
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Heart, MessageCircle, MoreHorizontal, Flag, 
  Trash2, Check, ChevronDown, ChevronUp, Smile, Image as ImageIcon
} from 'lucide-react';

interface CommentSystemProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  currentUser: {
    name: string;
    avatar: string;
  };
}

interface Reply {
  id: string;
  author: {
    name: string;
    avatar: string;
    verified?: boolean;
  };
  text: string;
  likes: number;
  isLiked: boolean;
  time: string;
}

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    verified?: boolean;
  };
  text: string;
  likes: number;
  isLiked: boolean;
  replies: Reply[];
  time: string;
  isPinned?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    author: { name: 'CyberPunk_Fan', avatar: 'https://picsum.photos/seed/c1/100', verified: true },
    text: 'This is absolutely incredible! The lighting and composition are perfect. Would love to see more content like this! 🔥',
    likes: 234,
    isLiked: false,
    replies: [
      {
        id: 'r1',
        author: { name: 'Neon_Walker', avatar: 'https://picsum.photos/seed/r1/100', verified: true },
        text: 'Thanks so much! Working on a new series, stay tuned! 🎨',
        likes: 45,
        isLiked: true,
        time: '1 hour ago'
      }
    ],
    time: '2 hours ago',
    isPinned: true
  },
  {
    id: '2',
    author: { name: 'Matrix_Lover', avatar: 'https://picsum.photos/seed/c2/100' },
    text: 'The cyberpunk aesthetic here is unmatched. What camera setup are you using?',
    likes: 89,
    isLiked: false,
    replies: [],
    time: '3 hours ago'
  },
  {
    id: '3',
    author: { name: 'Synth_Wave', avatar: 'https://picsum.photos/seed/c3/100', verified: true },
    text: 'This gives me major Blade Runner vibes. Absolutely love it! 💜',
    likes: 156,
    isLiked: true,
    replies: [
      {
        id: 'r2',
        author: { name: 'Night_Owl', avatar: 'https://picsum.photos/seed/r2/100' },
        text: 'Right?? The neon colors are perfect!',
        likes: 12,
        isLiked: false,
        time: '2 hours ago'
      },
      {
        id: 'r3',
        author: { name: 'CyberPunk_Fan', avatar: 'https://picsum.photos/seed/c1/100', verified: true },
        text: 'Blade Runner 2049 was such an inspiration for this!',
        likes: 23,
        isLiked: false,
        time: '1 hour ago'
      }
    ],
    time: '5 hours ago'
  },
  {
    id: '4',
    author: { name: 'Art_Collector', avatar: 'https://picsum.photos/seed/c4/100' },
    text: 'Would love to purchase a print of this if available!',
    likes: 67,
    isLiked: false,
    replies: [],
    time: '1 day ago'
  },
];

const EMOJIS = ['🔥', '❤️', '😍', '👏', '🎨', '💯', '✨', '😂', '🤯', '👀'];

