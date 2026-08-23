const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  // Tip details
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Amount & Token
  amount: {
    type: String,
    required: true  // Store as string to avoid floating point issues
  },
  amountUnits: { type: String, required: true },
  token: {
    type: String,
    default: 'USDC'
  },
  chain: {
    type: String,
    default: 'base-sepolia'
  },
  
  // Split amounts
  creatorAmount: {
    type: String,
    required: true  // 80% of amount
  },
  platformAmount: {
    type: String,
    required: true  // 20% of amount
  },
  
  // Transaction
  txHash: {
    type: String,
    unique: true,
    sparse: true  // Allow null for failed transactions
  },
  idempotencyKey: { type: String, required: true },
  senderWallet: { type: String, required: true },
  creatorWallet: { type: String, required: true },
  tokenAddress: { type: String, required: true },
  routerAddress: { type: String, required: true },
  treasuryAddress: { type: String, required: true },
  chainId: { type: Number, required: true, default: 84532 },
  expiresAt: { type: Date, required: true },
  blockNumber: Number,
  confirmationCount: Number,
  txStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  
  // Post/content (optional - can tip without post)
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  
  // Message from tipper (optional)
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: Date,
  failedAt: Date,
  
  // Error tracking (for failed tips)
  failureReason: String
}, {
  timestamps: true
});

// Index for queries
tipSchema.index({ creator: 1, createdAt: -1 });
tipSchema.index({ sender: 1, createdAt: -1 });
tipSchema.index(
  { sender: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Tip', tipSchema);
