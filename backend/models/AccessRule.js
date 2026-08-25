const mongoose = require('mongoose');

const accessRuleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, trim: true, maxlength: 80, default: '' },
  expression: { type: mongoose.Schema.Types.Mixed, required: true },
  presentation: { type: String, enum: ['hidden', 'locked_preview'], default: 'hidden' },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

accessRuleSchema.index({ owner: 1, enabled: 1 });

module.exports = mongoose.model('AccessRule', accessRuleSchema);
