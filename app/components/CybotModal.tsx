
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Activity, Minimize2, Eye } from 'lucide-react';
import { getCybotResponse } from '../services/aiService';

interface CybotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'cybot';
  text: string;
}

const REACTIVE_PHRASES = [
  "System monitoring active.",
  "Data stream stable.",
  "User heartbeat elevated.",
  "Surveillance protocols engaged.",
  "I am watching."
];

const CybotModal: React.FC<CybotModalProps> = ({ isOpen, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'cybot',
      text: "Greetings, User. I am Cybot, v9.0. I am currently monitoring your session."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, isExpanded]);

  // Random "Passive" Commentary (Simulates AI watching you)
  useEffect(() => {
    if (isExpanded) return;

    const interval = setInterval(() => {
        if (Math.random() > 0.8) {
            const phrase = REACTIVE_PHRASES[Math.floor(Math.random() * REACTIVE_PHRASES.length)];
            triggerToast(phrase);
        }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isExpanded]);

  // Watch for the "Open" prop from parent to expand automatically
  useEffect(() => {
    if (isOpen) setIsExpanded(true);
  }, [isOpen]);

  const triggerToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(''), 4000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputValue;
    setInputValue('');
    setIsThinking(true);

    // Get AI response
    const aiResponse = await getCybotResponse(currentInput);
    
    setIsThinking(false);
    const cybotMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'cybot',
      text: aiResponse
    };
    setMessages(prev => [...prev, cybotMsg]);
  };

  // Explicitly handle closing both local and parent state
  const handleClose = () => {
    setIsExpanded(false);
    onClose();
  };

  const toggleExpand = () => {
      if (isExpanded) {
          handleClose();
      } else {
          setIsExpanded(true);
      }
  };

  // --- RENDER ---

  return (
    <>
      {/* 1. THE FLOATING HUD WIDGET (Always Visible) */}
      <div className={`
         fixed z-[190] transition-all duration-500 ease-out
         /* Positioning */
         bottom-24 right-4 md:bottom-8 md:right-8
         ${isExpanded ? 'translate-x-[200%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
      `}>
         {/* The Speech Toast */}
         {toastMsg && (
             <div className="absolute bottom-full mb-2 right-0 w-48 bg-[#00FFFF]/10 border border-[#00FFFF] text-[#00FFFF] text-[10px] font-mono p-2 backdrop-blur-md rounded-tl-lg rounded-br-lg animate-in slide-in-from-right-10 fade-in duration-300">
                {toastMsg}
                <div className="absolute bottom-[-5px] right-4 w-2 h-2 bg-[#00FFFF] rotate-45 border-r border-b border-[#00FFFF]"></div>
             </div>
         )}

         {/* The Orb */}
         <button 
           onClick={toggleExpand}
           className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/80 border-2 border-[#00FFFF] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)] group hover:scale-110 transition-transform"
         >
            <div className="absolute inset-0 rounded-full border border-[#00FFFF] animate-ping opacity-20"></div>
            <Bot size={24} className="text-[#00FFFF] group-hover:animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black"></div>
         </button>
      </div>


      {/* 2. THE EXPANDED CHAT INTERFACE */}
      {isExpanded && (
        <div className={`
          fixed z-[200] 
          /* Mobile: Full Screen Overlay */
          inset-0 md:inset-auto md:bottom-24 md:right-8 md:w-96 md:h-[500px]
          flex flex-col
          bg-black/90 backdrop-blur-xl
          border-x border-y md:border border-[#00FFFF]
          shadow-[0_0_50px_rgba(0,255,255,0.2)]
          animate-in zoom-in-95 duration-200
        `}>
          
          {/* Background FX */}
          <div className="absolute inset-0 pointer-events-none z-0" 
               style={{ 
                 backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, .05) 25%, rgba(0, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .05) 75%, rgba(0, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, .05) 25%, rgba(0, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .05) 75%, rgba(0, 255, 255, .05) 76%, transparent 77%, transparent)',
                 backgroundSize: '30px 30px'
               }} 
          />

          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#00FFFF]/30 bg-[#00FFFF]/10 z-10">
            <div className="flex items-center gap-2 text-[#00FFFF]">
              <Activity size={16} className="animate-pulse" />
              <span className="font-mono font-bold tracking-widest text-xs">CYBOT_INTERFACE // V.9.0</span>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={handleClose} className="text-[#00FFFF]/50 hover:text-[#00FFFF] transition-colors p-1 hover:bg-[#00FFFF]/20 rounded">
                 <Minimize2 size={18} />
               </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm relative z-10 scrollbar-thin scrollbar-thumb-[#00FFFF]/20 scrollbar-track-transparent"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`
                  shrink-0 w-8 h-8 flex items-center justify-center border 
                  ${msg.sender === 'cybot' ? 'border-[#00FFFF] bg-[#00FFFF]/10 shadow-[0_0_10px_rgba(0,255,255,0.2)]' : 'border-[#39FF14] bg-[#39FF14]/10'}
                `}>
                   {msg.sender === 'cybot' ? <Eye size={16} className="text-[#00FFFF]" /> : <span className="text-[#39FF14] text-[10px]">USR</span>}
                </div>

                <div className={`
                  max-w-[80%] p-2 text-xs leading-relaxed border-l-2
                  ${msg.sender === 'cybot' 
                    ? 'text-[#00FFFF] border-[#00FFFF]/50 bg-[#00FFFF]/5' 
                    : 'text-[#39FF14] border-[#39FF14]/50 bg-[#39FF14]/5 text-right'}
                `}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-3 animate-pulse">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#00FFFF] bg-[#00FFFF]/10"><Bot size={16} /></div>
                <div className="flex items-center text-[#00FFFF] text-xs font-mono">PROCESSING...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#00FFFF]/30 bg-[#00FFFF]/5 z-10">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-black/50 border border-[#00FFFF]/30 p-1">
              <span className="text-[#00FFFF] pl-2">{'>'}</span>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent border-none text-[#00FFFF] font-mono text-sm focus:ring-0 focus:outline-none placeholder-[#00FFFF]/30 h-8"
                placeholder="QUERY_SYSTEM..."
                autoFocus
              />
              <button type="submit" disabled={!inputValue.trim()} className="p-2 text-[#00FFFF] hover:bg-[#00FFFF]/20 transition-colors">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CybotModal;
