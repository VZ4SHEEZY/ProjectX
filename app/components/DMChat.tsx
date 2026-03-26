
import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Search, MoreVertical, Phone, Video, Image as ImageIcon,
  Smile, Paperclip, Check, CheckCheck, Clock, PhoneOff, Mic,
  ArrowLeft, UserPlus, Block, Flag, Trash2, Sparkles, MessageCircle
} from 'lucide-react';
import { aiAPI } from '../services/ai';

interface DMChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    avatar: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    verified?: boolean;
    isOnline?: boolean;
    lastSeen?: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isTyping?: boolean;
  isAI?: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'ai',
    user: { id: 'ai', name: 'CyberDope AI', avatar: '', isOnline: true },
    lastMessage: 'Hey! Need help with captions, bios, or anything?',
    lastMessageTime: 'now',
    unreadCount: 0,
    isAI: true,
  },
  {
    id: '1',
    user: { 
      id: 'u1', 
      name: 'Neon_Walker', 
      avatar: 'https://picsum.photos/seed/c1/100',
      verified: true,
      isOnline: true 
    },
    lastMessage: 'Thanks for the tip! Really appreciate it 🙏',
    lastMessageTime: '2m',
    unreadCount: 2
  },
  {
    id: '2',
    user: { 
      id: 'u2', 
      name: 'Matrix_Coder', 
      avatar: 'https://picsum.photos/seed/c2/100',
      verified: true,
      isOnline: false,
      lastSeen: '1h ago'
    },
    lastMessage: 'The smart contract is ready for review',
    lastMessageTime: '1h',
    unreadCount: 0
  },
  {
    id: '3',
    user: { 
      id: 'u3', 
      name: 'Synth_Wave_Queen', 
      avatar: 'https://picsum.photos/seed/c3/100',
      isOnline: true 
    },
    lastMessage: 'Check out my new track! 🔥',
    lastMessageTime: '3h',
    unreadCount: 1
  },
  {
    id: '4',
    user: { 
      id: 'u4', 
      name: 'Cyber_Goth', 
      avatar: 'https://picsum.photos/seed/c4/100',
      verified: true,
      isOnline: false,
      lastSeen: '2d ago'
    },
    lastMessage: 'Would you be interested in a collab?',
    lastMessageTime: '1d',
    unreadCount: 0
  },
  {
    id: '5',
    user: { 
      id: 'u5', 
      name: 'Art_Collector', 
      avatar: 'https://picsum.photos/seed/c5/100',
      isOnline: true 
    },
    lastMessage: 'How much for a custom piece?',
    lastMessageTime: '2d',
    unreadCount: 0
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'ai': [
    { id: 'ai-0', senderId: 'ai', text: "Hey there! I'm your CyberDope AI assistant. Need help with captions, bios, or just want to chat? 🔮", timestamp: new Date(), status: 'read', type: 'text' },
  ],
  '1': [
    { id: 'm1', senderId: 'u1', text: 'Hey! Love your content!', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
    { id: 'm2', senderId: 'me', text: 'Thanks so much! 🙏', timestamp: new Date(Date.now() - 3500000), status: 'read', type: 'text' },
    { id: 'm3', senderId: 'u1', text: 'Sent you a little tip', timestamp: new Date(Date.now() - 1800000), status: 'read', type: 'text' },
    { id: 'm4', senderId: 'me', text: 'Wow, thank you! That means a lot', timestamp: new Date(Date.now() - 1700000), status: 'read', type: 'text' },
    { id: 'm5', senderId: 'u1', text: 'Thanks for the tip! Really appreciate it 🙏', timestamp: new Date(Date.now() - 120000), status: 'delivered', type: 'text' },
  ],
  '2': [
    { id: 'm1', senderId: 'u2', text: 'Hey, wanted to discuss the Web3 integration', timestamp: new Date(Date.now() - 7200000), status: 'read', type: 'text' },
    { id: 'm2', senderId: 'me', text: 'Sure! What do you have in mind?', timestamp: new Date(Date.now() - 7100000), status: 'read', type: 'text' },
    { id: 'm3', senderId: 'u2', text: 'The smart contract is ready for review', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
  ],
};

const EMOJIS = ['🔥', '❤️', '😍', '👏', '🎨', '💯', '✨', '😂', '🤯', '👀', '🙏', '💪', '🎉', '🔥'];

const DMChat: React.FC<DMChatProps> = ({ isOpen, onClose, currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const activeMessages = activeConversation ? messages[activeConversation] || [] : [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Focus input when conversation opens
  useEffect(() => {
    if (activeConversation) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeConversation]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: newMessage,
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };

    setMessages(prev => ({
      ...prev,
      [activeConversation]: [...(prev[activeConversation] || []), message]
    }));

    const userMessage = newMessage.trim();
    setNewMessage('');

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [activeConversation]: prev[activeConversation]?.map(m => 
          m.id === message.id ? { ...m, status: 'sent' } : m
        ) || []
      }));
    }, 500);

    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [activeConversation]: prev[activeConversation]?.map(m => 
          m.id === message.id ? { ...m, status: 'delivered' } : m
        ) || []
      }));
    }, 1500);

    if (activeConversation === 'ai') {
      setIsTyping(true);
      aiAPI.chatAssistant(userMessage).then((response) => {
        setIsTyping(false);
        setMessages(prev => ({
          ...prev,
          ai: [...(prev['ai'] || []), {
            id: Date.now().toString(),
            senderId: 'ai',
            text: response.reply,
            timestamp: new Date(),
            status: 'read',
            type: 'text',
          }],
        }));
      }).catch(() => {
        setIsTyping(false);
        setMessages(prev => ({
          ...prev,
          ai: [...(prev['ai'] || []), {
            id: Date.now().toString(),
            senderId: 'ai',
            text: 'Sorry, I had a glitch in the matrix. Try again! ⚡',
            timestamp: new Date(),
            status: 'read',
            type: 'text',
          }],
        }));
      });
    } else {
      // Simulate reply from real user
      setTimeout(() => {
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          senderId: activeConv?.user.id || '',
          text: 'Thanks for reaching out! I\'ll get back to you soon.',
          timestamp: new Date(),
          status: 'read',
          type: 'text'
        };
        setMessages(prev => ({
          ...prev,
          [activeConversation]: [...(prev[activeConversation] || []), reply]
        }));
      }, 3000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending': return <Clock size={12} className="text-gray-500" />;
      case 'sent': return <Check size={12} className="text-gray-500" />;
      case 'delivered': return <CheckCheck size={12} className="text-gray-500" />;
      case 'read': return <CheckCheck size={12} className="text-[#39FF14]" />;
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-4xl mx-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden h-[80vh] flex">
        
        {/* Sidebar - Conversations List */}
        <div className={`w-full md:w-80 border-r border-gray-800 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-bold">Messages</h2>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-[#FF00FF] text-black text-xs font-bold rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors">
                <UserPlus size={18} />
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39FF14]"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-gray-800/50 ${
                  activeConversation === conv.id ? 'bg-white/5' : ''
                }`}
              >
                <div className="relative">
                  {conv.isAI ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <img
                      src={conv.user.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  {conv.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#39FF14] rounded-full border-2 border-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">@{conv.user.name}</span>
                    {conv.user.verified && (
                      <Check size={12} className="text-[#39FF14] fill-[#39FF14] flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">{conv.lastMessageTime}</p>
                  {conv.unreadCount > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#FF00FF] text-black text-xs font-bold rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeConv ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black/30">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-2 text-gray-500 hover:text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  {activeConv.isAI ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <img
                      src={activeConv.user.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  {activeConv.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#39FF14] rounded-full border-2 border-black" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">@{activeConv.user.name}</span>
                    {activeConv.user.verified && (
                      <Check size={14} className="text-[#39FF14] fill-[#39FF14]" />
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    {activeConv.user.isOnline ? 'Online' : activeConv.user.lastSeen}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors">
                  <Phone size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors">
                  <Video size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:text-white transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeMessages.map((msg, idx) => {
                const isMe = msg.senderId === 'me';
                const showAvatar = idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId;

                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {!isMe && showAvatar && (
                      <img 
                        src={activeConv.user.avatar} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    {!isMe && !showAvatar && <div className="w-8" />}
                    
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`px-4 py-2 rounded-2xl ${
                          isMe 
                            ? 'bg-[#39FF14] text-black rounded-br-sm' 
                            : 'bg-gray-800 text-white rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                        {isMe && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && activeConversation === 'ai' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:100ms]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:200ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-black/30">
              <div className="flex items-end gap-2">
                <button className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors">
                  <Paperclip size={20} />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39FF14] resize-none h-12 max-h-32"
                    rows={1}
                  />
                  
                  {/* Emoji Button */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors"
                    >
                      <Smile size={18} />
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-900 border border-gray-700 rounded-xl grid grid-cols-7 gap-1">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setNewMessage(newMessage + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-8 h-8 hover:bg-gray-800 rounded flex items-center justify-center text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {newMessage.trim() ? (
                  <button 
                    onClick={handleSendMessage}
                    className="p-3 bg-[#39FF14] text-black rounded-xl hover:bg-white transition-colors"
                  >
                    <Send size={18} />
                  </button>
                ) : (
                  <button className="p-3 bg-gray-800 text-gray-500 rounded-xl hover:bg-gray-700 transition-colors">
                    <Mic size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={40} className="text-gray-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Your Messages</h3>
            <p className="text-gray-500 text-sm mb-6">Select a conversation to start chatting</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#39FF14] text-black text-sm font-bold rounded-lg hover:bg-white transition-colors">
              <UserPlus size={16} />
              New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DMChat;
