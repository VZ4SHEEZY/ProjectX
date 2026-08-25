import React, { useState, useEffect } from 'react';
import { Heart, UserCheck } from 'lucide-react';
import { socialAPI } from '../services/api';

interface Following {
  _id: string;
  username: string;
  displayName?: string;
  avatar: string;
  followersCount?: number;
}

interface TopFriendsWidgetProps {
  userId?: string;
}

const TopFriendsWidget: React.FC<TopFriendsWidgetProps> = ({ userId }) => {
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const fetchFollowing = async () => {
      try {
        const response = await socialAPI.getTopFriends(userId);
        if (response.data?.success && response.data.data) {
          setFollowing(response.data.data.map((entry: any) => entry.friend));
        }
      } catch (err) {
        console.error('Failed to fetch following:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();

    // Listen for follow updates
    const handleFollowUpdate = () => {
      fetchFollowing();
    };

    window.addEventListener('followingUpdated', handleFollowUpdate);
    return () => window.removeEventListener('followingUpdated', handleFollowUpdate);
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full h-full bg-black/80 backdrop-blur-md border-2 border-[#FF00FF] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="w-full h-full bg-black/80 backdrop-blur-md border-2 border-[#FF00FF] flex flex-col items-center justify-center p-4 text-center">
        <Heart size={24} className="text-[#FF00FF] mb-2 opacity-50" />
        <p className="text-gray-400 text-xs font-mono">No Top Friends selected</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-md border-2 border-[#FF00FF] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b-2 border-[#FF00FF]/50 bg-gradient-to-r from-[#FF00FF]/20 via-[#FF00FF]/10 to-transparent">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-[#FF00FF] fill-[#FF00FF] animate-pulse" />
          <span className="font-mono font-bold tracking-widest text-xs uppercase text-[#FF00FF]">
            Top Friends
          </span>
        </div>
        <span className="text-[9px] font-mono text-gray-500">{following.length} users</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {following.map((user, idx) => (
          <div
            key={user._id}
            className="flex items-center gap-3 p-2 bg-black/40 border border-gray-800 hover:border-[#FF00FF] hover:bg-black/60 transition-all rounded group"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded border border-[#39FF14]/30 object-cover"
              />
              <div className="absolute -top-1 -right-1 bg-[#39FF14] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                #{idx + 1}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white text-sm font-mono truncate">{user.username}</h4>
              <p className="text-gray-500 text-[10px] font-mono">
                {user.followersCount ?? 0} followers
              </p>
            </div>

            {/* Action */}
            <button className="flex-shrink-0 p-1.5 bg-[#FF00FF]/10 border border-[#FF00FF]/30 text-[#FF00FF] rounded hover:bg-[#FF00FF] hover:text-black transition-all opacity-0 group-hover:opacity-100">
              <UserCheck size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#FF00FF]/30 bg-black/40">
        <p className="text-[8px] text-gray-500 font-mono text-center">
          {following.length} of {following.length} visible
        </p>
      </div>
    </div>
  );
};

export default TopFriendsWidget;
