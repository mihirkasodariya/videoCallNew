import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, initializeSocket } from './socket';

function VideoChat() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, searching, connected, disconnected
  const [partnerId, setPartnerId] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

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

  // Monitor remote video element
  useEffect(() => {
    const checkRemoteStream = () => {
      if (status !== 'connected') return; // Only check when connected
      
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        const stream = remoteVideoRef.current.srcObject;
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        const hasActiveVideoTrack = videoTracks.some(t => t.readyState === 'live');
        const hasActiveAudioTrack = audioTracks.some(t => t.readyState === 'live');
        
        if (hasActiveVideoTrack || hasActiveAudioTrack) {
          if (!hasRemoteStream) {
            console.log('✅ Remote stream detected with active tracks');
            setHasRemoteStream(true);
          }
        } else if (hasRemoteStream && videoTracks.length === 0 && audioTracks.length === 0) {
          // Only hide if there are no tracks at all
          console.warn('⚠️ Remote stream has no tracks');
          // Don't reset immediately - might be temporary
        }
      }
    };

    // Check immediately
    checkRemoteStream();
    
    // Set up interval to check periodically (helps catch delayed streams)
    const interval = setInterval(checkRemoteStream, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [status, hasRemoteStream]);

  /**
   * Handle when a partner is matched
   */
  const handleMatched = async ({ partnerId: matchedPartnerId }) => {
    console.log(`✅ Matched with partner: ${matchedPartnerId}`);
    setPartnerId(matchedPartnerId);
    partnerIdRef.current = matchedPartnerId;
    setStatus('connected');
    setHasRemoteStream(false); // Reset remote stream state

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
    setHasRemoteStream(false);
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
      console.log('📹 Received remote stream', event);
      console.log('📹 Streams:', event.streams);
      console.log('📹 Track:', event.track);
      
      // Get or create stream
      let stream;
      if (event.streams && event.streams.length > 0) {
        stream = event.streams[0];
      } else if (event.track) {
        // Create stream from track if needed
        stream = new MediaStream([event.track]);
      }
      
      if (stream) {
        console.log('✅ Setting remote stream, tracks:', stream.getTracks().length);
        
        // If we already have a stream, add the new track to it
        if (remoteStreamRef.current && remoteVideoRef.current?.srcObject) {
          const existingStream = remoteStreamRef.current;
          // Add new tracks to existing stream
          stream.getTracks().forEach(newTrack => {
            // Check if track doesn't already exist
            if (!existingStream.getTracks().find(t => t.id === newTrack.id)) {
              existingStream.addTrack(newTrack);
              console.log('➕ Added new track to existing stream:', newTrack.kind);
            }
          });
        } else {
          // First track - set new stream
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteStreamRef.current = stream;
            setHasRemoteStream(true);
            
            // Force video to play
            remoteVideoRef.current.play().catch(err => {
              console.error('Error playing remote video:', err);
            });
            
            console.log('✅ Remote video srcObject set and playing');
          } else {
            console.warn('⚠️ remoteVideoRef.current is null');
          }
        }
        
        // Handle track ended events
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.log('⚠️ Remote track ended:', track.kind, track.id);
            // Check if stream still has active tracks
            const activeTracks = stream.getTracks().filter(t => t.readyState === 'live');
            if (activeTracks.length === 0) {
              console.warn('⚠️ All remote tracks ended');
              // Don't immediately hide - connection might be re-establishing
            } else {
              console.log('✅ Stream still has active tracks:', activeTracks.length);
              setHasRemoteStream(true);
            }
          };
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔌 Connection state: ${state}`);
      
      // Only trigger disconnect if connection actually failed (not just temporarily disconnected)
      if (state === 'failed') {
        console.error('❌ Connection failed permanently');
        handlePartnerLeft();
      } else if (state === 'disconnected') {
        // Check if we should wait for reconnection
        console.warn('⚠️ Connection disconnected - waiting for potential reconnection...');
        // Wait a bit before declaring partner left (allows for reconnection)
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'disconnected') {
            console.error('❌ Connection still disconnected after timeout');
            handlePartnerLeft();
          }
        }, 5000); // Wait 5 seconds for reconnection
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
      // Always request both video and audio, we'll control them via track.enabled
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Set initial state
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOn;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
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
   * Toggle microphone on/off
   */
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  /**
   * Toggle video on/off
   */
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
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
    
    setHasRemoteStream(false);
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
    setHasRemoteStream(false);
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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold text-lg">Random Video Chat</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'connected' ? 'bg-green-500/20 text-green-400' :
            status === 'searching' ? 'bg-yellow-500/20 text-yellow-400' :
            status === 'disconnected' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {status === 'idle' && 'Ready'}
            {status === 'searching' && 'Searching...'}
            {status === 'connected' && 'Connected'}
            {status === 'disconnected' && 'Disconnected'}
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative overflow-hidden">
        {status === 'idle' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Ready to start</h3>
              <p className="text-gray-400">Click "Start" to find a random partner</p>
            </div>
          </div>
        ) : status === 'searching' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Searching for partner...</h3>
              <p className="text-gray-400">Please wait while we find someone for you</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-1 bg-black">
            {/* Remote Video */}
            <div className="relative bg-gray-900 flex items-center justify-center overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log('✅ Remote video metadata loaded');
                  setHasRemoteStream(true);
                }}
                onCanPlay={() => {
                  console.log('✅ Remote video can play');
                }}
                onError={(e) => {
                  console.error('❌ Remote video error:', e);
                }}
              />
              {!hasRemoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Waiting for partner...</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg z-20">
                <p className="text-white text-sm font-medium">Partner</p>
              </div>
            </div>

            {/* Local Video */}
            <div className="relative bg-gray-900 flex items-center justify-center overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Camera is off</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                <p className="text-white text-sm font-medium">You</p>
                {!isMicOn && (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 01-1.343 4.618l-1.406-1.406A6 6 0 0016 10c0-3.314-2.686-6-6-6a6 6 0 00-2.212.402L6.172 3H10a8 8 0 018 8zM2 2l16 16-1.414 1.414L.586 3.414 2 2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            disabled={status === 'idle' || !localStreamRef.current}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMicOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 01-1.343 4.618l-1.406-1.406A6 6 0 0016 10c0-3.314-2.686-6-6-6a6 6 0 00-2.212.402L6.172 3H10a8 8 0 018 8zM2 2l16 16-1.414 1.414L.586 3.414 2 2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            disabled={status === 'idle' || !localStreamRef.current}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isVideoOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 01-1.343 4.618l-1.406-1.406A6 6 0 0016 10c0-3.314-2.686-6-6-6a6 6 0 00-2.212.402L6.172 3H10a8 8 0 018 8zM2 2l16 16-1.414 1.414L.586 3.414 2 2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Start Button */}
          {status === 'idle' && (
            <button
              onClick={startChat}
              className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-all shadow-lg"
              title="Start chat"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Next Button */}
          {status !== 'idle' && (
            <button
              onClick={nextChat}
              disabled={status === 'idle'}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next partner"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Stop/Leave Button */}
          {status !== 'idle' && (
            <button
              onClick={stopCall}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all"
              title="End call"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoChat;

