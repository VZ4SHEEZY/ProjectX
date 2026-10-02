import React, { useState } from 'react';
import { profileAPI } from '../services/api';
import { User } from '../types';

interface Props {
  user: User;
  onComplete: (updates: Partial<User>, openStudio: boolean) => void;
}

const FirstRunProfileSetup: React.FC<Props> = ({ user, onComplete }) => {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const finish = async (openStudio: boolean) => {
    setSaving(true); setError('');
    try {
      const profile = { displayName: displayName.trim(), bio: bio.trim(), avatar: avatar.trim() };
      await profileAPI.updateMine(profile);
      onComplete(profile, openStudio);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save your profile. Try again.');
    } finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-mono">
    <section className="w-full max-w-xl border border-[#39FF14]/40 bg-gray-950 p-5 sm:p-8">
      <p className="text-[#39FF14] text-xs tracking-[.25em] mb-2">PROFILE SETUP</p>
      <h1 className="text-2xl font-black mb-2">Establish your signal</h1>
      <p className="text-sm text-gray-400 mb-6">You are <span className="text-white">{user.faction || 'Unaffiliated'}</span>. Add enough context for people to recognize and connect with you.</p>
      <div className="space-y-4">
        <label className="block text-xs text-gray-400">Display name
          <input aria-label="Display name" maxLength={50} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={user.username} className="mt-1 w-full bg-black border border-gray-700 p-3 text-white" />
        </label>
        <label className="block text-xs text-gray-400">Avatar URL
          <input aria-label="Avatar URL" value={avatar} onChange={e => setAvatar(e.target.value)} className="mt-1 w-full bg-black border border-gray-700 p-3 text-white" />
        </label>
        <label className="block text-xs text-gray-400">Bio
          <textarea aria-label="Bio" maxLength={500} rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="What should people know about you?" className="mt-1 w-full bg-black border border-gray-700 p-3 text-white resize-none" />
        </label>
      </div>
      <div className="mt-3 text-[11px] text-gray-500">Profile completion: {displayName.trim() && bio.trim() ? 'ready to publish' : 'add a name and bio for a stronger first impression'}</div>
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button disabled={saving} onClick={() => finish(false)} className="flex-1 bg-[#39FF14] text-black font-bold p-3 disabled:opacity-50">{saving ? 'SAVING…' : 'SAVE & DISCOVER'}</button>
        <button disabled={saving} onClick={() => finish(true)} className="flex-1 border border-[#39FF14] text-[#39FF14] font-bold p-3 disabled:opacity-50">CONTINUE IN PROFILE STUDIO</button>
      </div>
    </section>
  </main>;
};

export default FirstRunProfileSetup;