const CommentSystem: React.FC<CommentSystemProps> = ({ isOpen, onClose, contentId, currentUser }) => {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set(['1']));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'top' | 'controversial'>('top');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const totalComments = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: { name: currentUser.name, avatar: currentUser.avatar },
      text: newComment,
      likes: 0,
      isLiked: false,
      replies: [],
      time: 'Just now'
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleSubmitReply = (commentId: string) => {
    if (!replyText.trim()) return;

    const reply: Reply = {
      id: Date.now().toString(),
      author: { name: currentUser.name, avatar: currentUser.avatar },
      text: replyText,
      likes: 0,
      isLiked: false,
      time: 'Just now'
    };

    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, replies: [...c.replies, reply] }
        : c
    ));
    setReplyText('');
    setReplyingTo(null);
  };

  const toggleLikeComment = (commentId: string) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
        : c
    ));
  };

  const toggleLikeReply = (commentId: string, replyId: string) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { 
            ...c, 
            replies: c.replies.map(r => 
              r.id === replyId 
                ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 }
                : r
            )
          }
        : c
    ));
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const startReply = (commentId: string) => {
    setReplyingTo(commentId);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const addEmoji = (emoji: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyText(replyText + emoji);
    } else {
      setNewComment(newComment + emoji);
    }
    setShowEmojiPicker(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg sm:mx-4 bg-[#0a0a0a] border border-gray-800 sm:rounded-2xl shadow-2xl overflow-hidden h-[85vh] sm:h-[80vh] flex flex-col animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black/50">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-[#39FF14]" size={24} />
            <div>
              <h2 className="text-white font-bold">Comments</h2>
              <p className="text-gray-500 text-xs">{totalComments} comments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black border border-gray-700 text-gray-400 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="top">Top</option>
              <option value="newest">Newest</option>
              <option value="controversial">Controversial</option>
            </select>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="flex gap-3">
                <img 
                  src={comment.author.avatar} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {/* Pinned Badge */}
                  {comment.isPinned && (
                    <div className="flex items-center gap-1 text-[10px] text-[#39FF14] mb-1">
                      <Check size={10} />
                      PINNED BY CREATOR
                    </div>
                  )}
                  
                  {/* Author */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">@{comment.author.name}</span>
                    {comment.author.verified && (
                      <Check size={12} className="text-[#39FF14] fill-[#39FF14]" />
                    )}
                    <span className="text-gray-500 text-xs">{comment.time}</span>
                  </div>
                  
                  {/* Text */}
                  <p className="text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => toggleLikeComment(comment.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                      {formatNumber(comment.likes)}
                    </button>
                    <button 
                      onClick={() => startReply(comment.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#39FF14] transition-colors"
                    >
                      <MessageCircle size={14} />
                      Reply
                    </button>
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-13 pl-13 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <img 
                    src={currentUser.avatar} 
                    alt="" 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <textarea
                        ref={replyInputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to @${comment.author.name}...`}
                        className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39FF14] resize-none h-16"
                      />
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyText.trim()}
                          className="p-2 bg-[#39FF14] text-black rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={16} />
                        </button>
                        <button 
                          onClick={() => setReplyingTo(null)}
                          className="p-2 text-gray-500 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-13 pl-6 border-l-2 border-gray-800">
                  {/* Toggle Replies */}
                  <button 
                    onClick={() => toggleReplies(comment.id)}
                    className="flex items-center gap-1 text-xs text-[#39FF14] hover:underline mb-2"
                  >
                    {expandedReplies.has(comment.id) ? (
                      <><ChevronUp size={12} /> Hide replies</>
                    ) : (
                      <><ChevronDown size={12} /> View {comment.replies.length} replies</>
                    )}
                  </button>

                  {/* Reply List */}
                  {expandedReplies.has(comment.id) && (
                    <div className="space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <img 
                            src={reply.author.avatar} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">@{reply.author.name}</span>
                              {reply.author.verified && (
                                <Check size={10} className="text-[#39FF14] fill-[#39FF14]" />
                              )}
                              <span className="text-gray-500 text-xs">{reply.time}</span>
                            </div>
                            <p className="text-gray-400 text-sm">{reply.text}</p>
                            <button 
                              onClick={() => toggleLikeReply(comment.id, reply.id)}
                              className={`flex items-center gap-1 mt-1 text-xs transition-colors ${
                                reply.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <Heart size={12} className={reply.isLiked ? 'fill-current' : ''} />
                              {formatNumber(reply.likes)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-800 bg-black/50">
          <div className="flex gap-3">
            <img 
              src={currentUser.avatar} 
              alt="" 
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 pr-24 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39FF14] resize-none h-20"
                />
                
                {/* Input Actions */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {/* Emoji Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors"
                    >
                      <Smile size={18} />
                    </button>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-900 border border-gray-700 rounded-xl grid grid-cols-5 gap-1">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addEmoji(emoji)}
                            className="w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors">
                    <ImageIcon size={18} />
                  </button>
                  
                  <button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="p-2 bg-[#39FF14] text-black rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-gray-600 mt-2">
                Press Enter to post • Be respectful and follow community guidelines
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentSystem;
