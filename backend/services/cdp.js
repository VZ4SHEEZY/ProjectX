/**
 * Coinbase Developer Platform (CDP) Service
 * Handles embedded wallet creation and management
 * 
 * Environment Variables Required:
 * - CDP_API_KEY_ID: CDP API key ID
 * - CDP_API_KEY_SECRET: CDP API secret (NEVER log this)
 * - CDP_PROJECT_ID: CDP project ID (public, safe for frontend)
 * - BASE_SEPOLIA_RPC_URL: Base Sepolia RPC endpoint
 * - USDC_SEPOLIA_ADDRESS: Circle's USDC contract on Base Sepolia
 */

const axios = require('axios');

// Initialize CDP client
// In production, use @coinbase/coinbase-sdk when it's ready
// For now, use direct API calls
class CDPService {
  constructor() {
    this.apiBaseUrl = 'https://api.coinbase.com/api/v1';
    this.apiKeyId = process.env.CDP_API_KEY_ID;
    this.apiKeySecret = process.env.CDP_API_KEY_SECRET;
    this.projectId = process.env.CDP_PROJECT_ID;
    
    if (!this.apiKeyId || !this.apiKeySecret || !this.projectId) {
      console.warn('CDP credentials not fully configured. Embedded wallets will fail.');
    }
  }

  /**
   * Create an embedded wallet for a user
   * @param {string} email - User's email address
   * @param {string} userId - User's MongoDB ID (for tracking)
   * @returns {Promise<{address: string, chainId: string}>}
   */
  async createEmbeddedWallet(email, userId) {
    try {
      if (!this.apiKeyId || !this.apiKeySecret) {
        throw new Error('CDP credentials not configured');
      }

      // CDP API call to create embedded wallet
      // This is a simplified example - actual implementation depends on CDP SDK availability
      const response = await axios.post(
        `${this.apiBaseUrl}/wallets`,
        {
          name: `cyberdope_${userId}`,
          network: 'base-sepolia',
          email: email
        },
        {
          auth: {
            username: this.apiKeyId,
            password: this.apiKeySecret
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const walletAddress = response.data.address || response.data.wallet_address;
      
      if (!walletAddress) {
        throw new Error('No wallet address returned from CDP');
      }

      return {
        address: walletAddress,
        chainId: 'base-sepolia',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('CDP Wallet Creation Error:', error.message);
      // Don't log the full error - it may contain sensitive data
      throw new Error('Failed to create embedded wallet');
    }
  }

  /**
   * Get USDC balance for a wallet on Base Sepolia
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<string>} Balance as string (e.g., "100.50")
   */
  async getUSDCBalance(walletAddress) {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address required');
      }

      const usdcAddress = process.env.USDC_SEPOLIA_ADDRESS;
      const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

      if (!usdcAddress || !rpcUrl) {
        console.warn('USDC address or RPC URL not configured. Returning mock balance.');
        return '0.00';
      }

      // Use Ethers.js or Web3.js for balance reading
      // For now, return placeholder
      // In production: call RPC, decode USDC contract balanceOf(address)
      const balance = await this._callBalanceOfContract(
        walletAddress,
        usdcAddress,
        rpcUrl
      );

      return balance;
    } catch (error) {
      console.error('Balance Read Error:', error.message);
      return '0.00';
    }
  }

  /**
   * Read balance from USDC contract via RPC
   * @private
   */
  async _callBalanceOfContract(walletAddress, contractAddress, rpcUrl) {
    try {
      // ERC20 balanceOf signature: 0x70a08231 + address
      // This requires ethers.js or web3.js
      // Placeholder implementation - will be replaced with actual contract call
      
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: `0x70a08231000000000000000000000000${walletAddress.slice(2).padStart(40, '0')}`
          },
          'latest'
        ]
      });

      if (response.data.result) {
        // Convert hex to decimal and divide by 6 decimals (USDC)
        const balance = BigInt(response.data.result);
        const decimals = 6;
        const formatted = (Number(balance) / Math.pow(10, decimals)).toFixed(2);
        return formatted;
      }

      return '0.00';
    } catch (error) {
      console.error('Contract Call Error:', error.message);
      return '0.00';
    }
  }

  /**
   * Get transaction history from blockchain
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getTransactionHistory(walletAddress) {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address required');
      }

      // Use Etherscan API or block explorer API for Base Sepolia
      // For now, return empty array - will implement with real data
      // In production: call Base Sepolia block explorer API
      
      return [];
    } catch (error) {
      console.error('Transaction History Error:', error.message);
      return [];
    }
  }
}

module.exports = new CDPService();
