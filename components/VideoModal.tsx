import React, { useState, useRef, useEffect } from 'react';
import { X, Heart, MessageSquare, Share2, Cpu, Volume2, VolumeX } from 'lucide-react';
import { postAPI, commentAPI, userAPI } from '../services/api';
import { Video, User } from '../types';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null | undefined;
  currentUser?: User;
  onUsernameClick?: (userId: string) => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, video, currentUser, onUsernameClick }) => {
  if (!isOpen || !video) return null;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video?.likes || 0);
  const [commentText, setCommentText] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && video?.id) {
      loadComments();
    }
  }, [isOpen, video?.id]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const res = await commentAPI.getComments(video.id);
      setComments(res.data?.data || []);
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!video) return null;

  const handleLike = async () => {
    try {
      if (isLiked) {
        await postAPI.unlikePost(video.id);
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        await postAPI.likePost(video.id);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    
    setIsCommentLoading(true);
    try {
      const res = await commentAPI.createComment(video.id, { content: commentText });
      setCommentText('');
      // Reload comments to show new one
      await loadComments();
    } catch (error) {
      console.error('Comment error:', error);
    } finally {
      setIsCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentAPI.deleteComment(commentId);
      // Reload comments
      await loadComments();
    } catch (error) {
      console.error('Delete comment error:', error);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // Unfollow
        await userAPI.unfollowUser(video.user.id);
        setIsFollowing(false);
      } else {
        // Follow
        await userAPI.followUser(video.user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const canDeleteComment = (comment: any) => {
    // Check if current user is the comment author
    return currentUser?.id === comment.author?._id || 
           currentUser?.id === comment.author?.id || 
           currentUser?.username === comment.author?.username;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `CyberDope // ${video.user.username}`,
          text: video.description || 'Check out this video',
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-black border-2 border-[#39FF14] rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-[#39FF14] transition-colors"
        >
          <X size={24} />
        </button>

        {/* Video Container */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            src={video.url || video.mediaUrl}
            controls
            autoPlay
            muted={isMuted}
            className="w-full h-full object-contain"
          />

          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Video Info & Interactions */}
        <div className="p-6 space-y-4">
          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <img
              src={video.user.avatar}
              alt={video.user.username}
              className="w-12 h-12 rounded-full border border-[#39FF14]"
            />
            <div 
              className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onUsernameClick?.(video.user.id)}
            >
              <p className="text-white font-bold hover:text-[#39FF14]">{video.user.username}</p>
              <p className="text-gray-400 text-sm">{video.user.displayName || '@' + video.user.username}</p>
            </div>
            <button
              onClick={handleFollow}
              className={`px-4 py-2 rounded transition-all text-sm font-bold ${
                isFollowing
                  ? 'bg-[#39FF14] text-black border border-[#39FF14]'
                  : 'border border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black'
              }`}
            >
              {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-white font-bold text-lg">{video.title}</h3>
            {video.description && (
              <p className="text-gray-300 text-sm mt-2">{video.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 py-4 border-y border-gray-700">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 text-white hover:text-[#FF00FF] transition-colors"
            >
              <Heart size={20} fill={isLiked ? '#FF00FF' : 'none'} color={isLiked ? '#FF00FF' : 'white'} />
              <span className="text-sm font-bold">{likeCount}</span>
            </button>

            <button className="flex items-center gap-2 text-white hover:text-[#00FFFF] transition-colors">
              <MessageSquare size={20} />
              <span className="text-sm font-bold">{video.comments || 0}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors"
            >
              <Share2 size={20} />
              <span className="text-sm font-bold">Share</span>
            </button>

            {showShareToast && (
              <div className="ml-auto text-green-400 text-sm">Copied to clipboard!</div>
            )}
          </div>

          {/* Comments List */}
          <div className="border-y border-gray-700 py-4 max-h-48 overflow-y-auto">
            <h4 className="text-white font-bold mb-3 text-sm">Comments ({comments.length})</h4>
            {isLoadingComments ? (
              <div className="text-gray-500 text-sm">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-gray-500 text-sm">No comments yet</div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment._id} className="bg-gray-900/50 p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-bold text-xs">{comment.author?.username || 'Anonymous'}</p>
                      {canDeleteComment(comment) && (
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Input */}
          {currentUser && (
            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#39FF14]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isCommentLoading) {
                      handlePostComment();
                    }
                  }}
                />
                <button
                  onClick={handlePostComment}
                  disabled={isCommentLoading || !commentText.trim()}
                  className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded hover:bg-[#39FF14]/80 disabled:opacity-50 transition-all"
                >
                  {isCommentLoading ? 'POSTING...' : 'POST'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
