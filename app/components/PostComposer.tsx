
import React, { useState, useRef } from 'react';
import { 
  X, Video, Image as ImageIcon, Type, Link, Mic, 
  Lock, EyeOff, DollarSign, Users, Clock, Sparkles,
  Upload, Check, AlertTriangle, Hash, AtSign, Wand2
} from 'lucide-react';
import GlitchButton from './GlitchButton';
import { AIGenerator } from './AIGenerator';

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (post: PostData) => void;
}

interface PostData {
  type: 'video' | 'image' | 'text' | 'audio' | 'link';
  content: string;
  caption: string;
  monetization: 'free' | 'subscribers' | 'ppv' | 'nft';
  price?: number;
  isNSFW: boolean;
  isSensitive: boolean;
  tags: string[];
  scheduledFor?: Date;
}

const PostComposer: React.FC<PostComposerProps> = ({ isOpen, onClose, onPublish }) => {
  const [postType, setPostType] = useState<PostData['type']>('video');
  const [caption, setCaption] = useState('');
  const [monetization, setMonetization] = useState<PostData['monetization']>('free');
  const [price, setPrice] = useState(5);
  const [isNSFW, setIsNSFW] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate upload
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setPreviewUrl(URL.createObjectURL(file));
        }
      }, 200);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePublish = () => {
    onPublish({
      type: postType,
      content: previewUrl || '',
      caption,
      monetization,
      price: monetization === 'ppv' ? price : undefined,
      isNSFW,
      isSensitive,
      tags
    });
    onClose();
    // Reset state
    setCaption('');
    setTags([]);
    setPreviewUrl(null);
    setMonetization('free');
    setIsNSFW(false);
    setIsSensitive(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl mx-4 bg-[#0a0a0a] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#39FF14]/10 border-b-2 border-[#39FF14]/30">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#39FF14]" size={24} />
            <h2 className="text-[#39FF14] font-bold text-xl tracking-wider">CREATE POST</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'video', label: 'Video', icon: Video },
            { id: 'image', label: 'Photo', icon: ImageIcon },
            { id: 'text', label: 'Text', icon: Type },
            { id: 'audio', label: 'Audio', icon: Mic },
            { id: 'link', label: 'Link', icon: Link },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setPostType(type.id as PostData['type'])}
              className={`flex-1 py-3 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                postType === type.id 
                  ? 'bg-[#39FF14]/20 text-[#39FF14] border-b-2 border-[#39FF14]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <type.icon size={14} />
              {type.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Upload Area */}
          {!previewUrl && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-[#39FF14] rounded-lg p-12 text-center cursor-pointer transition-all hover:bg-[#39FF14]/5"
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={postType === 'video' ? 'video/*' : postType === 'image' ? 'image/*' : postType === 'audio' ? 'audio/*' : '*/*'}
                />
                <Upload className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-white font-medium mb-2">Click to upload or drag & drop</p>
                <p className="text-gray-500 text-sm">
                  {postType === 'video' && 'MP4, MOV, WEBM up to 500MB'}
                  {postType === 'image' && 'JPG, PNG, GIF up to 50MB'}
                  {postType === 'audio' && 'MP3, WAV, AAC up to 100MB'}
                  {postType === 'text' && 'Write your thoughts'}
                  {postType === 'link' && 'Share a URL'}
                </p>
              </div>
              
              {/* AI Image Generator for Image Posts */}
              {postType === 'image' && (
                <div className="flex justify-center">
                  <AIGenerator 
                    type="image" 
                    onGenerate={(imageUrl) => {
                      setPreviewUrl(imageUrl);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-[#39FF14]">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#39FF14] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden border border-gray-800">
              {postType === 'video' && (
                <video src={previewUrl} className="w-full max-h-64 object-cover" controls />
              )}
              {postType === 'image' && (
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover" />
              )}
              {postType === 'audio' && (
                <div className="bg-gray-900 p-8 flex items-center justify-center">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              )}
              <button 
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-500 text-xs font-mono uppercase">Caption</label>
              <AIGenerator 
                type="caption" 
                onGenerate={(generatedCaption) => setCaption(generatedCaption)}
              />
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind? Or use AI to generate one..."
              className="w-full h-24 bg-black border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14] resize-none"
            />
            <div className="flex items-center gap-2 text-gray-500">
              <Hash size={14} />
              <span className="text-xs">Add hashtags in your caption</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-gray-500 text-xs font-mono uppercase">Tags</label>
            <div className="flex flex-wrap gap-2 p-2 bg-black border border-gray-700 rounded-lg min-h-[44px]">
              {tags.map((tag) => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#39FF14]/20 text-[#39FF14] text-xs rounded-full"
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Add tags (press Enter)" : ""}
                className="flex-1 min-w-[100px] bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              />
            </div>
          </div>

          {/* Monetization */}
          <div className="space-y-3">
            <label className="text-gray-500 text-xs font-mono uppercase">Monetization</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'free', label: 'Free', desc: 'All followers', icon: Users },
                { id: 'subscribers', label: 'Subscribers', desc: 'Paid tier only', icon: Lock },
                { id: 'ppv', label: 'Pay-Per-View', desc: 'One-time unlock', icon: DollarSign },
                { id: 'nft', label: 'NFT Drop', desc: 'Limited editions', icon: Sparkles },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setMonetization(option.id as PostData['monetization'])}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    monetization === option.id 
                      ? 'border-[#39FF14] bg-[#39FF14]/10' 
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <option.icon size={16} className={monetization === option.id ? 'text-[#39FF14]' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${monetization === option.id ? 'text-white' : 'text-gray-400'}`}>
                      {option.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">{option.desc}</p>
                </button>
              ))}
            </div>

            {/* PPV Price Input */}
            {monetization === 'ppv' && (
              <div className="flex items-center gap-3 p-3 bg-black/50 border border-yellow-500/30 rounded-lg">
                <DollarSign size={18} className="text-yellow-500" />
                <div className="flex-1">
                  <label className="text-yellow-500 text-xs font-mono">UNLOCK PRICE</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full bg-transparent text-white text-lg font-bold focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">You keep 85%</p>
                  <p className="text-[#39FF14] font-mono">${(price * 0.85).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Content Flags */}
          <div className="space-y-3">
            <label className="text-gray-500 text-xs font-mono uppercase">Content Flags</label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg cursor-pointer hover:border-pink-500/50 transition-colors">
              <input
                type="checkbox"
                checked={isNSFW}
                onChange={(e) => setIsNSFW(e.target.checked)}
                className="w-5 h-5 accent-pink-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <EyeOff size={16} className="text-pink-500" />
                  <span className="text-white text-sm font-medium">NSFW (18+)</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Adult content. Requires age verification.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-colors">
              <input
                type="checkbox"
                checked={isSensitive}
                onChange={(e) => setIsSensitive(e.target.checked)}
                className="w-5 h-5 accent-yellow-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  <span className="text-white text-sm font-medium">Sensitive Content</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Trigger warning (violence, flashing lights, etc.)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-500 hover:text-white text-sm">
              <Clock size={16} />
              Schedule
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-white transition-colors text-sm font-bold"
            >
              CANCEL
            </button>
            <GlitchButton 
              onClick={handlePublish}
              disabled={!previewUrl && postType !== 'text'}
              className="px-8 py-2"
            >
              <Check size={16} className="mr-2" />
              PUBLISH
            </GlitchButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
