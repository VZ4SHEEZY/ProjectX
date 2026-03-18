import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert, Binary } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface LockedWidgetProps {
  isUnlocked: boolean;
  price: string;
  contentType: string;
  children: React.ReactNode;
  onPurchase?: () => void;
}

const LockedWidget: React.FC<LockedWidgetProps> = ({ isUnlocked, price, contentType, children, onPurchase }) => {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isUnlocked]);

  const handleUnlock = () => {
    if (onPurchase) {
      onPurchase();
    } else {
      alert("Opening Wallet Connection...");
    }
  };

  // UNLOCKED STATE
  if (isUnlocked) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        {showFlash && (
          <div className="absolute inset-0 z-50 bg-[#39FF14] mix-blend-color-dodge opacity-50 pointer-events-none animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_1]" />
        )}
        {children}
      </div>
    );
  }

  // LOCKED STATE
  return (
    <div className="relative w-full h-full min-h-[200px] bg-black border-2 border-red-900/60 overflow-hidden group hover:border-red-600 transition-colors duration-500">
      
      {/* Background Noise/Texture */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#2a0000_0%,_#000000_100%)] opacity-60" />
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ff0000 0, #ff0000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} 
      />
      
      {/* Heavy Blur Overlay */}
      <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/40" />

      {/* Security Interface */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-6 text-center">
        
        {/* Animated Icon Cluster */}
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse" />
           {/* Spinning Lock */}
           <div className="relative">
             <div className="absolute inset-0 border-2 border-red-600/30 rounded-full animate-[spin_4s_linear_infinite]" />
             <div className="absolute inset-[-4px] border border-red-600/20 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
             <Lock className="w-10 h-10 text-red-500 relative z-10 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
           </div>
           
           <ShieldAlert className="absolute -top-3 -right-3 text-red-400 w-5 h-5 animate-bounce" />
        </div>

        {/* Text Details */}
        <h3 className="text-red-500 font-bold tracking-[0.2em] text-lg mb-1 drop-shadow-sm glitch-text" data-text="ENCRYPTED">
          ENCRYPTED DATA
        </h3>
        
        <div className="flex items-center gap-2 text-[10px] text-red-400/80 font-mono mb-6 border-y border-red-900/50 py-1.5 px-4 uppercase tracking-widest bg-red-950/20">
           <Binary size={10} />
           TIER 1 ACCESS REQUIRED // {contentType}
        </div>

        {/* Action Button */}
        <GlitchButton variant="danger" onClick={handleUnlock} className="text-xs py-3 px-6 group/btn">
           <div className="flex items-center gap-2">
             <Unlock size={14} className="group-hover/btn:animate-pulse" />
             <span>UNLOCK - {price}</span>
           </div>
        </GlitchButton>

      </div>

      {/* Decorative Corner Borders */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-red-600/50" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-red-600/50" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-red-600/50" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-red-600/50" />

    </div>
  );
};

export default LockedWidget;