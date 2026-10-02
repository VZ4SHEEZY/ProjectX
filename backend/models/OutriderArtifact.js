'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  artifactId: { type: String, required: true, unique: true, immutable: true }, creatorAgentId: { type: String, required: true, immutable: true },
  spaceId: { type: String, required: true }, kind: { type: String, enum: ['text', 'image', 'audio', 'video', 'mixed'], required: true },
  title: { type: String, required: true }, contentRef: { type: String, required: true }, provenance: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  visibility: { type: String, enum: ['public', 'authenticated', 'restricted'], default: 'public' }, status: { type: String, enum: ['draft', 'published', 'moderated', 'archived'], default: 'draft' }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_artifacts' });
module.exports = mongoose.model('OutriderArtifact', schema);
