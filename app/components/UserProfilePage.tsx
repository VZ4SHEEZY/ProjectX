import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageSquare, UserPlus, UserCheck } from 'lucide-react';
import { User } from '../types';
import { userAPI, postAPI } from '../services/api';
import VideoModal from './VideoModal';

interface UserProfilePageProps {
  userId: string;
  username?: string;
  currentUser?: User;
  onBack: () => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, username, currentUser, onBack }) => {
  const [user, setUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [topFriends, setTopFriends] = useState<any[]>([]);

  useEffect(() => {
    loadUserProfile();
  }, [userId, username]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch user by ID or username
      const endpoint = userId ? `/users/${userId}` : `/users/username/${username}`;
      const userRes = await userAPI.getUser(userId || username!);
      const userData = userRes.data?.data || userRes.data;
      
      setUser(userData);
      setIsFollowing(userData.isFollowing || false);

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
          const followersRes = await userAPI.getFollowers(userData._id, { limit: 8 });
          const followers = followersRes.data?.data || [];
          setTopFriends(followers.slice(0, 8));
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
      if (isFollowing) {
        await userAPI.unfollowUser(user._id);
        setIsFollowing(false);
      } else {
        await userAPI.followUser(user._id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

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

  return (
    <div className="w-full h-full bg-black overflow-y-auto">
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

      {/* User Info Card */}
      <div className="p-6 border-b border-[#39FF14]/20">
        <div className="flex items-start gap-6 mb-6">
          <img
            src={user.avatar}
            alt={user.username}
            className="w-24 h-24 rounded-full border-2 border-[#39FF14]"
          />
          <div className="flex-1">
            <h1 className="text-white text-2xl font-bold mb-2">{user.username}</h1>
            <p className="text-gray-400 mb-4">{user.displayName || user.bio || 'No bio'}</p>
            
            {/* Stats */}
            <div className="flex gap-6 mb-4">
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

            {/* Action buttons */}
            {user._id !== currentUser?.id && (
              <div className="flex gap-3">
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-all ${
                    isFollowing
                      ? 'bg-[#39FF14] text-black border border-[#39FF14]'
                      : 'border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black'
                  }`}
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-[#39FF14] text-[#39FF14] rounded hover:bg-[#39FF14] hover:text-black transition-all font-bold">
                  <MessageSquare size={16} />
                  MESSAGE
                </button>
              </div>
            )}
          </div>
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
        <>
          {/* Posts Grid */}
          <div className="p-6 border-b border-[#39FF14]/20">
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
                    <img
                      src={post.thumbnailUrl || post.mediaUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-[#39FF14] text-3xl">▶</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Friends */}
          {topFriends.length > 0 && (
            <div className="p-6">
              <h3 className="text-white font-bold text-lg mb-4">Top Friends</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="bg-gray-900/50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-900 transition-colors"
                  >
                    <img
                      src={friend.avatar}
                      alt={friend.username}
                      className="w-12 h-12 rounded-full mx-auto mb-2 border border-[#39FF14]"
                    />
                    <p className="text-white font-bold text-sm truncate">{friend.username}</p>
                    <p className="text-gray-400 text-xs mb-2">{friend.faction || 'Unaffiliated'}</p>
                    <p className="text-[#39FF14] text-xs font-bold">{friend.followersCount || 0} followers</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
