import api from './api';

export const walletAPI = {
  // Get nonce for wallet verification
  getNonce: async (walletAddress: string) => {
    const response = await api.post('/wallet/nonce', { walletAddress });
    return response.data;
  },

  // Verify wallet signature
  verify: async (walletAddress: string, signature: string, message: string) => {
    const response = await api.post('/wallet/verify', { walletAddress, signature, message });
    return response.data;
  },

  // Connect wallet to existing account
  connect: async (walletAddress: string, signature: string) => {
    const response = await api.post('/wallet/connect', { walletAddress, signature });
    return response.data;
  },

  // Disconnect wallet
  disconnect: async () => {
    const response = await api.post('/wallet/disconnect');
    return response.data;
  },

  // Get wallet balance
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },

  // Get transaction history
  getTransactions: async () => {
    const response = await api.get('/wallet/transactions');
    return response.data;
  },

  // Send crypto tip
  sendTip: async (recipientAddress: string, amount: string, token: string, message?: string) => {
    const response = await api.post('/wallet/send-tip', { recipientAddress, amount, token, message });
    return response.data;
  },

  // Get supported tokens
  getSupportedTokens: async () => {
    const response = await api.get('/wallet/supported-tokens');
    return response.data;
  }
};

export default walletAPI;
