import React, { useState } from 'react';
import { X, Star, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface CreatorApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAgeVerified: boolean;
  creatorStatus: 'none' | 'pending' | 'approved';
  onApplySuccess?: () => void;
}

const CreatorApplyModal: React.FC<CreatorApplyModalProps> = ({
  isOpen,
  onClose,
  isAgeVerified,
  creatorStatus,
  onApplySuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApply = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('cdToken');
      const res = await fetch('https://cyberdope-api.onrender.com/api/creator/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply');
      }

      setSuccess(true);
      setTimeout(() => {
        onApplySuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl mx-4 bg-[#0a0a0a] border-2 border-pink-600 shadow-[0_0_50px_rgba(236,72,153,0.3)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-pink-600/20 border-b-2 border-pink-600/50">
          <div className="flex items-center gap-3">
            <Star className="text-pink-500" size={28} />
            <div>
              <h2 className="text-pink-500 font-bold text-2xl tracking-wider">BECOME A CREATOR</h2>
              <p className="text-pink-400/70 text-xs font-mono">UNLOCK MONETIZATION</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-pink-500/50 hover:text-pink-500 transition-colors p-1 hover:bg-pink-500/10 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Current Status */}
          <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm font-mono mb-2">YOUR STATUS</p>
            <div className="flex items-center gap-2">
              {creatorStatus === 'approved' ? (
                <>
                  <CheckCircle className="text-[#39FF14]" size={20} />
                  <span className="text-[#39FF14] font-bold">CREATOR APPROVED</span>
                </>
              ) : creatorStatus === 'pending' ? (
                <>
                  <AlertCircle className="text-yellow-500" size={20} />
                  <span className="text-yellow-500 font-bold">APPLICATION PENDING</span>
                </>
              ) : (
                <>
                  <Lock className="text-gray-500" size={20} />
                  <span className="text-gray-400">NOT A CREATOR YET</span>
                </>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-3">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">Requirements</p>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              isAgeVerified 
                ? 'bg-[#39FF14]/10 border-[#39FF14]/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                isAgeVerified 
                  ? 'bg-[#39FF14] text-black' 
                  : 'bg-red-500 text-white'
              }`}>
                {isAgeVerified ? '✓' : '×'}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Age Verification (18+)</p>
                <p className="text-gray-400 text-xs">
                  {isAgeVerified ? 'Completed' : 'Required to unlock creator features'}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">Creator Benefits</p>
            
            {[
              { icon: '💰', title: 'Earn Tips', desc: 'Receive USDC tips from fans' },
              { icon: '🎬', title: '18+ Content', desc: 'Mark posts as adult content' },
              { icon: '📊', title: 'Analytics', desc: 'Track earnings and views' },
              { icon: '💳', title: 'Payouts', desc: 'Withdraw earnings to wallet' }
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-gray-800">
                <span className="text-xl">{benefit.icon}</span>
                <div>
                  <p className="text-white text-sm font-bold">{benefit.title}</p>
                  <p className="text-gray-400 text-xs">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status-specific message */}
          {creatorStatus === 'pending' && !isAgeVerified && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
              <p className="text-yellow-500 text-sm font-bold mb-1">⏳ Pending Age Verification</p>
              <p className="text-gray-400 text-xs">
                Complete your age verification to automatically unlock creator features.
              </p>
            </div>
          )}

          {creatorStatus === 'pending' && isAgeVerified && (
            <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-4 rounded-lg">
              <p className="text-[#39FF14] text-sm font-bold mb-1">✓ Ready to Create</p>
              <p className="text-gray-400 text-xs">
                Your creator account is approved. Start monetizing your content.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
              <p className="text-red-400 text-sm font-bold">Error</p>
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-4 rounded-lg text-center">
              <p className="text-[#39FF14] text-sm font-bold">✓ Application Submitted</p>
              <p className="text-gray-400 text-xs mt-1">
                {isAgeVerified 
                  ? 'You are now a creator!' 
                  : 'Pending age verification. Complete it to unlock.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6 bg-black/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg font-bold"
          >
            CANCEL
          </button>
          {creatorStatus === 'none' ? (
            <GlitchButton
              onClick={handleApply}
              disabled={isLoading || !isAgeVerified}
              className="flex-1 py-3"
            >
              {isLoading ? 'APPLYING...' : 'BECOME CREATOR'}
            </GlitchButton>
          ) : (
            <div className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-lg font-bold flex items-center justify-center cursor-not-allowed">
              {creatorStatus === 'pending' ? 'APPLICATION PENDING' : 'ALREADY CREATOR'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorApplyModal;
