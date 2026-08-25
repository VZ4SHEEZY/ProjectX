import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { profileAPI, socialAPI } from '../services/api';

const TopFriendsEditor: React.FC = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  useEffect(() => { Promise.all([socialAPI.getFriends(), profileAPI.getMine()]).then(async ([friendsResponse, mine]) => { setFriends(friendsResponse.data?.data || []); const userId = mine.data?.data?.profile?.user; if (userId) { const top = await socialAPI.getTopFriends(userId); setSelected((top.data?.data || []).map((entry: any) => entry.friend)); } }).catch(() => setFriends([])); }, []);
  const move = (index: number, delta: number) => setSelected(current => { const next = [...current]; const target = index + delta; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const save = async () => { await socialAPI.setTopFriends(selected.map(friend => friend._id)); setStatus('Saved'); window.dispatchEvent(new Event('topFriendsUpdated')); };
  return <section className="border border-gray-800 rounded p-4">
    <h3 className="text-white font-bold mb-2">Top Friends</h3><p className="text-xs text-gray-500 mb-3">Choose and order up to eight accepted friends.</p>
    <div className="space-y-2">{selected.map((friend, index) => <div key={friend._id} className="flex items-center gap-2 bg-black p-2"><span className="text-[#39FF14] w-6">{index + 1}</span><span className="text-white flex-1">{friend.displayName || friend.username}</span><button aria-label="Move up" onClick={() => move(index, -1)}><ArrowUp size={14}/></button><button aria-label="Move down" onClick={() => move(index, 1)}><ArrowDown size={14}/></button><button aria-label="Remove" onClick={() => setSelected(value => value.filter(item => item._id !== friend._id))}><X size={14}/></button></div>)}</div>
    <div className="flex flex-wrap gap-2 mt-3">{friends.filter(friend => !selected.some(item => item._id === friend._id)).map(friend => <button key={friend._id} disabled={selected.length >= 8} onClick={() => setSelected(value => [...value, friend])} className="text-xs border border-gray-700 px-2 py-1 text-gray-300 disabled:opacity-40"><Plus size={12} className="inline"/> {friend.displayName || friend.username}</button>)}</div>
    <button onClick={save} className="mt-3 px-3 py-2 bg-[#39FF14] text-black font-bold text-xs">SAVE TOP FRIENDS</button>{status && <span className="ml-3 text-xs text-[#39FF14]">{status}</span>}
  </section>;
};
export default TopFriendsEditor;
