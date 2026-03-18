
import React, { useState } from 'react';
import { 
  DollarSign, Users, TrendingUp, Plus, Video, Calendar, 
  MessageSquare, Heart, Eye, Lock, Zap, Crown, ArrowUpRight,
  BarChart3, Wallet, Settings, Bell, Image as ImageIcon, Mic,
  ChevronRight, TrendingDown, Star, Gift, FileText, Camera
} from 'lucide-react';
import GlitchButton from './GlitchButton';

interface CreatorDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCreatePost?: () => void;
}

// Mock data for the dashboard
const MOCK_STATS = {
  earnings: {
    month: 12450,
    lastMonth: 10120,
    total: 89320,
    pending: 2100
  },
  subscribers: {
    total: 1247,
    new: 23,
    churned: 5,
    growth: 12.4
  },
  content: {
    total: 89,
    views: 456000,
    likes: 23400,
    thisWeek: 8
  }
};

const MOCK_CONTENT = [
  { id: 1, type: 'video', title: 'Cyberpunk Photoshoot BTS', earnings: 450, views: 12000, likes: 890, date: '2h ago', locked: false },
  { id: 2, type: 'ppv', title: 'Exclusive: Neon Nights', earnings: 890, views: 89, likes: 45, date: '1d ago', locked: true, price: 5 },
  { id: 3, type: 'text', title: 'My Creative Process', earnings: 0, views: 5400, likes: 320, date: '2d ago', locked: false },
  { id: 4, type: 'video', title: 'Live Stream Highlights', earnings: 1200, views: 8900, likes: 567, date: '3d ago', locked: true },
  { id: 5, type: 'image', title: 'Behind the Scenes', earnings: 230, views: 3400, likes: 189, date: '4d ago', locked: false },
];

const MOCK_ACTIVITY = [
  { id: 1, type: 'subscribe', user: 'CyberPunk_Fan', amount: 15, message: 'Subscribed to Premium tier', time: '5m ago', avatar: 'https://picsum.photos/seed/u1/100' },
  { id: 2, type: 'tip', user: 'Matrix_Lover', amount: 50, message: 'Love your work!', time: '12m ago', avatar: 'https://picsum.photos/seed/u2/100' },
  { id: 3, type: 'unlock', user: 'Neon_Dreamer', amount: 5, message: 'Unlocked "Neon Nights"', time: '1h ago', avatar: 'https://picsum.photos/seed/u3/100' },
  { id: 4, type: 'churn', user: 'Old_Subscriber', amount: 0, message: 'Canceled Premium subscription', time: '2h ago', avatar: 'https://picsum.photos/seed/u4/100' },
  { id: 5, type: 'tip', user: 'Synth_Wave', amount: 25, message: 'Keep creating!', time: '3h ago', avatar: 'https://picsum.photos/seed/u5/100' },
];

const MOCK_SUBSCRIBERS = [
  { name: 'CyberPunk_Fan', tier: 'Premium', since: '2 months', avatar: 'https://picsum.photos/seed/s1/100' },
  { name: 'Matrix_Lover', tier: 'VIP', since: '5 months', avatar: 'https://picsum.photos/seed/s2/100' },
  { name: 'Neon_Dreamer', tier: 'Basic', since: '1 week', avatar: 'https://picsum.photos/seed/s3/100' },
  { name: 'Synth_Wave', tier: 'Premium', since: '3 months', avatar: 'https://picsum.photos/seed/s4/100' },
];

