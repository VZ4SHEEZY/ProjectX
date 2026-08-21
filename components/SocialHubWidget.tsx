
import React from 'react';
import { Instagram, Twitter, Youtube, Music, ExternalLink, Globe, X as XIcon, Gamepad2, Video, FileText, Share2 } from 'lucide-react';
import GlitchButton from './GlitchButton';

const SOCIAL_LINKS = [
  { id: 's1', platform: 'instagram', username: '@NeonGhost_Official', url: '#', icon: Instagram, color: 'text-pink-500' },
  { id: 's2', platform: 'x', username: '@NetRunner_01', url: '#', icon: XIcon, color: 'text-white' },
  { id: 's3', platform: 'tiktok', username: '@Cyber_Vibes', url: '#', icon: Video, color: 'text-cyan-400' },
  { id: 's4', platform: 'discord', username: 'CyberDope Community', url: '#', icon: Gamepad2, color: 'text-indigo-400' },
  { id: 's5', platform: 'substack', username: 'The Glitch Manifesto', url: '#', icon: FileText, color: 'text-orange-500' },
];

const SocialHubWidget: React.FC = () => {
  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-md border border-[#39FF14]/50 flex flex-col overflow-hidden relative group">
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#39FF14]/30 bg-[#39FF14]/10">
        <div className="flex items-center gap-2 text-[#39FF14]">
           <Share2 size={14} />
           <span className="font-mono font-bold text-[10px] tracking-widest uppercase">NEXUS_HUB // COMMS</span>
        </div>
        <div className="flex gap-1">
           <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
           <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse delay-75" />
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {SOCIAL_LINKS.map((link) => (
          <a 
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 border border-gray-800 bg-black/40 hover:border-[#39FF14] hover:bg-[#39FF14]/10 transition-all group/item"
          >
             <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-sm border border-gray-700 bg-black ${link.color} group-hover/item:text-[#39FF14] transition-colors`}>
                   <link.icon size={16} />
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{link.platform}</span>
                   <span className="text-xs text-white font-bold">{link.username}</span>
                </div>
             </div>
             
             <ExternalLink size={12} className="text-gray-600 group-hover/item:text-[#39FF14] -translate-x-2 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
          </a>
        ))}
      </div>
      
      {/* Decorative Bottom */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#39FF14]/50 to-transparent" />
    </div>
  );
};

export default SocialHubWidget;
