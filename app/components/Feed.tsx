
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import DesktopFeedWrapper from './DesktopFeedWrapper';
import { postAPI } from '../services/api';
import { generateSystemMessage } from '../services/aiService';
import { User, Video } from '../types';
import { ChevronUp, ChevronDown, Radio, Wifi, Battery } from 'lucide-react';

interface FeedProps {
  onTipClick: (address: string) => void;
  onCommentClick: () => void;
  currentUser: User;
  activeTab: 'discover' | 'friends' | 'faction';
  onTabChange?: (tab: 'discover' | 'friends' | 'faction') => void;
}

type FeedTab = 'discover' | 'friends' | 'faction';

// Feed tabs: Discover (algorithm), Friends (following), Faction (private)

// Progress Indicator Component
const ProgressIndicator: React.FC<{ total: number; current: number }> = ({ total, current }) => {
  // Limit visible indicators on mobile
  const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : total;
  const startIndex = Math.max(0, Math.min(current - Math.floor(maxVisible / 2), total - maxVisible));
  const visibleIndicators = Array.from({ length: Math.min(total, maxVisible) }).map((_, i) => startIndex + i);
  
  return (
    <div className="absolute top-32 left-3 sm:left-4 z-40 flex flex-col gap-1">
      {visibleIndicators.map((i) => (
        <div
          key={i}
          className={`w-1 sm:w-1.5 h-5 sm:h-6 rounded-full transition-all duration-300 ${
            i === current 
              ? 'bg-[#39FF14] shadow-[0_0_10px_#39FF14]' 
              : i < current 
                ? 'bg-[#39FF14]/50' 
                : 'bg-white/20'
          }`}
        />
      ))}
    </div>
  );
};

// Status Bar Component
const StatusBar: React.FC<{ systemMsg: string }> = ({ systemMsg }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full z-40 px-3 sm:px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
      <div className="flex items-center gap-2">
        <span className="text-white text-[10px] sm:text-xs font-medium">{time}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5">
        <Radio size={10} className="text-white sm:w-3 sm:h-3" />
        <Wifi size={12} className="text-white sm:w-3.5 sm:h-3.5" />
        <Battery size={14} className="text-white sm:w-4 sm:h-4" />
      </div>
    </div>
  );
};

// Navigation Arrows
const NavigationArrows: React.FC<{ 
  onPrev: () => void; 
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}> = ({ onPrev, onNext, canGoPrev, canGoNext }) => {
  return (
    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 sm:gap-4">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center transition-all btn-touch ${
          canGoPrev 
            ? 'text-white hover:bg-[#39FF14] hover:text-black hover:scale-110 active:scale-95' 
            : 'text-gray-600 cursor-not-allowed'
        }`}
      >
        <ChevronUp size={24} className="sm:w-7 sm:h-7" />
      </button>
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center transition-all btn-touch ${
          canGoNext 
            ? 'text-white hover:bg-[#39FF14] hover:text-black hover:scale-110 active:scale-95' 
            : 'text-gray-600 cursor-not-allowed'
        }`}
      >
        <ChevronDown size={24} className="sm:w-7 sm:h-7" />
      </button>
    </div>
  );
};

// Video Counter
const VideoCounter: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  return (
    <div className="absolute bottom-20 sm:bottom-24 left-3 sm:left-4 z-30">
      <div className="bg-black/60 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/20">
        <span className="text-white text-[10px] sm:text-xs font-mono">
          <span className="text-[#39FF14] font-bold">{current + 1}</span>
          <span className="text-gray-400"> / {total}</span>
        </span>
      </div>
    </div>
  );
};

