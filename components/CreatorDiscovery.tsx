import React, { useEffect, useState } from 'react';
import api from '../services/api';
const CreatorDiscovery = ({ onProfile }: { onProfile: (id: string) => void }) => {
  const [creators, setCreators] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setError(''); try { setCreators((await api.get('/creator/discover')).data.creators); } catch { setError('Creator discovery unavailable.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <div className="h-full overflow-y-auto p-4 md:p-8 text-white"><h1 className="text-2xl text-[#39FF14] font-bold mb-4">Discover creators</h1><p className="text-sm text-gray-400 mb-6">Original work from the CyberDope community. Follow creators from their existing profiles.</p>{loading && <p>Loading creators…</p>}{error && <div role="alert">{error} <button onClick={load} className="border p-3 ml-3">Retry</button></div>}{!loading && !error && !creators.length && <p>No public creators yet. Creator Mode is available from Creator Studio.</p>}<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{creators.map(c => <button key={c._id} onClick={() => onProfile(c.username)} className="text-left border border-gray-800 rounded p-4 hover:border-[#39FF14]"><img src={c.avatar} alt="" className="h-16 w-16 rounded-full mb-3"/><h2 className="font-bold">{c.displayName || c.username}</h2><p className="text-xs text-gray-500">@{c.username} · {c.faction || 'Unaffiliated'}</p><p className="text-sm text-gray-400 mt-2 break-words">{c.bio || 'Visit this creator’s profile to discover their work.'}</p></button>)}</div></div>;
};
export default CreatorDiscovery;
