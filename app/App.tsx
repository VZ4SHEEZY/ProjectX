
import React, { useState, useEffect } from 'react';
import VideoFeed from './components/Feed';
import ProfileGrid from './components/ProfileGrid';
import AuthPage from './components/AuthPage';
import TipModal from './components/TipModal';
import UploadModal from './components/UploadModal';
import CybotModal from './components/CybotModal';
import BiometricScanner from './components/BiometricScanner';
import FactionReveal from './components/FactionReveal';
import AgeVerificationModal from './components/AgeVerificationModal';
import CreatorDashboard from './components/CreatorDashboard';
import PostComposer from './components/PostComposer';
import ExplorePage from './components/ExplorePage';
import SubscriptionTiers from './components/SubscriptionTiers';

// New Components
import SearchSystem from './components/SearchSystem';
import WalletConnect from './components/WalletConnect';
import NotificationSystem from './components/NotificationSystem';
import CommentSystem from './components/CommentSystem';
import DMChat from './components/DMChat';
import SettingsPage from './components/SettingsPage';
import ThemeEditor from './components/ThemeEditor';
import LiveStream from './components/LiveStream';
import { Stories, CreateStory } from './components/Stories';
import { Groups } from './components/Groups';
import { AIChatAssistant } from './components/AIGenerator';

import { User } from './types';
import { 
  Wallet, Zap, User as UserIcon, Settings, 
  Mail, Bell, Search, LogOut, LayoutGrid, Crown, Plus,
  BarChart3, Home, Compass, Radio, Image, Users, Menu, X
} from 'lucide-react';

type OnboardingStep = 'auth' | 'scanning' | 'reveal' | 'app';
type MainView = 'feed' | 'profile' | 'explore' | 'creator';

