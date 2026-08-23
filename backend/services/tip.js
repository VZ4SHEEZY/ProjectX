/**
 * TipRouter Contract Service
 * Integrates with TipRouter on Base Sepolia for USDC tipping
 *
 * Environment Variables Required:
 * - BASE_SEPOLIA_RPC_URL: RPC endpoint for Base Sepolia network
 * - TIP_ROUTER_CONTRACT_ADDRESS: Address of deployed TipRouter contract
 * - USDC_SEPOLIA_ADDRESS: Address of USDC contract on Base Sepolia
 * - TIP_ROUTER_PRIVATE_KEY: Private key of wallet with signer privileges
 *
 * Flow:
 * 1. User connects wallet via WalletConnect
 * 2. Backend verifies user authentication & age verification
 * 3. Backend reads USDC allowance for TipRouter contract
 * 4. If allowance insufficient, returns { needApproval: true, amount }
 * 5. User approves TipRouter for USDC via wallet (via frontend)
 * 6. Backend calls tipRouter.sendTip(creatorAddress, amount) using TIP_ROUTER_PRIVATE_KEY
 * 7. Transaction receipt stored in MongoDB Tip collection
 */

const { ethers } = require('ethers');

class TipService {
  constructor() {
    this.rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    this.contractAddress = process.env.TIP_ROUTER_CONTRACT_ADDRESS;
    this.usdcAddress = process.env.USDC_SEPOLIA_ADDRESS;
    this.recipientAddress = process.env.TIP_ROUTER_TREASURY_ADDRESS;

    // Contract ABIs
    this.tipRouterABI = [
      'function sendTip(address creator, uint256 amount) external',
      'function usdc() external view returns (address)',
      'function treasury() external view returns (address)',
      'function CREATOR_BPS() external pure returns (uint256)'
    ];

    this.usdcABI = [
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function balanceOf(address account) external view returns (uint256)'
    ];

    // Initialize provider
    this.provider = null;
    if (this.rpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      } catch (error) {
        console.error('Failed to initialize RPC provider:', error.message);
      }
    }

    // Check config status
    const isConfigured = this.isExecutionEnabled();

    if (!isConfigured) {
      console.warn('TipService not fully configured. USDC tipping will fail.');
      console.warn('Missing:', {
        rpcUrl: !this.rpcUrl,
        contractAddress: !this.contractAddress,
        usdcAddress: !this.usdcAddress
      });
    }
  }

  isExecutionEnabled() {
    try {
      const rpc = new URL(this.rpcUrl || '');
      return rpc.protocol === 'https:' &&
        ethers.isAddress(this.contractAddress || '') && this.contractAddress !== ethers.ZeroAddress &&
        ethers.isAddress(this.usdcAddress || '') && this.usdcAddress !== ethers.ZeroAddress &&
        ethers.isAddress(this.recipientAddress || '') && this.recipientAddress !== ethers.ZeroAddress &&
        /^0x[0-9a-fA-F]{64}$/.test(process.env.TIP_ROUTER_PRIVATE_KEY || '');
    } catch { return false; }
  }

  assertExecutionEnabled() {
    if (!this.isExecutionEnabled()) throw new Error('Wallet payment execution is disabled until all Base Sepolia configuration is valid');
  }

  /**
   * Get TipRouter contract instance (read-only)
   */
  getTipRouter() {
    if (!this.provider || !this.contractAddress) {
      throw new Error('TipService not configured');
    }
    return new ethers.Contract(this.contractAddress, this.tipRouterABI, this.provider);
  }

  /**
   * Get USDC contract instance (read-only)
   */
  getUSDC() {
    if (!this.provider || !this.usdcAddress) {
      throw new Error('TipService not configured for USDC');
    }
    return new ethers.Contract(this.usdcAddress, this.usdcABI, this.provider);
  }

  /**
   * Check USDC allowance for TipRouter contract
   * @param {string} wallet - Wallet address
   */
  async getAllowance(wallet) {
    if (!this.provider || !this.usdcAddress || !this.contractAddress) {
      throw new Error('TipService not configured');
    }

    const usdc = this.getUSDC();
    const allowance = await usdc.allowance(wallet, this.contractAddress);

    return ethers.formatUnits(allowance, 6); // USDC has 6 decimals
  }

  /**
   * Get user's USDC balance
   * @param {string} wallet - Wallet address
   */
  async getBalance(wallet) {
    if (!this.provider || !this.usdcAddress) {
      throw new Error('TipService not configured');
    }

    const usdc = this.getUSDC();
    const balance = await usdc.balanceOf(wallet);

    return ethers.formatUnits(balance, 6); // 6 decimals
  }

  /**
   * Build transaction to send tip via TipRouter
   * @param {string} walletPrivateKey - Wallet private key (with leading 0x)
   * @param {string} creatorAddress - Creator's wallet address
   * @param {number} amountUsdc - Amount in USDC (e.g., 5 for $5.00)
   */
  async sendTip(walletPrivateKey, creatorAddress, amountUsdc) {
    this.assertExecutionEnabled();
    if (!this.provider || !this.contractAddress) {
      throw new Error('TipService not configured');
    }

    // Convert amount to USDC wei (6 decimals)
    const amountWei = ethers.parseUnits(amountUsdc.toString(), 6);

    // Create signer from private key
    const wallet = new ethers.Wallet(walletPrivateKey, this.provider);
    
    // Get TipRouter contract with signer
    const tipRouter = new ethers.Contract(
      this.contractAddress,
      this.tipRouterABI,
      wallet
    );

    // Build transaction
    const tx = await tipRouter.sendTip(creatorAddress, amountWei);

    // Wait for confirmation (3 confirmations recommended)
    const receipt = await tx.wait(3);

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create approval transaction for TipRouter
   * @param {string} walletPrivateKey - Wallet private key (with leading 0x)
   * @param {number} amountUsdc - Amount to approve (e.g., 100 for $100.00)
   */
  async approveTipRouter(walletPrivateKey, amountUsdc) {
    this.assertExecutionEnabled();
    if (!this.provider || !this.usdcAddress || !this.contractAddress) {
      throw new Error('TipService not configured');
    }

    // Convert amount to USDC wei
    const amountWei = ethers.parseUnits(amountUsdc.toString(), 6);

    // Create signer from private key
    const wallet = new ethers.Wallet(walletPrivateKey, this.provider);
    
    // Get USDC contract with signer
    const usdc = new ethers.Contract(
      this.usdcAddress,
      this.usdcABI,
      wallet
    );

    // Approve TipRouter for the amount
    const tx = await usdc.approve(this.contractAddress, amountWei);

    const receipt = await tx.wait(3);

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      approvedAmount: amountUsdc,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate tip parameters
   */
  validateTip(senderId, creatorId, amount) {
    const errors = [];

    if (!senderId) errors.push('Sender ID is required');
    if (!creatorId) errors.push('Creator ID is required');
    if (!amount || parseFloat(amount) <= 0) errors.push('Valid amount required');
    if (parseFloat(amount) < 0.01) errors.push('Minimum tip is $0.01');

    // Minimum USDC unit is 0.01 (10000 wei)
    const minWei = 10000n;
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    if (amountWei < minWei) {
      errors.push('Amount too small (minimum 0.01 USDC)');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  /**
   * Get contract status info
   */
  getStatus() {
    return {
      configured: this.isExecutionEnabled(),
      rpcUrl: this.rpcUrl || null,
      contractAddress: this.contractAddress || null,
      usdcAddress: this.usdcAddress || null,
      recipientAddress: this.recipientAddress || null,
      network: 'base-sepolia'
    };
  }
}

module.exports = new TipService();
