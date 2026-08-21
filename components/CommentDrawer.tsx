import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, CornerDownLeft } from 'lucide-react';

interface Comment {
  id: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: string;
}

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'c1',
    username: 'Glitch_Boy',
    avatar: 'https://picsum.photos/seed/glitch/50',
    message: 'Did you see the sub-routine in that last clip? Insane.',
    timestamp: '04:20 AM'
  },
  {
    id: 'c2',
    username: 'Net_Runner',
    avatar: 'https://picsum.photos/seed/runner/50',
    message: 'My neural link is frying just watching this.',
    timestamp: '04:22 AM'
  },
  {
    id: 'c3',
    username: 'System_Admin',
    avatar: 'https://picsum.photos/seed/admin/50',
    message: 'WARNING: Unauthorized data stream detected.',
    timestamp: '04:25 AM'
  }
];

const CommentDrawer: React.FC<CommentDrawerProps> = ({ isOpen, onClose }) => {
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [comments, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      username: 'NeonGhost', // Current user fallback
      avatar: 'https://picsum.photos/seed/me/50',
      message: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setComments([...comments, newComment]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div 
        className={`
          fixed z-[70] bg-black/90 backdrop-blur-md flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.8)]
          transition-transform duration-300 ease-out
          
          /* Mobile: Bottom Sheet */
          bottom-0 left-0 w-full h-[75vh] rounded-t-xl border-t-2 border-[#39FF14]
          transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}

          /* Desktop: Right Panel */
          md:top-0 md:right-0 md:bottom-auto md:w-96 md:h-full md:rounded-none md:border-t-0 md:border-l-2 md:border-[#39FF14]
          md:transform ${isOpen ? 'md:translate-x-0' : 'md:translate-x-full'}
        `}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#39FF14]/30 bg-black/60">
          <div className="flex items-center gap-2 text-[#39FF14]">
            <Hash size={16} className="animate-pulse" />
            <span className="font-mono font-bold tracking-widest text-sm">ENCRYPTED CHAT // V.1.0</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Stream (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#39FF14]/20 scrollbar-track-transparent">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300">
              {/* Avatar */}
              <div className="shrink-0 w-8 h-8 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden group-hover:border-[#39FF14] transition-colors">
                <img src={comment.avatar} alt="avatar" className="w-full h-full object-cover grayscale" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[#FF00FF] font-bold text-xs tracking-wider shadow-[#FF00FF]/50 drop-shadow-sm">
                    @{comment.username}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">
                    {comment.timestamp}
                  </span>
                </div>
                <p className="text-white text-xs font-mono leading-relaxed break-words opacity-90">
                  {comment.message}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#39FF14]/30 bg-black/80">
          <div className="relative flex items-end gap-2">
            <div className="text-[#39FF14] py-2 font-mono select-none">{'>'}</div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write to network..."
              className="w-full bg-transparent border-b border-gray-700 text-white font-mono text-sm py-2 px-1 focus:outline-none focus:border-[#39FF14] placeholder-gray-700 resize-none h-10 min-h-[40px] max-h-24 scrollbar-none"
              rows={1}
            />
            <button 
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
              className="mb-1 text-gray-500 hover:text-[#39FF14] disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
            >
              <CornerDownLeft size={20} />
            </button>
          </div>
          <div className="mt-2 text-[9px] text-gray-600 font-mono text-right flex justify-end gap-2">
             <span>SECURE_CONNECTION</span>
             <span className="animate-pulse w-2 h-2 bg-[#39FF14] rounded-full inline-block"></span>
          </div>
        </div>

      </div>
    </>
  );
};

export default CommentDrawer;
