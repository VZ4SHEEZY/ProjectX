import React, { useState, useEffect } from 'react';
import { X, Bell, Trash2, CheckCheck, Check } from 'lucide-react';
import { userAPI } from '../services/api';

interface Notification {
  _id: string;
  type: 'follow' | 'like' | 'comment' | 'reply' | 'mention' | 'faction_win' | 'rank_up' | 'top_post' | 'message';
  actor: {
    _id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  message: string;
  read: boolean;
  createdAt: string;
  post?: {
    _id: string;
    mediaUrl: string;
    title: string;
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUserClick?: (username: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onUserClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await userAPI.getNotifications({ limit: 50 });
      if (response.data?.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await userAPI.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await userAPI.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await userAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleUserClick = (username: string) => {
    onUserClick?.(username);
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤';
      case 'like':
        return '❤️';
      case 'comment':
      case 'reply':
        return '💬';
      case 'mention':
        return '@️⃣';
      case 'faction_win':
        return '🏆';
      case 'rank_up':
        return '⬆️';
      case 'top_post':
        return '🔥';
      case 'message':
        return '✉️';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-start justify-end">
      {/* Close overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel */}
      <div className="relative h-full w-full max-w-md bg-[#0a0a0a] border-l border-gray-800 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-[#39FF14]" />
            <div>
              <h2 className="text-white font-bold">NOTIFICATIONS</h2>
              {unreadCount > 0 && (
                <p className="text-[#39FF14] text-xs">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-xs text-[#39FF14] hover:text-white border-b border-gray-800 flex items-center gap-2 justify-center"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm text-center">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-white/5 transition-colors group ${
                    !notification.read ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar Button */}
                    <button
                      onClick={() => handleUserClick(notification.actor.username)}
                      className="w-10 h-10 rounded-full flex-shrink-0 border border-gray-700 hover:border-[#39FF14] transition-colors p-0 bg-none cursor-pointer overflow-hidden"
                    >
                      <img
                        src={notification.actor.avatar}
                        alt={notification.actor.username}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white flex items-center gap-1">
                        <button
                          onClick={() => handleUserClick(notification.actor.username)}
                          className="font-bold hover:text-[#39FF14] transition-colors bg-none border-none p-0 cursor-pointer text-left"
                        >
                          @{notification.actor.username}
                        </button>
                        {notification.actor.isVerified && (
                          <span className="text-[#39FF14] text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-600 mt-2">{formatTime(notification.createdAt)}</p>
                    </div>

                    {/* Icon + Actions */}
                    <div className="flex items-start gap-2">
                      {/* Notification type icon */}
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>

                      {/* Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-[#39FF14]"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Post thumbnail if available */}
                  {notification.post && notification.post.mediaUrl && (
                    <button
                      onClick={() => handleUserClick(notification.actor.username)}
                      className="mt-3 w-full h-24 rounded border border-gray-800 hover:border-[#39FF14] transition-colors p-0 bg-none cursor-pointer overflow-hidden"
                    >
                      <img
                        src={notification.post.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
