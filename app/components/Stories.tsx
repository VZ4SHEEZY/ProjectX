import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { storiesAPI } from '../services/stories';

interface Story {
  _id: string;
  user: {
    _id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  views: any[];
  reactions: any[];
}

interface StoriesProps {
  onCreateStory?: () => void;
}

export const Stories: React.FC<StoriesProps> = ({ onCreateStory }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (activeStory && !isPaused) {
      startProgress();
    }
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [activeStory, activeIndex, isPaused]);

  const fetchStories = async () => {
    try {
      const response = await storiesAPI.getFeed();
      // Flatten stories from all users
      const allStories = response.stories.flatMap((group: any) => group.stories);
      setStories(allStories);
    } catch (error) {
      console.error('Fetch Stories Error:', error);
    }
  };

  const startProgress = () => {
    setProgress(0);
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
    
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2; // 5 seconds total
      });
    }, 100);
  };

  const nextStory = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex(prev => prev + 1);
      setActiveStory(stories[activeIndex + 1]);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
      setActiveStory(stories[activeIndex - 1]);
    }
  };

  const closeStory = () => {
    setActiveStory(null);
    setActiveIndex(0);
    setProgress(0);
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
  };

  const handleReact = async (reaction: string) => {
    if (!activeStory) return;
    try {
      await storiesAPI.reactToStory(activeStory._id, reaction);
    } catch (error) {
      console.error('React Error:', error);
    }
  };

  const handleReply = async (message: string) => {
    if (!activeStory) return;
    try {
      await storiesAPI.replyToStory(activeStory._id, message);
    } catch (error) {
      console.error('Reply Error:', error);
    }
  };

  // Group stories by user
  const groupedStories = stories.reduce((acc: any, story) => {
    const userId = story.user._id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.user,
        stories: [],
        hasUnseen: false
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {});

  return (
    <div className="w-full">
      {/* Stories Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Create Story Button */}
        <button
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-2 group"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-500 
                        flex items-center justify-center bg-gray-900 group-hover:bg-purple-500/20 
                        transition-colors">
            <Plus className="w-6 h-6 text-purple-400" />
          </div>
          <span className="text-xs text-gray-400">Add Story</span>
        </button>

        {/* Story Circles */}
        {Object.values(groupedStories).map((group: any) => (
          <button
            key={group.user._id}
            onClick={() => {
              setActiveStory(group.stories[0]);
              setActiveIndex(stories.findIndex(s => s._id === group.stories[0]._id));
            }}
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <div className={`w-16 h-16 rounded-full p-0.5 ${
              group.hasUnseen 
                ? 'bg-gradient-to-tr from-purple-500 to-pink-500' 
                : 'bg-gray-700'
            }`}>
              <img
                src={group.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.username}`}
                alt={group.user.displayName}
                className="w-full h-full rounded-full object-cover border-2 border-gray-900"
              />
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[64px]">
              {group.user.displayName}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      {activeStory && (
        <div 
          className="fixed inset-0 z-50 bg-black"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100"
                  style={{ 
                    width: idx < activeIndex ? '100%' : idx === activeIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <img
                src={activeStory.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeStory.user.username}`}
                alt={activeStory.user.displayName}
                className="w-10 h-10 rounded-full border-2 border-purple-500"
              />
              <div>
                <p className="font-semibold text-white">{activeStory.user.displayName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(activeStory.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={closeStory}
              className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Story Content */}
          <div className="h-full flex items-center justify-center">
            {activeStory.mediaType === 'video' ? (
              <video
                src={activeStory.mediaUrl}
                autoPlay
                muted
                loop
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <img
                src={activeStory.mediaUrl}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {/* Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-24 left-4 right-4 z-10">
              <p className="text-white text-lg drop-shadow-lg">{activeStory.caption}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={prevStory} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={nextStory} />

          {/* Bottom Actions */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-4">
              {/* Reactions */}
              <div className="flex gap-2">
                {['❤️', '🔥', '😂', '😮', '👏'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Reply to story..."
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full
                           text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleReply(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button className="p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Story Component
export const CreateStory: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ 
  onClose, 
  onCreated 
}) => {
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMedia(url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const handleSubmit = async () => {
    if (!media) return;
    
    setIsUploading(true);
    try {
      // In production, upload file first, then create story
      await storiesAPI.createStory(media, mediaType, caption);
      onCreated();
      onClose();
    } catch (error) {
      console.error('Create Story Error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Create Story</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!media ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] bg-gray-800 rounded-xl flex flex-col items-center justify-center
                       border-2 border-dashed border-gray-600 cursor-pointer hover:border-purple-500
                       transition-colors"
            >
              <Plus className="w-16 h-16 text-gray-500 mb-4" />
              <p className="text-gray-400">Click to upload photo or video</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden">
                {mediaType === 'video' ? (
                  <video src={media} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={media} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
              
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setMedia(null)}
                  className="flex-1 py-3 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 
                           rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500
                           transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Share Story'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stories;
