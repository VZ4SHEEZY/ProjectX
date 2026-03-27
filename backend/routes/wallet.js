const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');

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

// Connect wallet to existing account
router.post('/connect', auth, async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Check if wallet is already connected to another account
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Wallet already connected to another account' });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        walletAddress: walletAddress.toLowerCase(),
        isWalletConnected: true,
        walletConnectedAt: new Date()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        walletAddress: user.walletAddress,
        isWalletConnected: true
      }
    });
  } catch (error) {
    console.error('Wallet Connect Error:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

// Disconnect wallet
router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        walletAddress: null,
        isWalletConnected: false
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Wallet disconnected'
    });
  } catch (error) {
    console.error('Wallet Disconnect Error:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet' });
  }
});

// Get wallet balance (mock for demo)
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'No wallet connected' });
    }
    
    // Mock balances - in production, fetch from blockchain
    const balances = {
      ETH: (Math.random() * 2).toFixed(4),
      USDC: (Math.random() * 1000).toFixed(2),
      USDT: (Math.random() * 500).toFixed(2),
      MATIC: (Math.random() * 100).toFixed(2),
      SOL: (Math.random() * 50).toFixed(4)
    };
    
    res.json({
      success: true,
      walletAddress: user.walletAddress,
      balances,
      totalUSD: Object.values(balances).reduce((a, b) => a + parseFloat(b), 0).toFixed(2)
    });
  } catch (error) {
    console.error('Get Balance Error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get transaction history (mock for demo)
router.get('/transactions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'No wallet connected' });
    }
    
    // Mock transactions - in production, fetch from blockchain explorer API
    const transactions = [
      {
        id: 'tx_1',
        type: 'receive',
        amount: '0.5',
        token: 'ETH',
        from: '0x1234...5678',
        to: user.walletAddress,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'confirmed'
      },
      {
        id: 'tx_2',
        type: 'send',
        amount: '100',
        token: 'USDC',
        from: user.walletAddress,
        to: '0xabcd...efgh',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        status: 'confirmed'
      },
      {
        id: 'tx_3',
        type: 'tip',
        amount: '0.01',
        token: 'ETH',
        from: user.walletAddress,
        to: '0x9876...5432',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        status: 'confirmed'
      }
    ];
    
    res.json({
      success: true,
      transactions
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

// Get supported chains/tokens
router.get('/supported-tokens', async (req, res) => {
  try {
    const tokens = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        chain: 'ethereum',
        decimals: 18,
        logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        chain: 'ethereum',
        decimals: 6,
        logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        chain: 'ethereum',
        decimals: 6,
        logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        chain: 'polygon',
        decimals: 18,
        logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        chain: 'solana',
        decimals: 9,
        logo: 'https://cryptologos.cc/logos/solana-sol-logo.png'
      }
    ];
    
    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('Get Tokens Error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

module.exports = router;
