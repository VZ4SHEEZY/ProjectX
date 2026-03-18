
import React, { useState } from 'react';
import { 
  X, Check, Crown, Star, Zap, Users, DollarSign, 
  MessageSquare, Video, Gift, Lock, Edit2, Plus
} from 'lucide-react';
import GlitchButton from './GlitchButton';

interface SubscriptionTiersProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tiers: Tier[]) => void;
}

interface Tier {
  id: string;
  name: string;
  price: number;
  description: string;
  benefits: string[];
  color: string;
  icon: string;
  isActive: boolean;
}

const DEFAULT_TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free Follower',
    price: 0,
    description: 'Access to public content',
    benefits: ['Public posts', 'Basic interactions', 'Newsletter'],
    color: 'gray',
    icon: 'users',
    isActive: true
  },
  {
    id: 'basic',
    name: 'Basic Supporter',
    price: 5,
    description: 'Support my work with exclusive perks',
    benefits: ['All public content', 'Exclusive posts', 'Early access', 'Direct messages'],
    color: '[#39FF14]',
    icon: 'star',
    isActive: true
  },
  {
    id: 'premium',
    name: 'Premium Fan',
    price: 15,
    description: 'Get the full experience',
    benefits: ['Everything in Basic', 'PPV discounts', 'Monthly video call', 'Custom requests'],
    color: 'yellow',
    icon: 'crown',
    isActive: true
  },
  {
    id: 'vip',
    name: 'VIP Member',
    price: 50,
    description: 'Ultimate access and personal connection',
    benefits: ['Everything in Premium', 'Weekly 1-on-1 calls', 'Priority responses', 'Exclusive NFTs', 'Behind the scenes'],
    color: 'purple',
    icon: 'zap',
    isActive: false
  }
];

const BENEFIT_OPTIONS = [
  'Public posts',
  'Exclusive posts',
  'Early access',
  'Direct messages',
  'PPV discounts',
  'Monthly video call',
  'Custom requests',
  'Weekly 1-on-1 calls',
  'Priority responses',
  'Exclusive NFTs',
  'Behind the scenes',
  'Personal shoutouts',
  'Merch discounts',
  'Discord access'
];

