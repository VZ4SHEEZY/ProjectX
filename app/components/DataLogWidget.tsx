
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, FileText, Trash2, MoreHorizontal, Lock, Unlock } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface LogEntry {
  id: string;
  content: string;
  timestamp: string;
  image?: string;
  type: 'status' | 'media' | 'system' | 'locked';
  price?: string;
  isUnlocked?: boolean;
}

const MOCK_LOGS: LogEntry[] = [
  { id: 'l1', content: 'Just jacked into the mainframe. The data stream is wild tonight.', timestamp: '10:42 PM', type: 'status' },
  { id: 'l2', content: 'Sector 7 View', timestamp: 'Yesterday', image: 'https://picsum.photos/seed/city/300/150', type: 'media' },
  { id: 'l3', content: 'System Update: Neural Link Verified.', timestamp: '2 days ago', type: 'system' },
  { id: 'l4', content: 'SECRET_KEY_FRAGMENT: 894-X', timestamp: '3 days ago', type: 'locked', price: '0.01 ETH', isUnlocked: false },
];

const DataLogWidget: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [input, setInput] = useState('');
  const [isLockMode, setIsLockMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePost = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newLog: LogEntry = {
      id: Date.now().toString(),
      content: input,
      timestamp: 'Just now',
      type: isLockMode ? 'locked' : 'status',
      price: isLockMode ? '0.02 ETH' : undefined,
      isUnlocked: false
    };

    setLogs([newLog, ...logs]);
    setInput('');
    setIsLockMode(false);
  };

  const handleUnlock = (id: string) => {
    // Simulate purchase
    setLogs(prev => prev.map(log => 
        log.id === id ? { ...log, isUnlocked: true } : log
    ));
  };

  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-md border border-gray-700 flex flex-col overflow-hidden relative group">
      
      {/* Header */}
      <div className="h-10 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 text-gray-400">
           <FileText size={14} />
           <span className="font-mono font-bold text-[10px] tracking-widest uppercase">Data_Log // User_Feed</span>
        </div>
        <div className="text-[8px] text-gray-600 font-mono">ENCRYPTED</div>
      </div>

      {/* Input Area */}
      <div className={`p-3 border-b border-gray-700 transition-colors ${isLockMode ? 'bg-yellow-500/10' : 'bg-black/40'}`}>
         <form onSubmit={handlePost} className="flex gap-2 items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`flex-1 bg-transparent border-b text-white font-mono text-xs py-1 focus:outline-none placeholder-gray-600 transition-colors ${isLockMode ? 'border-yellow-500 placeholder-yellow-500/50' : 'border-gray-700 focus:border-[#39FF14]'}`}
              placeholder={isLockMode ? "Enter Encrypted Data..." : "Update Status Log..."}
            />
            
            {/* Lock Toggle */}
            <button 
              type="button" 
              onClick={() => setIsLockMode(!isLockMode)}
              className={`transition-colors ${isLockMode ? 'text-yellow-500 animate-pulse' : 'text-gray-500 hover:text-white'}`}
              title="Encrypt Post (Paid)"
            >
               <Lock size={16} />
            </button>

            <button type="button" className="text-gray-500 hover:text-[#39FF14] transition-colors">
               <ImageIcon size={16} />
            </button>
            <button type="submit" disabled={!input.trim()} className="text-gray-500 hover:text-[#39FF14] disabled:opacity-30 transition-colors">
               <Send size={16} />
            </button>
         </form>
         {isLockMode && (
            <div className="text-[8px] text-yellow-500 font-mono mt-1 text-right">
               MONETIZATION ACTIVE (0.02 ETH)
            </div>
         )}
      </div>

      {/* Logs Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
         {logs.map(log => (
           <div key={log.id} className="relative pl-3 border-l border-gray-800 hover:border-[#39FF14] transition-colors group/item">
              
              {/* Timeline Dot */}
              <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-gray-800 group-hover/item:bg-[#39FF14] rounded-full transition-colors" />

              <div className="flex justify-between items-start mb-1">
                 <span className="text-[9px] text-gray-500 font-mono uppercase">{log.timestamp}</span>
                 <button className="text-gray-700 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Trash2 size={10} />
                 </button>
              </div>

              {log.type === 'system' ? (
                 <div className="text-[10px] font-mono text-[#39FF14] bg-[#39FF14]/5 p-1 border border-[#39FF14]/20">
                    {log.content}
                 </div>
              ) : log.type === 'locked' && !log.isUnlocked ? (
                 // LOCKED POST UI
                 <div className="border border-yellow-500/30 bg-yellow-500/5 p-2 flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2 text-yellow-500">
                        <Lock size={12} />
                        <span className="text-[10px] font-mono font-bold blur-[2px] select-none">ENCRYPTED_DATA_PACKET</span>
                     </div>
                     <button 
                        onClick={() => handleUnlock(log.id)}
                        className="text-[9px] border border-yellow-500 text-yellow-500 px-2 py-1 hover:bg-yellow-500 hover:text-black transition-colors font-bold"
                     >
                        UNLOCK ({log.price})
                     </button>
                 </div>
              ) : (
                 // STANDARD / UNLOCKED POST
                 <p className={`text-xs text-gray-300 font-mono leading-relaxed mb-2 ${log.type === 'locked' ? 'text-yellow-500' : ''}`}>
                    {log.type === 'locked' && <Unlock size={10} className="inline mr-1" />}
                    {log.content}
                 </p>
              )}

              {log.image && (
                 <div className="rounded-sm overflow-hidden border border-gray-800 mt-2">
                    <img src={log.image} alt="attachment" className="w-full h-auto object-cover opacity-80 hover:opacity-100 transition-opacity" />
                 </div>
              )}
           </div>
         ))}
      </div>

    </div>
  );
};

export default DataLogWidget;
