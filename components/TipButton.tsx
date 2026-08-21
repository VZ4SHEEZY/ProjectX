import React, { useState, useEffect } from 'react';
import { Gift, X, Check, AlertCircle, Zap } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface TipButtonProps {
  creatorId: string;
  creatorName: string;
  postId?: string;
  userToken: string;
  isAgeVerified: boolean;
}

type TipAmount = '1' | '5' | '10' | '50' | '100' | 'custom';

const TipButton: React.FC<TipButtonProps> = ({
  creatorId,
  creatorName,
  postId,
  userToken,
  isAgeVerified
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<TipAmount>('5');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // USDC balance and approval state
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [allowance, setAllowance] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [hasWallet, setHasWallet] = useState(true);

  const tipPresets: { amount: TipAmount; label: string; emoji: string }[] = [
    { amount: '1', label: '$1', emoji: '💝' },
    { amount: '5', label: '$5', emoji: '🎁' },
    { amount: '10', label: '$10', emoji: '⭐' },
    { amount: '50', label: '$50', emoji: '💫' },
    { amount: '100', label: '$100', emoji: '👑' }
  ];

  const getTipAmount = (): string => {
    if (selectedAmount === 'custom') {
      return customAmount || '0';
    }
    return selectedAmount;
  };

  // Check wallet connection and USDC balance when modal opens
  useEffect(() => {
    const checkWalletStatus = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          setHasWallet(!!accounts[0]);
          
          // Fetch USDC balance and allowance
          if (accounts[0]) {
            try {
              const res = await fetch('https://cyberdope-api.onrender.com/api/wallet/balance', {
                headers: { 'Authorization': `Bearer ${userToken}` }
              });
              const data = await res.json();
              if (data?.balances) {
                setUsdcBalance(parseFloat(data.balances.USDC || '0'));
              }
            } catch (err) {
              console.warn('Could not fetch balance:', err);
            }
          }
        }
      } catch (error) {
        console.error('Wallet check error:', error);
      }
    };

    if (showModal) {
      checkWalletStatus();
    }
  }, [showModal, userToken]);

  const handleSendTip = async () => {
    const amount = getTipAmount();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setStatus('pending');
    setError(null);

    try {
      // Stub for contract integration
      // When the tipping contract deploys, this becomes:
      // const tx = await tipContract.sendTip(creatorId, amount, message);
      
      // For now, we're calling a backend endpoint that will be created
      // This is where Task 3 will implement the actual contract call
      
      const res = await fetch('https://cyberdope-api.onrender.com/api/tips/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creatorId,
          amount,
          message,
          postId,
          token: 'USDC'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send tip');
      }

      setStatus('success');
      setTimeout(() => {
        setShowModal(false);
        setSelectedAmount('5');
        setCustomAmount('');
        setMessage('');
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAgeVerified) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed opacity-50 font-bold text-sm"
        title="Complete age verification to send tips"
      >
        <Gift size={16} />
        Tip
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors font-bold text-sm"
      >
        <Gift size={16} />
        Tip
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border-2 border-pink-600 shadow-[0_0_50px_rgba(236,72,153,0.3)] overflow-hidden rounded-lg">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-pink-600/20 border-b-2 border-pink-600/50">
              <div className="flex items-center gap-3">
                <Gift className="text-pink-500" size={24} />
                <div>
                  <h2 className="text-pink-500 font-bold text-xl tracking-wider">SEND A TIP</h2>
                  <p className="text-pink-400/70 text-xs font-mono">To {creatorName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-pink-500/50 hover:text-pink-500 transition-colors p-1 hover:bg-pink-500/10 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Amount Selection */}
              <div className="space-y-3">
                <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Amount (USDC)</p>
                <div className="grid grid-cols-5 gap-2">
                  {tipPresets.map((preset) => (
                    <button
                      key={preset.amount}
                      onClick={() => {
                        setSelectedAmount(preset.amount);
                        setCustomAmount('');
                      }}
                      className={`py-2 px-2 rounded-lg font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                        selectedAmount === preset.amount
                          ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <span>{preset.emoji}</span>
                      <span className="text-xs">{preset.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div>
                  <button
                    onClick={() => setSelectedAmount('custom')}
                    className={`w-full py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                      selectedAmount === 'custom'
                        ? 'bg-pink-600 text-white border-2 border-pink-500'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 border-2 border-gray-800'
                    }`}
                  >
                    Custom Amount
                  </button>
                  {selectedAmount === 'custom' && (
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount in USDC"
                      className="w-full mt-2 bg-black border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-pink-600"
                      min="0"
                      step="0.01"
                    />
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Message (Optional)</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Leave a message for the creator..."
                  maxLength={500}
                  className="w-full h-24 bg-black border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-pink-600 resize-none"
                />
                <p className="text-gray-600 text-xs text-right">{message.length}/500</p>
              </div>

              {/* Breakdown */}
              {getTipAmount() && (
                <div className="bg-black/50 border border-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your tip:</span>
                    <span className="text-white font-bold">${getTipAmount()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{creatorName} gets (80%):</span>
                    <span className="text-green-500 font-bold">${(parseFloat(getTipAmount()) * 0.8).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
                    <span className="text-gray-400">Platform (20%):</span>
                    <span className="text-pink-500 font-bold">${(parseFloat(getTipAmount()) * 0.2).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {status === 'success' && (
                <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 p-3 rounded-lg flex items-center gap-2">
                  <Check className="text-[#39FF14]" size={20} />
                  <div>
                    <p className="text-[#39FF14] font-bold text-sm">Tip sent!</p>
                    <p className="text-gray-400 text-xs">Closing in 2 seconds...</p>
                  </div>
                </div>
              )}

              {error && status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-400 font-bold text-sm">Error</p>
                    <p className="text-red-300 text-xs">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-800 p-4 bg-black/50 flex gap-2">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg font-bold"
              >
                CANCEL
              </button>
              <GlitchButton
                onClick={handleSendTip}
                disabled={isLoading || !getTipAmount() || parseFloat(getTipAmount()) <= 0}
                className="flex-1 py-3"
              >
                {status === 'pending' ? 'SENDING...' : 'SEND TIP'}
              </GlitchButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TipButton;