const SubscriptionTiers: React.FC<SubscriptionTiersProps> = ({ isOpen, onClose, onSave }) => {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleToggleTier = (tierId: string) => {
    setTiers(tiers.map(t => 
      t.id === tierId ? { ...t, isActive: !t.isActive } : t
    ));
  };

  const handleEditTier = (tier: Tier) => {
    setEditingTier({ ...tier });
  };

  const handleSaveEdit = () => {
    if (editingTier) {
      setTiers(tiers.map(t => 
        t.id === editingTier.id ? editingTier : t
      ));
      setEditingTier(null);
    }
  };

  const handleAddBenefit = (benefit: string) => {
    if (editingTier && !editingTier.benefits.includes(benefit)) {
      setEditingTier({
        ...editingTier,
        benefits: [...editingTier.benefits, benefit]
      });
    }
  };

  const handleRemoveBenefit = (benefit: string) => {
    if (editingTier) {
      setEditingTier({
        ...editingTier,
        benefits: editingTier.benefits.filter(b => b !== benefit)
      });
    }
  };

  const handleSaveAll = () => {
    onSave(tiers);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl mx-4 bg-[#0a0a0a] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#39FF14]/10 border-b-2 border-[#39FF14]/30">
          <div className="flex items-center gap-3">
            <Crown className="text-[#39FF14]" size={24} />
            <div>
              <h2 className="text-[#39FF14] font-bold text-xl tracking-wider">SUBSCRIPTION TIERS</h2>
              <p className="text-[#39FF14]/70 text-[10px] font-mono">SET UP YOUR MONETIZATION</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Info Banner */}
          <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <DollarSign className="text-[#39FF14] flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-[#39FF14] font-bold text-sm mb-1">How Subscriptions Work</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Fans subscribe monthly to access your exclusive content. You keep 85% of all subscription revenue. 
                  Subscribers are billed automatically and can cancel anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {tiers.map((tier) => (
              <div 
                key={tier.id}
                className={`relative border-2 rounded-lg p-4 transition-all ${
                  tier.isActive 
                    ? `border-${tier.color}-500 bg-${tier.color}-500/5` 
                    : 'border-gray-800 bg-black/30 opacity-60'
                }`}
              >
                {/* Toggle */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => handleToggleTier(tier.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      tier.isActive ? 'bg-[#39FF14]' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      tier.isActive ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Tier Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full bg-${tier.color}-500/20 flex items-center justify-center`}>
                    {tier.icon === 'users' && <Users className={`text-${tier.color}-500`} size={24} />}
                    {tier.icon === 'star' && <Star className={`text-${tier.color}-500`} size={24} />}
                    {tier.icon === 'crown' && <Crown className={`text-${tier.color}-500`} size={24} />}
                    {tier.icon === 'zap' && <Zap className={`text-${tier.color}-500`} size={24} />}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{tier.name}</h3>
                    <p className={`text-${tier.color}-500 font-mono text-lg font-bold`}>
                      {tier.price === 0 ? 'FREE' : `$${tier.price}/mo`}
                    </p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-3">{tier.description}</p>

                {/* Benefits */}
                <div className="space-y-1 mb-4">
                  {tier.benefits.slice(0, 4).map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                      <Check size={12} className={`text-${tier.color}-500`} />
                      {benefit}
                    </div>
                  ))}
                  {tier.benefits.length > 4 && (
                    <p className="text-xs text-gray-600">+{tier.benefits.length - 4} more</p>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleEditTier(tier)}
                  className="w-full py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 size={12} />
                  EDIT TIER
                </button>
              </div>
            ))}

            {/* Add New Tier */}
            <button 
              onClick={() => setShowAddModal(true)}
              className="border-2 border-dashed border-gray-700 hover:border-[#39FF14] rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:text-[#39FF14] transition-all min-h-[250px]"
            >
              <Plus size={32} className="mb-2" />
              <span className="text-sm font-medium">ADD CUSTOM TIER</span>
            </button>
          </div>

          {/* Revenue Estimate */}
          <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-[#39FF14]" />
              POTENTIAL MONTHLY REVENUE
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#39FF14]">100</p>
                <p className="text-[10px] text-gray-500">Subscribers</p>
                <p className="text-sm text-gray-400">$850/mo</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#39FF14]">500</p>
                <p className="text-[10px] text-gray-500">Subscribers</p>
                <p className="text-sm text-gray-400">$4,250/mo</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#39FF14]">1,000</p>
                <p className="text-[10px] text-gray-500">Subscribers</p>
                <p className="text-sm text-gray-400">$8,500/mo</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#39FF14]">10,000</p>
                <p className="text-[10px] text-gray-500">Subscribers</p>
                <p className="text-sm text-gray-400">$85,000/mo</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-4">
              * Estimates based on average $10/subscriber. Actual earnings vary.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/50 flex items-center justify-between">
          <p className="text-[10px] text-gray-600 font-mono">
            PLATFORM FEE: 15% | YOU KEEP: 85%
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-white transition-colors text-sm font-bold"
            >
              CANCEL
            </button>
            <GlitchButton onClick={handleSaveAll} className="px-8 py-2">
              <Check size={16} className="mr-2" />
              SAVE TIERS
            </GlitchButton>
          </div>
        </div>
      </div>

      {/* Edit Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-lg mx-4 bg-[#0a0a0a] border-2 border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">EDIT TIER</h3>
              <button onClick={() => setEditingTier(null)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs font-mono uppercase mb-1 block">Tier Name</label>
                <input
                  type="text"
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-[#39FF14]"
                />
              </div>

              <div>
                <label className="text-gray-500 text-xs font-mono uppercase mb-1 block">Price (USD/month)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="number"
                    value={editingTier.price}
                    onChange={(e) => setEditingTier({ ...editingTier, price: Number(e.target.value) })}
                    min={0}
                    max={1000}
                    className="w-full bg-black border border-gray-700 rounded p-3 pl-10 text-white focus:outline-none focus:border-[#39FF14]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-500 text-xs font-mono uppercase mb-1 block">Description</label>
                <textarea
                  value={editingTier.description}
                  onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-[#39FF14] h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-gray-500 text-xs font-mono uppercase mb-2 block">Benefits</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingTier.benefits.map((benefit) => (
                    <span 
                      key={benefit}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#39FF14]/20 text-[#39FF14] text-xs rounded"
                    >
                      {benefit}
                      <button onClick={() => handleRemoveBenefit(benefit)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddBenefit(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-black border border-gray-700 rounded p-2 text-gray-400 text-sm"
                >
                  <option value="">+ Add benefit...</option>
                  {BENEFIT_OPTIONS.filter(b => !editingTier.benefits.includes(b)).map(benefit => (
                    <option key={benefit} value={benefit}>{benefit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setEditingTier(null)}
                className="flex-1 py-3 border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <GlitchButton onClick={handleSaveEdit} className="flex-1 py-3">
                SAVE CHANGES
              </GlitchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionTiers;
