
import React, { useState, useEffect } from 'react';
import { Shield, Zap, Skull, Ghost, Terminal } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface FactionRevealProps {
  onComplete: (faction: string) => void;
}

type FactionType = 'NETRUNNER' | 'CORPORATE' | 'NOMAD' | 'PHANTOM';

interface FactionData {
  id: FactionType;
  color: string;
  icon: React.ReactNode;
  tagline: string;
  desc: string;
}

const FACTIONS: Record<FactionType, FactionData> = {
  NETRUNNER: {
    id: 'NETRUNNER',
    color: '#39FF14',
    icon: <Terminal size={64} />,
    tagline: 'INFORMATION IS POWER',
    desc: 'You live in the code. No encryption is safe. No wall is high enough.'
  },
  CORPORATE: {
    id: 'CORPORATE',
    color: '#3B82F6',
    icon: <Shield size={64} />,
    tagline: 'ORDER. WEALTH. CONTROL.',
    desc: 'You own the skyline. The system works because you built it.'
  },
  NOMAD: {
    id: 'NOMAD',
    color: '#EF4444',
    icon: <Zap size={64} />,
    tagline: 'FREEDOM OR DEATH',
    desc: 'The wastelands are your home. Ride fast, live loud, die young.'
  },
  PHANTOM: {
    id: 'PHANTOM',
    color: '#A855F7',
    icon: <Ghost size={64} />,
    tagline: 'UNSEEN. UNKNOWN.',
    desc: 'A ghost in the machine. You exist only in the shadows of the data stream.'
  }
};

const FactionReveal: React.FC<FactionRevealProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'flash' | 'blackout' | 'analyzing' | 'reveal'>('flash');
  const [faction, setFaction] = useState<FactionData>(FACTIONS.NETRUNNER);
  const [text, setText] = useState('');

  useEffect(() => {
    // 1. Randomize Faction
    const keys = Object.keys(FACTIONS) as FactionType[];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setFaction(FACTIONS[randomKey]);

    // 2. Flash Sequence
    const timer1 = setTimeout(() => setStage('blackout'), 200);
    
    // 3. Analyzing Text
    const timer2 = setTimeout(() => {
        setStage('analyzing');
        typewriterEffect("CALCULATING PSYCHO-METRICS...", 50);
    }, 1000);

    // 4. Reveal
    const timer3 = setTimeout(() => {
        setStage('reveal');
    }, 3500);

    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
    };
  }, []);

  const typewriterEffect = (str: string, speed: number) => {
      let i = 0;
      setText('');
      const interval = setInterval(() => {
          setText(prev => prev + str.charAt(i));
          i++;
          if (i >= str.length) clearInterval(interval);
      }, speed);
  };

  // STAGE 1: FLASHBANG
  if (stage === 'flash') {
    return <div className="fixed inset-0 z-[200] bg-white animate-pulse" />;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-mono">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] z-10" />
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: `linear-gradient(${faction.color}22 1px, transparent 1px), linear-gradient(90deg, ${faction.color}22 1px, transparent 1px)`,
               backgroundSize: '50px 50px'
             }} 
        />

        {/* STAGE 2 & 3: ANALYZING */}
        {(stage === 'blackout' || stage === 'analyzing') && (
            <div className="z-20 text-center">
                <div className="text-[#39FF14] text-xl font-bold tracking-widest animate-pulse mb-4">
                    {text}<span className="animate-blink">_</span>
                </div>
                {stage === 'analyzing' && (
                    <div className="w-64 h-2 bg-gray-900 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-[#39FF14] animate-[width_2s_ease-in-out_forwards]" style={{ width: '0%' }} />
                    </div>
                )}
            </div>
        )}

        {/* STAGE 4: THE DROP */}
        {stage === 'reveal' && (
            <div className="z-30 flex flex-col items-center text-center p-6 animate-in zoom-in-50 duration-500 ease-out">
                
                {/* Logo */}
                <div 
                    className="mb-8 relative"
                    style={{ color: faction.color }}
                >
                    <div className="absolute inset-0 blur-2xl opacity-50 animate-pulse" style={{ backgroundColor: faction.color }} />
                    <div className="relative z-10 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] transform hover:scale-110 transition-transform duration-500">
                        {faction.icon}
                    </div>
                </div>

                {/* Identity */}
                <h3 className="text-sm text-gray-500 tracking-[0.5em] mb-2 uppercase">Identity Assigned</h3>
                <h1 
                    className="text-5xl md:text-7xl font-bold mb-4 glitch-text tracking-tighter mix-blend-screen" 
                    data-text={faction.id}
                    style={{ color: faction.color, textShadow: `0 0 30px ${faction.color}` }}
                >
                    {faction.id}
                </h1>

                {/* Tagline */}
                <p className="text-white text-lg font-bold tracking-widest mb-2 border-y py-2 border-white/20">
                    {faction.tagline}
                </p>
                <p className="text-gray-400 text-xs max-w-md mb-12 font-mono">
                    {faction.desc}
                </p>

                {/* Enter Button */}
                <GlitchButton onClick={() => onComplete(faction.id)} className="h-16 text-xl px-12" style={{ borderColor: faction.color, color: faction.color }}>
                    ENTER NIGHT CITY
                </GlitchButton>

            </div>
        )}

    </div>
  );
};

export default FactionReveal;
