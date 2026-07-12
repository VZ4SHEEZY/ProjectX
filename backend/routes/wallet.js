const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');
const cdpService = require('../services/cdp');

// Web3 message to sign for verification
const generateAuthMessage = (nonce) => {
  return `Welcome to CyberDope!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nNonce: ${nonce}`;
};

// Request nonce for wallet connection
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Generate nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store nonce temporarily (in production, use Redis)
    // For now, we'll store in user record or create a temp store
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      // Create temp user with nonce
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        walletNonce: nonce,
        username: `wallet_${walletAddress.slice(0, 8)}`,
        displayName: `CyberUser ${walletAddress.slice(0, 6)}`
      });
    } else {
      user.walletNonce = nonce;
    }
    
    await user.save();
    
    res.json({
      success: true,
      nonce,
      message: generateAuthMessage(nonce)
    });
  } catch (error) {
    console.error('Nonce Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// Verify wallet signature
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature required' });
    }
    
    // Find user
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user || !user.walletNonce) {
      return res.status(400).json({ error: 'Invalid or expired nonce' });
    }
    
    // Verify signature (in production, use ethers.js or web3.js)
    // This is a simplified verification
    const expectedMessage = generateAuthMessage(user.walletNonce);
    
    const isValid = message === expectedMessage;
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Clear nonce
    user.walletNonce = null;
    user.isWalletConnected = true;
    user.lastWalletLogin = new Date();
    await user.save();
    
    // Generate JWT
    const token = require('jsonwebtoken').sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Wallet Verification Error:', error);
    res.status(500).json({ error: 'Failed to verify wallet' });
  }
});

// Connect external wallet to existing account
router.post('/connect', auth, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Check if wallet is already connected to another account
    const existingUser = await User.findOne({ 
      externalWalletAddress: walletAddress.toLowerCase(),
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Wallet already connected to another account' });
    }
    
    // Update user - set external wallet
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        externalWalletAddress: walletAddress.toLowerCase(),
        // Keep payoutWallet as is (default is embedded)
      },
      { new: true }
    );
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        embeddedWalletAddress: user.embeddedWalletAddress,
        externalWalletAddress: user.externalWalletAddress,
        payoutWallet: user.payoutWallet
      }
    });
  } catch (error) {
    console.error('Wallet Connect Error:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

// Disconnect external wallet (keep embedded)
router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        externalWalletAddress: '',
        // If payout was set to external, switch back to embedded
        payoutWallet: user.payoutWallet === 'external' ? 'embedded' : user.payoutWallet
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'External wallet disconnected',
      wallets: {
        embedded: user.embeddedWalletAddress,
        external: user.externalWalletAddress,
        payoutWallet: user.payoutWallet
      }
    });
  } catch (error) {
    console.error('Wallet Disconnect Error:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

// Get wallet balance (real Base Sepolia data)
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Use embedded wallet by default, fall back to external
    const activeWallet = user.embeddedWalletAddress || user.externalWalletAddress;
    
    if (!activeWallet) {
      return res.status(400).json({ error: 'No wallet connected' });
    }
    
    // Get real USDC balance from Base Sepolia
    const usdcBalance = await cdpService.getUSDCBalance(activeWallet);
    
    // For now, only return USDC (most important for tipping)
    // Can expand to other tokens later
    const balances = {
      USDC: usdcBalance
    };
    
    res.json({
      success: true,
      walletAddress: activeWallet,
      walletType: user.embeddedWalletAddress === activeWallet ? 'embedded' : 'external',
      chain: 'base-sepolia',
      balances,
      totalUSD: usdcBalance
    });
  } catch (error) {
    console.error('Get Balance Error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get transaction history (from Base Sepolia)
router.get('/transactions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const activeWallet = user.embeddedWalletAddress || user.externalWalletAddress;
    
    if (!activeWallet) {
      return res.status(400).json({ error: 'No wallet connected' });
    }
    
    // Get real transaction history from Base Sepolia
    // In production: call Base Sepolia block explorer API (Basescan)
    const transactions = await cdpService.getTransactionHistory(activeWallet);
    
    res.json({
      success: true,
      walletAddress: activeWallet,
      chain: 'base-sepolia',
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Send crypto tip
router.post('/send-tip', auth, async (req, res) => {
  try {
    const { recipientAddress, amount, token, message } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'No wallet connected' });
    }
    
    // In production, this would create and send a blockchain transaction
    // For demo, we just record it
    const transaction = {
      id: `tx_${Date.now()}`,
      type: 'tip',
      amount,
      token,
      from: user.walletAddress,
      to: recipientAddress,
      message,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    res.json({
      success: true,
      transaction,
      message: 'Tip transaction created'
    });
  } catch (error) {
    console.error('Send Tip Error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// Get supported chains/tokens for Base Sepolia
router.get('/supported-tokens', async (req, res) => {
  try {
    const tokens = [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        chain: 'base-sepolia',
        chainId: 84532,
        decimals: 6,
        address: process.env.USDC_SEPOLIA_ADDRESS || '0x0',
        logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      }
    ];
    
    res.json({
      success: true,
      chain: 'base-sepolia',
      tokens
    });
  } catch (error) {
    console.error('Get Tokens Error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

module.exports = router;

