const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Related content (optional)
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  
  // Amount
  amount: {
    type: Number,
    required: true,
    min: 0.001
  },
  currency: {
    type: String,
    enum: ['ETH', 'USDC', 'USDT', 'BTC'],
    default: 'ETH'
  },
  
  // Message
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Anonymous tip
  isAnonymous: { type: Boolean, default: false },
  
  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Blockchain transaction hash
  txHash: { type: String },
  
  // Platform fee
  platformFee: { type: Number, default: 0 },
  recipientAmount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Index for fetching tips
tipSchema.index({ recipient: 1, status: 1, createdAt: -1 });
tipSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('Tip', tipSchema);

// Subscription model
const subscriptionSchema = new mongoose.Schema({
  subscriber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tier info
  tier: {
    name: String,
    price: Number,
    benefits: [String]
  },
  
  // Subscription period
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  cancelledAt: Date,
  
  // Auto-renew
  autoRenew: { type: Boolean, default: true },
  
  // Payment
  totalPaid: { type: Number, default: 0 },
  lastPaymentAt: Date,
  
  // Transaction hash
  txHash: String
}, {
  timestamps: true
});

subscriptionSchema.index({ subscriber: 1, status: 1 });
subscriptionSchema.index({ creator: 1, status: 1 });

module.exports.Subscription = mongoose.model('Subscription', subscriptionSchema);
