import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Cpu, Loader, X } from 'lucide-react';
import GlitchButton from './GlitchButton';
import api from '../services/api';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
}

type TransactionStatus = 'idle' | 'sending' | 'success' | 'error';

interface TipResponse {
  success?: boolean;
  needApproval?: boolean;
  message?: string;
  error?: string;
  failureReason?: string;
  tip?: { txHash?: string };
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as TipResponse | undefined;
    return data?.error || data?.failureReason || data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Unable to send tip. Please try again.';
};

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, creatorId }) => {
  const [amount, setAmount] = useState('1.00');
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [needApproval, setNeedApproval] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('1.00');
      setStatus('idle');
      setErrorMessage('');
      setSuccessMessage('');
      setTxHash('');
      setNeedApproval(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sendTip = async () => {
    const numericAmount = Number(amount);

    if (!creatorId) {
      setStatus('error');
      setErrorMessage('No creator selected. Close this window and try again.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 0.01) {
      setStatus('error');
      setErrorMessage('Enter an amount of at least 0.01 USDC.');
      return;
    }

    setStatus('sending');
    setErrorMessage('');
    setNeedApproval(false);

    try {
      const response = await api.post('/tips/send', { creatorId, amount });
      const data = response.data as TipResponse;

      if (data.needApproval) {
        setNeedApproval(true);
        setErrorMessage(data.error || data.message || 'USDC approval is required to send this tip.');
        setStatus('error');
        return;
      }
      if (!data.success) {
        throw new Error(data.error || data.message || 'The tip was not completed.');
      }

      setTxHash(data.tip?.txHash || '');
      setSuccessMessage(data.message || 'Tip sent successfully.');
      setStatus('success');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as TipResponse | undefined;
        if (data?.needApproval) {
          setNeedApproval(true);
          setErrorMessage(data.error || data.message || 'USDC approval is required to send this tip.');
          setStatus('error');
          return;
        }
      }
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendTip();
  };

  const busy = status === 'sending';

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md" onClick={busy ? undefined : onClose} />
      <div className="fixed bottom-0 left-0 z-[101] w-full rounded-t-xl border-t-2 border-[#39FF14] bg-[#0a0a0a] shadow-[0_-10px_40px_rgba(57,255,20,0.2)] md:bottom-auto md:left-1/2 md:top-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border-2">
        <div className="flex w-full justify-center pt-2 md:hidden"><div className="h-1 w-12 rounded-full bg-gray-700" /></div>
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-2 text-[#39FF14]">
              <Cpu className="animate-pulse" />
              <span className="font-mono text-xs font-bold tracking-widest">BASE_SEPOLIA_TIP</span>
            </div>
            <button onClick={onClose} disabled={busy} className="text-gray-500 hover:text-white disabled:opacity-40" aria-label="Close tip modal"><X size={24} /></button>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-6 py-10">
              <CheckCircle className="h-16 w-16 text-[#39FF14] drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]" />
              <div className="text-center font-mono">
                <h3 className="text-xl font-bold tracking-widest text-white">TIP CONFIRMED</h3>
                <p className="mt-2 text-xs text-gray-400">{successMessage}</p>
                {txHash && <p className="mt-3 break-all text-[10px] text-[#39FF14]">TX: {txHash}</p>}
              </div>
              <GlitchButton onClick={onClose}>DONE</GlitchButton>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center gap-6 py-8 text-[#FF00FF]">
              <AlertTriangle className="h-16 w-16" />
              <div className="text-center font-mono">
                <h3 className="text-xl font-bold tracking-widest">TIP FAILED</h3>
                <p className="mt-2 text-xs text-white">{errorMessage}</p>
              </div>
              {needApproval ? (
                <GlitchButton onClick={sendTip}>APPROVE USDC FOR TIPPING</GlitchButton>
              ) : (
                <GlitchButton variant="danger" onClick={() => { setStatus('idle'); setErrorMessage(''); }}>TRY AGAIN</GlitchButton>
              )}
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <Loader className="h-12 w-12 animate-spin text-[#39FF14]" />
              <div className="text-center font-mono">
                <h3 className="animate-pulse text-lg text-white">SENDING USDC...</h3>
                <p className="mt-2 text-xs text-gray-500">Base Sepolia</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="rounded border border-[#39FF14]/40 bg-[#39FF14]/10 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2775CA] text-xs font-bold text-white">$</div>
                  <div><div className="text-sm font-bold text-white">USDC</div><div className="text-[10px] text-gray-400">Base Sepolia</div></div>
                </div>
              </div>
              <div className="rounded border border-gray-800 bg-black/40 py-4 text-center">
                <label htmlFor="tip-amount" className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-gray-500">Amount (USDC)</label>
                <input id="tip-amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full border-none bg-transparent py-2 text-center font-mono text-5xl text-[#39FF14] outline-none placeholder:text-gray-800" placeholder="1.00" />
              </div>
              <GlitchButton type="submit" fullWidth className="h-12 text-md">SEND USDC TIP</GlitchButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default TipModal;
