import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Circle, Shield, Hash, Lock, MoreVertical } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface ChatTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  lastMsg: string;
}

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
  read?: boolean;
}

const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Morpheus', avatar: 'https://picsum.photos/seed/morpheus/100', status: 'online', lastMsg: 'The Matrix has you.' },
  { id: 'c2', name: 'Trinity', avatar: 'https://picsum.photos/seed/trinity/100', status: 'offline', lastMsg: 'Follow the white rabbit.' },
  { id: 'c3', name: 'Neo', avatar: 'https://picsum.photos/seed/neo/100', status: 'online', lastMsg: 'I know Kung Fu.' },
];

const INITIAL_CHAT: Message[] = [
  { id: 'm1', sender: 'them', text: 'Did you see the latest Faction War stats?', timestamp: '13:45' },
  { id: 'm2', sender: 'me', text: 'Yeah, NetRunners are gaining territory in the downtown sector.', timestamp: '13:46', read: true },
  { id: 'm3', sender: 'them', text: 'We need to mobilize the node cluster tonight. 22:00.', timestamp: '13:48' },
  { id: 'm4', sender: 'me', text: 'Consider it done. I\'m encrypting the payload now.', timestamp: '13:50', read: true },
];

const ChatTerminal: React.FC<ChatTerminalProps> = ({ isOpen, onClose }) => {
  const [activeContact, setActiveContact] = useState<Contact>(CONTACTS[0]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_CHAT);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, activeContact]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages([...messages, newMsg]);
    setInputValue('');

    // Simulate Reply
    setTimeout(() => {
       const reply: Message = {
         id: (Date.now() + 1).toString(),
         sender: 'them',
         text: "Packet received. Stand by.",
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
       };
       setMessages(prev => {
          // Mark previous as read
          const updated = prev.map(m => m.id === newMsg.id ? { ...m, read: true } : m);
          return [...updated, reply];
       });
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      
      {/* Main Container */}
      <div className="w-full max-w-5xl h-[80vh] bg-[#050505] border border-[#39FF14] flex shadow-[0_0_50px_rgba(57,255,20,0.1)] clip-path-polygon relative overflow-hidden">
        
        {/* Decorative Grid BG */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, #39FF14 1px, transparent 1px)',
               backgroundSize: '30px 30px'
             }} 
        />

        {/* LEFT SIDEBAR: CONTACTS */}
        <div className="w-80 border-r border-[#39FF14]/30 flex flex-col bg-black/40 backdrop-blur-sm z-10 hidden md:flex">
           <div className="p-4 border-b border-[#39FF14]/30 bg-[#39FF14]/5">
              <h3 className="text-[#39FF14] font-mono text-xs font-bold tracking-widest flex items-center gap-2">
                 <Hash size={14} /> ACTIVE CONNECTIONS
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto">
              {CONTACTS.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setActiveContact(contact)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-[#39FF14]/10 transition-all border-l-2 ${activeContact.id === contact.id ? 'bg-[#39FF14]/20 border-[#39FF14]' : 'border-transparent'}`}
                >
                   <div className="relative">
                      <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-sm border border-gray-600 grayscale" />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${contact.status === 'online' ? 'bg-[#39FF14]' : 'bg-gray-500'}`} />
                   </div>
                   <div className="text-left flex-1 min-w-0">
                      <div className="text-white font-mono text-sm font-bold truncate">{contact.name}</div>
                      <div className="text-gray-500 text-[10px] font-mono truncate">{contact.lastMsg}</div>
                   </div>
                </button>
              ))}
           </div>

           <div className="p-4 border-t border-[#39FF14]/30 text-[9px] text-gray-500 font-mono text-center">
              ENCRYPTION: AES-256 // NODES: 3/12
           </div>
        </div>

        {/* RIGHT AREA: CHAT WINDOW */}
        <div className="flex-1 flex flex-col z-10 bg-black/20">
           
           {/* Header */}
           <div className="h-16 border-b border-[#39FF14]/30 flex items-center justify-between px-6 bg-[#39FF14]/5">
              <div className="flex items-center gap-3">
                 <img src={activeContact.avatar} alt="active" className="w-8 h-8 rounded-sm border border-[#39FF14] md:hidden" />
                 <div>
                    <h2 className="text-[#39FF14] font-bold tracking-widest text-sm flex items-center gap-2">
                       <Lock size={14} /> SECURE CONNECTION ESTABLISHED
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                       TARGET: <span className="text-white uppercase">{activeContact.name}</span>
                       <span className="w-1 h-1 bg-[#39FF14] rounded-full animate-pulse" />
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <MoreVertical size={20} className="text-[#39FF14] cursor-pointer hover:text-white" />
                 <button onClick={onClose} className="text-[#39FF14] hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
           </div>

           {/* Messages */}
           <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                 <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`
                        max-w-[70%] p-4 text-xs font-mono border leading-relaxed relative
                        ${msg.sender === 'me' 
                          ? 'bg-black border-[#39FF14] text-[#39FF14] shadow-[4px_4px_0px_#39FF1422]' 
                          : 'bg-black border-[#FF00FF] text-[#FF00FF] shadow-[-4px_4px_0px_#FF00FF22]'}
                      `}
                    >
                       {msg.text}
                       
                       {/* Decorative Corner */}
                       <div className={`absolute top-0 w-2 h-2 border-t border-l ${msg.sender === 'me' ? 'left-0 border-[#39FF14]' : 'right-0 border-[#FF00FF] rotate-90'}`} />
                       <div className={`absolute bottom-0 w-2 h-2 border-b border-r ${msg.sender === 'me' ? 'right-0 border-[#39FF14]' : 'left-0 border-[#FF00FF] rotate-90'}`} />
                    </div>
                    
                    {/* Timestamp / Read Receipt */}
                    <div className="mt-1 flex items-center gap-2">
                       <span className="text-[9px] text-gray-600 font-mono">{msg.timestamp}</span>
                       {msg.sender === 'me' && msg.read && (
                          <span className="text-[8px] text-[#39FF14]/70 font-mono tracking-tighter">
                             [READ::ACK]
                          </span>
                       )}
                    </div>
                 </div>
              ))}
           </div>

           {/* Input Area */}
           <form onSubmit={handleSend} className="p-4 bg-black border-t border-[#39FF14]/30">
              <div className="flex items-center gap-2 border-b-2 border-[#39FF14] pb-2 group focus-within:border-white transition-colors">
                 <span className="text-[#39FF14] animate-pulse">{'>'}</span>
                 <input 
                   type="text" 
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   placeholder="Input transmission data..."
                   className="flex-1 bg-transparent border-none text-white font-mono text-sm focus:outline-none placeholder-gray-700"
                 />
                 <button 
                   type="submit" 
                   className="text-[#39FF14] font-bold text-xs tracking-widest hover:text-white hover:animate-pulse transition-colors uppercase"
                 >
                    TRANSMIT
                 </button>
              </div>
           </form>

        </div>

      </div>
    </div>
  );
};

export default ChatTerminal;