const mongoose = require('mongoose');

const profileLayoutSchema = new mongoose.Schema({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, unique: true },
  theme: {
    primaryColor: String, secondaryColor: String, accentColor: String,
    backgroundColor: String, fontFamily: String, fontSize: String,
    animations: Boolean, glowEffects: Boolean, scanlines: Boolean,
    backgroundImage: String, cursorEffect: String, layoutStyle: String
  },
  factionStarterTheme: { type: String, enum: ['full', 'partial', 'off'], default: 'full' },
  version: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('ProfileLayout', profileLayoutSchema);
