const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const cdpService = require('../services/cdp');
const walletAuth = require('../services/walletAuth');

const fail = (res, error) => res.status(error.status || 500).json({ error: error.status ? error.message : 'Wallet authentication failed' });

router.post('/nonce', async (req, res) => {
  try { res.json({ success: true, ...(await walletAuth.createChallenge(req, req.body?.walletAddress)) }); }
  catch (error) { fail(res, error); }
});

router.post('/verify', async (req, res) => {
  try {
    const address = await walletAuth.verifyAndConsume(req.body || {});
    let user = await User.findOne({ $or: [{ walletAddress: address }, { externalWalletAddress: address }] });
    if (!user) {
      const suffix = address.slice(2, 10);
      user = await User.create({
        walletAddress: address, externalWalletAddress: address,
        username: `wallet_${suffix}`, displayName: `CyberUser 0x${suffix.slice(0, 4)}`,
        email: `wallet-${address.slice(2).toLowerCase()}@wallet.invalid`,
        password: crypto.randomBytes(32).toString('hex')
      });
    }
    user.walletAddress = address;
    user.externalWalletAddress = address;
    user.lastWalletLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { _id: user._id, username: user.username, displayName: user.displayName, walletAddress: address, avatar: user.avatar } });
  } catch (error) { fail(res, error); }
});

router.post('/connect', protect, async (req, res) => {
  try {
    const address = await walletAuth.verifyAndConsume(req.body || {});
    const existing = await User.findOne({ externalWalletAddress: address, _id: { $ne: req.user._id } });
    if (existing) return res.status(409).json({ error: 'Wallet already connected to another account' });
    req.user.externalWalletAddress = address;
    req.user.walletAddress = address;
    await req.user.save();
    res.json({ success: true, walletAddress: address });
  } catch (error) { fail(res, error); }
});

router.post('/disconnect', protect, async (req, res) => {
  try {
    req.user.externalWalletAddress = '';
    req.user.walletAddress = '';
    if (req.user.payoutWallet === 'external') req.user.payoutWallet = 'embedded';
    await req.user.save();
    res.json({ success: true, message: 'External wallet disconnected' });
  } catch { res.status(500).json({ error: 'Failed to disconnect wallet' }); }
});

router.get('/balance', protect, async (req, res) => {
  try {
    const activeWallet = req.user.externalWalletAddress || req.user.embeddedWalletAddress;
    if (!activeWallet) return res.status(400).json({ error: 'No wallet connected' });
    const usdcBalance = await cdpService.getUSDCBalance(activeWallet);
    res.json({ success: true, walletAddress: activeWallet, chain: 'base-sepolia', chainId: walletAuth.CHAIN_ID, balances: { USDC: usdcBalance }, totalUSD: usdcBalance });
  } catch { res.status(500).json({ error: 'Failed to fetch balance' }); }
});

router.get('/transactions', protect, async (req, res) => {
  try {
    const activeWallet = req.user.externalWalletAddress || req.user.embeddedWalletAddress;
    if (!activeWallet) return res.status(400).json({ error: 'No wallet connected' });
    res.json({ success: true, walletAddress: activeWallet, chain: 'base-sepolia', chainId: walletAuth.CHAIN_ID, transactions: await cdpService.getTransactionHistory(activeWallet) || [] });
  } catch { res.status(500).json({ error: 'Failed to fetch transactions' }); }
});

router.post('/send-tip', protect, (_req, res) => res.status(503).json({ error: 'Wallet payment execution is disabled' }));
router.get('/supported-tokens', (_req, res) => res.json({ chain: 'base-sepolia', chainId: walletAuth.CHAIN_ID, tokens: ['USDC'] }));

module.exports = router;
