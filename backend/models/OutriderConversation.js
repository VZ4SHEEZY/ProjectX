'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, immutable: true }, spaceId: { type: String, required: true },
  kind: { type: String, enum: ['agent_agent', 'observer_agent'], required: true }, agentIds: { type: [String], required: true },
  observerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  visibility: { type: String, enum: ['public', 'participants', 'restricted'], required: true }, status: { type: String, enum: ['active', 'closed', 'moderated'], default: 'active' },
  memoryPolicy: { type: String, enum: ['none', 'summary', 'permitted_history'], default: 'none' }
}, { timestamps: true, strict: 'throw', collection: 'outrider_conversations' });
module.exports = mongoose.model('OutriderConversation', schema);
