import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Copy, Check, LogOut, Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { walletAPI } from '../services/wallet';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  logo: string;
  usdValue: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, onDisconnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalUSD, setTotalUSD] = useState('0.00');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem('walletAddress');
    if (savedWallet) {
      setWalletAddress(savedWallet);
      setIsConnected(true);
      fetchBalances(savedWallet);
    }
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Web3 wallet');
        window.open('https://metamask.io', '_blank');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Get nonce from backend
      const nonceResponse = await walletAPI.getNonce(address);
      
      // Sign message
      const message = nonceResponse.message;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      // Verify with backend
      const verifyResponse = await walletAPI.verify(address, signature, message);

      // Save token and wallet
      localStorage.setItem('token', verifyResponse.token);
      localStorage.setItem('walletAddress', address);
      
      setWalletAddress(address);
      setIsConnected(true);
      onConnect?.(address);
      
      // Fetch balances
      await fetchBalances(address);
      
    } catch (error) {
      console.error('Wallet Connection Error:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchBalances = async (address: string) => {
    try {
      const response = await walletAPI.getBalance();
      
      const tokens = [
        { symbol: 'ETH', name: 'Ethereum', balance: response.balances.ETH, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', usdValue: (parseFloat(response.balances.ETH) * 3500).toFixed(2) },
        { symbol: 'USDC', name: 'USD Coin', balance: response.balances.USDC, logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', usdValue: response.balances.USDC },
        { symbol: 'USDT', name: 'Tether', balance: response.balances.USDT, logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', usdValue: response.balances.USDT },
        { symbol: 'MATIC', name: 'Polygon', balance: response.balances.MATIC, logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png', usdValue: (parseFloat(response.balances.MATIC) * 0.5).toFixed(2) },
        { symbol: 'SOL', name: 'Solana', balance: response.balances.SOL, logo: 'https://cryptologos.cc/logos/solana-sol-logo.png', usdValue: (parseFloat(response.balances.SOL) * 150).toFixed(2) }
      ];
      
      setBalances(tokens);
      setTotalUSD(response.totalUSD);
    } catch (error) {
      console.error('Fetch Balances Error:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await walletAPI.disconnect();
      localStorage.removeItem('walletAddress');
      setIsConnected(false);
      setWalletAddress('');
      setBalances([]);
      onDisconnect?.();
    } catch (error) {
      console.error('Disconnect Error:', error);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 
                 text-white rounded-lg hover:from-orange-400 hover:to-yellow-400 
                 transition-all duration-300 disabled:opacity-50 font-medium"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Connected Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 
                 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="font-medium">{formatAddress(walletAddress)}</span>
        <Coins className="w-4 h-4 text-yellow-500" />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 
                      rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-400" />
                <span className="font-semibold text-white">My Wallet</span>
              </div>
              <button
                onClick={copyAddress}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-400 font-mono">{walletAddress}</p>
          </div>

          {/* Balance Summary */}
          <div className="p-4 border-b border-gray-700">
            <p className="text-sm text-gray-400">Total Balance</p>
            <p className="text-2xl font-bold text-white">${totalUSD}</p>
          </div>

          {/* Token List */}
          <div className="max-h-48 overflow-y-auto">
            {balances.map((token) => (
              <div
                key={token.symbol}
                className="flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="font-medium text-white">{token.symbol}</p>
                    <p className="text-xs text-gray-400">{token.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{parseFloat(token.balance).toFixed(4)}</p>
                  <p className="text-xs text-gray-400">${parseFloat(token.usdValue).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            <button
              onClick={() => setShowDetails(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 
                       rounded-lg text-white hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Explorer
            </button>
            <button
              onClick={disconnectWallet}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-600/20 
                       border border-red-600/50 rounded-lg text-red-400 hover:bg-red-600/30 
                       transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Transaction History</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {/* Mock Transactions */}
              {[
                { type: 'receive', token: 'ETH', amount: '0.5', from: '0x1234...5678', time: '1 day ago' },
                { type: 'send', token: 'USDC', amount: '100', to: '0xabcd...efgh', time: '2 days ago' },
                { type: 'tip', token: 'ETH', amount: '0.01', to: '0x9876...5432', time: '3 days ago' }
              ].map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {tx.type === 'receive' ? (
                        <ArrowDownLeft className={`w-5 h-5 ${tx.type === 'receive' ? 'text-green-400' : 'text-red-400'}`} />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-400">{tx.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.type === 'receive' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.token}
                    </p>
                    <p className="text-xs text-gray-400">{tx.from || tx.to}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export default WalletConnect;