const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ isOpen = true, onClose, onCreatePost }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'subscribers' | 'earnings'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const growthPercent = ((MOCK_STATS.earnings.month - MOCK_STATS.earnings.lastMonth) / MOCK_STATS.earnings.lastMonth * 100).toFixed(1);

  return (
    <div className="w-full min-h-full bg-[#050505] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#39FF14]/20 to-[#FF00FF]/20 border border-[#39FF14]/30 flex items-center justify-center">
              <Crown className="text-[#39FF14]" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">CREATOR DASHBOARD</h1>
              <p className="text-gray-500 text-sm font-mono">MONETIZATION_CENTER // V2.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-black border border-gray-700 text-gray-400 text-sm px-4 py-2 rounded-lg focus:outline-none focus:border-[#39FF14]"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            
            {/* Create Button */}
            <button 
              onClick={onCreatePost}
              className="flex items-center gap-2 px-6 py-2 bg-[#39FF14] text-black text-sm font-bold hover:bg-white transition-colors rounded-lg"
            >
              <Plus size={18} />
              CREATE
            </button>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <QuickActionCard 
            icon={Video}
            label="Upload Video"
            color="#39FF14"
            onClick={onCreatePost}
          />
          <QuickActionCard 
            icon={Camera}
            label="Go Live"
            color="#FF00FF"
            onClick={() => console.log('Go Live')}
          />
          <QuickActionCard 
            icon={Calendar}
            label="Schedule"
            color="#00FFFF"
            onClick={() => console.log('Schedule')}
          />
          <QuickActionCard 
            icon={Settings}
            label="Settings"
            color="#FFFF00"
            onClick={() => console.log('Settings')}
          />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="EARNINGS"
            value={formatCurrency(MOCK_STATS.earnings.month)}
            change={`+${growthPercent}%`}
            changeType="positive"
            icon={DollarSign}
            color="#39FF14"
          />
          <StatCard 
            label="SUBSCRIBERS"
            value={formatNumber(MOCK_STATS.subscribers.total)}
            change={`+${MOCK_STATS.subscribers.new}`}
            changeType="positive"
            icon={Users}
            color="#FF00FF"
          />
          <StatCard 
            label="TOTAL VIEWS"
            value={formatNumber(MOCK_STATS.content.views)}
            change="+15%"
            changeType="positive"
            icon={Eye}
            color="#00FFFF"
          />
          <StatCard 
            label="ENGAGEMENT"
            value={formatNumber(MOCK_STATS.content.likes)}
            change="5.1%"
            changeType="neutral"
            icon={Heart}
            color="#FFFF00"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'content', label: 'Content', icon: ImageIcon },
            { id: 'subscribers', label: 'Subscribers', icon: Users },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'text-[#39FF14] border-[#39FF14] bg-[#39FF14]/5' 
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} />
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              
              {/* Top Performing Content */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#39FF14]" />
                    TOP PERFORMING
                  </h3>
                  <button className="text-[#39FF14] text-xs hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {MOCK_CONTENT.slice(0, 4).map((content, idx) => (
                    <div key={content.id} className="flex items-center gap-4 p-3 bg-black/50 rounded-lg hover:bg-black/70 transition-colors cursor-pointer group">
                      <span className="text-gray-600 font-bold text-lg w-6">{idx + 1}</span>
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        {content.type === 'video' && <Video size={20} className="text-gray-500" />}
                        {content.type === 'ppv' && <Lock size={20} className="text-yellow-500" />}
                        {content.type === 'text' && <FileText size={20} className="text-gray-500" />}
                        {content.type === 'image' && <ImageIcon size={20} className="text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-[#39FF14] transition-colors">{content.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye size={10} /> {formatNumber(content.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={10} /> {formatNumber(content.likes)}
                          </span>
                        </div>
                      </div>
                      {content.earnings > 0 && (
                        <span className="text-[#39FF14] font-mono text-sm">+${content.earnings}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Zap size={18} className="text-yellow-500" />
                    RECENT ACTIVITY
                  </h3>
                  <button className="text-yellow-500 text-xs hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {MOCK_ACTIVITY.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-black/50 rounded-lg">
                      <img src={activity.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">
                          <span className="font-medium">{activity.user}</span>
                          {' '}<span className="text-gray-400">{activity.message}</span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{activity.time}</p>
                      </div>
                      {activity.amount > 0 && (
                        <span className="text-[#39FF14] font-mono text-sm font-bold">+${activity.amount}</span>
                      )}
                      {activity.type === 'churn' && (
                        <span className="text-red-500 text-xs">LEFT</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Chart Placeholder */}
              <div className="lg:col-span-2 bg-black/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#39FF14]" />
                    REVENUE TREND
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#39FF14]" />
                      Subscriptions
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#FF00FF]" />
                      PPV
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-yellow-500" />
                      Tips
                    </span>
                  </div>
                </div>
                <div className="h-48 flex items-end justify-between gap-2 px-4">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-gradient-to-t from-[#39FF14]/50 to-[#39FF14] rounded-t"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-gray-600">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">ALL CONTENT ({MOCK_CONTENT.length})</h3>
                <div className="flex gap-2">
                  <select className="bg-black border border-gray-700 text-gray-400 text-xs px-3 py-2 rounded-lg">
                    <option>All Types</option>
                    <option>Videos</option>
                    <option>Photos</option>
                    <option>Text</option>
                  </select>
                  <select className="bg-black border border-gray-700 text-gray-400 text-xs px-3 py-2 rounded-lg">
                    <option>All Access</option>
                    <option>Free Only</option>
                    <option>Paid Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_CONTENT.map((content) => (
                  <div key={content.id} className="bg-black/50 border border-gray-800 rounded-xl p-4 hover:border-[#39FF14]/50 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                          {content.type === 'video' && <Video size={20} className="text-gray-500" />}
                          {content.type === 'ppv' && <Lock size={20} className="text-yellow-500" />}
                          {content.type === 'text' && <FileText size={20} className="text-gray-500" />}
                          {content.type === 'image' && <ImageIcon size={20} className="text-gray-500" />}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-[#39FF14] transition-colors">{content.title}</p>
                          <p className="text-[10px] text-gray-500">{content.date}</p>
                        </div>
                      </div>
                      {content.locked && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[9px] font-mono rounded">
                          {content.price ? `$${content.price}` : 'SUBS'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {formatNumber(content.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {formatNumber(content.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-[#39FF14]">
                        <DollarSign size={12} /> {content.earnings}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBSCRIBERS TAB */}
          {activeTab === 'subscribers' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-[#39FF14]">{formatNumber(MOCK_STATS.subscribers.total)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Subscribers</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-green-500">+{MOCK_STATS.subscribers.new}</p>
                  <p className="text-xs text-gray-500 mt-1">New This Week</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-red-500">-{MOCK_STATS.subscribers.churned}</p>
                  <p className="text-xs text-gray-500 mt-1">Churned</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-blue-500">89%</p>
                  <p className="text-xs text-gray-500 mt-1">Retention Rate</p>
                </div>
              </div>

              {/* Subscription Tiers */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold text-sm mb-4">SUBSCRIPTION TIERS</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Free Followers', price: 0, subscribers: 850, color: 'gray' },
                    { name: 'Basic Supporters', price: 5, subscribers: 280, color: '[#39FF14]' },
                    { name: 'Premium Fans', price: 15, subscribers: 95, color: 'yellow' },
                    { name: 'VIP Members', price: 50, subscribers: 22, color: 'purple' },
                  ].map((tier) => (
                    <div key={tier.name} className="flex items-center gap-4 p-4 bg-black/50 rounded-lg">
                      <div className={`w-4 h-4 rounded-full bg-${tier.color}-500`} />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{tier.name}</p>
                        <p className="text-[10px] text-gray-500">{tier.subscribers} active subscribers</p>
                      </div>
                      <p className="text-white font-mono">${tier.price}/mo</p>
                      <p className="text-[#39FF14] font-mono font-bold">${tier.subscribers * tier.price}/mo</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Subscribers */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold text-sm mb-4">RECENT SUBSCRIBERS</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {MOCK_SUBSCRIBERS.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-black/50 rounded-lg">
                      <img src={sub.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="text-white text-sm font-medium">{sub.name}</p>
                        <p className="text-[10px] text-[#39FF14]">{sub.tier}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EARNINGS TAB */}
          {activeTab === 'earnings' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Balance Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-6 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">AVAILABLE BALANCE</p>
                  <p className="text-3xl font-bold text-[#39FF14]">{formatCurrency(2100)}</p>
                  <button className="mt-3 text-xs text-[#39FF14] hover:underline flex items-center gap-1">
                    <Wallet size={12} /> Withdraw to Wallet
                  </button>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">PENDING</p>
                  <p className="text-3xl font-bold text-yellow-500">{formatCurrency(450)}</p>
                  <p className="text-[10px] text-gray-500 mt-3">Available in 2 days</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 p-6 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">LIFETIME EARNINGS</p>
                  <p className="text-3xl font-bold text-purple-500">{formatCurrency(89320)}</p>
                  <p className="text-[10px] text-gray-500 mt-3">Since March 2024</p>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold text-sm mb-6">REVENUE BREAKDOWN (30D)</h3>
                <div className="space-y-4">
                  {[
                    { source: 'Subscriptions', amount: 8750, percent: 70, color: '#39FF14' },
                    { source: 'Pay-Per-View', amount: 2500, percent: 20, color: '#FF00FF' },
                    { source: 'Tips', amount: 1000, percent: 8, color: '#FFFF00' },
                    { source: 'NFT Sales', amount: 200, percent: 2, color: '#00FFFF' },
                  ].map((item) => (
                    <div key={item.source} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="text-white">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400">{formatCurrency(item.amount)}</span>
                          <span className="text-gray-600 w-10 text-right">{item.percent}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-black/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-bold text-sm mb-4">RECENT TRANSACTIONS</h3>
                <div className="space-y-2">
                  {[
                    { type: 'withdrawal', amount: -500, date: 'Today', status: 'completed' },
                    { type: 'subscription', amount: 15, date: 'Yesterday', from: 'New_Subscriber' },
                    { type: 'ppv', amount: 5, date: '2 days ago', from: 'Fan_123' },
                    { type: 'tip', amount: 25, date: '3 days ago', from: 'Big_Tipper' },
                  ].map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.type === 'withdrawal' ? 'bg-red-500/20' : 'bg-[#39FF14]/20'
                        }`}>
                          {tx.type === 'withdrawal' ? <ArrowUpRight size={14} className="text-red-500" /> : <DollarSign size={14} className="text-[#39FF14]" />}
                        </div>
                        <div>
                          <p className="text-white text-sm capitalize">{tx.type}</p>
                          {tx.from && <p className="text-[10px] text-gray-500">from {tx.from}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${tx.amount > 0 ? 'text-[#39FF14]' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                        </p>
                        <p className="text-[10px] text-gray-500">{tx.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-4 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-600">
          <p className="font-mono">
            PLATFORM FEE: 15% | YOU KEEP: 85% | MIN WITHDRAWAL: $50
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
            <span className="font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, change, changeType, icon: Icon, color }) => {
  return (
    <div className="bg-black/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-xs font-mono">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <div className="flex items-center gap-1">
        {changeType === 'positive' && <TrendingUp size={12} className="text-[#39FF14]" />}
        {changeType === 'negative' && <TrendingDown size={12} className="text-red-500" />}
        <span className={`text-xs ${changeType === 'positive' ? 'text-[#39FF14]' : changeType === 'negative' ? 'text-red-500' : 'text-gray-500'}`}>
          {change}
        </span>
        <span className="text-gray-600 text-xs">vs last period</span>
      </div>
    </div>
  );
};

// Quick Action Card Component
interface QuickActionCardProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon: Icon, label, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-black/50 border border-gray-800 rounded-xl hover:border-gray-600 transition-all group"
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-white text-sm font-medium">{label}</span>
    </button>
  );
};

export default CreatorDashboard;
