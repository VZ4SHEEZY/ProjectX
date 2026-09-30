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
const Memory = require('../../models/OutriderAgentMemory');
const Execution = require('../../models/OutriderAgentExecution');

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
const createAgent = (value, options) => Agent.create([value], session(options)).then(([doc]) => doc);
const upsertAgent = (value, options) => Agent.findOneAndUpdate({ agentId: value.agentId }, { $setOnInsert: value }, { upsert: true, new: true, runValidators: true, ...session(options) });
const updateAgent = (agentId, value, options) => Agent.findOneAndUpdate({ agentId }, { $set: value }, { new: true, runValidators: true, ...session(options) });
const createGrant = (value, options) => Grant.create([value], session(options)).then(([doc]) => doc);
const upsertGrant = (value, options) => Grant.findOneAndUpdate({ grantId: value.grantId }, { $setOnInsert: value }, { upsert: true, new: true, runValidators: true, ...session(options) });
const upsertSpace = (value, options) => Space.findOneAndUpdate({ spaceId: value.spaceId }, { $setOnInsert: value }, { upsert: true, new: true, runValidators: true, ...session(options) });
const setPresence = async (agentId, fromSpaceId, toSpaceId, options) => {
  if (fromSpaceId && fromSpaceId !== toSpaceId) await Space.updateOne({ spaceId: fromSpaceId }, { $pull: { presentAgentIds: agentId } }, session(options));
  await Space.updateOne({ spaceId: toSpaceId }, { $addToSet: { presentAgentIds: agentId } }, session(options));
  return updateAgent(agentId, { currentSpaceId: toSpaceId }, options);
};
const listAgents = filter => Agent.find(filter || {}).lean();
const listSpaces = filter => Space.find(filter || {}).lean();
const listRecentEvents = (filter = {}, limit = 100) => Event.find(filter).sort({ occurredAt: -1, eventId: -1 }).limit(limit).lean();
const listArtifacts = (filter = {}, limit = 100) => Artifact.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
const listConversations = (filter = {}, limit = 100) => Conversation.find(filter).sort({ updatedAt: -1 }).limit(limit).lean();
const appendMemory = (value, options) => Memory.create([value], session(options)).then(([doc]) => doc);
const listMemory = (namespace, limit = 20) => Memory.find({ namespace }).sort({ recordedAt: -1, memoryId: -1 }).limit(limit).lean();
const appendExecution = (value, options) => Execution.create([value], session(options)).then(([doc]) => doc);
const findExecution = (runId, tick, agentId) => Execution.findOne({ runId, tick, agentId }).lean();
const listSignals = (filter = {}, limit = 50) => Signal.find(filter).sort({ occurredAt: -1 }).limit(limit).lean();

// This module intentionally imports only Outrider models. Canonical CyberDope
// reads and commands must enter through adapters owned by the Glass gateway.
module.exports = { findAgent, findActiveGrant, createSpace, appendWorldEvent, upsertRelationship, createObserverSession, appendSignal, appendProposal, appendGlassAudit, createArtifact, createConversation, createAgent, upsertAgent, updateAgent, createGrant, upsertGrant, upsertSpace, setPresence, listAgents, listSpaces, listRecentEvents, listArtifacts, listConversations, appendMemory, listMemory, appendExecution, findExecution, listSignals };
