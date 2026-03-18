
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, X, User, Hash, Video, Image as ImageIcon, 
  Filter, TrendingUp, Clock, DollarSign, EyeOff, Check,
  ArrowRight, Loader2
} from 'lucide-react';

interface SearchSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (result: SearchResult) => void;
  isAgeVerified: boolean;
}

type SearchResult = {
  id: string;
  type: 'user' | 'content' | 'tag';
  title: string;
  subtitle?: string;
  image?: string;
  verified?: boolean;
  followers?: number;
  isNSFW?: boolean;
  isPremium?: boolean;
  price?: number;
};

// Mock search data
const MOCK_USERS: SearchResult[] = [
  { id: 'u1', type: 'user', title: 'Neon_Walker', subtitle: 'Cyberpunk Photographer', image: 'https://picsum.photos/seed/u1/100', verified: true, followers: 12500 },
  { id: 'u2', type: 'user', title: 'Matrix_Coder', subtitle: 'Web3 Developer', image: 'https://picsum.photos/seed/u2/100', verified: true, followers: 8900 },
  { id: 'u3', type: 'user', title: 'Synth_Wave_Queen', subtitle: 'Music Producer', image: 'https://picsum.photos/seed/u3/100', verified: false, followers: 5600 },
  { id: 'u4', type: 'user', title: 'Cyber_Goth', subtitle: 'Fashion Creator', image: 'https://picsum.photos/seed/u4/100', verified: true, followers: 23000 },
  { id: 'u5', type: 'user', title: 'Hacker_News', subtitle: 'Tech Journalist', image: 'https://picsum.photos/seed/u5/100', verified: false, followers: 3400 },
];

const MOCK_CONTENT: SearchResult[] = [
  { id: 'c1', type: 'content', title: 'Cyberpunk City Night Tour', subtitle: 'Neon_Walker • 12K views', image: 'https://picsum.photos/seed/c1/200', isNSFW: false },
  { id: 'c2', type: 'content', title: 'Late Night Drive 🔞', subtitle: 'Night_Rider • 8K views', image: 'https://picsum.photos/seed/c2/200', isNSFW: true },
  { id: 'c3', type: 'content', title: 'Matrix Code Tutorial', subtitle: 'Matrix_Coder • 45K views', image: 'https://picsum.photos/seed/c3/200', isPremium: true, price: 5 },
  { id: 'c4', type: 'content', title: 'Synthwave Mix 2077', subtitle: 'Synth_Wave_Queen • 23K views', image: 'https://picsum.photos/seed/c4/200' },
];

const MOCK_TAGS = [
  { id: 't1', type: 'tag' as const, title: '#cyberpunk', subtitle: '234K posts' },
  { id: 't2', type: 'tag' as const, title: '#neon', subtitle: '189K posts' },
  { id: 't3', type: 'tag' as const, title: '#matrix', subtitle: '156K posts' },
  { id: 't4', type: 'tag' as const, title: '#web3', subtitle: '98K posts' },
  { id: 't5', type: 'tag' as const, title: '#nsfw', subtitle: '45K posts' },
];

const TRENDING_SEARCHES = [
  'cyberpunk', 'neon nights', 'matrix code', 'web3 tutorial', 'synthwave'
];

const RECENT_SEARCHES = [
  'Neon_Walker', '#cyberpunk', 'late night drive'
];

