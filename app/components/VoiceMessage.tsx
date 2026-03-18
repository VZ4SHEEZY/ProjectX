import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Send, Trash2, Volume2 } from 'lucide-react';
import { voiceAPI } from '../services/voice';

interface VoiceMessageRecorderProps {
  recipientId: string;
  onSend: () => void;
}

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  waveform?: number[];
  isListened?: boolean;
}

// Voice Recorder Component
export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({ 
  recipientId, 
  onSend 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording Error:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('recipientId', recipientId);
      formData.append('duration', recordingTime.toString());

      await voiceAPI.sendVoiceMessage(formData);
      
      // Reset
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      onSend();
    } catch (error) {
      console.error('Send Voice Error:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-full">
        <audio src={audioUrl} controls className="flex-1 h-8" />
        <button
          onClick={cancelRecording}
          className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={sendVoiceMessage}
          className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 rounded-full">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono">{formatTime(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            <div className="w-4 h-4 bg-white rounded-sm" />
          </button>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full
                   hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-110"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// Voice Message Player Component
export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ 
  audioUrl, 
  duration, 
  waveform = [],
  isListened = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform bars if not provided
  const bars = waveform.length > 0 ? waveform : Array(30).fill(0).map(() => Math.random() * 0.8 + 0.2);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl ${
      isListened ? 'bg-gray-800' : 'bg-purple-600/20'
    }`}>
      <audio ref={audioRef} src={audioUrl} className="hidden" />
      
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isPlaying 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center gap-0.5 h-8">
        {bars.map((height, idx) => {
          const progress = currentTime / duration;
          const isPlayed = idx / bars.length < progress;
          
          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-200 ${
                isPlayed ? 'bg-purple-500' : 'bg-gray-600'
              }`}
              style={{ 
                height: `${height * 100}%`,
                opacity: isPlaying ? 1 : 0.7
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 font-mono">
          {formatTime(duration - currentTime)}
        </span>
      </div>

      {!isListened && (
        <div className="w-2 h-2 bg-purple-500 rounded-full" />
      )}
    </div>
  );
};

export default VoiceMessageRecorder;
