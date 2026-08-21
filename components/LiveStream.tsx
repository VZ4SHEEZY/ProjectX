import React, { useState, useEffect, useRef } from 'react';
import { Video, Users, MessageSquare, Heart, DollarSign, X, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { socketService } from '../services/socket';

interface LiveStreamProps {
  streamId?: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  user: { username: string; avatar: string };
  message: string;
  timestamp: Date;
}

export const LiveStream: React.FC<any> = ({ streamId, onClose, isOpen }) => { if (!isOpen) return null;
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (streamId) joinStream();

    socketService.onStreamMessage((data) => {
      setChatMessages(prev => [...prev, data]);
    });

    return () => {
      if (isStreaming) endStream();
      socketService.offStreamMessage();
    };
  }, [streamId]);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      socketService.startStream({ streamId, title: streamTitle || 'Live Stream' });
      setIsStreaming(true);
    } catch (error) {
      console.error('Start Stream Error:', error);
      alert('Could not access camera/microphone');
    }
  };

  const joinStream = async () => {
    try {
      if (streamId) socketService.joinRoom(streamId);
    } catch (error) {
      console.error('Join Stream Error:', error);
    }
  };

  const endStream = async () => {
    try {
      if (streamId) socketService.endStream(streamId);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      setIsStreaming(false);
    } catch (error) {
      console.error('End Stream Error:', error);
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !streamId) return;
    socketService.sendStreamMessage(streamId, chatInput);
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: { username: 'You', avatar: '' },
      message: chatInput,
      timestamp: new Date()
    }]);
    setChatInput('');
  };

  const sendTip = async () => {
    if (!tipAmount) return;
    alert('Tip sent! 🎉');
    setShowTipModal(false);
    setTipAmount('');
  };

  const toggleMute = () => {
    if (videoRef.current?.srcObject) {
      const audioTrack = (videoRef.current.srcObject as MediaStream).getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!isMuted); }
    }
  };

  const toggleVideo = () => {
    if (videoRef.current?.srcObject) {
      const videoTrack = (videoRef.current.srcObject as MediaStream).getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(!isVideoOff); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white">LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" />
            <span>{viewerCount}</span>
          </div>
        </div>
        <button onClick={() => { if (isStreaming) endStream(); onClose(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex h-full">
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {isStreaming && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-600' : 'bg-white/20 hover:bg-white/30'}`}>
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>
              <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-600' : 'bg-white/20 hover:bg-white/30'}`}>
                {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <VideoIcon className="w-6 h-6 text-white" />}
              </button>
              <button onClick={endStream} className="px-6 py-4 bg-red-600 rounded-full text-white font-semibold hover:bg-red-700 transition-colors">
                End Stream
              </button>
            </div>
          )}

          {!isStreaming && !streamId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <Video className="w-12 h-12 text-white" />
                </div>
                <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Stream title..." className="w-80 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-center focus:outline-none focus:border-purple-500" />
                <button onClick={startStream} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/40">
                  Go Live 🔴
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Live Chat</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {msg.user.username[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-400">{msg.user.username}</p>
                  <p className="text-sm text-gray-300">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-800 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Say something..." className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              <button onClick={sendChatMessage} className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition-colors">Send</button>
            </div>
            <button onClick={() => setShowTipModal(true)} className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-orange-400 transition-colors">
              <DollarSign className="w-5 h-5" />
              Send Tip
            </button>
          </div>
        </div>
      </div>

      {showTipModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 p-6 rounded-2xl border border-purple-500/30 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">Send a Tip</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount ($)</label>
                <input type="number" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} placeholder="5.00" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex gap-2">
                {['1', '5', '10', '20'].map(amount => (
                  <button key={amount} onClick={() => setTipAmount(amount)} className="flex-1 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors">${amount}</button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowTipModal(false)} className="flex-1 py-3 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={sendTip} disabled={!tipAmount} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-colors disabled:opacity-50">Send Tip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStream;



