import React, { useState, useEffect } from 'react';
import { Video, User } from '../types';
import VideoPlayer from './VideoPlayer';
import { Heart, MessageCircle, Share2, Crown, UserPlus, UserCheck } from 'lucide-react';
import { userAPI, postAPI } from '../services/api';

interface DesktopFeedLayoutProps {
  videos: Video[];
  currentUser: User;
  onTipClick: (address: string) => void;
}

const DesktopFeedLayout: React.FC<DesktopFeedLayoutProps> = ({ videos, currentUser, onTipClick }) => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const activeVideo = videos[activeVideoIndex];

  useEffect(() => {
    if (!activeVideo) return;
    
    // Load comments for active video
    setCommentsLoading(true);
    postAPI.getComments(activeVideo.id)
      .then(res => {
        setComments(res.data || []);
      })
      .catch(err => console.error('Load comments error:', err))
      .finally(() => setCommentsLoading(false));

    // Check follow status
    if (activeVideo.user?.id) {
      userAPI.getUser(activeVideo.user.id)
        .then(res => setIsFollowing(res.data?.isFollowing || false))
        .catch(err => console.error('Follow status error:', err));
    }
  }, [activeVideoIndex, activeVideo]);

  const handleFollow = async () => {
    if (!activeVideo?.user?.id) return;
    try {
      if (isFollowing) {
        await userAPI.unfollowUser(activeVideo.user.id);
      } else {
        await userAPI.followUser(activeVideo.user.id);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  if (!activeVideo) {
    return <div className="text-center text-gray-400 py-20">No videos</div>;
  }

  return (
    <div className="w-full h-full bg-black flex gap-4 p-4">
      {/* Left: Video Player (65%) */}
      <div className="flex-[0.65] flex flex-col gap-4">
        <div className="flex-1 bg-gray-950 rounded-lg overflow-hidden">
          <VideoPlayer
            video={activeVideo}
            isActive={true}
            onTip={onTipClick}
            userAgeVerified={currentUser.isAgeVerified}
          />
        </div>

        {/* Video Actions */}
        <div className="flex gap-4 text-white">
          <button className="flex items-center gap-2 hover:text-[#39FF14]">
            <Heart size={20} />
            <span className="text-sm">{activeVideo.likes || 0}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-[#39FF14]">
            <MessageCircle size={20} />
            <span className="text-sm">{comments.length}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-[#39FF14]">
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => onTipClick(activeVideo.user?.walletAddress || '')}
            className="ml-auto flex items-center gap-2 border border-[#FF00FF] text-[#FF00FF] px-4 py-2 rounded hover:bg-[#FF00FF]/10"
          >
            <Crown size={16} />
            Tip
          </button>
        </div>

        {/* Video Navigation */}
        <div className="flex gap-2 text-xs text-gray-400">
          <button 
            onClick={() => setActiveVideoIndex(Math.max(0, activeVideoIndex - 1))}
            disabled={activeVideoIndex === 0}
            className="px-4 py-2 border border-gray-700 rounded disabled:opacity-50 hover:border-[#39FF14]"
          >
            ← Previous
          </button>
          <span className="flex-1 text-center text-gray-400 py-2">
            {activeVideoIndex + 1} / {videos.length}
          </span>
          <button 
            onClick={() => setActiveVideoIndex(Math.min(videos.length - 1, activeVideoIndex + 1))}
            disabled={activeVideoIndex === videos.length - 1}
            className="px-4 py-2 border border-gray-700 rounded disabled:opacity-50 hover:border-[#39FF14]"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Right: Creator Info + Comments (35%) */}
      <div className="flex-[0.35] bg-gray-950 border border-[#39FF14]/20 rounded-lg overflow-hidden flex flex-col">
        {/* Creator Section */}
        <div className="p-4 border-b border-[#39FF14]/20">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={activeVideo.user?.avatar}
              alt="creator"
              className="w-12 h-12 rounded-full border border-[#39FF14]"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{activeVideo.user?.username}</p>
              <p className="text-xs text-gray-400">{activeVideo.user?.followersCount || 0} followers</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFollow}
              className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
                isFollowing
                  ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]'
                  : 'bg-[#39FF14] text-black hover:bg-[#39FF14]/80'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button className="flex-1 py-2 border border-[#FF00FF] text-[#FF00FF] rounded text-sm font-bold hover:bg-[#FF00FF]/10">
              Subscribe
            </button>
          </div>

          <p className="text-sm text-white mt-3 font-semibold">{activeVideo.title}</p>
          <p className="text-xs text-gray-400 mt-2 line-clamp-3">{activeVideo.description}</p>
        </div>

        {/* Comments Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-white font-bold text-sm mb-4">Comments ({comments.length})</h3>
          
          {commentsLoading ? (
            <div className="text-center text-gray-400 text-xs py-4">Loading...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-4">No comments yet</div>
          ) : (
            <div className="space-y-3">
              {comments.slice(0, 8).map(comment => (
                <div key={comment._id} className="bg-black/50 p-3 rounded border border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={comment.author?.avatar}
                      alt="commenter"
                      className="w-5 h-5 rounded-full"
                    />
                    <p className="text-xs font-bold text-white">{comment.author?.username}</p>
                  </div>
                  <p className="text-xs text-gray-300">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopFeedLayout;
