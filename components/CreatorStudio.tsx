import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CreatorDashboard from './CreatorDashboard';
import { User } from '../types';

interface Props { user: User; onActivated: () => Promise<void>; onCreate: () => void; onProfileStudio: () => void; onTiers: () => void; onDiscover: () => void }
const CreatorStudio: React.FC<Props> = ({ user, onActivated, onCreate, onProfileStudio, onTiers, onDiscover }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const saveContent = async () => {
    if (!editing) return;
    setBusy(true); setError('');
    try { await api.put(`/posts/${editing._id}`, { title: editing.title || '', content: editing.content || '' }); setEditing(null); await load(); }
    catch (e: any) { setError(e.response?.data?.message || 'Content changes could not be saved.'); }
    finally { setBusy(false); }
  };
  const load = async () => {
    setError('');
    try { setData((await api.get('/creator/studio')).data); }
    catch { setError('Creator Studio could not be loaded. Retry to recover.'); }
  };
  useEffect(() => { void load(); }, [user.isCreator]);
  const activate = async () => {
    setBusy(true); setError('');
    try { await api.post('/creator/apply'); await onActivated(); await load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Activation failed. Your existing profile is preserved.'); }
    finally { setBusy(false); }
  };
  const update = async (post: any) => {
    setBusy(true); setError('');
    try { await api.put(`/posts/${post._id}`, { status: post.status === 'published' ? 'archived' : 'published' }); await load(); }
    catch (e: any) { setError(e.response?.data?.message || 'Content could not be updated.'); }
    finally { setBusy(false); }
  };
  const button = 'px-4 py-3 rounded border border-gray-700 text-sm hover:border-[#39FF14] disabled:opacity-50';
  return <div className="h-full overflow-y-auto p-4 md:p-8 text-white"><div className="max-w-5xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold text-[#39FF14]">Creator Studio</h1>
    <p className="text-sm text-gray-400">Create from your existing identity. Your faction, friends, posts and personal progression stay connected.</p>
    <button className={button} onClick={onDiscover}>Discover creators</button>
    {error && <div role="alert" className="border border-red-500 p-4 text-red-300">{error} <button className={button} onClick={load}>Retry</button></div>}
    {!data && !error && <p>Loading Creator Studio…</p>}
    {data && !data.isCreator && <section className="border border-gray-800 p-6 space-y-4"><h2 className="text-xl">Enable Creator Mode</h2><p className="text-gray-400">Unlock creator profile modules and content management. Age verification and paid memberships are unavailable. Tips use Base Sepolia test tokens only.</p><button className={button} disabled={busy} onClick={activate}>{busy ? 'Activating…' : 'Activate Creator Mode'}</button></section>}
    {data?.isCreator && <>
      <div className="flex flex-wrap gap-3"><button className={button} onClick={onCreate}>Create content</button><button className={button} onClick={onProfileStudio}>Edit creator profile modules</button><button className={button} onClick={onTiers}>Configure membership drafts</button></div>
      <section className="border border-gray-800 p-5 space-y-2"><h2 className="text-lg font-bold">Audience overview</h2><p>{data.audience.followers} followers · {data.audience.following} following</p><p className="text-xs text-gray-500">Current account counts. Reach, impressions and growth analytics are not available.</p></section>
      <section className="border border-gray-800 p-5 space-y-3"><h2 className="text-lg font-bold">Content management</h2><p className="text-xs text-gray-400">{data.contentCounts.map((c: any) => `${c.count} ${c._id}`).join(' · ') || 'No content yet'}. Latest 100 posts shown.</p>{!data.posts.length && <p className="text-gray-400">Create your first post to start your archive.</p>}{data.posts.map((post: any) => <article key={post._id} className="border-t border-gray-800 py-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-words">{post.title || post.content?.slice(0, 120) || 'Untitled content'}</p><p className="text-xs text-gray-500">{post.type} · {post.status} · {post.visibility}{post.moderationState === 'removed' ? ' · Removed by moderation' : ''}</p></div><button className={button} disabled={busy || post.moderationState === 'removed' || post.isNSFW} onClick={() => setEditing({ ...post })}>Edit</button><button className={button} disabled={busy || post.moderationState === 'removed' || post.isNSFW} onClick={() => update(post)}>{post.status === 'published' ? 'Archive' : 'Publish'}</button></article>)}</section>
      {editing && <section className="border border-gray-700 p-5 space-y-3"><h2>Edit content</h2><label className="block">Title<input aria-label="Content title" maxLength={200} value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="block w-full bg-black border border-gray-700 p-3 mt-2"/></label><label className="block">Text<textarea aria-label="Content text" maxLength={5000} value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} className="block w-full bg-black border border-gray-700 p-3 mt-2"/></label><div className="flex gap-3"><button className={button} disabled={busy} onClick={saveContent}>Save content</button><button className={button} disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div></section>}
      <section className="border border-amber-500/30 p-5 space-y-2"><h2 className="text-lg font-bold">Monetization settings</h2><p>Base Sepolia testnet only. Test tokens have no monetary value.</p><p className="text-sm text-gray-400">Tipping: {data.monetization.paymentExecutionEnabled ? 'Ready on testnet' : 'Unavailable until verified testnet configuration is enabled'}. Paid memberships and real payments are disabled. Age verification provider unavailable.</p><p className="text-xs break-all text-gray-500">Receipt wallet: {data.monetization.wallet || 'Connect and verify a wallet in the navigation bar'}</p></section>
      <CreatorDashboard isCreator userToken={localStorage.getItem('cdToken') || ''}/>
    </>}
  </div></div>;
};
export default CreatorStudio;
