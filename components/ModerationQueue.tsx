import React, { useEffect, useState } from 'react';
import api from '../services/api';
const ModerationQueue = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setError('');
    try { const [queue, audit] = await Promise.all([api.get('/moderation/queue'), api.get('/moderation/audit')]); setPosts(queue.data.posts); setLogs(audit.data.logs); }
    catch (e: any) { setError(e.response?.data?.error || 'Moderation data unavailable'); }
  };
  useEffect(() => { void load(); }, []);
  const enforce = async (action: string, targetId: string) => {
    const reason = window.prompt('Record the reason for this moderation action (required):');
    if (!reason?.trim()) return;
    setBusy(true); setError('');
    try { await api.post('/moderation/enforce', { action, targetId, reason }); await load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Enforcement failed'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 text-white"><h2 className="text-xl">Reports and enforcement</h2><button onClick={load} className="border border-gray-700 p-3">Refresh queue</button>{error && <p role="alert" className="text-red-400">{error}</p>}{!posts.length && <p className="text-gray-400">No pending reports.</p>}{posts.map(p => <article key={p._id} className="border border-gray-800 p-4 space-y-3"><p className="break-words">{p.title || p.content || 'Untitled content'}</p><p className="text-sm text-gray-400">{p.reports.map((r: any) => r.reason).join(', ')}</p><div className="flex flex-wrap gap-3">{['remove', 'dismiss'].map(action => <button key={action} disabled={busy} onClick={() => enforce(action, p._id)} className="border border-gray-700 p-3">{action === 'remove' ? 'Remove content' : 'Dismiss reports'}</button>)}<button disabled={busy} onClick={() => enforce('suspend_user', p.author)} className="border border-red-800 p-3">Suspend author (admin)</button></div></article>)}<h3 className="text-lg">Audit history</h3>{!logs.length && <p className="text-gray-400">No enforcement actions recorded.</p>}{logs.map(l => <p key={l._id} className="text-sm break-words">{new Date(l.createdAt).toLocaleString()} · {l.action} · {l.details.reason}</p>)}</section>;
};
export default ModerationQueue;
