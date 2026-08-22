import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, CheckCheck, Clock } from 'lucide-react';
import { messageAPI } from '../services/api';

interface DMChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    avatar: string;
    _id?: string;
  };
  recipientId?: string;
  recipientName?: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar: string;
  };
  recipient: {
    _id: string;
    username: string;
    avatar: string;
  };
  content: string;
  mediaUrl?: string;
  read: boolean;
  readAt?: Date;
  screenshotAlert: boolean;
  isVanishing: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const DMChat: React.FC<DMChatProps> = ({ 
  isOpen, 
  onClose, 
  currentUser,
  recipientId = 'test-user',
  recipientName = 'User'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Load messages on open or when recipient changes
  useEffect(() => {
    if (isOpen && recipientId) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, recipientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const response = await messageAPI.getMessages(recipientId, { limit: 50 });
      if (response.data?.success) {
        setMessages(response.data.data);
        setLoadError('');
        
        // Mark unread messages as read
        response.data.data.forEach((msg: Message) => {
          if (!msg.read && msg.recipient._id === currentUser._id) {
            messageAPI.markMessageAsRead(msg._id).catch(console.error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLoadError('Messages could not be refreshed. Retrying…');
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || !recipientId) return;

    setIsSending(true);
    try {
      const response = await messageAPI.sendMessage(
        recipientId,
        inputText,
        undefined,
        true // isVanishing = true by default
      );

      if (response.data?.success) {
        setMessages((current) => [...current, response.data.data]);
        setInputText('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages((current) => current.filter(m => m._id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  const formatExpiresIn = (expiresAt: string | Date) => {
    const d = new Date(expiresAt);
    const now = new Date();
    const diff = d.getTime() - now.getTime();

    if (diff <= 0) return 'expired';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h left`;
    return `${Math.floor(diff / 86400000)}d left`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-end md:justify-end">
      {/* Chat Box */}
      <div className="w-full md:w-96 h-full md:h-[600px] bg-black border-l md:border border-gray-800 flex flex-col rounded-none md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-sm">{recipientName}</h3>
            <div className="text-[10px] text-gray-500">Vanishing messages</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadError && <div className="text-xs text-amber-400 text-center">{loadError}</div>}
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex gap-3 group ${
                  msg.sender._id === currentUser._id ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender._id !== currentUser._id && (
                  <img
                    src={msg.sender.avatar}
                    alt={msg.sender.username}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                )}

                <div
                  className={`flex flex-col gap-1 max-w-xs ${
                    msg.sender._id === currentUser._id ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg text-sm break-words ${
                      msg.sender._id === currentUser._id
                        ? 'bg-[#39FF14] text-black'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 px-2">
                    <span>{formatTime(msg.createdAt)}</span>
                    {msg.sender._id === currentUser._id && (
                      <>
                        {msg.read ? (
                          <CheckCheck size={12} className="text-[#39FF14]" />
                        ) : (
                          <Clock size={12} />
                        )}
                      </>
                    )}
                    <span>({formatExpiresIn(msg.expiresAt)})</span>
                  </div>

                  {msg.screenshotAlert && msg.sender._id !== currentUser._id && (
                    <div className="text-[10px] text-red-500">⚠️ Screenshot attempt detected</div>
                  )}
                </div>

                {msg.sender._id === currentUser._id && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500 p-1"
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-gray-800 p-4 flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message... (disappears in 7 days)"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39FF14]"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="bg-[#39FF14] text-black p-2 rounded-lg hover:bg-[#32d60b] disabled:opacity-50 transition-colors"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DMChat;