const mapApiUser = (apiUser: any): User => ({
  id: apiUser.id || apiUser._id,
  username: apiUser.username,
  walletAddress: apiUser.walletAddress || '',
  btcAddress: apiUser.btcAddress || '',
  avatar: apiUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiUser.username}`,
  bio: apiUser.bio || '',
  faction: apiUser.faction || 'Unaffiliated',
  isVerified: apiUser.isVerified || false,
  isAgeVerified: apiUser.isAgeVerified || false,
  followersCount: apiUser.followersCount || 0,
  followingCount: apiUser.followingCount || 0,
  postsCount: apiUser.postsCount || 0,
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('auth');
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentView, setCurrentView] = useState<MainView>('feed');
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCybotOpen, setIsCybotOpen] = useState(false);
  
  // New modals
  const [isAgeVerificationOpen, setIsAgeVerificationOpen] = useState(false);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [isSubscriptionTiersOpen, setIsSubscriptionTiersOpen] = useState(false);
  
  // New functional components
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeEditorOpen, setIsThemeEditorOpen] = useState(false);
  const [isLiveStreamOpen, setIsLiveStreamOpen] = useState(false);
  
  // New Feature States
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string>('0');
  
  const [activeCreatorAddress, setActiveCreatorAddress] = useState<string>('');

  // Initial loading + session restore (validates token against real API)
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('cdToken');
      const storedUser = localStorage.getItem('cdUser');

      if (!token || !storedUser) {
        // No credentials at all — go to auth
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with a 8s timeout (Render cold starts can be slow)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://cyberdope-api.onrender.com/api'}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user || JSON.parse(storedUser);
          localStorage.setItem('cdUser', JSON.stringify(freshUser));
          setUser(mapApiUser(freshUser));
          setOnboardingStep('app');
        } else {
          // Token invalid or expired — wipe and send to auth
          localStorage.removeItem('cdToken');
          localStorage.removeItem('cdUser');
        }
      } catch (e) {
        // Network error / timeout — don't trust stale cache, send to auth
        localStorage.removeItem('cdToken');
        localStorage.removeItem('cdUser');
      }

      setIsLoading(false);
    };
    restore();
  }, []);

  // 1. Auth Success -> Handle Routing based on user status
  const handleLoginSuccess = (isNewUser: boolean) => {
    const storedUser = localStorage.getItem('cdUser');
    if (storedUser) {
      try {
        setUser(mapApiUser(JSON.parse(storedUser)));
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    if (isNewUser) {
      setOnboardingStep('scanning');
    } else {
      setOnboardingStep('app');
    }
  };

  // 2. Scanner Success -> Go to Faction Reveal
  const handleScanComplete = () => {
    setOnboardingStep('reveal');
  };

  // 3. Reveal Success -> Enter App
  const handleRevealComplete = (faction: string) => {
    if (user) {
      setUser({ ...user, faction });
    }
    setOnboardingStep('app');
  };

  // Tip Modal Handler
  const handleTipClick = (address: string) => {
    setActiveCreatorAddress(address);
    setIsTipModalOpen(true);
  };

  // Handle profile updates from profile save
  const handleProfileUpdate = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      const storedUser = localStorage.getItem('cdUser');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          localStorage.setItem('cdUser', JSON.stringify({ ...u, ...updates }));
        } catch (e) {}
      }
    }
  };

  // Handle Age Verification from Settings
  const handleVerificationUpdate = (status: boolean) => {
    if (user) {
      setUser({ ...user, isAgeVerified: status });
      const storedUser = localStorage.getItem('cdUser');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          u.isAgeVerified = status;
          localStorage.setItem('cdUser', JSON.stringify(u));
        } catch (e) {}
      }
    }
  };

  // Handle Age Verification from modal
  const handleAgeVerify = (method: 'wallet' | 'document' | 'nft') => {
    handleVerificationUpdate(true);
    setIsAgeVerificationOpen(false);
  };

  // Wallet handlers
  const handleWalletConnect = (address: string, balance: string) => {
    setWalletAddress(address);
    setWalletBalance(balance);
    const storedUser = localStorage.getItem('cdUser');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        u.walletAddress = address;
        localStorage.setItem('cdUser', JSON.stringify(u));
      } catch (e) {}
    }
  };

  const handleWalletDisconnect = () => {
    setWalletAddress('');
    setWalletBalance('0');
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('cdToken');
    localStorage.removeItem('cdUser');
    setUser(null);
    setOnboardingStep('auth');
    setCurrentView('feed');
    setWalletAddress('');
    setWalletBalance('0');
  };

  // Handle post publish
  const handlePublishPost = (post: any) => {
    console.log('Publishing post:', post);
    setIsPostComposerOpen(false);
  };

  // Handle subscription tiers save
  const handleSaveTiers = (tiers: any[]) => {
    console.log('Saving tiers:', tiers);
    setIsSubscriptionTiersOpen(false);
  };

  // Navigation handler - switches between main views
  const navigateTo = (view: MainView) => {
    setCurrentView(view);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // ESC to close modals
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        if (isNotificationsOpen) setIsNotificationsOpen(false);
        if (isDMOpen) setIsDMOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isNotificationsOpen, isDMOpen]);

  // --- RENDER FLOW ---

  // Loading Screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39FF14] border-t-transparent animate-spin" />
        </div>
        <h1 className="text-2xl font-bold tracking-tighter italic text-white mb-2">CYBER//DOPE</h1>
        <p className="text-[#39FF14] font-mono text-sm animate-pulse">INITIALIZING...</p>
      </div>
    );
  }

  // Step 1: Authentication
  if (!user || onboardingStep === 'auth') {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Step 2: Biometric Scanner
  if (onboardingStep === 'scanning') {
    return <BiometricScanner onScanComplete={handleScanComplete} />;
  }

  // Step 3: Faction Reveal
  if (onboardingStep === 'reveal') {
    return <FactionReveal onComplete={handleRevealComplete} />;
  }

  // Step 4: Main Application
  return (
    <div className="min-h-screen bg-[var(--background-color,#050505)] text-[var(--primary-color,#39FF14)] font-mono flex flex-col relative overflow-hidden">
      {/* Scanlines Effect */}
      <div className="scanlines-effect fixed inset-0 pointer-events-none z-[1] opacity-30" 
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}
      />
      
      {/* 1. Header - Always Visible */}
      <header className="fixed top-0 left-0 w-full z-40 bg-black/95 backdrop-blur-xl border-b border-[var(--primary-color,#39FF14)]/20 h-14 md:h-16 flex items-center justify-between px-3 md:px-4 safe-top">
        {/* Left: Logo + Mobile Menu Button */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          
          {/* Glitch Logo */}
          <div className="relative group cursor-pointer" onClick={() => navigateTo('feed')}>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tighter italic text-white mix-blend-difference z-10 relative">
              CYBER//DOPE
            </h1>
            <div className="absolute top-0 left-0 text-[var(--primary-color,#39FF14)] opacity-50 translate-x-[2px] group-hover:translate-x-1 transition-transform hidden sm:block">CYBER//DOPE</div>
            <div className="absolute top-0 left-0 text-[var(--secondary-color,#FF00FF)] opacity-50 translate-x-[-2px] group-hover:translate-x-[-1px] transition-transform hidden sm:block">CYBER//DOPE</div>
          </div>
        </div>

        {/* Desktop Center Navigation - Main Views */}
        <nav className="hidden md:flex items-center gap-1 bg-black/50 rounded-lg p-1 border border-gray-800">
          <NavButton 
            active={currentView === 'feed'}
            onClick={() => navigateTo('feed')}
            icon={Home}
            label="FEED"
          />
          <NavButton 
            active={currentView === 'explore'}
            onClick={() => navigateTo('explore')}
            icon={Compass}
            label="EXPLORE"
          />
          <NavButton 
            active={currentView === 'creator'}
            onClick={() => navigateTo('creator')}
            icon={BarChart3}
            label="CREATOR"
            accent="var(--secondary-color,#FF00FF)"
          />
          <NavButton 
            active={currentView === 'profile'}
            onClick={() => navigateTo('profile')}
            icon={UserIcon}
            label="PROFILE"
          />
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
          {/* Search - Always visible */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-500 hover:text-[var(--primary-color,#39FF14)] hover:bg-[var(--primary-color,#39FF14)]/10 rounded-lg transition-all btn-touch"
            title="Search (CMD+K)"
          >
             <Search size={18} />
          </button>

          {/* Notifications - Desktop only */}
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center text-gray-500 hover:text-[var(--secondary-color,#FF00FF)] hover:bg-[var(--secondary-color,#FF00FF)]/10 rounded-lg transition-colors relative btn-touch"
          >
             <Bell size={18} />
             <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--secondary-color,#FF00FF)] rounded-full animate-pulse" />
          </button>

          {/* Messages - Desktop only */}
          <button 
            onClick={() => setIsDMOpen(true)}
            className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center text-gray-500 hover:text-[var(--primary-color,#39FF14)] hover:bg-[var(--primary-color,#39FF14)]/10 rounded-lg transition-colors btn-touch"
          >
             <Mail size={18} />
          </button>

          {/* Stories - Desktop only */}
          <button 
            onClick={() => setIsStoriesOpen(true)}
            className="hidden md:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center text-gray-500 hover:text-pink-500 hover:bg-pink-500/10 rounded-lg transition-colors btn-touch"
          >
             <Image size={18} />
          </button>

          {/* Groups - Desktop only */}
          <button 
            onClick={() => setIsGroupsOpen(true)}
            className="hidden md:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center text-gray-500 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors btn-touch"
          >
             <Users size={18} />
          </button>

          <div className="hidden md:block w-[1px] h-6 bg-gray-800 mx-1" />

          {/* Wallet Connect - Desktop only */}
          <button 
            onClick={() => setIsWalletOpen(true)}
            className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all btn-touch ${
              walletAddress 
                ? 'bg-[var(--primary-color,#39FF14)]/20 text-[var(--primary-color,#39FF14)] border border-[var(--primary-color,#39FF14)]/50' 
                : 'border border-[var(--primary-color,#39FF14)] text-[var(--primary-color,#39FF14)] hover:bg-[var(--primary-color,#39FF14)] hover:text-black'
            }`}
          >
            <Wallet size={14} />
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'CONNECT'}
          </button>

          {/* Settings - Desktop only */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
             <Settings size={18} />
          </button>

          {/* Logout - Desktop only */}
          <button 
            onClick={handleLogout}
            className="hidden md:flex w-10 h-10 items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Logout"
          >
             <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/95 backdrop-blur-xl pt-14">
          <div className="p-4 space-y-2">
            {/* Mobile Navigation Items */}
            <MobileMenuItem
              active={currentView === 'feed'}
              onClick={() => { navigateTo('feed'); setIsMobileMenuOpen(false); }}
              icon={Home}
              label="Feed"
            />
            <MobileMenuItem
              active={currentView === 'explore'}
              onClick={() => { navigateTo('explore'); setIsMobileMenuOpen(false); }}
              icon={Compass}
              label="Explore"
            />
            <MobileMenuItem
              active={currentView === 'creator'}
              onClick={() => { navigateTo('creator'); setIsMobileMenuOpen(false); }}
              icon={BarChart3}
              label="Creator Dashboard"
              accent="var(--secondary-color,#FF00FF)"
            />
            <MobileMenuItem
              active={currentView === 'profile'}
              onClick={() => { navigateTo('profile'); setIsMobileMenuOpen(false); }}
              icon={UserIcon}
              label="Profile"
            />
            
            <div className="border-t border-gray-800 my-4" />
            
            {/* Quick Actions */}
            <MobileMenuItem
              onClick={() => { setIsStoriesOpen(true); setIsMobileMenuOpen(false); }}
              icon={Image}
              label="Stories"
              color="text-pink-400"
            />
            <MobileMenuItem
              onClick={() => { setIsGroupsOpen(true); setIsMobileMenuOpen(false); }}
              icon={Users}
              label="Communities"
              color="text-cyan-400"
            />
            <MobileMenuItem
              onClick={() => { setIsNotificationsOpen(true); setIsMobileMenuOpen(false); }}
              icon={Bell}
              label="Notifications"
              badge={true}
            />
            <MobileMenuItem
              onClick={() => { setIsDMOpen(true); setIsMobileMenuOpen(false); }}
              icon={Mail}
              label="Messages"
            />
            <MobileMenuItem
              onClick={() => { setIsWalletOpen(true); setIsMobileMenuOpen(false); }}
              icon={Wallet}
              label={walletAddress ? `Wallet: ${walletAddress.slice(0, 6)}...` : 'Connect Wallet'}
              color="text-[var(--primary-color,#39FF14)]"
            />
            
            <div className="border-t border-gray-800 my-4" />
            
            <MobileMenuItem
              onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
              icon={Settings}
              label="Settings"
            />
            <MobileMenuItem
              onClick={handleLogout}
              icon={LogOut}
              label="Logout"
              color="text-red-400"
            />
          </div>
        </div>
      )}

      {/* 2. Main Content Area - Switches based on currentView */}
      <main className="flex-1 relative overflow-hidden pt-14 md:pt-16 pb-16 md:pb-10">
        
        {/* FEED VIEW */}
        {currentView === 'feed' && (
          <VideoFeed 
            onTipClick={handleTipClick} 
            onCommentClick={() => setIsCommentsOpen(true)}
            currentUser={user} 
          />
        )}
        
        {/* EXPLORE VIEW */}
        {currentView === 'explore' && (
          <div className="h-full w-full overflow-y-auto">
            <ExplorePage 
              isAgeVerified={user.isAgeVerified || false}
              onContentClick={(content) => {
                if (content.isNSFW && !user.isAgeVerified) {
                  setIsAgeVerificationOpen(true);
                } else {
                  console.log('Opening content:', content);
                }
              }}
            />
          </div>
        )}
        
        {/* CREATOR VIEW */}
        {currentView === 'creator' && (
          <div className="h-full w-full overflow-y-auto bg-[var(--background-color,#050505)]">
            <CreatorDashboard 
              isOpen={true}
              onClose={() => navigateTo('feed')}
              onCreatePost={() => setIsPostComposerOpen(true)}
            />
          </div>
        )}
        
        {/* PROFILE VIEW */}
        {currentView === 'profile' && (
          <div className="h-full w-full overflow-y-auto">
             <ProfileGrid user={user} onTip={handleTipClick} />
          </div>
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[calc(3.5rem+var(--sab))] bg-black/95 backdrop-blur-xl border-t border-[var(--primary-color,#39FF14)]/30 grid grid-cols-5 items-start pt-2 safe-bottom">
        
        {/* FEED */}
        <MobileNavButton 
          active={currentView === 'feed'}
          onClick={() => navigateTo('feed')}
          icon={Home}
          label="FEED"
        />

        {/* EXPLORE */}
        <MobileNavButton 
          active={currentView === 'explore'}
          onClick={() => navigateTo('explore')}
          icon={Compass}
          label="EXPLORE"
        />

        {/* CREATE (Center) */}
        <div className="relative flex items-center justify-center -mt-6">
          <button 
            onClick={() => setIsPostComposerOpen(true)}
            className="w-14 h-14 bg-gradient-to-br from-[var(--primary-color,#39FF14)] to-[#2dd412] rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(57,255,20,0.6)] hover:scale-110 active:scale-95 transition-all btn-touch"
          >
            <Plus size={26} className="text-black" strokeWidth={3} />
          </button>
        </div>
        
        {/* CREATOR */}
        <MobileNavButton 
          active={currentView === 'creator'}
          onClick={() => navigateTo('creator')}
          icon={BarChart3}
          label="CREATOR"
          accent="var(--secondary-color,#FF00FF)"
        />

        {/* PROFILE */}
        <MobileNavButton 
          active={currentView === 'profile'}
          onClick={() => navigateTo('profile')}
          icon={UserIcon}
          label="PROFILE"
        />
      </nav>

      {/* Desktop Bottom Status Bar */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-full z-50 h-10 bg-black/90 backdrop-blur border-t border-gray-800 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--primary-color,#39FF14)] animate-pulse" />
            <span className="hidden sm:inline">SYSTEM ONLINE</span>
            <span className="sm:hidden">ONLINE</span>
          </span>
          <span className="text-gray-700 hidden sm:inline">|</span>
          <span className="hidden sm:inline">v2.0.1</span>
          <span className="text-gray-700">|</span>
          <span className="truncate max-w-[80px] lg:max-w-none">{user.username}</span>
          {user.isAgeVerified && (
            <>
              <span className="text-gray-700 hidden sm:inline">|</span>
              <span className="text-pink-500 flex items-center gap-1 hidden sm:flex">
                <span>🔞</span>
                <span className="hidden lg:inline">18+ VERIFIED</span>
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          {!user.isAgeVerified && (
            <button 
              onClick={() => setIsAgeVerificationOpen(true)}
              className="flex items-center gap-2 text-pink-500 hover:text-pink-400 text-xs transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="hidden lg:inline">VERIFY AGE FOR 18+ CONTENT</span>
              <span className="lg:hidden hidden sm:inline">VERIFY AGE</span>
            </button>
          )}
          <button 
            onClick={() => setIsLiveStreamOpen(true)}
            className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 bg-red-500/20 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white transition-colors"
          >
            <Radio size={12} className="animate-pulse" />
            <span className="hidden sm:inline">GO LIVE</span>
          </button>
        </div>
      </div>

      {/* 4. Global Modals - All the new functional components */}
      
      {/* Search */}
      <SearchSystem 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onResultClick={(result) => console.log('Selected:', result)}
        isAgeVerified={user.isAgeVerified || false}
      />

      {/* Wallet Connect */}
      <WalletConnect 
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        onConnect={handleWalletConnect}
        onDisconnect={handleWalletDisconnect}
        connectedAddress={walletAddress}
        connectedBalance={walletBalance}
      />

      {/* Notifications */}
      <NotificationSystem 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Comments */}
      <CommentSystem 
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        contentId="post-123"
        currentUser={{ name: user.username, avatar: user.avatar }}
      />

      {/* DM Chat */}
      <DMChat 
        isOpen={isDMOpen}
        onClose={() => setIsDMOpen(false)}
        currentUser={{ name: user.username, avatar: user.avatar }}
      />

      {/* Settings */}
      <SettingsPage
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={{ 
          name: user.username, 
          email: '', 
          bio: user.bio, 
          isAgeVerified: user.isAgeVerified 
        }}
        onVerify={handleVerificationUpdate}
      />

      {/* Theme Editor */}
      <ThemeEditor 
        isOpen={isThemeEditorOpen}
        onClose={() => setIsThemeEditorOpen(false)}
      />

      {/* Live Stream */}
      <LiveStream 
        isOpen={isLiveStreamOpen}
        onClose={() => setIsLiveStreamOpen(false)}
        currentUser={{ name: user.username, avatar: user.avatar }}
      />

      {/* Legacy Modals */}
      <TipModal 
        isOpen={isTipModalOpen} 
        onClose={() => setIsTipModalOpen(false)} 
        creatorAddress={activeCreatorAddress} 
      />

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        currentUser={user}
      />

      <CybotModal 
        isOpen={isCybotOpen} 
        onClose={() => setIsCybotOpen(false)} 
      />

      <AgeVerificationModal 
        isOpen={isAgeVerificationOpen}
        onClose={() => setIsAgeVerificationOpen(false)}
        onVerify={handleAgeVerify}
      />

      <PostComposer 
        isOpen={isPostComposerOpen}
        onClose={() => setIsPostComposerOpen(false)}
        onPublish={handlePublishPost}
      />

      <SubscriptionTiers 
        isOpen={isSubscriptionTiersOpen}
        onClose={() => setIsSubscriptionTiersOpen(false)}
        onSave={handleSaveTiers}
      />

      {/* NEW FEATURES */}
      
      {/* Stories */}
      {isStoriesOpen && (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
          <div className="max-w-2xl mx-auto p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-black/90 backdrop-blur-xl py-3 z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Stories</h2>
              <button 
                onClick={() => setIsStoriesOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors btn-touch"
              >
                <X size={24} />
              </button>
            </div>
            <Stories 
              onCreateStory={() => setIsCreateStoryOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Create Story */}
      {isCreateStoryOpen && (
        <CreateStory 
          onClose={() => setIsCreateStoryOpen(false)}
          onCreated={() => {
            setIsCreateStoryOpen(false);
            // Refresh stories
          }}
        />
      )}

      {/* Groups */}
      {isGroupsOpen && (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
          <div className="max-w-4xl mx-auto p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-black/90 backdrop-blur-xl py-3 z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Communities</h2>
              <button 
                onClick={() => setIsGroupsOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors btn-touch"
              >
                <X size={24} />
              </button>
            </div>
            <Groups />
          </div>
        </div>
      )}

      {/* AI Chat Assistant */}
      <AIChatAssistant />
      
    </div>
  );
};

// Desktop Navigation Button Component
interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  accent?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label, accent = 'var(--primary-color,#39FF14)' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 lg:px-4 py-2 rounded-md text-xs font-bold tracking-wider transition-all duration-200
        ${active 
          ? 'bg-white/10 text-white' 
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
        }
      `}
      style={{
        color: active ? accent : undefined,
        backgroundColor: active ? `${accent}20` : undefined
      }}
    >
      <Icon size={16} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
};

// Mobile Navigation Button Component
interface MobileNavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  accent?: string;
}

const MobileNavButton: React.FC<MobileNavButtonProps> = ({ active, onClick, icon: Icon, label, accent = 'var(--primary-color,#39FF14)' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-200 btn-touch
        ${active ? 'text-white' : 'text-gray-500'}
      `}
      style={{ color: active ? accent : undefined }}
    >
      <Icon size={20} className={active ? 'fill-current' : ''} style={{ fill: active ? `${accent}30` : 'transparent' }} />
      <span className="text-[7px] font-bold tracking-wider">{label}</span>
    </button>
  );
};

// Mobile Menu Item Component
interface MobileMenuItemProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  accent?: string;
  color?: string;
  badge?: boolean;
}

const MobileMenuItem: React.FC<MobileMenuItemProps> = ({ 
  active = false, 
  onClick, 
  icon: Icon, 
  label, 
  accent = 'var(--primary-color,#39FF14)',
  color,
  badge
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 btn-touch
        ${active 
          ? 'bg-white/10 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
      style={{ color: active ? accent : color }}
    >
      <div className="relative">
        <Icon size={22} />
        {badge && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--secondary-color,#FF00FF)] rounded-full animate-pulse" />
        )}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {active && (
        <div 
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
    </button>
  );
};

export default App;
