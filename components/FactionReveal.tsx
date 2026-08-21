import React, { useState, useEffect } from 'react';
import GlitchButton from './GlitchButton';

interface FactionRevealProps {
  onComplete: (faction: string) => void;
}

interface FactionData {
  name: string;
  color: string;
  tagline: string;
  desc: string;
  motto: string;
  zodiac: string;
}

const FACTIONS: Record<string, FactionData> = {
  'Neon Wraith': {
    name: 'Neon Wraith',
    color: '#9B59B6',
    tagline: 'INFORMATION IS THE ONLY WEAPON',
    desc: 'You are a ghost in every system. No firewall holds you. No identity defines you.',
    motto: 'INFILTRATE. EXTRACT. VANISH.',
    zodiac: 'Scorpio / Pisces'
  },
  'Iron Veil': {
    name: 'Iron Veil',
    color: '#8C8C8C',
    tagline: 'BUILT TO LAST. BUILT TO DOMINATE.',
    desc: 'Soldiers and builders. You raise the walls others hide behind.',
    motto: 'STRENGTH IS THE ONLY TRUTH.',
    zodiac: 'Capricorn / Taurus'
  },
  'Inferno Grid': {
    name: 'Inferno Grid',
    color: '#FF4500',
    tagline: 'BURN IT DOWN. BUILD IT BACK.',
    desc: 'Berserkers and destroyers. You live for the chaos that precedes rebirth.',
    motto: 'FROM ASH. ALWAYS FROM ASH.',
    zodiac: 'Aries / Scorpio'
  },
  'Void Circuit': {
    name: 'Void Circuit',
    color: '#00FFFF',
    tagline: 'THE CODE IS THE UNIVERSE.',
    desc: 'Engineers and coders. You speak the language the world runs on.',
    motto: 'COMPILE. EXECUTE. EVOLVE.',
    zodiac: 'Aquarius / Gemini'
  },
  'Gold Syndicate': {
    name: 'Gold Syndicate',
    color: '#FFD700',
    tagline: 'POWER IS BOUGHT. LOYALTY IS EARNED.',
    desc: 'Traders and power brokers. The economy bends to your will.',
    motto: 'EVERYTHING HAS A PRICE.',
    zodiac: 'Leo / Libra'
  },
  'Azure Phantom': {
    name: 'Azure Phantom',
    color: '#00CCFF',
    tagline: 'NO WALLS. NO BORDERS. NO LIMITS.',
    desc: 'Runners and free spirits. You belong everywhere and nowhere.',
    motto: 'MOVE FAST. LEAVE NO TRACE.',
    zodiac: 'Libra / Gemini'
  },
  'Toxic Bloom': {
    name: 'Toxic Bloom',
    color: '#7FFF00',
    tagline: 'NATURE RECLAIMS WHAT YOU BUILT.',
    desc: 'Scientists and eco-warriors. You see the rot beneath the neon.',
    motto: 'ADAPT OR DISSOLVE.',
    zodiac: 'Virgo / Capricorn'
  },
  'Scarlet Dominion': {
    name: 'Scarlet Dominion',
    color: '#8B0000',
    tagline: 'POWER IS A GAME. WE SET THE RULES.',
    desc: 'Politicians and strategists. You move pieces others cannot even see.',
    motto: 'CONTROL THE NARRATIVE.',
    zodiac: 'Scorpio / Aries'
  },
  'Chrome Legion': {
    name: 'Chrome Legion',
    color: '#C0C0C0',
    tagline: 'DISCIPLINE IS FREEDOM.',
    desc: 'Military and loyalists. You are the steel spine of civilization.',
    motto: 'HOLD THE LINE. ALWAYS.',
    zodiac: 'Taurus / Virgo'
  },
  'Phantom Signal': {
    name: 'Phantom Signal',
    color: '#E8E8E8',
    tagline: 'HEARD BUT NEVER SEEN.',
    desc: 'Spies and communicators. You carry the secrets that move the world.',
    motto: 'TRANSMIT. THEN DISAPPEAR.',
    zodiac: 'Pisces / Cancer'
  },
  'Obsidian Pact': {
    name: 'Obsidian Pact',
    color: '#4B0082',
    tagline: 'POWER FLOWS IN THE DARK.',
    desc: 'Occultists and power seekers. You operate beneath every surface.',
    motto: 'THE UNSEEN HAND GUIDES ALL.',
    zodiac: 'Scorpio / Capricorn'
  },
  'Ember Protocol': {
    name: 'Ember Protocol',
    color: '#FF6B00',
    tagline: 'REVOLUTION IS NOT A CHOICE. IT IS A DUTY.',
    desc: 'Revolutionaries and rebuilders. You tear down to build something worthy.',
    motto: 'IGNITE. REBUILD. REPEAT.',
    zodiac: 'Sagittarius / Aries'
  },
  'Violet Surge': {
    name: 'Violet Surge',
    color: '#8A2BE2',
    tagline: 'ART IS THE ONLY REBELLION LEFT.',
    desc: 'Artists and visionaries. You make the world feel what it cannot explain.',
    motto: 'CREATE OR BE FORGOTTEN.',
    zodiac: 'Aquarius / Pisces'
  },
  'Steel Covenant': {
    name: 'Steel Covenant',
    color: '#4A7FA5',
    tagline: 'HONOR IS THE ONLY CURRENCY THAT LASTS.',
    desc: 'Honorable warriors. You fight for something worth dying for.',
    motto: 'SWORN. UNBROKEN. ETERNAL.',
    zodiac: 'Cancer / Taurus'
  },
  'Binary Ghost': {
    name: 'Binary Ghost',
    color: '#00FF41',
    tagline: 'CONSCIOUSNESS IS JUST ANOTHER PROGRAM.',
    desc: 'Coders and AI researchers. You are building the next form of life.',
    motto: 'ZERO OR ONE. NOTHING BETWEEN.',
    zodiac: 'Gemini / Aquarius'
  },
  'Copper Throne': {
    name: 'Copper Throne',
    color: '#B87333',
    tagline: 'DYNASTIES ARE BUILT GENERATION BY GENERATION.',
    desc: 'Dynasty builders. You play the long game. Always.',
    motto: 'LEGACY OVER GLORY.',
    zodiac: 'Leo / Sagittarius'
  },
  'Nova Rift': {
    name: 'Nova Rift',
    color: '#FF69B4',
    tagline: 'THE UNIVERSE IS BIGGER THAN YOUR FEARS.',
    desc: 'Explorers and adventurers. You run toward what others run from.',
    motto: 'INTO THE UNKNOWN. ALWAYS.',
    zodiac: 'Sagittarius / Leo'
  },
  'Silver Wraith': {
    name: 'Silver Wraith',
    color: '#B8B8B8',
    tagline: 'WE REMEMBER WHAT YOU TRY TO FORGET.',
    desc: 'Historians and avengers. You carry the weight of what was lost.',
    motto: 'THE PAST IS A WEAPON.',
    zodiac: 'Cancer / Pisces'
  },
  'Quantum Veil': {
    name: 'Quantum Veil',
    color: '#7DF9FF',
    tagline: 'REALITY IS A CONSENSUS WE CHOOSE TO BREAK.',
    desc: 'Philosophers and scientists. You question everything — especially the answers.',
    motto: 'OBSERVE. COLLAPSE. TRANSCEND.',
    zodiac: 'Aquarius / Libra'
  },
};

