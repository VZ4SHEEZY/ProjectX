'use strict';

const mongoose = require('mongoose');
const { canonicalEvent } = require('../contracts');
const { canonicalEvidence } = require('../evidence');
const { qualificationDecision, qualifyLedger } = require('../qualification');
const { project } = require('../projection');
const { verifyPolicyArtifact } = require('../policy-artifact');
const repository = require('./repository');

// Release 3B is intentionally not connected to routes, jobs, or application imports.
const SHADOW_MODE = true;
const USER_FACING_PROGRESSION_ENABLED = false;

async function appendEvent(input, options = {}) {
  const event = canonicalEvent(input);
  return withOptionalTransaction({ ...options, transaction: options.transaction ?? Boolean(event.correction) }, async session => {
    const stored = await repository.appendActivityEvent(event, { session });
    if (event.correction) await repository.appendCorrectionRelationship(event, { session });
    return stored;
  });
}

function appendEvidence(input, options = {}) {
  return repository.appendEvidence(canonicalEvidence(input), options);
}

function appendDecision(input, options = {}) {
  return repository.appendQualificationDecision(qualificationDecision(input), options);
}

function appendPolicy(input, options = {}) {
  return repository.appendPolicyArtifact(verifyPolicyArtifact(input), options);
}

async function appendContribution(eventInput, decisionInput, options = {}) {
  return repository.appendContributionResult(canonicalEvent(eventInput), qualificationDecision(decisionInput), options);
}

async function rebuildProjection({ policy, context = {}, rebuiltAt } = {}) {
  if (!policy?.artifact) throw new TypeError('a registered Release 3A policy is required');
  const artifact = verifyPolicyArtifact(policy.artifact);
  const inputs = await repository.getOrderedReplayInputs();
  const evidenceByRef = Object.fromEntries(inputs.evidence.map(item => [item.evidenceId, item]));
  const replayContext = { ...context, evidenceByRef };
  const decisions = qualifyLedger(inputs.events, policy.qualification, replayContext);
  const projection = project(inputs.events, decisions, policy, replayContext);
  const eventsById = new Map(inputs.events.map(event => [event.eventId, event]));

  await withOptionalTransaction({ transaction: true }, async session => {
    await repository.appendPolicyArtifact(artifact, { session });
    for (const decision of decisions) {
      await repository.appendQualificationDecision(decision, { session });
      await repository.appendContributionResult(eventsById.get(decision.eventId), decision, { session });
    }
    for (const [subjectId, checkpoint] of Object.entries(projection.personal)) {
      await repository.storeProjection({ scope: 'personal', subjectId, projectionContext: projection.projectionContext, checkpoint }, { session, rebuiltAt });
    }
    for (const [subjectId, checkpoint] of Object.entries(projection.faction)) {
      await repository.storeProjection({ scope: 'faction', subjectId, projectionContext: projection.projectionContext, checkpoint }, { session, rebuiltAt });
    }
  });
  return projection;
}

async function rebuildUserProjection({ userId, ...options } = {}) {
  if (typeof userId !== 'string' || !userId || userId.length > 256) throw new TypeError('a bounded userId is required');
  const rebuilt = await rebuildProjection(options);
  return {
    projectionContext: rebuilt.projectionContext,
    generationMetadata: rebuilt.generationMetadata,
    inactiveEventIds: rebuilt.inactiveEventIds,
    personal: rebuilt.personal[userId] || null
  };
}

function getProjection(scope, subjectId, projectionContextId) {
  if (!['personal', 'faction'].includes(scope)) throw new TypeError('projection scope must be personal or faction');
  return repository.getProjection(scope, subjectId, projectionContextId);
}

function getOrderedReplayInputs() { return repository.getOrderedReplayInputs(); }

async function withOptionalTransaction(options, operation) {
  if (!options.transaction) return operation(options.session);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await operation(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = Object.freeze({ SHADOW_MODE, USER_FACING_PROGRESSION_ENABLED, appendEvent, appendEvidence, appendDecision, appendPolicy, appendContribution, rebuildProjection, rebuildUserProjection, getProjection, getOrderedReplayInputs });
