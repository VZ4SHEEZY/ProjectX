
import React from 'react';

// Skeleton pulse animation wrapper
export const Skeleton: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`animate-pulse bg-gray-800 rounded ${className}`}>
    {children}
  </div>
);

// Video Card Skeleton
export const VideoCardSkeleton: React.FC = () => (
  <div className="w-full aspect-[9/16] bg-black relative overflow-hidden">
    <Skeleton className="absolute inset-0" />
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-48" />
    </div>
    <div className="absolute right-4 bottom-20 flex flex-col gap-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  </div>
);

// Feed Skeleton (multiple videos)
export const FeedSkeleton: React.FC = () => (
  <div className="w-full h-full">
    <VideoCardSkeleton />
  </div>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="w-full p-4 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="w-20 h-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    
    {/* Stats */}
    <div className="flex gap-4">
      <Skeleton className="h-16 flex-1 rounded-lg" />
      <Skeleton className="h-16 flex-1 rounded-lg" />
      <Skeleton className="h-16 flex-1 rounded-lg" />
    </div>
    
    {/* Widgets */}
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  </div>
);

// Creator Dashboard Skeleton
export const CreatorDashboardSkeleton: React.FC = () => (
  <div className="w-full p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
    
    {/* Content */}
    <div className="grid grid-cols-2 gap-6">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  </div>
);

// Explore Skeleton
export const ExploreSkeleton: React.FC = () => (
  <div className="w-full p-4 space-y-4">
    <Skeleton className="h-12 w-full rounded-lg" />
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-10 w-24 rounded-full" />
      ))}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[3/4] rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

// Comment Skeleton
export const CommentSkeleton: React.FC = () => (
  <div className="flex gap-3 p-4">
    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

// Notification Skeleton
export const NotificationSkeleton: React.FC = () => (
  <div className="flex gap-3 p-4 border-b border-gray-800">
    <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-full" />
    </div>
    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
  </div>
);

// DM Skeleton
export const DMSkeleton: React.FC = () => (
  <div className="flex gap-3 p-3 border-b border-gray-800">
    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
    <Skeleton className="h-4 w-12" />
  </div>
);

// Search Result Skeleton
export const SearchResultSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-3">
    <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

// Loading Spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  }[size];
  
  return (
    <div className={`${sizeClass} border-gray-700 border-t-[#39FF14] rounded-full animate-spin`} />
  );
};

// Full Page Loader
export const FullPageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur flex flex-col items-center justify-center">
    <div className="relative mb-8">
      <div className="w-20 h-20 rounded-full border-4 border-gray-800" />
      <div className="absolute inset-0 rounded-full border-4 border-[#39FF14] border-t-transparent animate-spin" />
    </div>
    <p className="text-[#39FF14] font-mono text-sm animate-pulse">{message}</p>
  </div>
);

// Button Loader
export const ButtonLoader: React.FC = () => (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="sm" />
    <span className="text-sm">Loading...</span>
  </div>
);

// Image Loader with blur
export const ImageLoader: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const [loaded, setLoaded] = React.useState(false);
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}
      <img 
        src={src} 
        alt={alt} 
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

// Progress Bar
export const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => (
  <div className={`w-full h-2 bg-gray-800 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-gradient-to-r from-[#39FF14] to-[#FF00FF] transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

// Shimmer Effect
export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gray-800" />
    <div 
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
      style={{ 
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

export default {
  Skeleton,
  VideoCardSkeleton,
  FeedSkeleton,
  ProfileSkeleton,
  CreatorDashboardSkeleton,
  ExploreSkeleton,
  CommentSkeleton,
  NotificationSkeleton,
  DMSkeleton,
  SearchResultSkeleton,
  LoadingSpinner,
  FullPageLoader,
  ButtonLoader,
  ImageLoader,
  ProgressBar,
  Shimmer
};
