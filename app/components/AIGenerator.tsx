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
// AIChatAssistant removed - functionality consolidated in DMChat.tsx with CyberDope AI contact

export default AIGenerator;
