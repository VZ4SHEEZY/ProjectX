'use strict';

const Agent = require('../../models/OutriderAgent');
const Grant = require('../../models/OutriderCapabilityGrant');
const Space = require('../../models/OutriderWorldSpace');
const Event = require('../../models/OutriderWorldEvent');
const Relationship = require('../../models/OutriderAgentRelationship');
const ObserverSession = require('../../models/OutriderObserverSession');
const Signal = require('../../models/OutriderWorldSignal');
const Proposal = require('../../models/OutriderProposal');
const GlassAudit = require('../../models/OutriderGlassAudit');
const Artifact = require('../../models/OutriderArtifact');
const Conversation = require('../../models/OutriderConversation');

const session = options => options?.session ? { session: options.session } : {};
const findAgent = agentId => Agent.findOne({ agentId }).lean();
const findActiveGrant = (agentId, capability, now = new Date()) => Grant.findOne({ agentId, capability, state: 'active', $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).lean();
const createSpace = (value, options) => Space.create([value], session(options)).then(([doc]) => doc);
const appendWorldEvent = (value, options) => Event.create([value], session(options)).then(([doc]) => doc);
const upsertRelationship = (value, options) => Relationship.findOneAndUpdate({ sourceAgentId: value.sourceAgentId, targetAgentId: value.targetAgentId }, { $set: value }, { upsert: true, new: true, runValidators: true, ...session(options) });
const createObserverSession = (value, options) => ObserverSession.create([value], session(options)).then(([doc]) => doc);
const appendSignal = (value, options) => Signal.create([value], session(options)).then(([doc]) => doc);
const appendProposal = (value, options) => Proposal.create([value], session(options)).then(([doc]) => doc);
const appendGlassAudit = (value, options) => GlassAudit.create([value], session(options)).then(([doc]) => doc);
const createArtifact = (value, options) => Artifact.create([value], session(options)).then(([doc]) => doc);
const createConversation = (value, options) => Conversation.create([value], session(options)).then(([doc]) => doc);

// This module intentionally imports only Outrider models. Canonical CyberDope
// reads and commands must enter through adapters owned by the Glass gateway.
module.exports = { findAgent, findActiveGrant, createSpace, appendWorldEvent, upsertRelationship, createObserverSession, appendSignal, appendProposal, appendGlassAudit, createArtifact, createConversation };
