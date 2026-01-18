import { useState, useRef, useEffect } from 'react';
import { socket, initializeSocket } from './socket';
import './VideoChat.css';

function VideoChat() {
  const [status, setStatus] = useState('idle'); // idle, searching, connected, disconnected
  const [partnerId, setPartnerId] = useState(null);

  // Refs for video elements and streams
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const isActiveRef = useRef(false); // Track if user is in active chat mode (not stopped)
  const partnerIdRef = useRef(null); // Ref to track partner ID for ICE candidate handler

  // WebRTC configuration
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
      // TURN server placeholder for production
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password'
      // }
    ]
  };

  // Initialize socket connection
  useEffect(() => {
    initializeSocket();

    // Socket event listeners
    socket.on('matched', handleMatched);
    socket.on('signal', handleSignal);
    socket.on('partner-left', handlePartnerLeft);

    // Cleanup on unmount
    return () => {
      socket.off('matched');
      socket.off('signal');
      socket.off('partner-left');
      stopCall();
    };
  }, []);

  /**
   * Handle when a partner is matched
   */
  const handleMatched = async ({ partnerId: matchedPartnerId }) => {
    console.log(`✅ Matched with partner: ${matchedPartnerId}`);
    setPartnerId(matchedPartnerId);
    partnerIdRef.current = matchedPartnerId;
    setStatus('connected');

    // Initialize WebRTC peer connection
    await initializePeerConnection();

    // Start local video
    await startLocalVideo();

    // Create and send offer
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      console.log('📤 Sending offer to partner');
      socket.emit('signal', {
        targetId: matchedPartnerId,
        signal: { type: 'offer', sdp: offer.sdp }
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  };

  /**
   * Handle incoming WebRTC signaling messages
   */
  const handleSignal = async ({ fromId, signal }) => {
    // Set partner ID if not set (for incoming offers)
    if (!partnerId && fromId) {
      setPartnerId(fromId);
      partnerIdRef.current = fromId;
      setStatus('connected');
    }

    if (!peerConnectionRef.current) {
      await initializePeerConnection();
    }

    try {
      if (signal.type === 'offer') {
        console.log('📥 Received offer from partner');
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription({ type: signal.type, sdp: signal.sdp })
        );

        // Start local video if not started
        if (!localStreamRef.current) {
          await startLocalVideo();
          // Add tracks after stream is ready
          if (localStreamRef.current && peerConnectionRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              if (!peerConnectionRef.current.getSenders().find(s => s.track === track)) {
                peerConnectionRef.current.addTrack(track, localStreamRef.current);
              }
            });
          }
        }

        // Create and send answer
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        console.log('📤 Sending answer to partner');
        socket.emit('signal', {
          targetId: fromId,
          signal: { type: 'answer', sdp: answer.sdp }
        });
      } else if (signal.type === 'answer') {
        console.log('📥 Received answer from partner');
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription({ type: signal.type, sdp: signal.sdp })
        );
      } else if (signal.type === 'candidate') {
        console.log('📥 Received ICE candidate from partner');
        if (signal.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(signal.candidate)
            );
          } catch (error) {
            // Ignore errors for candidates that are already added
            if (error.name !== 'OperationError') {
              console.error('❌ Error adding ICE candidate:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  };

  /**
   * Handle when partner disconnects
   */
  const handlePartnerLeft = () => {
    console.log('👋 Partner left');
    setStatus('disconnected');
    setPartnerId(null);
    partnerIdRef.current = null;
    cleanupPeerConnection();
    
    // Optional: Auto re-queue if user wants to continue
    // This can be removed if you want manual re-matching only
    if (isActiveRef.current) {
      setTimeout(() => {
        if (isActiveRef.current) {
          startChat();
        }
      }, 2000);
    }
  };

  /**
   * Initialize WebRTC peer connection
   */
  const initializePeerConnection = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(pcConfig);
    peerConnectionRef.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && partnerIdRef.current) {
        console.log('📤 Sending ICE candidate to partner');
        socket.emit('signal', {
          targetId: partnerIdRef.current,
          signal: {
            type: 'candidate',
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📹 Received remote stream', event.streams);
      console.log('📹 Stream tracks:', event.track ? [event.track] : 'no track');
      if (event.streams && event.streams.length > 0 && remoteVideoRef.current) {
        const stream = event.streams[0];
        remoteVideoRef.current.srcObject = stream;
        remoteStreamRef.current = stream;
        console.log('✅ Remote video srcObject set, tracks:', stream.getTracks().length);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔌 Connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handlePartnerLeft();
      }
    };

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
  };

  /**
   * Start local video stream
   */
  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to avoid feedback
      }

      // Add tracks to peer connection if it exists
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }

      console.log('📹 Local video started');
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  /**
   * Cleanup peer connection and streams
   */
  const cleanupPeerConnection = () => {
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Stop remote stream tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  /**
   * Start chat - join matchmaking queue
   */
  const startChat = () => {
    if (status === 'searching') return;

    console.log('🚀 Starting chat...');
    isActiveRef.current = true;
    setStatus('searching');
    setPartnerId(null);
    partnerIdRef.current = null;
    cleanupPeerConnection();
    socket.emit('join-queue');
  };

  /**
   * Next - disconnect current partner and find new one
   */
  const nextChat = () => {
    if (status === 'idle') {
      startChat();
      return;
    }

    console.log('🔄 Finding next partner...');
    setStatus('searching');
    setPartnerId(null);
    partnerIdRef.current = null;
    cleanupPeerConnection();
    socket.emit('next');
  };

  /**
   * Stop - leave queue and end call
   */
  const stopCall = () => {
    console.log('🛑 Stopping chat...');
    isActiveRef.current = false;
    setStatus('idle');
    setPartnerId(null);
    partnerIdRef.current = null;
    cleanupPeerConnection();
    socket.emit('leave');
  };

  return (
    <div className="video-chat">
      {/* Status Display */}
      <div className="status-bar">
        <p className={`status status-${status}`}>
          {status === 'idle' && 'Ready to start'}
          {status === 'searching' && '🔍 Searching for partner...'}
          {status === 'connected' && `✅ Connected to ${partnerId?.substring(0, 8)}...`}
          {status === 'disconnected' && '⚠️ Partner disconnected'}
        </p>
      </div>

      {/* Video Container */}
      <div className="video-container">
        {/* Remote Video */}
        <div className="video-wrapper remote-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
          {status !== 'connected' && (
            <div className="video-placeholder">
              <p>Waiting for partner...</p>
            </div>
          )}
        </div>

        {/* Local Video */}
        <div className="video-wrapper local-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="controls">
        <button
          onClick={startChat}
          disabled={status === 'searching'}
          className="btn btn-start"
        >
          Start
        </button>
        <button
          onClick={nextChat}
          disabled={status === 'idle'}
          className="btn btn-next"
        >
          Next
        </button>
        <button
          onClick={stopCall}
          disabled={status === 'idle'}
          className="btn btn-stop"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

export default VideoChat;

