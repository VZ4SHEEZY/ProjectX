
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Cpu, Loader, Bitcoin, QrCode, Copy, Star, Crown } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorAddress: string;
}

type TransactionStatus = 'idle' | 'processing' | 'success' | 'error';
type Currency = 'ETH' | 'BTC';
type Mode = 'TIP' | 'MEMBERSHIP';

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, creatorAddress }) => {
  const [mode, setMode] = useState<Mode>('TIP');
  const [currency, setCurrency] = useState<Currency>('ETH');
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setAmount('0.01');
      setErrorMsg('');
      setMode('TIP');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(creatorAddress);
    // Could add visual toast here
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setErrorMsg('');

    // Simulate Processing Delay
    setTimeout(() => {
        // Mock Success
        if (Math.random() > 0.1) {
            setStatus('success');
            setTimeout(() => onClose(), 2500);
        } else {
            setStatus('error');
            setErrorMsg('Network Congestion: Gas too low.');
        }
    }, 2000);
  };

  return (
    <>
    {/* Backdrop */}
    <div 
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
    />

    {/* Modal / Bottom Sheet */}
    <div className={`
        fixed z-[101] bg-[#0a0a0a] border-t-2 border-[#39FF14] shadow-[0_-10px_40px_rgba(57,255,20,0.2)]
        
        /* Mobile: Bottom Sheet */
        bottom-0 left-0 w-full rounded-t-xl
        
        /* Desktop: Centered Modal */
        md:top-1/2 md:left-1/2 md:w-[480px] md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border-2
        
        transition-transform duration-300 ease-out transform
    `}>
      
      {/* Handle for Mobile Drag */}
      <div className="w-full flex justify-center pt-2 md:hidden">
         <div className="w-12 h-1 bg-gray-700 rounded-full" />
      </div>

      <div className="p-6">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 text-[#39FF14]">
               <Cpu className="animate-pulse" />
               <span className="font-mono tracking-widest text-xs font-bold">VALUE_EXCHANGE_PROTOCOL</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-gray-900 rounded-lg p-1 mb-6 border border-gray-800">
             <button 
               onClick={() => setMode('TIP')}
               className={`flex-1 py-2 text-xs font-bold font-mono rounded flex items-center justify-center gap-2 transition-all ${mode === 'TIP' ? 'bg-[#39FF14] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
             >
                <Star size={14} /> SEND TIP
             </button>
             <button 
               onClick={() => setMode('MEMBERSHIP')}
               className={`flex-1 py-2 text-xs font-bold font-mono rounded flex items-center justify-center gap-2 transition-all ${mode === 'MEMBERSHIP' ? 'bg-[#FF00FF] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
             >
                <Crown size={14} /> JOIN MEMBER
             </button>
          </div>

          {status === 'idle' ? (
             <form onSubmit={handleAction} className="flex flex-col gap-6">
               
               {/* 1. Currency Selector */}
               <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setCurrency('ETH')}
                    className={`cursor-pointer border p-3 flex items-center gap-3 rounded transition-all ${currency === 'ETH' ? 'border-[#39FF14] bg-[#39FF14]/10' : 'border-gray-800 bg-black hover:border-gray-600'}`}
                  >
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">Ξ</div>
                      <div>
                          <div className="text-xs font-bold text-white">Ethereum</div>
                          <div className="text-[9px] text-gray-500">Web3 Wallet</div>
                      </div>
                  </div>

                  <div 
                    onClick={() => setCurrency('BTC')}
                    className={`cursor-pointer border p-3 flex items-center gap-3 rounded transition-all ${currency === 'BTC' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-800 bg-black hover:border-gray-600'}`}
                  >
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black">
                         <Bitcoin size={18} />
                      </div>
                      <div>
                          <div className="text-xs font-bold text-white">Bitcoin</div>
                          <div className="text-[9px] text-gray-500">Native SegWit</div>
                      </div>
                  </div>
               </div>

               {/* 2. Amount / Subscription Info */}
               {mode === 'TIP' ? (
                  <div className="text-center py-4 bg-black/40 border border-gray-800 rounded">
                     <label className="block text-gray-500 text-[10px] font-mono mb-2 uppercase tracking-wider">
                        AMOUNT ({currency})
                     </label>
                     <input 
                        type="number" 
                        step="0.001"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full bg-transparent border-none text-center text-5xl font-mono outline-none py-2 placeholder-gray-800 transition-colors ${currency === 'BTC' ? 'text-orange-500' : 'text-[#39FF14]'}`}
                        placeholder="0.00"
                     />
                  </div>
               ) : (
                  <div className="bg-gradient-to-br from-purple-900/40 to-black border border-[#FF00FF]/30 p-4 rounded text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 bg-[#FF00FF] text-black text-[9px] font-bold">MONTHLY</div>
                      <h3 className="text-white font-bold text-lg mb-1">NEON TIER ACCESS</h3>
                      <ul className="text-[10px] text-gray-400 font-mono mb-4 space-y-1">
                          <li>+ Exclusive Video Logs</li>
                          <li>+ Private Discord Access</li>
                          <li>+ Hex-Badge on Profile</li>
                      </ul>
                      <div className={`text-2xl font-bold font-mono ${currency === 'BTC' ? 'text-orange-500' : 'text-[#39FF14]'}`}>
                          {currency === 'ETH' ? '0.05 ETH' : '0.003 BTC'}
                      </div>
                  </div>
               )}

               {/* 3. Address / QR (Mainly for BTC) */}
               <div className="bg-gray-900/50 p-3 border border-gray-800 rounded text-xs font-mono text-gray-400">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[9px] uppercase">Destination Address ({currency})</span>
                     <button type="button" onClick={handleCopy} className="text-gray-500 hover:text-white flex items-center gap-1">
                        <Copy size={10} /> COPY
                     </button>
                  </div>
                  <div className="flex gap-3 items-center">
                      <div className="bg-white p-1 rounded-sm">
                          <QrCode size={48} className="text-black" />
                      </div>
                      <div className="flex-1 break-all text-[10px] leading-relaxed text-gray-300">
                          {creatorAddress || '0x...'}
                      </div>
                  </div>
               </div>

               <GlitchButton type="submit" fullWidth className="h-12 text-md" variant={mode === 'MEMBERSHIP' ? 'danger' : 'primary'}>
                  {mode === 'TIP' ? 'INITIATE TRANSFER' : 'ACTIVATE SUBSCRIPTION'}
               </GlitchButton>

             </form>
          ) : status === 'processing' ? (
             <div className="flex flex-col items-center justify-center py-12 gap-6">
                <Loader className={`w-12 h-12 animate-spin ${currency === 'BTC' ? 'text-orange-500' : 'text-[#39FF14]'}`} />
                <div className="text-center font-mono">
                   <h3 className="text-lg text-white animate-pulse">BROADCASTING TO {currency} NODE...</h3>
                   <p className="text-xs text-gray-500 mt-2">Waiting for confirmations...</p>
                </div>
             </div>
          ) : status === 'success' ? (
             <div className="flex flex-col items-center justify-center py-12 gap-6">
                <CheckCircle className="w-16 h-16 text-[#39FF14] drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]" />
                <div className="text-center font-mono">
                   <h3 className="text-xl font-bold text-white tracking-widest">TRANSACTION CONFIRMED</h3>
                   <p className="text-xs text-gray-500 mt-2">{mode === 'TIP' ? 'Funds Transferred.' : 'Welcome to the Inner Circle.'}</p>
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-6 text-[#FF00FF]">
                <AlertTriangle className="w-16 h-16" />
                <div className="text-center font-mono">
                   <h3 className="text-xl font-bold tracking-widest">TRANSACTION FAILED</h3>
                   <p className="text-xs text-white mt-2">{errorMsg}</p>
                </div>
                <GlitchButton variant="danger" onClick={() => setStatus('idle')}>
                   RETRY
                </GlitchButton>
             </div>
          )}

      </div>
    </div>
    </>
  );
};

export default TipModal;
