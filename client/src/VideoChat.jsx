import { useState, useRef, useEffect } from "react";
import { socket, initializeSocket } from "./socket";
import "./VideoChat.css";

function VideoChat() {
  const [status, setStatus] = useState("idle");
  const [partnerId, setPartnerId] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const partnerIdRef = useRef(null);
  const isActiveRef = useRef(false);

  const pcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    initializeSocket();

    socket.on("matched", handleMatched);
    socket.on("signal", handleSignal);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("matched");
      socket.off("signal");
      socket.off("partner-left");
      stopCall();
    };
  }, []);

  const handleMatched = async ({ partnerId }) => {
    setPartnerId(partnerId);
    partnerIdRef.current = partnerId;
    setStatus("connected");

    await initPeer();
    await startLocalVideo();

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);

    socket.emit("signal", {
      targetId: partnerId,
      signal: { type: "offer", sdp: offer.sdp },
    });
  };

  const handleSignal = async ({ fromId, signal }) => {
    if (!peerConnectionRef.current) await initPeer();

    if (signal.type === "offer") {
      setPartnerId(fromId);
      partnerIdRef.current = fromId;
      setStatus("connected");

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );

      await startLocalVideo();

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit("signal", {
        targetId: fromId,
        signal: { type: "answer", sdp: answer.sdp },
      });
    }

    if (signal.type === "answer") {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
    }

    if (signal.type === "candidate" && signal.candidate) {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(signal.candidate)
      );
    }
  };

  const handlePartnerLeft = () => {
    setStatus("disconnected");
    cleanup();
    if (isActiveRef.current) startChat();
  };

  const initPeer = async () => {
    cleanup();

    const pc = new RTCPeerConnection(pcConfig);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && partnerIdRef.current) {
        socket.emit("signal", {
          targetId: partnerIdRef.current,
          signal: { type: "candidate", candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };
  };

  const startLocalVideo = async () => {
    if (localStreamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.muted = true;

    stream.getTracks().forEach((track) =>
      peerConnectionRef.current.addTrack(track, stream)
    );
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startChat = () => {
    isActiveRef.current = true;
    setStatus("searching");
    socket.emit("join-queue");
  };

  const nextChat = () => {
    cleanup();
    setStatus("searching");
    socket.emit("next");
  };

  const stopCall = () => {
    isActiveRef.current = false;
    cleanup();
    setStatus("idle");
    socket.emit("leave");
  };

  return (
    <div className="video-chat">
      <div className="status-bar">
        <p className={`status status-${status}`}>
          {status === "idle" && "Ready to start"}
          {status === "searching" && "🔍 Searching for partner..."}
          {status === "connected" && "✅ Connected"}
          {status === "disconnected" && "⚠️ Partner disconnected"}
        </p>
      </div>

      <div className="video-container">
        <div className="remote-video">
          <video ref={remoteVideoRef} autoPlay playsInline />
          {status !== "connected" && (
            <div className="video-placeholder">Waiting for partner...</div>
          )}
        </div>

        <div className="local-video">
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
      </div>

      <div className="controls">
        <button className="btn btn-start" onClick={startChat} disabled={status === "searching"}>
          Start
        </button>
        <button className="btn btn-next" onClick={nextChat} disabled={status === "idle"}>
          Next
        </button>
        <button className="btn btn-stop" onClick={stopCall} disabled={status === "idle"}>
          Stop
        </button>
      </div>
    </div>
  );
}

export default VideoChat;
