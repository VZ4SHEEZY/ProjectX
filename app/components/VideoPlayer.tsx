
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Video } from '../types';
import { Play, AlertTriangle, ShieldCheck, Cpu, ArrowBigUp, MessageSquare, Share2, Lock, Unlock, EyeOff, Heart, Check, Volume2, VolumeX, Bookmark, MoreHorizontal } from 'lucide-react';
import GlitchButton from './GlitchButton';
import { postAPI } from '../services/api';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  onTip: (address: string) => void;
  onComment?: () => void;
  userAgeVerified?: boolean;
  isTransitioning?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  video, 
  isActive, 
  onTip, 
  onComment, 
  userAgeVerified = false,
  isTransitioning = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted for sound
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Interaction State
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  
  // Gating Logic
  const [decrypted, setDecrypted] = useState(!video.isSensitive);
  const [unlocked, setUnlocked] = useState(!video.isPremium);

  // Strict NSFW Logic
  const canViewNSFW = !video.isNSFW || (video.isNSFW && userAgeVerified);

  // Play/Pause based on active state
  useEffect(() => {
    const canPlay = isActive && decrypted && unlocked && canViewNSFW && !isTransitioning;
    
    if (canPlay) {
      const playPromise = videoRef.current?.play();
      if (playPromise) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isActive, decrypted, unlocked, canViewNSFW, isTransitioning]);

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current || !decrypted || !unlocked || !canViewNSFW) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    resetControlsTimeout();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const handleDecrypt = () => {
    setDecrypted(true);
  };

  const handleTipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTip(video.user.walletAddress);
  };

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTip(video.user.walletAddress);
    setTimeout(() => {
        setUnlocked(true);
    }, 5000);
  };

  // --- INTERACTION HANDLERS ---

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isLiked) {
        // Unlike: call backend to remove like
        await postAPI.unlikePost(video.id);
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like: call backend to add like
        await postAPI.likePost(video.id);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        // Show like animation
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 800);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      try {
        await postAPI.likePost(video.id);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 800);
      } catch (error) {
        console.error('Like error:', error);
      }
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  const handleComment = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onComment) onComment();
  };

  const handleShare = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const shareData = {
          title: `CyberDope // ${video.user.username}`,
          text: video.description,
          url: window.location.href
      };

      // 1. Try Native Share (Mobile)
      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Share canceled');
          }
      } else {
          // 2. Fallback to Clipboard (Desktop)
          try {
            await navigator.clipboard.writeText(shareData.url);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
          } catch (err) {
            // 3. Fallback for insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = shareData.url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
          }
      }
  };

  // BLOCK RENDER IF NSFW AND NOT VERIFIED
  if (!canViewNSFW) {
      return (
        <div className="relative w-full h-full bg-black snap-start shrink-0 overflow-hidden flex flex-col items-center justify-center p-8 text-center border-b border-pink-900">
             <div className="bg-pink-900/20 p-6 rounded-lg border-2 border-pink-600 animate-pulse">
                <EyeOff className="w-16 h-16 text-pink-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-pink-600 tracking-widest mb-2">RESTRICTED ACCESS</h2>
                <p className="text-gray-400 font-mono text-xs">
                    AGE VERIFICATION REQUIRED (18+)
                </p>
                <div className="mt-4 text-[10px] text-pink-800 font-mono uppercase">
                    Protocol 18.b // Identity_Check_Fail
                </div>
             </div>
        </div>
      );
  }

  return (
    <div 
      className="relative w-full h-full bg-black snap-start shrink-0 overflow-hidden"
      onClick={togglePlay}
      onDoubleClick={handleDoubleClick}
    >
      
      {/* Share Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-[#39FF14] text-black px-4 py-2 rounded-full font-bold font-mono text-xs shadow-[0_0_20px_#39FF14] transition-all duration-300 pointer-events-none flex items-center gap-2 ${showShareToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <Check size={14} /> LINK COPIED
      </div>

      {/* Like Animation Overlay */}
      {showLikeAnimation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Heart className="w-32 h-32 text-[#FF00FF] fill-[#FF00FF] animate-ping" />
        </div>
      )}

      {/* Video Element with Gating Blur */}
      <video
        ref={videoRef}
        src={video.url}
        loop
        playsInline
        autoPlay={isActive}
        muted={isMuted}
        controls={false}
        className={`w-full h-full object-cover transition-all duration-500 ${(!decrypted || !unlocked) ? 'blur-2xl opacity-50 scale-110' : 'opacity-100 scale-100'}`}
      />

      {/* 1. Sensitive Content Overlay */}
      {!decrypted && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-6 text-center">
            <div className="border-2 border-[#FF00FF] p-4 rounded-full mb-6 animate-pulse shadow-[0_0_30px_#FF00FF]">
               <AlertTriangle className="w-12 h-12 text-[#FF00FF]" />
            </div>
            <h2 className="text-3xl font-bold text-[#FF00FF] mb-2 tracking-widest glitch-text">WARNING</h2>
            <p className="text-white font-mono text-sm mb-8 tracking-widest border-b border-[#FF00FF] pb-2">
                RESTRICTED VISUALS
            </p>
            <GlitchButton variant="danger" onClick={handleDecrypt}>
                <ShieldCheck className="w-4 h-4" /> DECRYPT STREAM
            </GlitchButton>
        </div>
      )}

      {/* 2. Premium Paywall Overlay */}
      {decrypted && !unlocked && (
         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center">
             <div className="border-2 border-yellow-500 p-4 rounded-full mb-4 shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                 <Lock className="w-10 h-10 text-yellow-500" />
             </div>
             <h2 className="text-2xl font-bold text-yellow-500 mb-2 tracking-widest font-mono">PREMIUM CONTENT</h2>
             <p className="text-gray-400 font-mono text-xs mb-6 max-w-xs">
                 This data stream requires a value exchange to decrypt.
             </p>
             <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 mb-6 rounded text-yellow-500 font-mono font-bold">
                 PRICE: {video.price || '0.05'} ETH
             </div>
             <GlitchButton onClick={handlePurchase} className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                 <Unlock className="w-4 h-4" /> UNLOCK CONTENT
             </GlitchButton>
         </div>
      )}

      {/* Interface Overlay (Only visible if decrypted) */}
      {decrypted && (
        <div className={`absolute inset-0 z-10 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Top Bar */}
          <div className="flex justify-between items-start pt-14 sm:pt-16 px-3 sm:px-4">
             <div className="text-[8px] sm:text-[9px] font-mono text-[#39FF14] bg-black/60 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-[#39FF14]/30 rounded">
                REC :: {video.id.substring(0, 8)}
             </div>
             <div className="flex flex-col items-end gap-1">
                {video.isPremium && unlocked && (
                    <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-black bg-yellow-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm">
                        <Unlock size={8} className="sm:w-2.5 sm:h-2.5" /> UNLOCKED
                    </div>
                )}
                {video.isNSFW && (
                    <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-white bg-pink-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm border border-pink-400">
                        <EyeOff size={8} className="sm:w-2.5 sm:h-2.5" /> 18+
                    </div>
                )}
             </div>
          </div>

          {/* Bottom Content Area */}
          <div className="bg-gradient-to-t from-black via-black/70 to-transparent pt-24 sm:pt-32 pb-20 sm:pb-8 px-3 sm:px-4">
            <div className="flex items-end justify-between">
                
                {/* Left: Text Metadata */}
                <div className="w-[60%] sm:w-[65%] pointer-events-auto">
                    {/* User Info */}
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="relative">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#39FF14] overflow-hidden">
                                <img src={video.user.avatar} alt="user" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-[#39FF14] rounded-full flex items-center justify-center">
                                <Check size={8} className="text-black sm:w-2.5 sm:h-2.5" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                                @{video.user.username}
                            </h3>
                            <p className="text-[9px] sm:text-[10px] text-[#39FF14] font-mono truncate">
                                {video.user.faction || 'UNAFFILIATED'}
                            </p>
                        </div>
                        <button className="ml-1 sm:ml-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-[#39FF14] text-black text-[9px] sm:text-[10px] font-bold rounded hover:bg-white transition-colors flex-shrink-0">
                            FOLLOW
                        </button>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs sm:text-sm text-white mb-2 line-clamp-2 leading-relaxed">
                        {video.description}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        {video.tags.slice(0, 4).map(t => (
                            <span key={t} className="text-[9px] sm:text-[10px] font-mono text-[#39FF14] hover:underline cursor-pointer">
                                #{t}
                            </span>
                        ))}
                        {video.tags.length > 4 && (
                            <span className="text-[9px] sm:text-[10px] font-mono text-gray-500">+{video.tags.length - 4}</span>
                        )}
                    </div>
                    
                    {/* Audio Info */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex gap-0.5 items-end h-3 sm:h-4">
                             <div className={`w-0.5 bg-[#39FF14] ${!isMuted ? 'animate-pulse h-full' : 'h-2'}`} />
                             <div className={`w-0.5 bg-[#39FF14] ${!isMuted ? 'animate-pulse delay-75 h-2/3' : 'h-3'}`} />
                             <div className={`w-0.5 bg-[#39FF14] ${!isMuted ? 'animate-pulse delay-150 h-3/4' : 'h-2'}`} />
                        </div>
                        <div className="whitespace-nowrap text-[10px] sm:text-[11px] text-white font-medium truncate max-w-[120px] sm:max-w-none">
                            {video.user.username} - Original Audio
                        </div>
                    </div>
                </div>

                {/* Right: Action Buttons - TikTok Style */}
                <div className="flex flex-col gap-3 sm:gap-5 items-center pointer-events-auto pb-2 sm:pb-4">
                    
                    {/* Profile Avatar with Follow */}
                    <div className="relative mb-1 sm:mb-2">
                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-white overflow-hidden">
                            <img src={video.user.avatar} alt="user" className="w-full h-full object-cover" />
                        </div>
                        <button className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 sm:w-6 sm:h-6 bg-[#FF00FF] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                            <span className="text-white text-base sm:text-lg leading-none">+</span>
                        </button>
                    </div>

                    {/* Like Button */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <button 
                            onClick={handleLike}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-300 btn-touch ${isLiked ? 'text-[#FF00FF]' : 'text-white hover:text-[#FF00FF]'}`}
                        >
                            <Heart className={`w-6 h-6 sm:w-7 sm:h-7 ${isLiked ? 'fill-[#FF00FF]' : ''}`} />
                        </button>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                    </div>

                    {/* Comment Button */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <button 
                            onClick={handleComment}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:text-[#00FFFF] transition-colors btn-touch"
                        >
                            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-md">{(video.comments || 240).toLocaleString()}</span>
                    </div>

                    {/* Bookmark Button */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <button 
                            onClick={handleBookmark}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-colors btn-touch ${isBookmarked ? 'text-yellow-400' : 'text-white hover:text-yellow-400'}`}
                        >
                            <Bookmark className={`w-6 h-6 sm:w-7 sm:h-7 ${isBookmarked ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-md">
                            {isBookmarked ? 'Saved' : 'Save'}
                        </span>
                    </div>

                    {/* Share Button */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <button 
                            onClick={handleShare}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:text-cyan-400 transition-colors active:scale-95 btn-touch"
                        >
                            <Share2 className="w-6 h-6 sm:w-7 sm:h-7" />
                        </button>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-md">{(video.shares || 89).toLocaleString()}</span>
                    </div>

                    {/* Tip Button */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <button 
                            onClick={handleTipClick}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-[#39FF14] flex items-center justify-center hover:bg-[#39FF14] hover:text-black transition-all shadow-[0_0_10px_rgba(57,255,20,0.2)] btn-touch"
                        >
                            <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#39FF14] drop-shadow-md">TIP</span>
                    </div>

                    {/* More Options */}
                    <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:text-gray-300 transition-colors mt-1 sm:mt-2 btn-touch">
                        <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Spinning Record */}
                    <div className="relative mt-1 sm:mt-2">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black border-2 border-gray-700 overflow-hidden ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`}>
                            <img src={video.user.avatar} alt="" className="w-full h-full object-cover opacity-70" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-black border border-gray-600" />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Play/Pause Center Indicator */}
          {!isPlaying && decrypted && unlocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                  </div>
              </div>
          )}

          {/* Mute Button - Bottom Right */}
          <button 
              onClick={toggleMute}
              className="absolute bottom-20 sm:bottom-24 right-[4.5rem] sm:right-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center transition-all text-white hover:bg-white/20 btn-touch"
          >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
