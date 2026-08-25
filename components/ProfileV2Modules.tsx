import React from 'react';
import { Lock } from 'lucide-react';
import TopFriendsWidget from './TopFriendsWidget';

export interface ProfileV2Module { _id: string; type: string; position: number; config?: Record<string, unknown>; locked?: boolean; presentation?: string }

const requirementLabel = (node: any): string => {
  if (!node) return 'restricted access';
  if (node.op === 'predicate') return String(node.type || 'requirement').replaceAll('_', ' ');
  return (node.children || []).map(requirementLabel).join(node.op === 'and' ? ' and ' : ' or ');
};

const ProfileV2Modules: React.FC<{ modules: ProfileV2Module[]; userId: string; owner: any; posts?: any[] }> = ({ modules, userId, owner, posts = [] }) => (
  <div className="space-y-4" data-testid="profile-v2-modules">
    {modules.map(module => module.locked ? (
      <section key={module._id} className="border border-[#39FF14]/30 bg-black/70 p-6 text-center" data-testid="locked-preview">
        <Lock className="mx-auto mb-2 text-[#39FF14]" size={20} />
        <p className="text-white font-bold">Locked</p>
        <p className="text-xs text-gray-400">Requires {requirementLabel((module as any).requirements)}.</p>
      </section>
    ) : module.type === 'bio' ? (
      <section key={module._id} className="border border-gray-800 p-4"><h3 className="text-white font-bold mb-2">About</h3><p className="text-gray-300">{owner.bio || 'No bio yet.'}</p></section>
    ) : module.type === 'faction' ? (
      <section key={module._id} className="border border-gray-800 p-4"><h3 className="text-white font-bold">Faction</h3><p className="text-[#39FF14]">{owner.faction}</p></section>
    ) : module.type === 'top_friends' ? (
      <section key={module._id} className="h-72"><TopFriendsWidget userId={userId} /></section>
    ) : module.type === 'posts' ? (
      <section key={module._id} className="border border-gray-800 p-4"><h3 className="text-white font-bold">Posts ({posts.length})</h3></section>
    ) : null)}
  </div>
);

export default ProfileV2Modules;
