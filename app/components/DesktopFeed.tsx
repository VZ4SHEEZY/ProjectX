import React, { useState, useEffect } from 'react';
import { User, Video } from '../types';
import VideoPlayer from './VideoPlayer';
import { Heart, MessageCircle, Share2, Crown, UserPlus, UserCheck } from 'lucide-react';
import { postAPI, userAPI } from '../services/api';

interface DesktopFeedProps {
  videos: Video[];
  currentUser: User;
  activeTab: 'discover' | 'friends' | 'faction';
  onTipClick: (address: string) => void;
}

const DesktopFeed: React.FC<DesktopFeedProps> = ({ videos, currentUser, activeTab, onTipClick }) => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(videos[0] || null);
  const [comments, setComments] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Load comments when video changes
  useEffect(() => {
    if (selectedVideo) {
      loadComments();
      checkFollowStatus();
    }
  }, [selectedVideo]);

  const loadComments = async () => {
    if (!selectedVideo) return;
    setLoadingComments(true);
    try {
      const response = await postAPI.getComments(selectedVideo.id);
      setComments(response.data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!selectedVideo?.user?.id) return;
    try {
      const user = await userAPI.getUser(selectedVideo.user.id);
      setIsFollowing(user.data?.isFollowing || false);
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!selectedVideo?.user?.id) return;
    try {
      if (isFollowing) {
        await userAPI.unfollowUser(selectedVideo.user.id);
      } else {
        await userAPI.followUser(selectedVideo.user.id);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  if (!selectedVideo) {
    return <div className="text-center py-20 text-gray-400">No videos available</div>;
  }

  return (
    <div className="w-full h-full bg-black flex gap-6 p-6 overflow-hidden">
      {/* Left Side: Video Player (70%) */}
      <div className="flex-1 flex flex-col">
        <div className="relative bg-black rounded-lg overflow-hidden flex-1 mb-4">
          <VideoPlayer
            video={selectedVideo}
            isActive={true}
            onTip={onTipClick}
            userAgeVerified={currentUser.isAgeVerified}
          />
        </div>

        {/* Video Actions */}
        <div className="flex gap-4 items-center text-white">
          <button className="flex items-center gap-2 hover:text-[#39FF14] transition-colors">
            <Heart size={20} />
            <span className="text-sm">{selectedVideo.likes || 0}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-[#39FF14] transition-colors">
            <MessageCircle size={20} />
            <span className="text-sm">{comments.length}</span>
          </button>
          <button className="flex items-center gap-2 hover:text-[#39FF14] transition-colors">
            <Share2 size={20} />
          </button>
          <button onClick={() => onTipClick(selectedVideo.user?.walletAddress)} className="flex items-center gap-2 ml-auto hover:text-[#FF00FF] transition-colors border border-[#FF00FF] px-4 py-2 rounded">
            <Crown size={16} />
            Tip
          </button>
        </div>
      </div>

      {/* Right Side: Creator Info + Comments (30%) */}
      <div className="w-[30%] flex flex-col bg-gray-950 border border-[#39FF14]/20 rounded-lg overflow-hidden">
        {/* Creator Info */}
        <div className="p-4 border-b border-[#39FF14]/20">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={selectedVideo.user?.avatar}
              alt="avatar"
              className="w-12 h-12 rounded-full border border-[#39FF14]"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{selectedVideo.user?.username}</p>
              <p className="text-xs text-gray-400">{selectedVideo.user?.followersCount || 0} followers</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFollow}
              className={`flex-1 py-2 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isFollowing
                  ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]'
                  : 'bg-[#39FF14] text-black hover:bg-[#39FF14]/80'
              }`}
            >
              {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button className="flex-1 py-2 px-4 rounded text-sm font-bold border border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF]/10 transition-all">
              Subscribe
            </button>
          </div>

          <p className="text-sm text-white mt-3">{selectedVideo.title}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedVideo.description}</p>
        </div>

        {/* Comments Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-bold text-sm mb-4">Comments</h3>

            {loadingComments ? (
              <div className="text-center py-4 text-gray-400 text-xs">Loading...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">No comments yet</div>
            ) : (
              <div className="space-y-3">
                {comments.slice(0, 10).map((comment) => (
                  <div key={comment._id} className="bg-black/50 p-3 rounded border border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={comment.author?.avatar}
                        alt="avatar"
                        className="w-6 h-6 rounded-full"
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

        {/* Comment Input */}
        <div className="p-4 border-t border-[#39FF14]/20">
          <input
            type="text"
            placeholder="Add comment..."
            className="w-full bg-black border border-gray-700 text-white text-xs px-3 py-2 rounded focus:border-[#39FF14] outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default DesktopFeed;
