import React from 'react';
import { Instagram, Twitter, Youtube, Music, ExternalLink, Globe, X as XIcon, Gamepad2, Video, FileText } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface SocialWidgetProps {
  platform: 'instagram' | 'twitter' | 'x' | 'youtube' | 'soundcloud' | 'tiktok' | 'discord' | 'substack' | 'generic';
  url: string;
  username: string;
}

const SocialWidget: React.FC<SocialWidgetProps> = ({ platform, url, username }) => {
  
  // 1. Icon Mapping
  const getIcon = (size: number = 24) => {
    switch (platform) {
      case 'instagram': return <Instagram size={size} />;
      case 'twitter': return <Twitter size={size} />;
      case 'x': return <XIcon size={size} />;
      case 'youtube': return <Youtube size={size} />;
      case 'soundcloud': return <Music size={size} />;
      case 'tiktok': return <Video size={size} />;
      case 'discord': return <Gamepad2 size={size} />;
      case 'substack': return <FileText size={size} />;
      default: return <Globe size={size} />;
    }
  };

  // 2. Visual Theme Mapping
  const getTheme = () => {
    switch (platform) {
      case 'instagram': 
        return {
            bg: 'bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-orange-900/80',
            border: 'border-pink-500',
            text: 'text-pink-400',
            glow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]'
        };
      case 'twitter': 
        return {
            bg: 'bg-[#1DA1F2]/20',
            border: 'border-[#1DA1F2]',
            text: 'text-[#1DA1F2]',
            glow: 'group-hover:shadow-[0_0_20px_rgba(29,161,242,0.4)]'
        };
      case 'x': 
        return {
            bg: 'bg-black',
            border: 'border-gray-500',
            text: 'text-white',
            glow: 'group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
        };
      case 'tiktok': 
        return {
            bg: 'bg-gradient-to-br from-[#00f2ea]/20 to-[#ff0050]/20',
            border: 'border-[#00f2ea]',
            text: 'text-white',
            glow: 'group-hover:shadow-[0_0_20px_rgba(0,242,234,0.4)]'
        };
      case 'discord':
         return {
            bg: 'bg-[#5865F2]/20',
            border: 'border-[#5865F2]',
            text: 'text-[#5865F2]',
            glow: 'group-hover:shadow-[0_0_20px_rgba(88,101,242,0.4)]'
         };
      case 'substack':
          return {
             bg: 'bg-[#FF6719]/20',
             border: 'border-[#FF6719]',
             text: 'text-[#FF6719]',
             glow: 'group-hover:shadow-[0_0_20px_rgba(255,103,25,0.4)]'
          };
      case 'youtube': 
        return {
            bg: 'bg-gradient-to-br from-red-900/80 to-black',
            border: 'border-red-600',
            text: 'text-red-500',
            glow: 'group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]'
        };
      case 'soundcloud': 
        return {
            bg: 'bg-gradient-to-br from-orange-900/80 to-black',
            border: 'border-orange-500',
            text: 'text-orange-500',
            glow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]'
        };
      default: 
        return {
            bg: 'bg-gray-900',
            border: 'border-[#39FF14]',
            text: 'text-[#39FF14]',
            glow: 'group-hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]'
        };
    }
  };

  const theme = getTheme();

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`
        relative w-full h-full block overflow-hidden border ${theme.border} ${theme.bg} ${theme.glow}
        transition-all duration-300 group
      `}
    >
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        {/* Center Icon (Default State) */}
        <div className={`
            absolute inset-0 flex items-center justify-center 
            transition-all duration-300 transform 
            group-hover:scale-150 group-hover:opacity-20 group-hover:blur-sm
            ${theme.text}
        `}>
            {getIcon(48)}
        </div>

        {/* Hover Content (Revealed on interaction) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 p-4 bg-black/40 backdrop-blur-sm">
            <div className={`mb-2 animate-bounce ${theme.text}`}>
                {getIcon(24)}
            </div>
            <h3 className="text-white font-bold tracking-wider text-sm mb-1 shadow-black drop-shadow-md">
                @{username}
            </h3>
            <div className={`text-[9px] font-mono uppercase tracking-widest mb-4 text-gray-300`}>
                {platform}
            </div>
            
            <GlitchButton variant="ghost" className="text-xs h-8 py-0 px-4 border-white text-white hover:bg-white hover:text-black">
                <ExternalLink size={12} /> CONNECT
            </GlitchButton>
        </div>

        {/* Decorative Corners */}
        <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${theme.border}`}></div>
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${theme.border}`}></div>
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${theme.border}`}></div>
        <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${theme.border}`}></div>

    </a>
  );
};

export default SocialWidget;