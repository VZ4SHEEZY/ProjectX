
import React, { useState, useEffect } from 'react';
import { 
  X, Bell, Check, UserPlus, Heart, DollarSign, MessageSquare, 
  Lock, AtSign, TrendingUp, Settings, Trash2, Filter,
  CheckCheck, Clock
} from 'lucide-react';

interface NotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotificationType = 'follow' | 'like' | 'tip' | 'comment' | 'subscribe' | 'unlock' | 'mention' | 'trending';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  from?: {
    name: string;
    avatar: string;
  };
  amount?: number;
  read: boolean;
  time: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { 
    id: '1', 
    type: 'tip', 
    title: 'New Tip!', 
    message: 'sent you $50 with message "Love your work!"',
    from: { name: 'Matrix_Lover', avatar: 'https://picsum.photos/seed/n1/100' },
    amount: 50,
    read: false,
    time: '2 min ago'
  },
  { 
    id: '2', 
    type: 'subscribe', 
    title: 'New Subscriber', 
    message: 'subscribed to your Premium tier ($15/mo)',
    from: { name: 'CyberPunk_Fan', avatar: 'https://picsum.photos/seed/n2/100' },
    amount: 15,
    read: false,
    time: '15 min ago'
  },
  { 
    id: '3', 
    type: 'like', 
    title: 'New Like', 
    message: 'liked your post "Cyberpunk City Tour"',
    from: { name: 'Neon_Dreamer', avatar: 'https://picsum.photos/seed/n3/100' },
    read: false,
    time: '32 min ago'
  },
  { 
    id: '4', 
    type: 'comment', 
    title: 'New Comment', 
    message: 'commented: "This is amazing! Can\'t wait for more"',
    from: { name: 'Synth_Wave', avatar: 'https://picsum.photos/seed/n4/100' },
    read: true,
    time: '1 hour ago'
  },
  { 
    id: '5', 
    type: 'unlock', 
    title: 'Content Unlocked', 
    message: 'unlocked your PPV post "Exclusive Behind Scenes"',
    from: { name: 'Big_Spender', avatar: 'https://picsum.photos/seed/n5/100' },
    amount: 5,
    read: true,
    time: '2 hours ago'
  },
  { 
    id: '6', 
    type: 'follow', 
    title: 'New Follower', 
    message: 'started following you',
    from: { name: 'Crypto_King', avatar: 'https://picsum.photos/seed/n6/100' },
    read: true,
    time: '3 hours ago'
  },
  { 
    id: '7', 
    type: 'mention', 
    title: 'Mentioned You', 
    message: 'mentioned you in a comment',
    from: { name: 'Art_Collector', avatar: 'https://picsum.photos/seed/n7/100' },
    read: true,
    time: '5 hours ago'
  },
  { 
    id: '8', 
    type: 'trending', 
    title: 'You\'re Trending!', 
    message: 'Your post is trending in #cyberpunk with 10K views',
    read: true,
    time: '1 day ago'
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'tip': return <DollarSign size={18} className="text-[#39FF14]" />;
    case 'subscribe': return <Check size={18} className="text-[#FF00FF]" />;
    case 'like': return <Heart size={18} className="text-red-500" />;
    case 'comment': return <MessageSquare size={18} className="text-blue-500" />;
    case 'unlock': return <Lock size={18} className="text-yellow-500" />;
    case 'follow': return <UserPlus size={18} className="text-[#39FF14]" />;
    case 'mention': return <AtSign size={18} className="text-purple-500" />;
    case 'trending': return <TrendingUp size={18} className="text-orange-500" />;
    default: return <Bell size={18} className="text-gray-500" />;
  }
};

const getNotificationBg = (type: NotificationType) => {
  switch (type) {
    case 'tip': return 'bg-[#39FF14]/10';
    case 'subscribe': return 'bg-[#FF00FF]/10';
    case 'like': return 'bg-red-500/10';
    case 'comment': return 'bg-blue-500/10';
    case 'unlock': return 'bg-yellow-500/10';
    case 'follow': return 'bg-[#39FF14]/10';
    case 'mention': return 'bg-purple-500/10';
    case 'trending': return 'bg-orange-500/10';
    default: return 'bg-gray-800';
  }
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (selectedType !== 'all' && n.type !== selectedType) return false;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-end pt-16 pr-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in slide-in-from-right-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="text-[#FF00FF]" size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF00FF] rounded-full text-[9px] flex items-center justify-center text-black font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-white font-bold">Notifications</h2>
              <p className="text-gray-500 text-xs">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#39FF14] hover:bg-[#39FF14]/10 rounded-lg transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-black/30 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'unread' ? 'bg-[#FF00FF]/20 text-[#FF00FF]' : 'text-gray-500 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <div className="w-[1px] h-4 bg-gray-800 mx-1" />
          {['tip', 'subscribe', 'like', 'comment'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? 'all' : type as NotificationType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                selectedType === type ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'text-gray-500 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                <Bell size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-medium mb-1">No notifications</p>
              <p className="text-gray-500 text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`group relative p-4 hover:bg-white/5 transition-colors ${
                    !notification.read ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FF00FF] rounded-r" />
                  )}

                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationBg(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {notification.title}
                          </p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {notification.from && (
                              <span className="text-[#39FF14] font-medium">@{notification.from.name} </span>
                            )}
                            {notification.message}
                          </p>
                          {notification.amount && (
                            <p className="text-[#39FF14] font-mono text-sm mt-1">
                              +${notification.amount}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock size={10} />
                          {notification.time}
                        </span>
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="text-[10px] text-[#39FF14] hover:underline"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Avatar (if from user) */}
                    {notification.from && (
                      <img 
                        src={notification.from.avatar} 
                        alt="" 
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    )}

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      {!notification.read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="p-1.5 text-gray-500 hover:text-[#39FF14] hover:bg-[#39FF14]/10 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-800 bg-black/50 flex items-center justify-between">
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
              Clear all
            </button>
            <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
              <Settings size={14} />
              Notification settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSystem;
