
import React, { useState } from 'react';
import { MapPin, Target, Crown, Navigation } from 'lucide-react';

const GeoNodeWidget: React.FC = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [controller, setController] = useState({ name: 'Viper_X', avatar: 'https://picsum.photos/seed/viper/50' });

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    // Simulate taking over
    setController({ name: 'YOU (NeonGhost)', avatar: 'https://picsum.photos/seed/me/50' });
  };

  return (
    <div className="w-full h-full bg-[#050505] border border-[#39FF14]/50 flex flex-col relative overflow-hidden group">
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#39FF14 1px, transparent 1px)', backgroundSize: '10px 10px' }} 
      />

      {/* Radar Animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
         <div className="w-[150%] h-[150%] rounded-full border border-[#39FF14]/20 animate-[spin_4s_linear_infinite]" 
              style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, #39FF14 360deg)' }}
         />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-2 bg-[#39FF14]/10 border-b border-[#39FF14]/30">
         <div className="flex items-center gap-2 text-[#39FF14]">
            <MapPin size={14} />
            <span className="font-mono font-bold text-[10px] tracking-widest uppercase">SECTOR_NODE</span>
         </div>
         <div className="text-[8px] text-[#39FF14] font-mono animate-pulse">LIVE</div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 p-4 flex flex-col items-center justify-center text-center">
         
         <h3 className="text-[#39FF14] font-bold text-lg font-mono tracking-widest mb-1 shadow-black drop-shadow-md">
            NEON MARKET (D2)
         </h3>
         <p className="text-[9px] text-gray-500 font-mono mb-4">COORDINATES: 34.0522° N, 118.2437° W</p>

         {/* Sector Controller */}
         <div className="flex items-center gap-3 bg-black/60 border border-gray-700 p-2 rounded-full mb-4 pr-4">
            <div className="relative">
               <img src={controller.avatar} className="w-8 h-8 rounded-full border border-yellow-500" />
               <Crown size={12} className="absolute -top-2 -right-1 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="text-left">
               <div className="text-[8px] text-yellow-500 uppercase font-bold tracking-wider">Sector Controller</div>
               <div className="text-xs text-white font-mono">{controller.name}</div>
            </div>
         </div>

         {/* Action */}
         {!isCheckedIn ? (
            <button 
               onClick={handleCheckIn}
               className="flex items-center gap-2 bg-[#39FF14] text-black px-4 py-2 font-bold text-xs font-mono hover:bg-white transition-colors clip-path-polygon"
            >
               <Target size={14} /> JACK_IN HERE
            </button>
         ) : (
            <div className="text-[#39FF14] text-xs font-mono flex items-center gap-2 bg-[#39FF14]/10 px-3 py-1 border border-[#39FF14]">
               <Navigation size={12} className="animate-spin" /> LINK ESTABLISHED
            </div>
         )}
      </div>

    </div>
  );
};

export default GeoNodeWidget;
