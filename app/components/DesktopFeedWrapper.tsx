import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { Video, User } from '../types';
import { postAPI } from '../services/api';

interface DesktopFeedWrapperProps {
  video: Video;
  currentUser: User;
  onTipClick: (address: string) => void;
  onVideoSelect?: (video: Video) => void;
  onCreatorClick?: (username: string) => void;
}

const DesktopFeedWrapper: React.FC<DesktopFeedWrapperProps> = ({ video, currentUser, onTipClick, onVideoSelect, onCreatorClick }) => {
  const [creatorVideos, setCreatorVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  useEffect(() => {
    if (!video.user?.id) return;
    
    setLoadingVideos(true);
    postAPI.getUserPosts(video.user.id, { page: 1, limit: 4 })
      .then(res => {
        setCreatorVideos(res.data?.posts || []);
      })
      .catch(err => console.error('Failed to load creator videos:', err))
      .finally(() => setLoadingVideos(false));
  }, [video.user?.id]);
  return (
    <div className="w-full h-full bg-black flex gap-4 p-4">
      {/* LEFT: Video Player (65%) */}
      <div className="flex-[0.65] flex flex-col gap-4">
        <div className="flex-1 bg-gray-950 rounded-lg overflow-hidden">
          <VideoPlayer
            video={video}
            isActive={true}
            onTip={onTipClick}
            userAgeVerified={currentUser.isAgeVerified}
          />
        </div>
      </div>

      {/* RIGHT: Sidebar (35%) */}
      <div className="flex-[0.35] bg-gray-950 border border-[#39FF14]/20 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Creator Card */}
        <div className="border-b border-[#39FF14]/20 pb-4">
          <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => onCreatorClick?.(video.user?.username || '')}>
            <img
              src={video.user?.avatar}
              alt="creator"
              className="w-12 h-12 rounded-full border border-[#39FF14] hover:opacity-80 transition-opacity"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate hover:text-[#39FF14] transition-colors">{video.user?.username}</p>
              <p className="text-xs text-gray-400">{video.user?.followersCount || 0} followers</p>
            </div>
          </div>

          {/* Faction Badge */}
          {video.user?.faction && (
            <div className="mb-3 px-3 py-1 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded text-xs text-[#39FF14] font-mono text-center">
              {video.user.faction}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-[#39FF14] text-black rounded text-xs font-bold hover:bg-[#39FF14]/80 transition-all">
              Follow
            </button>
            <button className="flex-1 py-2 border border-[#FF00FF] text-[#FF00FF] rounded text-xs font-bold hover:bg-[#FF00FF]/10 transition-all">
              Subscribe
            </button>
          </div>
        </div>

        {/* Latest Videos */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3">Latest Videos</h3>
          <div className="grid grid-cols-2 gap-2">
            {loadingVideos ? (
              <div className="col-span-2 text-center text-gray-400 text-xs py-4">Loading...</div>
            ) : creatorVideos.length === 0 ? (
              <div className="col-span-2 text-center text-gray-400 text-xs py-4">No videos</div>
            ) : (
              creatorVideos.map(v => (
                <div
                  key={v.id}
                  onClick={() => onVideoSelect?.(v)}
                  className="aspect-video bg-gray-800 rounded border border-gray-700 cursor-pointer hover:border-[#39FF14] transition-colors overflow-hidden group"
                >
                  <img
                    src={v.thumbnail || v.user?.avatar}
                    alt="video"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bio */}
        {video.description && (
          <div className="border-t border-[#39FF14]/20 pt-3">
            <p className="text-xs text-gray-300 line-clamp-3">{video.description}</p>
          </div>
        )}

        {/* Social Links */}
        <div className="border-t border-[#39FF14]/20 pt-3">
          <p className="text-xs text-gray-400 mb-2">Follow Creator</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded text-xs font-bold hover:bg-red-600/30 transition-all">YouTube</button>
            <button className="flex-1 py-2 bg-pink-600/20 border border-pink-600/50 text-pink-400 rounded text-xs font-bold hover:bg-pink-600/30 transition-all">Instagram</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopFeedWrapper;
