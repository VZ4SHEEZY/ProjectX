import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Terminal, UserPlus, Database, ChevronRight } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface SearchTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Database
const DATABASE_USERS = [
  { id: 'u1', username: 'Neon_Viper', faction: 'NETRUNNER', status: 'WANTED', bounty: '0.5 ETH' },
  { id: 'u2', username: 'Corp_Sec_09', faction: 'CORPORATE', status: 'ACTIVE', bounty: 'N/A' },
  { id: 'u3', username: 'Dust_Runner', faction: 'NOMAD', status: 'OFFLINE', bounty: '0.1 ETH' },
  { id: 'u4', username: 'Ghost_Proxy', faction: 'PHANTOM', status: 'UNKNOWN', bounty: '1.0 ETH' },
  { id: 'u5', username: 'Glitch_King', faction: 'NETRUNNER', status: 'ACTIVE', bounty: '0.2 ETH' },
];

const SearchTerminal: React.FC<SearchTerminalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof DATABASE_USERS>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState<string[]>(['> SYSTEM_READY', '> AWAITING_INPUT...']);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setLogs(prev => [...prev, `> QUERYING_SUBNET: "${query.toUpperCase()}"...`]);
    setResults([]);

    // Simulate Network Latency
    setTimeout(() => {
      const filtered = DATABASE_USERS.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase()) || 
        u.faction.toLowerCase().includes(query.toLowerCase())
      );
      
      setResults(filtered);
      setIsSearching(false);
      
      if (filtered.length > 0) {
        setLogs(prev => [...prev, `> MATCHES_FOUND: ${filtered.length}`]);
      } else {
        setLogs(prev => [...prev, `> ERROR: NO_DATA_FOUND`]);
      }
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Terminal Container */}
      <div className="w-full max-w-2xl h-[600px] bg-[#050505] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.15)] flex flex-col clip-path-polygon relative overflow-hidden">
        
        {/* CRT Scanline */}
        <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: '100% 2px, 3px 100%' }} />

        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-[#39FF14]/10 border-b border-[#39FF14]/30">
           <div className="flex items-center gap-2 text-[#39FF14]">
              <Terminal size={18} />
              <span className="font-mono font-bold tracking-widest text-xs">NET_DIRECTORY // SEARCH_PROTOCOL</span>
           </div>
           <button onClick={onClose} className="text-[#39FF14]/50 hover:text-[#39FF14] transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Output Screen */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 text-[#39FF14] scrollbar-thin scrollbar-thumb-[#39FF14]/30">
           {logs.map((log, i) => (
             <div key={i} className="opacity-80">{log}</div>
           ))}
           
           {isSearching && (
             <div className="animate-pulse">{'>'} SCANNING_DATABANKS...</div>
           )}

           {/* Results Grid */}
           {results.length > 0 && (
             <div className="grid grid-cols-1 gap-2 mt-4">
                {results.map(user => (
                   <div key={user.id} className="border border-[#39FF14]/30 bg-[#39FF14]/5 p-3 flex items-center justify-between group hover:bg-[#39FF14]/10 hover:border-[#39FF14] transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 border border-[#39FF14] bg-black flex items-center justify-center text-[#39FF14]">
                            <Database size={16} />
                         </div>
                         <div>
                            <div className="font-bold tracking-wider">{user.username}</div>
                            <div className="text-[10px] text-gray-400 flex gap-2">
                               <span>FACTION: {user.faction}</span>
                               <span className={user.status === 'WANTED' ? 'text-red-500 animate-pulse' : 'text-gray-500'}>
                                  STATUS: {user.status}
                               </span>
                            </div>
                         </div>
                      </div>
                      
                      <button className="flex items-center gap-2 text-xs border border-[#39FF14] px-3 py-1 hover:bg-[#39FF14] hover:text-black transition-colors">
                         <UserPlus size={12} /> JACK_IN
                      </button>
                   </div>
                ))}
             </div>
           )}
        </div>

        {/* Input Line */}
        <div className="p-4 border-t border-[#39FF14]/30 bg-black">
           <form onSubmit={handleSearch} className="flex items-center gap-2">
              <span className="text-[#39FF14] animate-pulse">{'>'}</span>
              <input 
                ref={inputRef}
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[#39FF14] font-mono placeholder-[#39FF14]/30 uppercase"
                placeholder="ENTER_TARGET_ID OR FACTION..."
                autoComplete="off"
              />
              <button type="submit" className="text-[#39FF14] hover:text-white">
                 <ChevronRight size={20} />
              </button>
           </form>
        </div>

      </div>
    </div>
  );
};

export default SearchTerminal;
