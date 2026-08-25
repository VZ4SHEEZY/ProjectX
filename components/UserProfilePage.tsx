import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, UserPlus, UserCheck, UserMinus, Ban, VolumeX } from 'lucide-react';
import { User } from '../types';
import { userAPI, postAPI, profileAPI, socialAPI } from '../services/api';
import VideoModal from './VideoModal';
import ProfileV2Modules, { ProfileV2Module } from './ProfileV2Modules';
import { profileThemeStyle, resolveProfileTheme } from '../profileV2Themes';

interface UserProfilePageProps {
  userId: string;
  username?: string;
  currentUser?: User;
  onBack: () => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  onMessage?: (userId: string) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, username, currentUser, onBack, onMessage }) => {
  const [user, setUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState('none');
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [topFriends, setTopFriends] = useState<any[]>([]);
  const [profileModules, setProfileModules] = useState<ProfileV2Module[]>([]);
  const [profileLayout, setProfileLayout] = useState<any>(null);

  // Listen for follow updates from other components
  useEffect(() => {
    const handleFollowUpdate = () => {
      loadUserProfile();
    };
    window.addEventListener('followingUpdated', handleFollowUpdate);
    return () => window.removeEventListener('followingUpdated', handleFollowUpdate);
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [userId, username]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch user by ID or username
      const userRes = await userAPI.getUser(userId || username!);
      const payload = userRes.data?.data || userRes.data;
      const userData = payload?.user || payload;
      
      setUser(userData);
      setIsFollowing(userData.isFollowing || false);
      setFollowStatus(userData.followStatus || (userData.isFollowing ? 'following' : 'none'));
      setIsFriend(Boolean(userData.isFriend));
      try {
        const normalized = await profileAPI.getPublic(userData._id);
        const normalizedData = normalized.data?.data || {};
        setProfileModules(normalizedData.modules || []);
        setProfileLayout(normalizedData.layout || null);
        setUser((current:any) => ({ ...current, ...(normalizedData.profile || {}), ...(normalizedData.owner || {}), location: normalizedData.profile?.locationLabel || current.location }));
      } catch { setProfileModules([]); setProfileLayout(null); }

      // Check if profile is private
      if (userData.profilePrivacy === 'private' && !userData.isFollowing && userData._id !== currentUser?.id) {
        setUserPosts([]);
        setTopFriends([]);
      } else {
        // Load user's posts
        const postsRes = await postAPI.getPosts({ author: userData._id, limit: 100 });
        const posts = postsRes.data?.data || [];
        setUserPosts(posts);

        // Load top friends (followers + following mix)
        try {
          const topFriendsRes = await socialAPI.getTopFriends(userData._id);
          setTopFriends((topFriendsRes.data?.data || []).map((entry: any) => entry.friend));
        } catch (err) {
          console.error('Load top friends error:', err);
        }
      }
    } catch (error) {
      console.error('Load user profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await userAPI.followUser(user._id);
      if (response.data?.success) {
        setIsFollowing(response.data.isFollowing);
        setFollowStatus(response.data.followStatus || (response.data.isFollowing ? 'following' : 'none'));
        setUser((current: any) => current ? {
          ...current,
          followersCount: response.data.followersCount ?? current.followersCount
        } : current);
        // Trigger refresh across app
        window.dispatchEvent(new Event('followingUpdated'));
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleFriend = async () => {
    try { if (isFriend) { await socialAPI.removeFriend(user._id); setIsFriend(false); } else { await socialAPI.sendFriendRequest(user._id); } } catch (error) { console.error('Friend action error:', error); }
  };

  const handleBlock = async () => { if (window.confirm(`Block ${user.username}?`)) { await socialAPI.block(user._id); onBack(); } };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-gray-500">User not found</div>
      </div>
    );
  }

  const isPrivate = user.profilePrivacy === 'private' && !isFollowing && user._id !== currentUser?.id;

  const resolvedTheme = resolveProfileTheme(user.faction, profileLayout?.factionStarterTheme || 'full', profileLayout?.theme || {});
  return (
    <div className={`w-full h-full bg-black overflow-y-auto profile-v2-page profile-layout-${resolvedTheme.layoutStyle} profile-border-${resolvedTheme.borderStyle} ${resolvedTheme.scanlines?'profile-scanlines':''} ${resolvedTheme.glowEffects?'profile-glow':''}`} style={profileThemeStyle(resolvedTheme)}>
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-[#39FF14]/20 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-white hover:text-[#39FF14] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-white font-bold">{user.username}</h2>
          <p className="text-gray-400 text-xs">{user.faction || 'Unaffiliated'}</p>
        </div>
      </div>

      {/* Relationship controls remain outside customizable modules. */}
      <div className="p-4 border-b border-white/10 bg-black/80">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4">
          <div className="flex gap-6 mr-auto">
              <div className="text-center">
                <div className="text-[#39FF14] font-bold text-lg">{user.followersCount || 0}</div>
                <div className="text-gray-400 text-xs">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-[#39FF14] font-bold text-lg">{user.followingCount || 0}</div>
                <div className="text-gray-400 text-xs">Following</div>
              </div>
              <div className="text-center">
                <div className="text-[#39FF14] font-bold text-lg">{user.postsCount || 0}</div>
                <div className="text-gray-400 text-xs">Posts</div>
              </div>
          </div>
            {user._id !== currentUser?.id && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-all ${
                    isFollowing
                      ? 'bg-[#39FF14] text-black border border-[#39FF14]'
                      : 'border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black'
                  }`}
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  {followStatus === 'requested' ? 'REQUESTED' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </button>
                <button onClick={handleFriend} className="flex items-center gap-2 px-4 py-2 border border-[#FF00FF] text-[#FF00FF] rounded font-bold">
                  {isFriend ? <UserMinus size={16} /> : <UserPlus size={16} />}{isFriend ? 'UNFRIEND' : 'ADD FRIEND'}
                </button>
                <button onClick={() => onMessage?.(user._id)} className="flex items-center gap-2 px-4 py-2 border border-[#39FF14] text-[#39FF14] rounded hover:bg-[#39FF14] hover:text-black transition-all font-bold">
                  <MessageSquare size={16} />
                  MESSAGE
                </button>
                <button aria-label="Mute user" onClick={() => socialAPI.mute(user._id)} className="p-2 border border-gray-700 text-gray-400 rounded"><VolumeX size={16} /></button>
                <button aria-label="Block user" onClick={handleBlock} className="p-2 border border-red-800 text-red-400 rounded"><Ban size={16} /></button>
              </div>
            )}
        </div>
      </div>

      {/* Private profile message */}
      {isPrivate ? (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <p className="text-lg font-bold mb-2">This profile is private</p>
            <p className="text-sm">Follow {user.username} to view their content</p>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {profileModules.length > 0 ? <ProfileV2Modules modules={profileModules} userId={user._id} owner={user} posts={userPosts} /> : <div className="p-6 border-b border-[#39FF14]/20">
            <h3 className="text-white font-bold text-lg mb-4">Posts ({userPosts.length})</h3>
            {userPosts.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No posts yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {userPosts.map((post) => (
                  <div
                    key={post._id}
                    onClick={() => setSelectedVideo({
                      id: post._id,
                      url: post.mediaUrl,
                      mediaUrl: post.mediaUrl,
                      title: post.title,
                      description: post.description || '',
                      user: post.author,
                      likes: post.likesCount || 0,
                      comments: post.commentsCount || 0
                    })}
                    className="relative group cursor-pointer overflow-hidden border border-[#39FF14]/30 rounded aspect-square"
                  >
                    {post.thumbnailUrl || post.mediaUrl ? (
                      <img
                        src={post.thumbnailUrl || post.mediaUrl}
                        alt={post.title || post.description || 'Post'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full p-4 bg-gray-950 text-sm text-gray-300 overflow-hidden">
                        {post.description || post.content || 'Text post'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-[#39FF14] text-3xl">▶</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo}
        currentUser={currentUser}
      />
    </div>
  );
};

export default UserProfilePage;
