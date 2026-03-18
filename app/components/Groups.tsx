import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Lock, Globe, ChevronRight, Crown, Shield, User } from 'lucide-react';
import { groupsAPI } from '../services/groups';

interface Group {
  _id: string;
  name: string;
  description: string;
  category: string;
  avatar: string;
  memberCount: number;
  isPrivate: boolean;
  creator: {
    username: string;
    displayName: string;
    avatar: string;
  };
}

interface GroupsProps {
  onSelectGroup?: (group: Group) => void;
}

export const Groups: React.FC<GroupsProps> = ({ onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my-groups'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
    fetchCategories();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.groups);
    } catch (error) {
      console.error('Fetch Groups Error:', error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await groupsAPI.getMyGroups();
      setMyGroups(response.groups);
    } catch (error) {
      console.error('Fetch My Groups Error:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await groupsAPI.getCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error('Fetch Categories Error:', error);
    }
  };

  const filteredGroups = (activeTab === 'discover' ? groups : myGroups).filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" />
          Communities
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 
                   text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'discover'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my-groups')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'my-groups'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          My Groups ({myGroups.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                   text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                   transition-colors"
        />
      </div>

      {/* Categories */}
      {activeTab === 'discover' && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm whitespace-nowrap">
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className="px-4 py-2 bg-gray-800 text-gray-400 rounded-full text-sm whitespace-nowrap
                       hover:bg-gray-700 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <div
            key={group._id}
            onClick={() => onSelectGroup?.(group)}
            className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 
                     hover:border-purple-500/50 transition-all cursor-pointer group"
          >
            {/* Cover */}
            <div className="h-24 bg-gradient-to-r from-purple-600/30 to-pink-600/30 relative">
              {group.avatar && (
                <img src={group.avatar} alt="" className="w-full h-full object-cover" />
              )}
              {group.isPrivate && (
                <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">{group.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.memberCount}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                    {group.category}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>

              {/* Creator */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                <img
                  src={group.creator.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.creator.username}`}
                  alt={group.creator.displayName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs text-gray-500">by {group.creator.displayName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {activeTab === 'discover' 
              ? 'No communities found. Try a different search.' 
              : 'You haven\'t joined any communities yet.'}
          </p>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchGroups();
            fetchMyGroups();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Create Group Modal
const CreateGroupModal: React.FC<{
  categories: string[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ categories, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await groupsAPI.createGroup(name, description, category, isPrivate);
      onCreated();
    } catch (error) {
      console.error('Create Group Error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Create Community</h3>
          <p className="text-gray-400 text-sm mt-1">Build your own cyberpunk faction</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Neon Runners"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                       text-white focus:outline-none focus:border-purple-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                isPrivate
                  ? 'bg-purple-600/20 border-purple-600 text-purple-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              <Lock className="w-4 h-4" />
              Private
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                !isPrivate
                  ? 'bg-purple-600/20 border-purple-600 text-purple-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              <Globe className="w-4 h-4" />
              Public
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 
                       rounded-lg text-white font-semibold hover:from-purple-500 hover:to-pink-500
                       transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Groups;
