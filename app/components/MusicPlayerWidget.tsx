
import React from 'react';
import { Music, Disc, Volume2 } from 'lucide-react';

interface MusicPlayerWidgetProps {
  spotifyUrl?: string;
}

const MusicPlayerWidget: React.FC<MusicPlayerWidgetProps> = ({ 
  spotifyUrl = "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT" 
}) => {
  
  return (
    <div className="w-full h-full bg-[#1a1a1a] border-2 border-gray-600 flex flex-col overflow-hidden relative shadow-inner shadow-black">
      
      {/* Decorative Bolts */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-gray-400 border border-gray-800 shadow-[1px_1px_2px_black]" />
      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gray-400 border border-gray-800 shadow-[1px_1px_2px_black]" />
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-gray-400 border border-gray-800 shadow-[1px_1px_2px_black]" />
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-gray-400 border border-gray-800 shadow-[1px_1px_2px_black]" />

      {/* Header Marquee */}
      <div className="h-6 bg-black border-b border-gray-700 flex items-center overflow-hidden relative">
        <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 w-8 h-full bg-gradient-to-l from-black to-transparent z-10" />
        
        <div className="whitespace-nowrap animate-[marquee_10s_linear_infinite] text-[9px] font-mono text-[#39FF14] flex items-center gap-4 px-4">
           <span>AURAL TRANSMISSION // NOW PLAYING</span>
           <span>///</span>
           <span>NEURAL SYNC ESTABLISHED</span>
           <span>///</span>
           <span>VOLUME: 100%</span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative bg-black">
         {/* Embed Layer */}
         <div className="absolute inset-0 z-10 mix-blend-screen opacity-90" style={{ filter: 'hue-rotate(90deg) contrast(1.2)' }}>
            <iframe 
              src={`${spotifyUrl}?theme=0`} 
              width="100%" 
              height="100%" 
              allow="encrypted-media"
              className="border-none"
              title="Spotify Embed"
            />
         </div>

         {/* Visualizer Layer (Fake overlay at bottom) */}
         <div className="absolute bottom-0 left-0 w-full h-12 flex items-end justify-center gap-0.5 px-2 z-20 pointer-events-none opacity-50 mix-blend-screen">
             {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-full bg-[#39FF14]"
                  style={{ 
                    height: '20%',
                    animation: `bounce ${0.5 + Math.random()}s ease-in-out infinite alternate`,
                    animationDelay: `-${Math.random()}s`
                  }} 
                />
             ))}
         </div>
         <style>{`
           @keyframes bounce {
             0% { height: 10%; opacity: 0.3; }
             100% { height: 80%; opacity: 0.8; }
           }
         `}</style>
      </div>

      {/* Control Bar (Aesthetic Only) */}
      <div className="h-6 bg-[#2a2a2a] border-t border-gray-600 flex items-center justify-between px-3">
         <div className="flex items-center gap-2 text-gray-500">
            <Disc size={12} className="animate-[spin_3s_linear_infinite]" />
            <span className="text-[8px] font-mono tracking-wider">SONIC_DECK_V4</span>
         </div>
         <div className="flex gap-1">
             <div className="w-1 h-3 bg-red-500 rounded-[1px]" />
             <div className="w-1 h-3 bg-yellow-500 rounded-[1px]" />
             <div className="w-1 h-3 bg-green-500 rounded-[1px]" />
         </div>
      </div>

    </div>
  );
};

export default MusicPlayerWidget;
