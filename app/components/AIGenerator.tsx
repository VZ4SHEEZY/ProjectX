import React, { useState } from 'react';
import { Sparkles, Wand2, Image as ImageIcon, MessageSquare, User } from 'lucide-react';
import { aiAPI } from '../services/ai';

interface AIGeneratorProps {
  type: 'caption' | 'bio' | 'image';
  onGenerate: (content: string) => void;
  className?: string;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ type, onGenerate, className = '' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [mood, setMood] = useState('cyberpunk');
  const [showOptions, setShowOptions] = useState(false);

  const moods = [
    { value: 'cyberpunk', label: 'Cyberpunk', icon: '⚡' },
    { value: 'mysterious', label: 'Mysterious', icon: '🌙' },
    { value: 'edgy', label: 'Edgy', icon: '🔥' },
    { value: 'futuristic', label: 'Futuristic', icon: '🚀' },
    { value: 'dark', label: 'Dark', icon: '💀' },
    { value: 'neon', label: 'Neon', icon: '💡' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let result;
      switch (type) {
        case 'caption':
          result = await aiAPI.generateCaption(topic, mood);
          onGenerate(result.caption);
          break;
        case 'bio':
          result = await aiAPI.generateBio(topic, mood);
          onGenerate(result.bio);
          break;
        case 'image':
          result = await aiAPI.generateImage(topic);
          onGenerate(result.imageUrl);
          break;
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
    } finally {
      setIsGenerating(false);
      setShowOptions(false);
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'caption': return 'Generate Caption';
      case 'bio': return 'Generate Bio';
      case 'image': return 'Generate Image';
      default: return 'Generate';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'caption': return <MessageSquare className="w-4 h-4" />;
      case 'bio': return <User className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 
                   text-white rounded-lg hover:from-purple-500 hover:to-pink-500 
                   transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-lg shadow-purple-500/30"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>{getButtonText()}</span>
          </>
        )}
      </button>

      {showOptions && (
        <div className="absolute z-50 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 
                        rounded-xl shadow-2xl shadow-purple-500/20 p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {type === 'image' ? 'Describe what you want:' : 'Topic or theme:'}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={type === 'image' ? 'A neon-lit cyberpunk city...' : 'What\'s on your mind?'}
                className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg 
                         text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                         transition-colors"
              />
            </div>

            {type !== 'image' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vibe:</label>
                <div className="grid grid-cols-3 gap-2">
                  {moods.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200
                                ${mood === m.value 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      <span className="mr-1">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 
                       text-white rounded-lg hover:from-cyan-400 hover:to-purple-400
                       transition-all duration-300 disabled:opacity-50 font-medium"
            >
              {isGenerating ? 'Creating Magic...' : `✨ ${getButtonText()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// AI Chat Assistant Component
export const AIChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Hey there! I\'m your CyberDope AI assistant. Need help with captions, bios, or just want to chat? 🔮' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await aiAPI.chatAssistant(userMessage);
      setMessages(prev => [...prev, { role: 'ai', content: response.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I had a glitch in the matrix. Try again! ⚡' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 
                 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40
                 hover:scale-110 transition-transform duration-300 group"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:animate-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96 bg-gray-900/95 backdrop-blur-xl 
                      border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20
                      flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full 
                            flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">CyberDope AI</h3>
                <p className="text-xs text-gray-400">Always here to help</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm
                    ${msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-200 rounded-bl-md'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-purple-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 bg-black/50 border border-purple-500/30 rounded-full
                         text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                         transition-colors text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full
                         flex items-center justify-center disabled:opacity-50
                         hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIGenerator;
