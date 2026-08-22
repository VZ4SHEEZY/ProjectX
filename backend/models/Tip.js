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

// Calculate 80/20 split before saving
tipSchema.pre('save', function(next) {
  if (this.amount && !this.creatorAmount) {
    const amountNum = parseFloat(this.amount);
    this.creatorAmount = (amountNum * 0.8).toFixed(6);
    this.platformAmount = (amountNum * 0.2).toFixed(6);
  }
  next();
});

module.exports = mongoose.model('Tip', tipSchema);