const Feed: React.FC<FeedProps> = ({ onTipClick, onCommentClick, currentUser, activeTab, onTabChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [systemMsg, setSystemMsg] = useState("SYSTEM_ONLINE");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const [apiVideos, setApiVideos] = useState<Video[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mapPostToVideo = (post: any): Video => ({
    id: post._id || post.id,
    url: post.mediaUrl || '',
    thumbnail: post.thumbnailUrl || post.thumbnail || '',
    description: post.description || post.title || '',
    likes: post.stats?.likes ?? post.likesCount ?? 0,
    views: post.stats?.views ?? post.views ?? 0,
    isSensitive: post.isSensitive || false,
    isNSFW: post.isNSFW || false,
    isPremium: post.monetizationType && post.monetizationType !== 'free',
    price: post.price ? String(post.price) : undefined,
    tags: post.tags || [],
    createdAt: post.createdAt,
    user: {
      id: post.author?._id || post.author?.id || '',
      username: post.author?.username || 'Unknown',
      walletAddress: post.author?.walletAddress || '',
      avatar: post.author?.avatar || '',
      bio: '',
      isVerified: post.author?.isVerified || false,
    },
  });

  useEffect(() => {
    const loadFeed = async () => {
      setFeedLoading(true);
      setActiveIndex(0);
      setIsTransitioning(true);
      setFeedError(null);
      
      try {
        let response;
        
        switch (activeTab) {
          case 'friends':
            response = await postAPI.getFollowingFeed({ page: 1, limit: 20 });
            break;
          case 'faction':
            response = await postAPI.getFactionFeed({ page: 1, limit: 20 });
            break;
          case 'discover':
          default:
            response = await postAPI.getForYouFeed({ page: 1, limit: 20 });
        }
        
        const posts = response.data?.data || [];
        console.log('Feed response full:', JSON.stringify(response.data));
        console.log('Posts array:', posts);
        console.log('Posts count:', posts.length);
        if (posts.length === 0) {
          console.warn(`No posts returned from API for tab: ${activeTab}`);
        }
        setApiVideos(posts.length > 0 ? posts.map(mapPostToVideo) : []);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Unknown error';
        console.error(`Feed error [${activeTab}]:`, err);
        setFeedError(`${err?.response?.status || 'ERR'}: ${msg}`);
        setApiVideos([]);
      } finally {
        setFeedLoading(false);
        setIsTransitioning(false);
        // Force scroll to top when tab changes
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }
    };
    loadFeed();
  }, [activeTab]);

  // Refetch feed when user logs in (currentUser changes)
  useEffect(() => {
    if (apiVideos.length === 0 && !feedLoading) {
      const loadFeed = async () => {
        setFeedLoading(true);
        setFeedError(null);
        
        try {
          let response;
          
          switch (activeTab) {
            case 'friends':
              response = await postAPI.getFollowingFeed({ page: 1, limit: 20 });
              break;
            case 'faction':
              response = await postAPI.getFactionFeed({ page: 1, limit: 20 });
              break;
            case 'discover':
            default:
              response = await postAPI.getForYouFeed({ page: 1, limit: 20 });
          }
          
          const posts = response.data?.data || [];
          setApiVideos(posts.length > 0 ? posts.map(mapPostToVideo) : []);
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Unknown error';
          setFeedError(`${err?.response?.status || 'ERR'}: ${msg}`);
          setApiVideos([]);
        } finally {
          setFeedLoading(false);
        }
      };
      loadFeed();
    }
  }, [currentUser.id]);

  // Filter Videos: Remove NSFW if user is not age verified
  const visibleVideos = useMemo(() => {
    return apiVideos.filter(video => {
      if (video.isNSFW && !currentUser.isAgeVerified) return false;
      return true;
    });
  }, [apiVideos, currentUser.isAgeVerified]);

  // Handle Scroll to determine active video
  const handleScroll = useCallback(() => {
    if (containerRef.current && !isTransitioning) {
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeIndex && index >= 0 && index < visibleVideos.length) {
        setIsTransitioning(true);
        setActiveIndex(index);
        // Trigger AI system message on new video roughly
        if (Math.random() > 0.7) {
            updateSystemMessage();
        }
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
  }, [activeIndex, visibleVideos.length, isTransitioning]);

  // Navigate to specific video
  const navigateToVideo = useCallback((index: number) => {
    if (containerRef.current && index >= 0 && index < visibleVideos.length) {
      setIsTransitioning(true);
      containerRef.current.scrollTo({
        top: index * containerRef.current.clientHeight,
        behavior: 'smooth'
      });
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), 500);
    }
  }, [visibleVideos.length]);

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      navigateToVideo(activeIndex - 1);
    }
  }, [activeIndex, navigateToVideo]);

  const goToNext = useCallback(() => {
    if (activeIndex < visibleVideos.length - 1) {
      navigateToVideo(activeIndex + 1);
    }
  }, [activeIndex, navigateToVideo, visibleVideos.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Wheel handler for mouse scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isTransitioning) return;
    
    const threshold = 50;
    if (Math.abs(e.deltaY) > threshold) {
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  }, [goToNext, goToPrev, isTransitioning]);

  const updateSystemMessage = async () => {
    const msgs = ["SCANNING...", "DECRYPTING METADATA...", "TRACKING USER EYE MOVEMENT...", "DATA HARVEST COMPLETE", "NEURAL LINK ESTABLISHED"];
    setSystemMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    
    // Occasionally hit the real API
    if (Math.random() > 0.8) {
       const newMsg = await generateSystemMessage("A user is scrolling through a cyberpunk video feed.");
       setSystemMsg(newMsg);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (feedLoading && apiVideos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-gray-800 relative mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#39FF14] border-t-transparent animate-spin" />
          </div>
          <p className="text-[#39FF14] font-mono text-sm animate-pulse">LOADING FEED...</p>
        </div>
      </div>
    );
  }

  if (visibleVideos.length === 0) {
      return (
          <div className="w-full h-full flex items-center justify-center bg-black text-center p-8">
              <div className="border-2 border-[#39FF14] p-8 max-w-sm">
                  <h2 className="text-[#39FF14] font-bold text-lg mb-3 tracking-wider">NO CONTENT YET</h2>
                  {feedError && (
                    <p className="text-red-400 text-[10px] font-mono mb-3 break-all">{feedError}</p>
                  )}
                  <p className="text-gray-400 text-xs font-mono mb-6 leading-relaxed">
                      The feed is empty. Be the first to post and shape the network.
                  </p>
                  <button className="px-6 py-2 border border-[#39FF14] text-[#39FF14] text-xs font-bold hover:bg-[#39FF14] hover:text-black transition-all">
                      CREATE POST
                  </button>
              </div>
          </div>
      );
  }

  const handleTabChange = (tab: FeedTab) => {
    if (activeTab === tab) return; // Prevent re-loading same tab
    setActiveIndex(0);
    setIsTransitioning(false);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const isFactionDisabled = !currentUser.faction || currentUser.faction === 'Unaffiliated';

  // STEP 1: Show desktop layout if on desktop with videos loaded
  if (isDesktop && visibleVideos.length > 0 && !feedLoading) {
    return (
      <DesktopFeedWrapper
        video={visibleVideos[activeIndex]}
        currentUser={currentUser}
        onTipClick={onTipClick}
        onVideoSelect={(selectedVideo) => {
          // Find the index of the selected video and jump to it
          const index = visibleVideos.findIndex(v => v.id === selectedVideo.id);
          if (index !== -1) {
            setActiveIndex(index);
          }
        }}
        onCreatorClick={(username) => {
          // This will be wired to App.tsx to navigate to profile
          // For now, just log it
          console.log('Navigate to profile:', username);
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-[#050505]">
      
      {/* Status Bar */}
      <StatusBar systemMsg={systemMsg} />

      {/* Feed Tabs - Now controlled by App.tsx */}
        
      {/* Top System Message */}
      <div className="absolute top-16 left-0 w-full z-30 p-3 sm:p-4 pointer-events-none flex justify-center">
        <div className="bg-black/80 backdrop-blur border border-[#39FF14]/30 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex items-center gap-2">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#39FF14] animate-pulse" />
            <span className="text-[9px] sm:text-[10px] text-[#39FF14] font-mono tracking-widest truncate max-w-[150px] sm:max-w-none">{systemMsg}</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator total={visibleVideos.length} current={activeIndex} />

      {/* Navigation Arrows */}
      <NavigationArrows 
        onPrev={goToPrev} 
        onNext={goToNext}
        canGoPrev={activeIndex > 0}
        canGoNext={activeIndex < visibleVideos.length - 1}
      />

      {/* Video Counter */}
      <VideoCounter current={activeIndex} total={visibleVideos.length} />

      {/* Snap Scroll Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar pt-20"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {visibleVideos.map((video, index) => (
          <div 
            key={video.id} 
            className="w-full h-screen snap-start snap-always relative"
            style={{ scrollSnapAlign: 'start' }}
          >
             <VideoPlayer 
                video={video} 
                isActive={index === activeIndex} 
                onTip={onTipClick}
                onComment={onCommentClick}
                userAgeVerified={currentUser.isAgeVerified}
                isTransitioning={isTransitioning}
             />
          </div>
        ))}
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20" />
    </div>
  );
};

export default Feed;
