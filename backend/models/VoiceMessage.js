const mongoose = require('mongoose');

const voiceMessageSchema = new mongoose.Schema({
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
  audioUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  waveform: [{
    type: Number
  }],
  transcription: {
    type: String,
    default: ''
  },
  isListened: {
    type: Boolean,
    default: false
  },
  listenedAt: {
    type: Date
  }
}, {
  timestamps: true
});

voiceMessageSchema.index({ sender: 1, recipient: 1 });
voiceMessageSchema.index({ recipient: 1, isListened: 1 });

module.exports = mongoose.model('VoiceMessage', voiceMessageSchema);
