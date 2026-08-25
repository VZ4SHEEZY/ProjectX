import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { BarChart3, Bell } from 'lucide-react';
import { adminAPI, AdminStats } from '../services/api';

interface AdminDashboardProps {
  user: User & { isAdmin?: boolean };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'announcements'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.isAdmin !== true) {
      setLoading(false);
      return;
    }
    setError('');
    adminAPI.getStats()
      .then(response => setStats(response.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load platform statistics'))
      .finally(() => setLoading(false));
  }, [user.isAdmin]);

  // Fail-closed: if isAdmin is not explicitly true, deny access
  if (user.isAdmin !== true) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Access denied. Admin role required.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#39FF14] mb-2">ADMIN CONTROL</h1>
          <p className="text-gray-400">Welcome back, {user.username}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#39FF14]/20">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 pb-4 px-4 font-bold transition-colors ${
              activeTab === 'stats'
                ? 'text-[#39FF14] border-b-2 border-[#39FF14]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 size={18} />
            STATS
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 pb-4 px-4 font-bold transition-colors ${
              activeTab === 'announcements'
                ? 'text-[#39FF14] border-b-2 border-[#39FF14]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell size={18} />
            ANNOUNCEMENTS
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="border border-red-500/50 bg-red-950/40 p-4 text-red-300">{error}</div>
        ) : activeTab === 'stats' ? (
          stats ? <StatsView stats={stats} /> : null
        ) : (
          <AnnouncementsView />
        )}
      </div>
    </div>
  );
};

// Stats View Component
const StatsView: React.FC<{ stats: AdminStats }> = ({ stats }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">PLATFORM STATISTICS</h2>
      
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totals.users },
          { label: 'Total Posts', value: stats.totals.posts },
          { label: 'Total Likes', value: stats.totals.likes },
          { label: 'Active Factions', value: stats.totals.activeFactions },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-950 border border-[#39FF14]/20 p-4 rounded">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-[#39FF14] mt-2">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Faction Leaderboard */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4">FACTION LEADERBOARD</h3>
        <div className="bg-gray-950 border border-[#39FF14]/20 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#39FF14]/20 bg-black/50">
                <th className="p-4 text-left text-[#39FF14]">FACTION</th>
                <th className="p-4 text-right text-[#39FF14]">USERS</th>
                <th className="p-4 text-right text-[#39FF14]">POSTS</th>
                <th className="p-4 text-right text-[#39FF14]">LIKES</th>
                <th className="p-4 text-right text-[#39FF14]">RAW ENGAGEMENT</th>
              </tr>
            </thead>
            <tbody>
              {stats.factions.map((faction) => (
                <tr key={faction.name} className="border-b border-gray-800 hover:bg-gray-900">
                  <td className="p-4 text-white font-mono">{faction.name}</td>
                  <td className="p-4 text-right text-gray-400">{faction.users.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-400">{faction.posts.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-400">{faction.likes.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-400">{faction.engagementSignals.toLocaleString()}</td>
                </tr>
              ))}
              {stats.factions.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No faction activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Announcements View Component
const AnnouncementsView: React.FC = () => {
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'faction'>('all');
  const [selectedFaction, setSelectedFaction] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!message.trim()) {
      alert('Enter a message');
      return;
    }
    if (target === 'faction' && !selectedFaction) {
      alert('Select a faction');
      return;
    }

    setIsPosting(true);
    try {
      await adminAPI.createAnnouncement({
          message: message.trim(),
          targetType: target,
          ...(target === 'faction' ? { targetFaction: selectedFaction } : {}),
      });
      
      alert('Announcement posted!');
      setMessage('');
      setSelectedFaction('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to post announcement');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">BROADCAST ANNOUNCEMENT</h2>

      <div className="bg-gray-950 border border-[#39FF14]/20 p-6 rounded space-y-4">
        {/* Target */}
        <div>
          <label className="block text-[#39FF14] font-mono text-sm uppercase mb-2">
            Send To
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="all"
                checked={target === 'all'}
                onChange={(e) => setTarget(e.target.value as 'all' | 'faction')}
                className="w-4 h-4"
              />
              <span className="text-white">All Users</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="faction"
                checked={target === 'faction'}
                onChange={(e) => setTarget(e.target.value as 'all' | 'faction')}
                className="w-4 h-4"
              />
              <span className="text-white">Specific Faction</span>
            </label>
          </div>
        </div>

        {/* Faction Select */}
        {target === 'faction' && (
          <div>
            <label className="block text-[#39FF14] font-mono text-sm uppercase mb-2">
              Select Faction
            </label>
            <select
              value={selectedFaction}
              onChange={(e) => setSelectedFaction(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white p-3 rounded focus:border-[#39FF14] outline-none"
            >
              <option value="">Choose faction...</option>
              <option value="Neon Wraith">Neon Wraith</option>
              <option value="Iron Veil">Iron Veil</option>
              <option value="Crimson Static">Crimson Static</option>
              <option value="Void Circuit">Void Circuit</option>
              <option value="Gold Syndicate">Gold Syndicate</option>
              <option value="Azure Phantom">Azure Phantom</option>
              <option value="Toxic Bloom">Toxic Bloom</option>
              <option value="Scarlet Dominion">Scarlet Dominion</option>
              <option value="Chrome Legion">Chrome Legion</option>
              <option value="Phantom Signal">Phantom Signal</option>
              <option value="Obsidian Pact">Obsidian Pact</option>
              <option value="Ember Protocol">Ember Protocol</option>
              <option value="Violet Surge">Violet Surge</option>
              <option value="Steel Covenant">Steel Covenant</option>
              <option value="Binary Ghost">Binary Ghost</option>
              <option value="Copper Throne">Copper Throne</option>
              <option value="Nova Rift">Nova Rift</option>
              <option value="Silver Wraith">Silver Wraith</option>
              <option value="Inferno Grid">Inferno Grid</option>
              <option value="Quantum Veil">Quantum Veil</option>
            </select>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-[#39FF14] font-mono text-sm uppercase mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-32 bg-black border border-gray-700 text-white p-3 rounded focus:border-[#39FF14] outline-none resize-none"
            placeholder="Type announcement..."
          />
        </div>

        {/* Post Button */}
        <button
          onClick={handlePost}
          disabled={isPosting}
          className="w-full py-3 bg-[#39FF14] text-black font-bold rounded hover:bg-[#39FF14]/80 disabled:opacity-50 transition-all"
        >
          {isPosting ? 'POSTING...' : 'POST ANNOUNCEMENT'}
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