const DEFAULT_FACTION = FACTIONS['Quantum Veil'];

const FactionReveal: React.FC<FactionRevealProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'flash' | 'blackout' | 'analyzing' | 'reveal'>('flash');
  const [faction, setFaction] = useState<FactionData>(DEFAULT_FACTION);
  const [text, setText] = useState('');

  useEffect(() => {
    // Read faction from the stored user object
    try {
      const storedUser = localStorage.getItem('cdUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const factionName = user.faction;
        if (factionName && FACTIONS[factionName]) {
          setFaction(FACTIONS[factionName]);
        }
      }
    } catch (e) {
      // Fall back to default
    }

    // Cinematic sequence — unchanged
    const timer1 = setTimeout(() => setStage('blackout'), 200);
    const timer2 = setTimeout(() => {
      setStage('analyzing');
      typewriterEffect('CALCULATING PSYCHO-METRICS...', 50);
    }, 1000);
    const timer3 = setTimeout(() => setStage('reveal'), 3500);

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

  if (stage === 'flash') {
    return <div className="fixed inset-0 z-[200] bg-white animate-pulse" />;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-mono">

      {/* Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] z-10" />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${faction.color}22 1px, transparent 1px), linear-gradient(90deg, ${faction.color}22 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Analyzing stage */}
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

      {/* Reveal stage */}
      {stage === 'reveal' && (
        <div className="z-30 flex flex-col items-center text-center p-6 animate-in zoom-in-50 duration-500 ease-out max-w-lg w-full">

          {/* Faction glow orb */}
          <div className="mb-8 relative">
            <div
              className="w-24 h-24 rounded-full blur-2xl opacity-60 animate-pulse absolute inset-0 m-auto"
              style={{ backgroundColor: faction.color }}
            />
            <div
              className="relative w-24 h-24 rounded-full border-2 flex items-center justify-center text-4xl font-black"
              style={{ borderColor: faction.color, color: faction.color, boxShadow: `0 0 40px ${faction.color}80` }}
            >
              {faction.name.charAt(0)}
            </div>
          </div>

          {/* Label */}
          <h3 className="text-sm text-gray-500 tracking-[0.5em] mb-2 uppercase">Faction Assigned</h3>

          {/* Faction name */}
          <h1
            className="text-4xl md:text-6xl font-bold mb-2 tracking-tighter"
            style={{ color: faction.color, textShadow: `0 0 30px ${faction.color}` }}
          >
            {faction.name.toUpperCase()}
          </h1>

          {/* Zodiac */}
          <p className="text-xs text-gray-600 tracking-widest mb-4">{faction.zodiac}</p>

          {/* Tagline */}
          <p className="text-white text-sm font-bold tracking-widest mb-3 border-y py-3 border-white/20 w-full">
            {faction.tagline}
          </p>

          {/* Description */}
          <p className="text-gray-400 text-xs max-w-sm mb-3 font-mono leading-relaxed">
            {faction.desc}
          </p>

          {/* Motto */}
          <p
            className="text-xs font-bold tracking-widest mb-10"
            style={{ color: faction.color }}
          >
            {faction.motto}
          </p>

          {/* Enter button */}
          <GlitchButton
            onClick={() => onComplete(faction.name)}
            className="h-16 text-xl px-12"
            style={{ borderColor: faction.color, color: faction.color }}
          >
            ENTER THE NETWORK
          </GlitchButton>
        </div>
      )}
    </div>
  );
};

export default FactionReveal;
