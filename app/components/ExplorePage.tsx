import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, Grid3X3, List, Flame, Clock, TrendingUp,
  EyeOff, Lock, DollarSign, Check, Video, Image as ImageIcon,
  MessageSquare, Music, Mic, Link2, Loader2, UserPlus
} from 'lucide-react';
import { postAPI, userAPI } from '../services/api';
import VideoModal from './VideoModal';

interface ExplorePageProps {
  isAgeVerified: boolean;
  onContentClick: (content: any) => void;
}

interface ContentItem {
  id: string;
  type: string;
  thumbnail: string;
  title: string;
  creator: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
  views: number;
  likes: number;
  isNSFW: boolean;
  isPremium: boolean;
  price?: number;
  tags: string[];
  postedAt: string;
}

interface SuggestedUser {
  _id: string;
  username: string;
  avatar: string;
  isVerified?: boolean;
  followersCount?: number;
  bio?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid3X3 },
  { id: 'foryou', label: 'For You', icon: TrendingUp },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'photo', label: 'Photo', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'live', label: 'Live', icon: Mic },
  { id: 'nsfw', label: 'NSFW 🔞', icon: EyeOff },
];

const ExplorePage: React.FC<ExplorePageProps> = ({ isAgeVerified, onContentClick, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nsfwFilter, setNsfwFilter] = useState<'hide' | 'blur' | 'show'>(isAgeVerified ? 'show' : 'hide');
  const [monetizationFilter, setMonetizationFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular'>('trending');

  const [content, setContent] = useState<ContentItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [postsRes, usersRes] = await Promise.allSettled([
          postAPI.getPosts({ sort: '-createdAt', limit: 20 }),
          userAPI.getSuggestedUsers(),
        ]);

        if (postsRes.status === 'fulfilled') {
          // API returns { data: { data: [...posts], count, total, ... } }
          const rawPosts: any[] = Array.isArray(postsRes.value?.data?.data) 
            ? postsRes.value.data.data 
            : Array.isArray(postsRes.value?.data) 
            ? postsRes.value.data 
            : [];
          
          const mapped: ContentItem[] = rawPosts.map((post: any) => ({
            id: post._id,
            type: post.type || 'post',
            thumbnail: post.mediaUrl || post.thumbnailUrl || `https://picsum.photos/seed/${post._id}/400/600`,
            title: post.title || post.content || 'Untitled',
            creator: {
              name: post.author?.username || 'unknown',
              avatar: post.author?.avatar || `https://picsum.photos/seed/${post.author?._id}/100`,
              isVerified: post.author?.isVerified || false,
            },
            views: post.stats?.views ?? 0,
            likes: post.stats?.likes ?? 0,
            isNSFW: post.isNSFW || false,
            isPremium: post.monetizationType === 'ppv' || post.monetizationType === 'subscription',
            price: post.price,
            tags: post.tags || [],
            postedAt: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '',
          }));
          setContent(mapped);
        }

        if (usersRes.status === 'fulfilled') {
          const rawUsers: any[] = Array.isArray(usersRes.value?.data?.users)
            ? usersRes.value.data.users
            : Array.isArray(usersRes.value?.data)
            ? usersRes.value.data
            : [];
          setSuggestedUsers(rawUsers);
        }
      } catch (err) {
        console.warn('Explore fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFollow = async (userId: string) => {
    try {
      await userAPI.followUser(userId);
      setFollowingMap(prev => ({ ...prev, [userId]: !prev[userId] }));
    } catch (err) {
      console.warn('Follow failed:', err);
    }
  };

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let items = [...content];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.creator.name.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory === 'nsfw') {
      items = items.filter(item => item.isNSFW);
    } else if (selectedCategory === 'video') {
      items = items.filter(item => item.type === 'video');
    } else if (selectedCategory === 'photo') {
      items = items.filter(item => item.type === 'image');
    } else if (selectedCategory === 'audio') {
      items = items.filter(item => item.type === 'audio');
    } else if (selectedCategory === 'live') {
      items = items.filter(item => item.type === 'live');
    }

    if (nsfwFilter === 'hide') {
      items = items.filter(item => !item.isNSFW);
    }

    if (monetizationFilter === 'free') {
      items = items.filter(item => !item.isPremium);
    } else if (monetizationFilter === 'premium') {
      items = items.filter(item => item.isPremium);
    }

    if (sortBy === 'popular') {
      items.sort((a, b) => b.views - a.views);
    }

    return items;
  }, [content, searchQuery, selectedCategory, nsfwFilter, monetizationFilter, sortBy]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={12} />;
      case 'image': return <ImageIcon size={12} />;
      case 'audio': return <Music size={12} />;
      case 'live': return <Mic size={12} />;
      case 'text': return <MessageSquare size={12} />;
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-full bg-[#050505] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">EXPLORE</h1>
        <p className="text-gray-500 text-sm">Discover creators and content from the CyberDope network</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, tags, content..."
            className="w-full bg-black border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#39FF14] text-black'
                  : 'bg-black border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-gray-500 text-sm">Filters:</span>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-black border border-gray-700 text-gray-400 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#39FF14]"
        >
          <option value="trending">🔥 Trending</option>
          <option value="newest">🕐 Newest</option>
          <option value="popular">⭐ Most Popular</option>
        </select>

        {/* NSFW Filter */}
        <select
          value={nsfwFilter}
          onChange={(e) => setNsfwFilter(e.target.value as any)}
          className="bg-black border border-gray-700 text-gray-400 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-pink-500"
        >
          <option value="hide">🚫 Hide NSFW</option>
          {isAgeVerified && <option value="show">🔞 Show NSFW</option>}
          {!isAgeVerified && <option value="blur" disabled>🔞 Verify to see NSFW</option>}
        </select>

        {/* Monetization Filter */}
        <select
          value={monetizationFilter}
          onChange={(e) => setMonetizationFilter(e.target.value as any)}
          className="bg-black border border-gray-700 text-gray-400 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-yellow-500"
        >
          <option value="all">💰 All Content</option>
          <option value="free">🆓 Free Only</option>
          <option value="premium">💎 Premium Only</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto bg-black border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#39FF14] text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-[#39FF14] text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-[#39FF14] animate-spin" size={40} />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Results Count */}
          <div className="max-w-7xl mx-auto mb-4">
            <p className="text-gray-500 text-sm">
              Showing <span className="text-white font-medium">{filteredContent.length}</span> results
            </p>
          </div>

          {/* Content Grid */}
          <div className={`max-w-7xl mx-auto ${
            viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
              : 'space-y-4'
          }`}>
            {filteredContent.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedVideo({
                  id: item.id,
                  url: item.thumbnail,
                  mediaUrl: item.thumbnail,
                  title: item.title,
                  description: '',
                  user: { username: item.creator.name, avatar: item.creator.avatar, displayName: item.creator.name },
                  likes: item.likes,
                  comments: 0
                })}
                className={`group cursor-pointer overflow-hidden bg-black border border-gray-800 hover:border-[#39FF14]/50 transition-all ${
                  viewMode === 'grid' ? 'rounded-lg' : 'rounded-lg flex'
                }`}
              >
                {/* Thumbnail */}
                <div className={`relative overflow-hidden ${viewMode === 'grid' ? 'aspect-[3/4]' : 'w-48 h-32 flex-shrink-0'}`}>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      item.isNSFW && nsfwFilter === 'blur' ? 'blur-xl' : ''
                    }`}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white">
                    {getTypeIcon(item.type)}
                    <span className="uppercase">{item.type}</span>
                  </div>

                  {/* NSFW Badge */}
                  {item.isNSFW && (
                    <div className="absolute top-2 right-2 bg-pink-600/90 px-2 py-1 rounded text-[10px] text-white font-bold flex items-center gap-1">
                      <EyeOff size={10} />
                      18+
                    </div>
                  )}

                  {/* Premium Badge */}
                  {item.isPremium && (
                    <div className="absolute bottom-2 right-2 bg-yellow-500/90 px-2 py-1 rounded text-[10px] text-black font-bold flex items-center gap-1">
                      <Lock size={10} />
                      {item.price ? `$${item.price}` : 'SUB'}
                    </div>
                  )}

                  {/* Live Badge */}
                  {item.type === 'live' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 px-3 py-1 rounded-full text-xs text-white font-bold animate-pulse">
                      LIVE
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                    <div className="w-16 h-16 rounded-full bg-[#39FF14]/80 flex items-center justify-center">
                      <Video className="w-8 h-8 text-black ml-1" fill="currentColor" />
                    </div>
                  </div>

                  {/* NSFW Blur Overlay */}
                  {item.isNSFW && nsfwFilter === 'blur' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <EyeOff size={32} className="text-pink-500 mx-auto mb-2" />
                        <p className="text-pink-500 text-xs font-bold">18+ CONTENT</p>
                        <p className="text-gray-500 text-[10px]">Verify to view</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={`p-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-[#39FF14] transition-colors">
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={item.creator.avatar}
                      alt={item.creator.name}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-gray-400 text-xs">@{item.creator.name}</span>
                    {item.creator.isVerified && (
                      <Check size={12} className="text-[#39FF14]" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                    <span>{formatNumber(item.views)} views</span>
                    <span>•</span>
                    <span>{item.postedAt}</span>
                  </div>

                  {viewMode === 'list' && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-[#39FF14]/70">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredContent.length === 0 && (
            <div className="max-w-7xl mx-auto text-center py-20">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-600" />
              </div>
              <h3 className="text-white text-lg font-medium mb-2">No content found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search query</p>
            </div>
          )}

          {/* Load More */}
          {filteredContent.length > 0 && (
            <div className="max-w-7xl mx-auto mt-8 text-center">
              <button className="px-8 py-3 border border-gray-700 text-gray-400 hover:text-white hover:border-[#39FF14] transition-all text-sm font-medium">
                LOAD MORE
              </button>
            </div>
          )}

          {/* Suggested Users */}
          {suggestedUsers.length > 0 && (
            <div className="max-w-7xl mx-auto mt-12">
              <h2 className="text-white text-lg font-bold mb-4 tracking-wider">SUGGESTED CREATORS</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestedUsers.slice(0, 8).map((user) => (
                  <div key={user._id} className="bg-black border border-gray-800 rounded-lg p-4 flex flex-col items-center gap-3">
                    <img
                      src={user.avatar || `https://picsum.photos/seed/${user._id}/100`}
                      alt={user.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
                    />
                    <div className="text-center">
                      <p className="text-white text-sm font-medium flex items-center justify-center gap-1">
                        @{user.username}
                        {user.isVerified && <Check size={12} className="text-[#39FF14]" />}
                      </p>
                      {user.followersCount !== undefined && (
                        <p className="text-gray-500 text-xs">{formatNumber(user.followersCount)} followers</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleFollow(user._id)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border transition-all w-full justify-center ${
                        followingMap[user._id]
                          ? 'bg-[#39FF14] text-black border-[#39FF14]'
                          : 'bg-transparent text-[#39FF14] border-[#39FF14] hover:bg-[#39FF14] hover:text-black'
                      }`}
                    >
                      <UserPlus size={12} />
                      {followingMap[user._id] ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
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

export default ExplorePage;
