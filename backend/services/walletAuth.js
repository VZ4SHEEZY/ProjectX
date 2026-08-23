const crypto = require('crypto');
const { ethers } = require('ethers');
const WalletChallenge = require('../models/WalletChallenge');

const CHAIN_ID = 84532;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const configuredOrigin = (env = process.env) => {
  const first = (env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  const url = new URL(first);
  return { domain: url.host, uri: `${url.origin}/` };
};

const requestOrigin = (req) => {
  const raw = req.get('origin');
  if (!raw) return configuredOrigin();
  const url = new URL(raw);
  const expected = configuredOrigin();
  if (url.host !== expected.domain || url.origin !== new URL(expected.uri).origin) {
    const error = new Error('Wallet authentication origin is not allowed');
    error.status = 403;
    throw error;
  }
  return { domain: url.host, uri: `${url.origin}/` };
};

const buildMessage = ({ domain, uri, address, chainId, nonce, issuedAt, expirationTime }) =>
  `${domain} wants you to sign in with your Ethereum account:\n${address}\n\n` +
  `Sign in to CyberDope. This request will not trigger a blockchain transaction or cost gas.\n\n` +
  `URI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\n` +
  `Issued At: ${issuedAt}\nExpiration Time: ${expirationTime}`;

const createChallenge = async (req, walletAddress) => {
  if (!ethers.isAddress(walletAddress || '')) {
    const error = new Error('Valid wallet address required'); error.status = 400; throw error;
  }
  const address = ethers.getAddress(walletAddress);
  const { domain, uri } = requestOrigin(req);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const challengeId = crypto.randomUUID();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = buildMessage({ domain, uri, address, chainId: CHAIN_ID, nonce, issuedAt: issuedAt.toISOString(), expirationTime: expiresAt.toISOString() });
  await WalletChallenge.create({ challengeId, nonce, address: address.toLowerCase(), domain, uri, chainId: CHAIN_ID, message, issuedAt, expiresAt });
  return { challengeId, message, expiresAt: expiresAt.toISOString(), chainId: CHAIN_ID };
};

const authError = (message) => { const error = new Error(message); error.status = 401; return error; };

const verifyAndConsume = async ({ challengeId, signature, walletAddress }) => {
  if (typeof challengeId !== 'string' || typeof signature !== 'string' || !ethers.isAddress(walletAddress || '')) {
    const error = new Error('Malformed wallet verification request'); error.status = 400; throw error;
  }
  const challenge = await WalletChallenge.findOne({ challengeId });
  if (!challenge || challenge.usedAt) throw authError('Challenge is invalid or has already been used');
  if (challenge.expiresAt <= new Date()) throw authError('Challenge has expired');
  const expected = configuredOrigin();
  if (challenge.domain !== expected.domain || challenge.uri !== expected.uri || challenge.chainId !== CHAIN_ID) {
    throw authError('Challenge domain, URI, or chain is invalid');
  }
  const normalizedAddress = ethers.getAddress(walletAddress).toLowerCase();
  if (challenge.address !== normalizedAddress) throw authError('Wallet address does not match challenge');
  let recovered;
  try { recovered = ethers.verifyMessage(challenge.message, signature).toLowerCase(); }
  catch { throw authError('Malformed wallet signature'); }
  if (recovered !== normalizedAddress) throw authError('Signature does not match wallet address');
  const consumed = await WalletChallenge.findOneAndUpdate(
    { _id: challenge._id, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }, { new: true }
  );
  if (!consumed) throw authError('Challenge is invalid, expired, or has already been used');
  return normalizedAddress;
};

module.exports = { CHAIN_ID, CHALLENGE_TTL_MS, buildMessage, configuredOrigin, createChallenge, verifyAndConsume };
