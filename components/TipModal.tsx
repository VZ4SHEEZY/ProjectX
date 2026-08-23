import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Cpu, Loader, X } from 'lucide-react';
import GlitchButton from './GlitchButton';
import api from '../services/api';
import { BrowserProvider, Contract } from 'ethers';

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
  intent?: PaymentIntent;
  allowance?: string;
  approvalRequired?: boolean;
}

interface PaymentIntent {
  _id: string;
  chainId: number;
  tokenAddress: string;
  routerAddress: string;
  treasuryAddress: string;
  senderWallet: string;
  creatorWallet: string;
  amount: string;
  amountUnits: string;
}

const USDC_ABI = ['function approve(address spender,uint256 amount) returns (bool)'];
const ROUTER_ABI = ['function sendTip(address creator,uint256 amount)'];

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
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('1.00');
      setStatus('idle');
      setErrorMessage('');
      setSuccessMessage('');
      setTxHash('');
      setNeedApproval(false);
      setIntent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getWallet = async (payment: PaymentIntent) => {
    if (!window.ethereum) throw new Error('A browser wallet is required.');
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== payment.chainId) {
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x14a34' }] });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 4902) throw error;
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
          chainId: '0x14a34', chainName: 'Base Sepolia', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia-explorer.base.org']
        }] });
      }
    }
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    if (address.toLowerCase() !== payment.senderWallet.toLowerCase()) throw new Error('Connected wallet does not match your verified CyberDope wallet.');
    return signer;
  };

  const prepareTip = async () => {

    if (!creatorId) {
      setStatus('error');
      setErrorMessage('No creator selected. Close this window and try again.');
      return;
    }
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(amount) || Number(amount) < 0.01) {
      setStatus('error');
      setErrorMessage('Enter an amount of at least 0.01 USDC.');
      return;
    }

    setStatus('sending');
    setErrorMessage('');
    setNeedApproval(false);

    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await api.post('/tips/intents', { creatorId, amount }, { headers: { 'Idempotency-Key': idempotencyKey } });
      const data = response.data as TipResponse;
      if (!data.success || !data.intent) throw new Error(data.error || 'The payment intent could not be prepared.');
      setIntent(data.intent);
      setNeedApproval(Boolean(data.approvalRequired));
      setStatus('idle');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as TipResponse | undefined;
        if (data?.needApproval) setNeedApproval(true);
      }
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    }
  };

  const approveExactAmount = async () => {
    if (!intent) return;
    if (!window.confirm(`Approve exactly ${intent.amount} USDC for CyberDope TipRouter on Base Sepolia? This is a separate wallet transaction.`)) return;
    setStatus('sending');
    setErrorMessage('');
    try {
      const signer = await getWallet(intent);
      const tx = await new Contract(intent.tokenAddress, USDC_ABI, signer).approve(intent.routerAddress, BigInt(intent.amountUnits));
      await tx.wait(1);
      setStatus('idle');
      setNeedApproval(false);
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    }
  };

  const executeTip = async () => {
    if (!intent) return;
    if (!window.confirm(`Send exactly ${intent.amount} USDC to the selected creator through CyberDope TipRouter on Base Sepolia?`)) return;
    setStatus('sending'); setErrorMessage('');
    try {
      const signer = await getWallet(intent);
      const tx = await new Contract(intent.routerAddress, ROUTER_ABI, signer).sendTip(intent.creatorWallet, BigInt(intent.amountUnits));
      setTxHash(tx.hash);
      await tx.wait(1);
      let response = await api.post(`/tips/intents/${intent._id}/confirm`, { txHash: tx.hash });
      for (let attempt = 0; response.status === 202 && attempt < 8; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 4000));
        response = await api.post(`/tips/intents/${intent._id}/confirm`, { txHash: tx.hash });
      }
      if (response.status === 202) throw new Error('Transaction is mined but still awaiting 3 confirmations. It is safe to check again shortly.');
      setSuccessMessage('Tip verified on Base Sepolia.'); setStatus('success');
    } catch (error) { setStatus('error'); setErrorMessage(getErrorMessage(error)); }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (intent) await executeTip(); else await prepareTip();
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
              {needApproval && intent ? (
                <GlitchButton onClick={approveExactAmount}>APPROVE EXACT TIP AMOUNT</GlitchButton>
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
              {intent && <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">Verified intent: {intent.amount} USDC · Base Sepolia · separate wallet confirmation required.</div>}
              {intent && needApproval ? (
                <GlitchButton type="button" onClick={approveExactAmount} fullWidth className="h-12 text-md">APPROVE EXACT TIP AMOUNT</GlitchButton>
              ) : (
                <GlitchButton type="submit" fullWidth className="h-12 text-md">{intent ? 'CONFIRM IN WALLET' : 'VERIFY PAYMENT DETAILS'}</GlitchButton>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default TipModal;
