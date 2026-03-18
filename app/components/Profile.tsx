
import React from 'react';
import { User } from '../types';
import ProfileGrid from './ProfileGrid';

interface ProfileProps {
  user: User;
  onTip?: (address: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onTip }) => {
  return (
    <div className="min-h-screen text-[#39FF14] pt-4 px-2 pb-24 overflow-y-auto overflow-x-hidden">
      <ProfileGrid user={user} onTip={onTip} />
    </div>
  );
};

export default Profile;
