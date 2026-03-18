import React, { useState, useEffect, useRef } from 'react';
import { User, ProfileTheme } from '../types';
import GlitchButton from './GlitchButton';
import SocialHubWidget from './SocialHubWidget';
import LockedWidget from './LockedWidget';
import TopFriendsWidget from './TopFriendsWidget';
import MusicPlayerWidget from './MusicPlayerWidget';
import AssetGalleryWidget from './AssetGalleryWidget';
import DataLogWidget from './DataLogWidget';
import GeoNodeWidget from './GeoNodeWidget';
import CustomCodeWidget from './CustomCodeWidget';
import ProfileDesignModal from './ProfileDesignModal';
import { Copy, Wallet, Cpu, Edit, Save, PaintBucket, Layers, Crown, Eye, EyeOff, Sparkles, MessageSquare, UserPlus, Heart, Eye as EyeIcon, Zap, Music } from 'lucide-react';
import { generateBio } from '../services/aiService';

interface ProfileGridProps {
  user: User;
  onTip?: (address: string) => void;
}

// Sparkle cursor trail component
const SparkleTrail: React.FC = () => {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const sparkleId = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const colors = ['#FF00FF', '#39FF14', '#00FFFF', '#FFFF00', '#FF0080'];
      const newSparkle = {
        id: sparkleId.current++,
        x: e.clientX,
        y: e.clientY,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
      setSparkles(prev => [...prev.slice(-15), newSparkle]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute w-2 h-2 animate-ping"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            backgroundColor: sparkle.color,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'ping 0.6s ease-out forwards, fadeOut 0.6s ease-out forwards'
          }}
        />
      ))}
      <style>{`
        @keyframes fadeOut {
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Visitor Counter Component
const VisitorCounter: React.FC = () => {
  const [count, setCount] = useState(1337);
  
  useEffect(() => {
    setCount(Math.floor(Math.random() * 5000) + 1000);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-[#39FF14]">
      <EyeIcon size={12} />
      <span>VISITORS: {count.toLocaleString()}</span>
    </div>
  );
};

// Marquee Announcement Component
const MarqueeText: React.FC<{ text: string; user: User }> = ({ text, user }) => {
  return (
    <div className="w-full overflow-hidden bg-black/60 border-y border-[#39FF14]/30 py-1">
      <div className="whitespace-nowrap animate-[marquee_15s_linear_infinite] text-[11px] font-mono text-[#FF00FF]">
        <span className="mx-8">★ WELCOME TO {user.username.toUpperCase()}'S CYBER-PROFILE ★</span>
        <span className="mx-8">{text}</span>
        <span className="mx-8">★ ADD ME TO YOUR TOP FRIENDS ★</span>
        <span className="mx-8">{text}</span>
        <span className="mx-8">★ SEND ME A MESSAGE ★</span>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

// Mood/Status Component
const MoodStatus: React.FC = () => {
  const moods = [
    { emoji: '⚡', text: 'HACKING THE MAINFRAME' },
    { emoji: '💜', text: 'IN LOVE WITH THE MATRIX' },
    { emoji: '🔥', text: 'BURNING BRIGHT' },
    { emoji: '🌙', text: 'NIGHT OWL MODE' },
    { emoji: '💻', text: 'CODING...' },
    { emoji: '🎵', text: 'VIBING TO SYNTHWAVE' }
  ];
  const [mood] = useState(moods[Math.floor(Math.random() * moods.length)]);

  return (
    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-[#39FF14]/30">
      <span className="text-lg">{mood.emoji}</span>
      <span className="text-[10px] font-mono text-[#39FF14]">{mood.text}</span>
    </div>
  );
};

// Online Now Indicator
const OnlineNow: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-3 h-3 bg-[#39FF14] rounded-full animate-pulse" />
        <div className="absolute inset-0 w-3 h-3 bg-[#39FF14] rounded-full animate-ping opacity-50" />
      </div>
      <span className="text-[10px] font-mono text-[#39FF14]">ONLINE NOW</span>
    </div>
  );
};

// About Me Section
const AboutMeSection: React.FC<{ user: User; bio: string }> = ({ user, bio }) => {
  return (
    <div className="bg-black/60 backdrop-blur-md border-2 border-[#FF00FF] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-[#FF00FF] via-[#FF00FF]/50 to-[#FF00FF] flex items-center px-3">
        <span className="text-black text-[10px] font-bold font-mono">ABOUT_ME.txt</span>
      </div>
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="text-gray-500">NAME:</div>
          <div className="text-white">{user.username}</div>
          <div className="text-gray-500">FACTION:</div>
          <div className="text-[#39FF14]">{user.faction || 'UNAFFILIATED'}</div>
          <div className="text-gray-500">STATUS:</div>
          <div className="text-[#FF00FF]">ACTIVE NODE</div>
          <div className="text-gray-500">MEMBER SINCE:</div>
          <div className="text-white">2077.03.15</div>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-[11px] text-gray-300 leading-relaxed font-mono">{bio}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-[9px] px-2 py-1 bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 rounded">#Cyberpunk</span>
          <span className="text-[9px] px-2 py-1 bg-[#FF00FF]/20 text-[#FF00FF] border border-[#FF00FF]/30 rounded">#Matrix</span>
          <span className="text-[9px] px-2 py-1 bg-[#00FFFF]/20 text-[#00FFFF] border border-[#00FFFF]/30 rounded">#Hacker</span>
        </div>
      </div>
    </div>
  );
};

// Contact/Action Buttons
const ContactButtons: React.FC<{ onMessage?: () => void; onAddFriend?: () => void }> = ({ onMessage, onAddFriend }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button 
        onClick={onMessage}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-[#39FF14]/10 border-2 border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black transition-all group"
      >
        <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold font-mono">SEND_MSG</span>
      </button>
      <button 
        onClick={onAddFriend}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FF00FF]/10 border-2 border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-all group"
      >
        <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold font-mono">ADD_FRIEND</span>
      </button>
    </div>
  );
};

const ProfileGrid: React.FC<ProfileGridProps> = ({ user, onTip }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [localTheme, setLocalTheme] = useState<ProfileTheme>(user.theme || { 
    backgroundImage: '', 
    backgroundColor: '#0a0a0a',
    customCss: '',
    fontFamily: 'mono',
    accentColor: '#39FF14'
  });
  const [bio, setBio] = useState(user.bio);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [showSparkles, setShowSparkles] = useState(true);

  const toggleEdit = () => setIsEditing(!isEditing);

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    const newBio = await generateBio(user.username);
    setBio(newBio);
    setIsGeneratingBio(false);
  };

  const handlePurchaseKey = () => {
    if (onTip) {
        onTip(user.walletAddress);
        setTimeout(() => setIsVaultUnlocked(true), 5000);
    } else {
        alert("Wallet not connected");
    }
  };

  return (
    <div 
      className="w-full min-h-full flex flex-col items-center p-2 md:p-8 relative transition-all duration-500" 
      id="profile-root"
      style={{ backgroundColor: localTheme.backgroundColor }}
    >
      {/* Sparkle Trail Effect */}
      {showSparkles && <SparkleTrail />}
      
      {/* 1. FIXED BACKGROUND LAYER */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
          {!localTheme.backgroundImage && (
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: localTheme.backgroundColor || '#0a0a0a' }}
            />
          )}
          {localTheme.backgroundImage && (
             <div 
               className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
               style={{ backgroundImage: `url('${localTheme.backgroundImage}')` }}
             />
          )}
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] [background-size:32px_32px]" />
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] pointer-events-none" />
          <div className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${isHudVisible ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Dynamic CSS Injection */}
      <style>{`${localTheme.customCss || ''}`}</style>

      {/* Marquee Header */}
      <div className={`relative z-20 w-full max-w-5xl mb-4 transition-all duration-500 ${isHudVisible ? 'opacity-100' : 'opacity-0'}`}>
        <MarqueeText text="THANKS FOR VISITING MY PROFILE! DROP A COMMENT BELOW!" user={user} />
      </div>

      {/* Control Panel */}
      <div className={`
         sticky top-16 md:top-0 z-20 w-full max-w-5xl flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 
         border-2 border-[#39FF14]/50 pb-4 gap-4 bg-black/80 p-4 backdrop-blur-md transition-all duration-500
         ${isHudVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}
         shadow-[0_0_30px_rgba(57,255,20,0.2)]
      `}>
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#39FF14] tracking-widest uppercase flex items-center gap-2">
              <Zap size={20} className="animate-pulse" />
              Holo-Deck
              {isEditing && <Layers size={16} className="animate-bounce text-[#FF00FF]" />}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-gray-500 font-mono">
                STATUS: {isEditing ? <span className="text-[#FF00FF] animate-pulse">UNLOCKED</span> : 'SECURE'}
              </p>
              <VisitorCounter />
            </div>
          </div>
          <MoodStatus />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           <button 
             onClick={() => setShowSparkles(!showSparkles)} 
             className={`px-3 py-2 border transition-all ${showSparkles ? 'border-[#FF00FF] text-[#FF00FF]' : 'border-gray-700 text-gray-500'}`}
             title="Toggle Sparkles"
           >
             <Sparkles size={14} />
           </button>
           <button onClick={() => setIsHudVisible(false)} className="px-3 py-2 border border-gray-700 text-gray-400 hover:text-white bg-black/50" title="Hide Interface"><EyeOff size={14} /></button>
           <button onClick={() => onTip && onTip(user.walletAddress)} className="flex items-center gap-2 px-4 py-2 bg-[#FF00FF]/10 border border-[#FF00FF] text-[#FF00FF] text-xs font-bold hover:bg-[#FF00FF] hover:text-black transition-all"><Crown size={14} /> SUBSCRIBE</button>
           <button onClick={() => setIsDesignOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 text-xs font-bold hover:border-[#39FF14] hover:text-[#39FF14] transition-all bg-black/50"><PaintBucket size={14} /> DESIGN</button>
           <GlitchButton onClick={toggleEdit} variant={isEditing ? 'danger' : 'primary'} className="h-9 px-4">
             {isEditing ? <><Save size={14} /> SAVE</> : <><Edit size={14} /> EDIT</>}
           </GlitchButton>
        </div>
      </div>

      {/* Restore HUD Button */}
      {!isHudVisible && (
         <button onClick={() => setIsHudVisible(true)} className="fixed top-24 right-4 z-30 bg-black/60 backdrop-blur border-2 border-[#39FF14] text-[#39FF14] p-3 rounded-full shadow-[0_0_20px_#39FF14] animate-bounce"><Eye size={24} /></button>
      )}

      {/* Main Profile Container */}
      <div className={`
        relative z-10 w-full max-w-5xl transition-all duration-700
        ${isEditing ? 'shadow-[0_0_30px_rgba(57,255,20,0.1)] border-dashed border-2 border-[#39FF14]/40 rounded-lg p-2 md:p-4' : ''}
        ${isHudVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        
        {/* MySpace-Style Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          
          {/* LEFT COLUMN - Profile Info */}
          <div className="space-y-4">
            {/* Profile Picture Card */}
            <div className="bg-black/80 backdrop-blur-md border-2 border-[#39FF14] p-4 relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#39FF14] text-black text-[10px] font-bold px-4 py-1 font-mono">
                {user.username}
              </div>
              
              <div className="relative mt-4">
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  className="w-full aspect-square object-cover border-2 border-[#39FF14] grayscale group-hover:grayscale-0 transition-all duration-300" 
                />
                <div className="absolute inset-0 border-2 border-[#39FF14] animate-ping opacity-20" />
                
                {/* Decorative corners */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#FF00FF]" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#FF00FF]" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#FF00FF]" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#FF00FF]" />
              </div>
              
              <div className="mt-4 text-center">
                <OnlineNow />
              </div>
              
              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/50 p-2 border border-gray-800">
                  <div className="text-[#FF00FF] text-lg font-bold">247</div>
                  <div className="text-[8px] text-gray-500 font-mono">FRIENDS</div>
                </div>
                <div className="bg-black/50 p-2 border border-gray-800">
                  <div className="text-[#39FF14] text-lg font-bold">1.2K</div>
                  <div className="text-[8px] text-gray-500 font-mono">FOLLOWERS</div>
                </div>
                <div className="bg-black/50 p-2 border border-gray-800">
                  <div className="text-[#00FFFF] text-lg font-bold">89</div>
                  <div className="text-[8px] text-gray-500 font-mono">POSTS</div>
                </div>
              </div>
            </div>

            {/* Contact Buttons */}
            <ContactButtons />

            {/* Music Player */}
            <div className="h-48">
              <MusicPlayerWidget />
            </div>

            {/* Mini Widgets */}
            <div className="h-48">
              <GeoNodeWidget />
            </div>
          </div>

          {/* RIGHT COLUMN - Main Content */}
          <div className="space-y-4">
            {/* About Me Section */}
            <AboutMeSection user={user} bio={bio} />

            {/* AI Bio Generator */}
            <div className="flex justify-end">
              <button 
                onClick={handleGenerateBio}
                disabled={isGeneratingBio}
                className="flex items-center gap-2 text-[10px] text-[#39FF14] hover:text-white transition-colors border border-[#39FF14]/30 px-3 py-2 rounded hover:bg-[#39FF14]/10"
              >
                <Sparkles size={12} className={isGeneratingBio ? 'animate-spin' : ''} />
                {isGeneratingBio ? 'GENERATING...' : 'GENERATE AI BIO'}
              </button>
            </div>

            {/* Top Friends - Full Width */}
            <div className="h-72">
              <TopFriendsWidget />
            </div>

            {/* Widget Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64"><AssetGalleryWidget /></div>
              <div className="h-64"><DataLogWidget /></div>
            </div>

            {/* Custom Code */}
            <div className="h-48">
              <CustomCodeWidget />
            </div>

            {/* Crypto-Vault */}
            <div className="h-48 group">
               <div className="w-full h-full bg-black/80 backdrop-blur-md border-2 border-[#39FF14] p-4 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 bg-[#39FF14] text-black text-[9px] font-bold px-2 py-0.5 flex items-center gap-1"><Wallet size={10} /> CRYPTO_VAULT</div>
                  <div className="mt-2 flex flex-col gap-1">
                     <span className="text-[10px] text-gray-500 uppercase">ETH Address</span>
                     <div className="flex items-center gap-2 bg-black border border-gray-800 p-2 font-mono text-[10px] text-[#39FF14]"><span className="truncate">{user.walletAddress}</span><button className="hover:text-white transition-colors"><Copy size={10} /></button></div>
                  </div>
                  {user.btcAddress && (
                    <div className="mt-1 flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase">BTC Address</span>
                      <div className="flex items-center gap-2 bg-black border border-gray-800 p-2 font-mono text-[10px] text-orange-500"><span className="truncate">{user.btcAddress}</span><button className="hover:text-white transition-colors"><Copy size={10} /></button></div>
                    </div>
                  )}
               </div>
            </div>

            {/* Locked Content & Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64">
                 <LockedWidget price="0.05 ETH" contentType="BLUEPRINTS" isUnlocked={isVaultUnlocked} onPurchase={handlePurchaseKey}>
                    <div className="w-full h-full bg-black relative">
                      <img src="https://picsum.photos/seed/secret/800/800" className="w-full h-full object-cover opacity-80" alt="Secret" />
                      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4"><h3 className="text-[#39FF14] font-bold">UNLOCKED: PROTOTYPE_BLUEPRINTS</h3></div>
                    </div>
                 </LockedWidget>
              </div>
              <div className="h-64"><SocialHubWidget /></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className={`mt-8 text-center transition-opacity ${isHudVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-[9px] text-gray-600 font-mono bg-black/50 px-4 py-2 rounded">
          CYBERDOPE_PROFILE_V3.0 // MYSPACE_PROTOCOL_ENABLED // SYSTEM_STABLE
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1"><Heart size={10} className="text-[#FF00FF]" /> Made with love in the Matrix</span>
          <span>|</span>
          <span className="flex items-center gap-1"><Music size={10} className="text-[#39FF14]" /> Now Playing: Cyberpunk Dreams</span>
        </div>
      </div>

      <ProfileDesignModal 
        isOpen={isDesignOpen} 
        onClose={() => setIsDesignOpen(false)} 
        currentTheme={localTheme} 
        onSave={setLocalTheme} 
      />
    </div>
  );
};

export default ProfileGrid;
