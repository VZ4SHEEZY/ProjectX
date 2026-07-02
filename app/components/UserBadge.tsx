import React from 'react';
import { Shield } from 'lucide-react';
import { User } from '../types';

interface UserBadgeProps {
  user: User;
  showOnlineStatus?: boolean;
  className?: string;
}

const UserBadge: React.FC<UserBadgeProps> = ({ user, showOnlineStatus = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div>
        <p className="font-bold text-white">{user.username}</p>
      </div>
      
      {/* 18+ Badge */}
      {user.isAdmin && (
        <div className="inline-flex items-center gap-1 bg-purple-600/20 border border-purple-600 px-2 py-1 rounded-full">
          <span className="text-purple-500 text-[10px] font-bold">👑 ADMIN</span>
        </div>
      )}
      
      {user.isVerified && !user.isAdmin && (
        <div className="inline-flex items-center gap-1 bg-blue-600/20 border border-blue-600 px-2 py-1 rounded-full">
          <span className="text-blue-500 text-[10px] font-bold">✓ VERIFIED</span>
        </div>
      )}
    </div>
  );
};

export default UserBadge;
