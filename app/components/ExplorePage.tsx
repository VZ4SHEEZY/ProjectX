
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Grid3X3, List, Flame, Clock, TrendingUp,
  EyeOff, Lock, DollarSign, Check, Video, Image as ImageIcon,
  MessageSquare, Music, Mic, Link2
} from 'lucide-react';

interface ExplorePageProps {
  isAgeVerified: boolean;
  onContentClick: (content: ContentItem) => void;
}

interface ContentItem {
  id: string;
  type: 'video' | 'image' | 'text' | 'audio' | 'live';
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

// Mock content data
const MOCK_CONTENT: ContentItem[] = [
  { id: '1', type: 'video', thumbnail: 'https://picsum.photos/seed/c1/400/600', title: 'Cyberpunk City Tour', creator: { name: 'Neon_Walker', avatar: 'https://picsum.photos/seed/u1/100', isVerified: true }, views: 12500, likes: 890, isNSFW: false, isPremium: false, tags: ['cyberpunk', 'city', 'tour'], postedAt: '2h ago' },
  { id: '2', type: 'image', thumbnail: 'https://picsum.photos/seed/c2/400/600', title: 'Neon Portrait Session', creator: { name: 'Photo_Mage', avatar: 'https://picsum.photos/seed/u2/100', isVerified: true }, views: 5400, likes: 420, isNSFW: false, isPremium: true, price: 5, tags: ['photography', 'portrait', 'neon'], postedAt: '4h ago' },
  { id: '3', type: 'video', thumbnail: 'https://picsum.photos/seed/c3/400/600', title: 'Late Night Drive 🔞', creator: { name: 'Night_Rider', avatar: 'https://picsum.photos/seed/u3/100', isVerified: false }, views: 8900, likes: 670, isNSFW: true, isPremium: false, tags: ['nsfw', 'night', 'drive'], postedAt: '6h ago' },
  { id: '4', type: 'live', thumbnail: 'https://picsum.photos/seed/c4/400/600', title: 'LIVE: Synthwave Production', creator: { name: 'Beat_Master', avatar: 'https://picsum.photos/seed/u4/100', isVerified: true }, views: 2300, likes: 180, isNSFW: false, isPremium: false, tags: ['live', 'music', 'synthwave'], postedAt: 'LIVE' },
  { id: '5', type: 'video', thumbnail: 'https://picsum.photos/seed/c5/400/600', title: 'Matrix Code Tutorial', creator: { name: 'Code_Wizard', avatar: 'https://picsum.photos/seed/u5/100', isVerified: true }, views: 45000, likes: 3200, isNSFW: false, isPremium: false, tags: ['tutorial', 'coding', 'matrix'], postedAt: '1d ago' },
  { id: '6', type: 'image', thumbnail: 'https://picsum.photos/seed/c6/400/600', title: 'Exclusive Photoshoot 💎', creator: { name: 'Glamour_Queen', avatar: 'https://picsum.photos/seed/u6/100', isVerified: true }, views: 1200, likes: 89, isNSFW: true, isPremium: true, price: 15, tags: ['exclusive', 'photoshoot', 'glamour'], postedAt: '2d ago' },
  { id: '7', type: 'audio', thumbnail: 'https://picsum.photos/seed/c7/400/600', title: 'Cyberpunk Ambient Mix', creator: { name: 'Sound_Designer', avatar: 'https://picsum.photos/seed/u7/100', isVerified: false }, views: 3400, likes: 280, isNSFW: false, isPremium: false, tags: ['music', 'ambient', 'cyberpunk'], postedAt: '3d ago' },
  { id: '8', type: 'text', thumbnail: 'https://picsum.photos/seed/c8/400/600', title: 'My Journey into the Matrix', creator: { name: 'Story_Teller', avatar: 'https://picsum.photos/seed/u8/100', isVerified: true }, views: 2100, likes: 156, isNSFW: false, isPremium: false, tags: ['story', 'journey', 'matrix'], postedAt: '4d ago' },
];

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

const ExplorePage: React.FC<ExplorePageProps> = ({ isAgeVerified, onContentClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nsfwFilter, setNsfwFilter] = useState<'hide' | 'blur' | 'show'>(isAgeVerified ? 'show' : 'hide');
  const [monetizationFilter, setMonetizationFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular'>('trending');

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let content = [...MOCK_CONTENT];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      content = content.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.creator.name.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory === 'nsfw') {
      content = content.filter(item => item.isNSFW);
    } else if (selectedCategory === 'video') {
      content = content.filter(item => item.type === 'video');
    } else if (selectedCategory === 'photo') {
      content = content.filter(item => item.type === 'image');
    } else if (selectedCategory === 'audio') {
      content = content.filter(item => item.type === 'audio');
    } else if (selectedCategory === 'live') {
      content = content.filter(item => item.type === 'live');
    }

    // NSFW filter
    if (nsfwFilter === 'hide') {
      content = content.filter(item => !item.isNSFW);
    }

    // Monetization filter
    if (monetizationFilter === 'free') {
      content = content.filter(item => !item.isPremium);
    } else if (monetizationFilter === 'premium') {
      content = content.filter(item => item.isPremium);
    }

    // Sort
    if (sortBy === 'newest') {
      content.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else if (sortBy === 'popular') {
      content.sort((a, b) => b.views - a.views);
    }

    return content;
  }, [searchQuery, selectedCategory, nsfwFilter, monetizationFilter, sortBy]);

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
            onClick={() => onContentClick(item)}
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
              
              {/* Overlays */}
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
    </div>
  );
};

export default ExplorePage;
