const mongoose = require('mongoose');

const factionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  color: { type: String, default: '#39FF14' },
  status: { type: String, enum: ['active', 'retired'], default: 'active' },
  founding: { type: Boolean, default: true },
  migrationRunId: { type: String, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Faction', factionSchema);
