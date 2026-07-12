import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Gift, Eye, ArrowRight } from 'lucide-react';

interface Tip {
  id: string;
  from: string;
  fromAvatar: string;
  amount: string;
  creatorAmount: string;
  platformAmount: string;
  onPost: string;
  message: string;
  date: string;
  txHash?: string;
}

interface DashboardStats {
  totalEarnings: string;
  totalTips: number;
  avgTip: string;
  pendingTips: number;
}

interface CreatorDashboardProps {
  isCreator: boolean;
  userToken: string;
}

const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ isCreator, userToken }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTips, setRecentTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreator) return;
    fetchEarnings();
  }, [isCreator]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://cyberdope-api.onrender.com/api/creator/earnings', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!res.ok) throw new Error('Failed to fetch earnings');

      const data = await res.json();
      setStats(data.stats);
      setRecentTips(data.recentTips);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isCreator) return null;

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Loading earnings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchEarnings}
          className="mt-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <div className="bg-gradient-to-br from-pink-600/20 to-pink-600/5 border border-pink-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Total Earnings</p>
            <DollarSign className="text-pink-500" size={16} />
          </div>
          <p className="text-3xl font-bold text-pink-500">${stats?.totalEarnings}</p>
          <p className="text-xs text-gray-500 mt-1">USDC on Base Sepolia</p>
        </div>

        {/* Total Tips */}
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Tips Received</p>
            <Gift className="text-blue-500" size={16} />
          </div>
          <p className="text-3xl font-bold text-blue-500">{stats?.totalTips}</p>
          <p className="text-xs text-gray-500 mt-1">From fans</p>
        </div>

        {/* Average Tip */}
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Average Tip</p>
            <TrendingUp className="text-green-500" size={16} />
          </div>
          <p className="text-3xl font-bold text-green-500">${stats?.avgTip}</p>
          <p className="text-xs text-gray-500 mt-1">Per tip</p>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-600/5 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Pending</p>
            <Eye className="text-yellow-500" size={16} />
          </div>
          <p className="text-3xl font-bold text-yellow-500">{stats?.pendingTips}</p>
          <p className="text-xs text-gray-500 mt-1">In progress</p>
        </div>
      </div>

      {/* Recent Tips */}
      <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-900/50 border-b border-gray-800">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Gift size={20} className="text-pink-500" />
            Recent Tips
          </h3>
        </div>

        {recentTips.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No tips yet. Share your content to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
            {recentTips.map((tip) => (
              <div key={tip.id} className="p-4 hover:bg-gray-900/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img
                      src={tip.fromAvatar}
                      alt={tip.from}
                      className="w-10 h-10 rounded-full flex-shrink-0 border border-gray-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-sm">{tip.from}</p>
                      <p className="text-gray-400 text-xs truncate">{tip.onPost}</p>
                      {tip.message && (
                        <p className="text-gray-500 text-xs italic mt-1 line-clamp-2">
                          "{tip.message}"
                        </p>
                      )}
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(tip.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-pink-500 font-bold">${tip.amount}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      You get: <span className="text-green-500 font-bold">${tip.creatorAmount}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Platform: ${tip.platformAmount}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Info */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-blue-400 font-bold text-sm mb-1">💳 Payouts</p>
            <p className="text-gray-400 text-xs">
              Earnings are automatically paid to your embedded wallet. Withdraw anytime to your external wallet or bank account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