const SearchSystem: React.FC<SearchSystemProps> = ({ isOpen, onClose, onResultClick, isAgeVerified }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'content' | 'tags'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase();
      let filteredResults: SearchResult[] = [];

      // Search users
      if (activeFilter === 'all' || activeFilter === 'users') {
        const users = MOCK_USERS.filter(u => 
          u.title.toLowerCase().includes(lowerQuery) ||
          u.subtitle?.toLowerCase().includes(lowerQuery)
        );
        filteredResults = [...filteredResults, ...users];
      }

      // Search content
      if (activeFilter === 'all' || activeFilter === 'content') {
        const content = MOCK_CONTENT.filter(c => {
          // Filter out NSFW if not verified and not explicitly searching for it
          if (c.isNSFW && !isAgeVerified) return false;
          return c.title.toLowerCase().includes(lowerQuery);
        });
        filteredResults = [...filteredResults, ...content];
      }

      // Search tags
      if (activeFilter === 'all' || activeFilter === 'tags') {
        const tags = MOCK_TAGS.filter(t => 
          t.title.toLowerCase().includes(lowerQuery)
        );
        filteredResults = [...filteredResults, ...tags];
      }

      setResults(filteredResults);
      setIsLoading(false);
    }, 300);
  }, [activeFilter, isAgeVerified]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    onClose();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <Search className="text-gray-500" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, content, tags..."
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-600 focus:outline-none"
          />
          {query && (
            <button onClick={clearSearch} className="text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'text-gray-500 hover:text-white'}`}
            >
              <Filter size={18} />
            </button>
            <button 
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-700 rounded hover:text-white hover:border-gray-500 transition-colors"
            >
              ESC
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-black/50 animate-in slide-in-from-top-2">
            {[
              { id: 'all', label: 'All', icon: Search },
              { id: 'users', label: 'Users', icon: User },
              { id: 'content', label: 'Content', icon: Video },
              { id: 'tags', label: 'Tags', icon: Hash },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === filter.id
                    ? 'bg-[#39FF14] text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <filter.icon size={12} />
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-[#39FF14] animate-spin" size={32} />
            </div>
          )}

          {/* Search Results */}
          {!isLoading && query && results.length > 0 && (
            <div className="p-4 space-y-1">
              <p className="text-xs text-gray-500 mb-3 font-mono">
                {results.length} RESULTS FOR "{query}"
              </p>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                >
                  {/* Image/Icon */}
                  {result.image ? (
                    <div className="relative">
                      <img 
                        src={result.image} 
                        alt="" 
                        className={`w-12 h-12 rounded-lg object-cover ${result.isNSFW ? 'blur-sm' : ''}`}
                      />
                      {result.isNSFW && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <EyeOff size={14} className="text-pink-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                      {result.type === 'tag' && <Hash size={20} className="text-[#39FF14]" />}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium group-hover:text-[#39FF14] transition-colors truncate">
                        {result.title}
                      </p>
                      {result.verified && (
                        <Check size={14} className="text-[#39FF14] fill-[#39FF14]" />
                      )}
                      {result.isNSFW && (
                        <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-500 text-[9px] rounded">18+</span>
                      )}
                      {result.isPremium && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[9px] rounded">${result.price}</span>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-gray-500 text-sm truncate">{result.subtitle}</p>
                    )}
                  </div>

                  {/* Stats */}
                  {result.followers && (
                    <p className="text-gray-500 text-xs">{formatNumber(result.followers)} followers</p>
                  )}

                  <ArrowRight size={16} className="text-gray-600 group-hover:text-[#39FF14] transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-medium mb-1">No results found</p>
              <p className="text-gray-500 text-sm">Try different keywords or filters</p>
            </div>
          )}

          {/* Default State - No Query */}
          {!query && !isLoading && (
            <div className="p-4 space-y-6">
              {/* Recent Searches */}
              <div>
                <p className="text-xs text-gray-500 mb-3 font-mono flex items-center gap-2">
                  <Clock size={12} />
                  RECENT SEARCHES
                </p>
                <div className="flex flex-wrap gap-2">
                  {RECENT_SEARCHES.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(search)}
                      className="px-3 py-1.5 bg-gray-800 text-gray-400 text-sm rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending */}
              <div>
                <p className="text-xs text-gray-500 mb-3 font-mono flex items-center gap-2">
                  <TrendingUp size={12} />
                  TRENDING NOW
                </p>
                <div className="space-y-1">
                  {TRENDING_SEARCHES.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-[#39FF14] font-mono w-6">{idx + 1}</span>
                      <span className="text-white">{search}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggested Users */}
              <div>
                <p className="text-xs text-gray-500 mb-3 font-mono flex items-center gap-2">
                  <User size={12} />
                  SUGGESTED CREATORS
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MOCK_USERS.slice(0, 4).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleResultClick(user)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                    >
                      <img src={user.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate flex items-center gap-1">
                          {user.title}
                          {user.verified && <Check size={12} className="text-[#39FF14] fill-[#39FF14]" />}
                        </p>
                        <p className="text-gray-500 text-xs">{formatNumber(user.followers || 0)} followers</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-black/50 flex items-center justify-between text-[10px] text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-800 rounded">↑↓</span>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-800 rounded">↵</span>
              Select
            </span>
          </div>
          <span>PRESS CMD+K TO SEARCH ANYWHERE</span>
        </div>
      </div>
    </div>
  );
};

export default SearchSystem;
