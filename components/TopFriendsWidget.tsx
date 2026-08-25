import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { socialAPI } from '../services/api';

interface Friend { _id:string; username:string; displayName?:string; avatar:string; faction?:string }
const TopFriendsWidget:React.FC<{userId?:string}>=({userId})=>{
  const [friends,setFriends]=useState<Friend[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ if(!userId){setLoading(false);return} const fetchFriends=async()=>{try{const response=await socialAPI.getTopFriends(userId);if(response.data?.success)setFriends((response.data.data||[]).map((entry:any)=>entry.friend).filter(Boolean).slice(0,8))}catch(error){console.error('Failed to fetch Top Friends:',error)}finally{setLoading(false)}}; fetchFriends(); window.addEventListener('followingUpdated',fetchFriends);window.addEventListener('topFriendsUpdated',fetchFriends);return()=>{window.removeEventListener('followingUpdated',fetchFriends);window.removeEventListener('topFriendsUpdated',fetchFriends)}},[userId]);
  if(loading)return <section className="profile-v2-card top-friends-shell border p-6 min-h-48 flex items-center justify-center"><p className="text-gray-500 text-sm">Tuning the inner circle…</p></section>;
  return <section className="profile-v2-card top-friends-shell border overflow-hidden" aria-labelledby={`top-friends-${userId}`}>
    <header className="top-friends-header p-4 md:p-5 flex items-end justify-between gap-3"><div><p className="profile-kicker">Chosen connections</p><h2 id={`top-friends-${userId}`} className="!text-xl md:!text-2xl flex items-center gap-2"><Heart size={19} className="fill-current" style={{color:'var(--profile-secondary)'}}/>Top Friends</h2></div><span className="text-[10px] uppercase tracking-[.2em] text-gray-500">{friends.length}/8</span></header>
    {!friends.length?<div className="p-8 md:p-12 text-center"><Heart size={30} className="mx-auto mb-3 opacity-30"/><p className="text-gray-300 text-sm">This inner circle is waiting to be chosen.</p></div>:<ol className={`top-friends-grid p-3 md:p-5 ${friends.length<5?'top-friends-grid-short':''}`}>
      {friends.map((friend,index)=><li key={friend._id} className="top-friend-portrait group" style={{'--friend-order':index} as React.CSSProperties}>
        <img src={friend.avatar} alt="" className="top-friend-image"/>
        <div className="top-friend-wash"/>
        <span className="top-friend-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
        <div className="top-friend-name"><span className="font-bold truncate">{friend.displayName||friend.username}</span><span className="text-[10px] opacity-70 truncate">@{friend.username}</span></div>
        <span className="sr-only">Position {index+1} of {friends.length}</span>
      </li>)}
    </ol>}
  </section>;
};
export default TopFriendsWidget;
