import React from 'react';
import VideoPlayer from './VideoPlayer';
import { Video, User } from '../types';

interface DesktopFeedWrapperProps {
  video: Video;
  currentUser: User;
  onTipClick: (address: string) => void;
}

/**
 * STEP 1: Just the layout container
 * - Left: 65% video player
 * - Right: 35% sidebar (placeholder for now)
 */
const DesktopFeedWrapper: React.FC<DesktopFeedWrapperProps> = ({ video, currentUser, onTipClick }) => {
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

      {/* RIGHT: Sidebar Placeholder (35%) */}
      <div className="flex-[0.35] bg-gray-950 border border-[#39FF14]/20 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Sidebar (placeholder)</div>
      </div>
    </div>
  );
};

export default DesktopFeedWrapper;
