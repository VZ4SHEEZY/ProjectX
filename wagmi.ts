import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
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
