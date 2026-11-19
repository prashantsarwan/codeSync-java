import { useState, useRef, useEffect } from 'react';
import { getSocket } from '../api/socket.js';

export default function useVoiceChat({ roomCode, user, socket, isHost }) {
  const [inCall, setInCall] = useState(false);
  const [selfMuted, setSelfMuted] = useState(true); 
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [participants, setParticipants] = useState(0);

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioElementsRef = useRef({});

  useEffect(() => {
    if (!socket) return;
    
    socket.on('voice-users', async (users) => {
      setParticipants(users.length > 0 ? users.length - 1 : 0);
      if (inCall) {
        users.forEach(userSocketId => {
          if (userSocketId !== socket.id && !peersRef.current[userSocketId]) {
            const amINew = users.indexOf(socket.id) > users.indexOf(userSocketId);
            createPeerConnection(userSocketId, !amINew); 
          }
        });
      }
    });

    socket.on('voice-signal', async ({ from, signal }) => {
      if (!peersRef.current[from]) {
        createPeerConnection(from, false);
      }
      
      const peer = peersRef.current[from];
      
      try {
        if (signal.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('voice-signal', { to: from, from: socket.id, signal: answer });
        } 
        else if (signal.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
        } 
        else if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (err) {
        console.warn("WebRTC Error:", err.message);
      }
    });

    socket.on('force-mute', (muted) => {
      if (localStreamRef.current) {
        // Audio stream ko mute/unmute karein, band na karein
        localStreamRef.current.getAudioTracks()[0].enabled = !muted;
        setSelfMuted(muted);
      }
    });

    return () => {
      socket.off('voice-users');
      socket.off('voice-signal');
      socket.off('force-mute');
    };
  }, [socket, inCall]);

  const createPeerConnection = async (targetSocketId, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peersRef.current[targetSocketId] = peer;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audio = audioElementsRef.current[targetSocketId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElementsRef.current[targetSocketId] = audio;
      }
      audio.srcObject = remoteStream;
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-signal', {
          to: targetSocketId,
          from: socket.id,
          signal: event.candidate
        });
      }
    };

    if (isInitiator) {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('voice-signal', { to: targetSocketId, from: socket.id, signal: offer });
      } catch (err) {
        console.warn("Offer error:", err.message);
      }
    }
  };

  const join = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // Mic ko ON rakhein par "enabled=false" se mute karein
      stream.getAudioTracks()[0].enabled = false;
      
      setInCall(true);
      setSelfMuted(true); 
      socket.emit('voice-join', { roomCode, userName: user.name });
    } catch (err) {
      console.error('Mic access denied', err);
      alert("Please allow microphone access to use voice chat.");
    }
  };

  const leave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peersRef.current).forEach(peer => peer.close());
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    
    peersRef.current = {};
    audioElementsRef.current = {};
    setInCall(false);
    socket.emit('voice-leave', { roomCode, userName: user.name });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setSelfMuted(!track.enabled);
      socket.emit('voice-mute-toggle', { roomCode, socketId: socket.id, muted: !track.enabled });
    }
  };

  // PTT Start
  const startPTT = () => {
    if (!inCall || !localStreamRef.current) return;
    setPushToTalkActive(true);
    // Mic ko enable karein (unmute)
    localStreamRef.current.getAudioTracks()[0].enabled = true;
    socket.emit('speaking', { roomCode, socketId: socket.id, speaking: true });
  };

  // PTT Stop
  const stopPTT = () => {
    if (!inCall || !localStreamRef.current) return;
    setPushToTalkActive(false);
    // Mic ko disable karein (mute)
    localStreamRef.current.getAudioTracks()[0].enabled = false;
    setSelfMuted(true); 
    socket.emit('speaking', { roomCode, socketId: socket.id, speaking: false });
  };

  return {
    inCall, selfMuted, pushToTalkActive, participants,
    join, leave, toggleMute, startPTT, stopPTT, setSelfMuted
  };
}