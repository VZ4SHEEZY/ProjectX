import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  connectors: [
    // MetaMask / browser wallets
    injected({
      target: 'metaMask',
    }),
    // Coinbase Wallet (mobile + extension)
    coinbaseWallet({
      appName: 'CyberDope',
    }),
  ],
});
