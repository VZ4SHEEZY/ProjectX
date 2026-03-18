
import React, { useState } from 'react';
import { User, MessageSquare, UserMinus, Plus, Shield, Crown, Star, Heart, Zap } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  rank: number;
  status: 'online' | 'offline' | 'busy';
  role: string;
  quote?: string;
}

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Frankie_The_Lion', avatar: 'https://picsum.photos/seed/lion/200', rank: 1, status: 'online', role: 'Prime Node', quote: 'Hacking the mainframe since 2077' },
  { id: 'f2', name: 'Trinity_V2', avatar: 'https://picsum.photos/seed/trin/200', rank: 2, status: 'busy', role: 'Netrunner', quote: 'Follow the white rabbit' },
  { id: 'f3', name: 'Morpheus_X', avatar: 'https://picsum.photos/seed/morph/200', rank: 3, status: 'offline', role: 'Mentor', quote: 'Free your mind' },
  { id: 'f4', name: 'Switch_Blade', avatar: 'https://picsum.photos/seed/switch/200', rank: 4, status: 'online', role: 'Enforcer', quote: 'Not like this' },
  { id: 'f5', name: 'Dozer', avatar: 'https://picsum.photos/seed/dozer/200', rank: 5, status: 'offline', role: 'Tank', quote: 'Believer in the One' },
  { id: 'f6', name: 'Apoc', avatar: 'https://picsum.photos/seed/apoc/200', rank: 6, status: 'online', role: 'Operator', quote: 'Call for backup' },
  { id: 'f7', name: 'Mouse', avatar: 'https://picsum.photos/seed/mouse/200', rank: 7, status: 'busy', role: 'Programmer', quote: 'Digital pimp hard at work' },
  { id: 'f8', name: 'Cypher', avatar: 'https://picsum.photos/seed/cypher/200', rank: 8, status: 'offline', role: 'Traitor', quote: 'Ignorance is bliss' },
];

const TopFriendsWidget: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS.slice(0, 8));
  const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-[#39FF14]';
      case 'busy': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={14} className="text-yellow-500" />;
      case 2: return <Star size={14} className="text-gray-300" />;
      case 3: return <Star size={14} className="text-orange-400" />;
      default: return <Zap size={12} className="text-[#39FF14]" />;
    }
  };

  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-md border-2 border-[#FF00FF] flex flex-col overflow-hidden relative group/widget">
      
      {/* Header - MySpace Style */}
      <div className="flex items-center justify-between p-3 border-b-2 border-[#FF00FF]/50 bg-gradient-to-r from-[#FF00FF]/20 via-[#FF00FF]/10 to-transparent">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-[#FF00FF] fill-[#FF00FF] animate-pulse" />
          <span className="font-mono font-bold tracking-widest text-xs uppercase text-[#FF00FF]">
            Top 8 Friends
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-500">{friends.length} / 8 SLOTS</span>
          <button className="p-1 hover:bg-[#FF00FF]/20 rounded transition-colors">
            <Plus size={14} className="text-[#FF00FF]" />
          </button>
        </div>
      </div>

      {/* MySpace-Style Grid Layout */}
      <div className="flex-1 p-3 overflow-y-auto">
        {/* Featured #1 Friend - Large */}
        {friends[0] && (
          <div 
            className="relative mb-3 group cursor-pointer overflow-hidden border-2 border-yellow-500/50 hover:border-yellow-500 transition-all"
            onMouseEnter={() => setHoveredFriend(friends[0].id)}
            onMouseLeave={() => setHoveredFriend(null)}
          >
            <div className="flex">
              {/* Avatar */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <img 
                  src={friends[0].avatar} 
                  alt={friends[0].name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" 
                />
                <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-black ${getStatusColor(friends[0].status)}`} />
                <div className="absolute top-0 left-0 bg-yellow-500 text-black font-bold text-[10px] px-1.5 py-0.5 font-mono flex items-center gap-1">
                  <Crown size={10} /> #1
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 p-3 bg-black/40">
                <h3 className="text-yellow-500 font-bold text-sm tracking-wide">{friends[0].name}</h3>
                <p className="text-[9px] text-[#FF00FF] font-mono uppercase">{friends[0].role}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">"{friends[0].quote}"</p>
                
                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[9px] font-mono hover:bg-[#39FF14] hover:text-black transition-colors flex items-center gap-1">
                    <MessageSquare size={10} /> MSG
                  </button>
                  <button className="px-2 py-1 bg-[#FF00FF]/10 border border-[#FF00FF]/30 text-[#FF00FF] text-[9px] font-mono hover:bg-[#FF00FF] hover:text-black transition-colors flex items-center gap-1">
                    <Heart size={10} /> ADD
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends 2-4 Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {friends.slice(1, 4).map((friend) => (
            <div 
              key={friend.id}
              className="relative group cursor-pointer overflow-hidden border border-gray-700 hover:border-[#FF00FF] transition-all bg-black/40"
              onMouseEnter={() => setHoveredFriend(friend.id)}
              onMouseLeave={() => setHoveredFriend(null)}
            >
              <div className="relative aspect-square">
                <img 
                  src={friend.avatar} 
                  alt={friend.name} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black ${getStatusColor(friend.status)}`} />
                <div className="absolute top-0 left-0 bg-black/70 text-white text-[8px] px-1 py-0.5 font-mono flex items-center gap-0.5">
                  {getRankIcon(friend.rank)} #{friend.rank}
                </div>
              </div>
              <div className="p-1.5 bg-black/60 border-t border-gray-800">
                <h4 className="text-[9px] text-white font-mono truncate">{friend.name}</h4>
                <p className="text-[7px] text-gray-500 font-mono truncate">{friend.role}</p>
              </div>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm p-2">
                <button className="p-2 text-[#39FF14] hover:text-white transition-colors mb-1">
                  <MessageSquare size={16} />
                </button>
                <span className="text-[8px] text-gray-400 font-mono">MESSAGE</span>
              </div>
            </div>
          ))}
        </div>

        {/* Friends 5-8 Grid */}
        <div className="grid grid-cols-4 gap-2">
          {friends.slice(4, 8).map((friend) => (
            <div 
              key={friend.id}
              className="relative group cursor-pointer overflow-hidden border border-gray-800 hover:border-[#39FF14] transition-all"
              onMouseEnter={() => setHoveredFriend(friend.id)}
              onMouseLeave={() => setHoveredFriend(null)}
            >
              <div className="relative aspect-square">
                <img 
                  src={friend.avatar} 
                  alt={friend.name} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                />
                <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-black ${getStatusColor(friend.status)}`} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                <h4 className="text-[7px] text-gray-300 font-mono truncate text-center">{friend.name}</h4>
              </div>
            </div>
          ))}
          
          {/* Empty Slot */}
          {friends.length < 8 && (
            <button className="border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-600 hover:text-[#39FF14] hover:border-[#39FF14] hover:bg-[#39FF14]/5 transition-all group aspect-square">
              <Plus size={20} className="mb-1 group-hover:scale-125 transition-transform" />
              <span className="text-[7px] font-mono tracking-widest">ADD</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-[#FF00FF]/30 bg-black/40 flex items-center justify-between">
        <span className="text-[8px] text-gray-500 font-mono">Drag to reorder friends</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
          <span className="text-[8px] text-gray-500 font-mono">{friends.filter(f => f.status === 'online').length} online</span>
        </div>
      </div>

      {/* Decorative Corner */}
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FF00FF]" />
    </div>
  );
};

export default TopFriendsWidget;
