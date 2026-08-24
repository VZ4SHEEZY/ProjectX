import React, { useState, useEffect } from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import DMChat from './DMChat';
import { userAPI, messageAPI } from '../services/api';

interface DMSystemProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    _id: string;
    name: string;
    avatar: string;
  };
  initialRecipientId?: string | null;
}

interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  displayName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
}

const DMSystem: React.FC<DMSystemProps> = ({ isOpen, onClose, currentUser, initialRecipientId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedConversation(initialRecipientId || null);
      loadConversations();
    }
  }, [isOpen, initialRecipientId]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await messageAPI.getConversations();
      setConversations(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await userAPI.searchUsers(text);
      setSearchResults(response.data?.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSelectUser = (userId: string, username: string) => {
    setSelectedConversation(userId);
    setShowSearch(false);
    setSearchText('');
  };

  if (!isOpen) return null;

  // If conversation is selected, show chat
  if (selectedConversation) {
    const conv = conversations.find(c => c.userId === selectedConversation) ||
                 searchResults.find(u => u._id === selectedConversation);
    
    return (
      <DMChat
        isOpen={true}
        onClose={() => {
          setSelectedConversation(null);
          onClose();
        }}
        currentUser={currentUser}
        recipientId={selectedConversation}
        recipientName={conv?.username || conv?.displayName || 'User'}
      />
    );
  }

  // Show conversation list
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-end md:justify-end">
      {/* Conversation List */}
      <div className="w-full md:w-96 h-full md:h-[600px] bg-black border-l md:border border-gray-800 flex flex-col rounded-none md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-bold">Messages</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full pl-10 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]"
            />
          </div>
        </div>

        {/* Conversation List / Search Results */}
        <div className="flex-1 overflow-y-auto">
          {showSearch && searchText.trim().length >= 2 ? (
            // Search Results
            searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No users found</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleSelectUser(user._id, user.username)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{user.username}</p>
                      {user.displayName && (
                        <p className="text-gray-500 text-xs">{user.displayName}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            // Recent Conversations
            isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Search for someone to message!
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => handleSelectUser(conv.userId, conv.username)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left relative"
                  >
                    <div className="relative">
                      <img
                        src={conv.avatar}
                        alt={conv.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      {conv.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#39FF14] rounded-full border border-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {conv.username}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-gray-500 text-xs truncate">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <div className="ml-2 flex-shrink-0 w-5 h-5 bg-[#39FF14] text-black rounded-full flex items-center justify-center text-xs font-bold">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default DMSystem;
