'use strict';

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { canonicalEvent, stableJson } = require('../contracts');
const { canonicalEvidence } = require('../evidence');
const { qualificationDecision, qualifyLedger } = require('../qualification');
const { project } = require('../projection');
const { verifyPolicyArtifact } = require('../policy-artifact');
const repository = require('./repository');
const { resolvePersistedPolicy } = require('./policy-resolver');

// Release 3B is intentionally not connected to routes, jobs, or application imports.
const SHADOW_MODE = true;
const USER_FACING_PROGRESSION_ENABLED = false;

async function appendEvent(input, options = {}) {
  const event = canonicalEvent(input);
  return withOptionalTransaction({ ...options, transaction: options.transaction ?? Boolean(event.correction) }, async session => {
    if (event.correction) await validateCorrectionRelationships(event, { session });
    const stored = await repository.appendActivityEvent(event, { session });
    if (event.correction) await repository.appendCorrectionRelationship(event, { session });
    return stored;
  });
}

function appendEvidence(input, options = {}) {
  return repository.appendEvidence(canonicalEvidence(input), options);
}

async function appendDecision(input, options = {}) {
  const decision = qualificationDecision(input);
  await validateDecisionRelationships(decision, options);
  return repository.appendQualificationDecision(decision, options);
}

function appendPolicy(input, options = {}) {
  return repository.appendPolicyArtifact(verifyPolicyArtifact(input), options);
}

async function appendContribution(eventInput, decisionInput, options = {}) {
  const event = canonicalEvent(eventInput);
  const decision = qualificationDecision(decisionInput);
  await validateContributionRelationships(event, decision, options);
  return repository.appendContributionResult(event, decision, options);
}

async function rebuildProjection({ policyIdentity, policy, context = {}, rebuiltAt, session } = {}) {
  if (policy) throw new TypeError('caller-supplied replay policies are not accepted; use policyIdentity');
  const { inputs, decisions, projection } = await calculateProjection({ policyIdentity, context, session });
  const eventsById = new Map(inputs.events.map(event => [event.eventId, event]));

  await withOptionalTransaction({ transaction: true, session }, async transactionSession => {
    for (const decision of decisions) {
      await validateDecisionRelationships(decision, { session: transactionSession });
      await repository.appendQualificationDecision(decision, { session: transactionSession });
      await validateContributionRelationships(eventsById.get(decision.eventId), decision, { session: transactionSession });
      await repository.appendContributionResult(eventsById.get(decision.eventId), decision, { session: transactionSession });
    }
    for (const [subjectId, checkpoint] of Object.entries(projection.personal)) {
      await repository.storeProjection({ scope: 'personal', subjectId, projectionContext: projection.projectionContext, checkpoint }, { session: transactionSession, rebuiltAt });
    }
    for (const [subjectId, checkpoint] of Object.entries(projection.faction)) {
      await repository.storeProjection({ scope: 'faction', subjectId, projectionContext: projection.projectionContext, checkpoint }, { session: transactionSession, rebuiltAt });
    }
  });
  return projection;
}

async function calculateProjection({ policyIdentity, policy, context = {}, session } = {}) {
  if (policy) throw new TypeError('caller-supplied replay policies are not accepted; use policyIdentity');
  const resolvedPolicy = await resolvePersistedPolicy(policyIdentity, { session });
  const inputs = await repository.getOrderedReplayInputs({ session });
  const evidenceByRef = Object.fromEntries(inputs.evidence.map(item => [item.evidenceId, item]));
  const replayContext = { ...context, evidenceByRef };
  const decisions = qualifyLedger(inputs.events, resolvedPolicy.qualification, replayContext);
  const projection = project(inputs.events, decisions, resolvedPolicy, replayContext);
  return { inputs, decisions, projection };
}

// Derive one newly-ingested event through the same canonical ledger evaluator used
// by rebuild/replay, while persisting only that event's immutable result and the
// projections it can affect. The caller owns the transaction so event ingestion,
// derived state, and outbox acknowledgement can commit as one unit.
async function advanceLiveEvent({ eventId, policyIdentity, context = {}, session, rebuiltAt } = {}) {
  if (typeof eventId !== 'string' || !/^[a-f0-9]{32}$/.test(eventId)) throw new TypeError('a canonical eventId is required');
  if (!session || typeof session.inTransaction !== 'function' || !session.inTransaction()) throw new TypeError('advanceLiveEvent requires an active transaction session');
  const storedEvent = await repository.getActivityEvent(eventId, { session });
  if (!storedEvent) throw new Error(`PROGRESSION_LIVE_EVENT_NOT_FOUND:${eventId}`);
  // A live decision is an immutable as-of-ingestion fact. Pinning both bounds to
  // the event watermark makes a delayed duplicate/retry derive the same identity
  // even after newer ledger activity has arrived. Rebuild/replay remains free to
  // select a later explicit context and append its separately versioned results.
  const liveContext = { ...context, cutoff: storedEvent.canonicalPayload.ingestedAt, watermark: storedEvent.canonicalPayload.ingestedAt };
  const { inputs, decisions, projection } = await calculateProjection({ policyIdentity, context: liveContext, session });
  const event = inputs.events.find(value => value.eventId === eventId);
  const decision = decisions.find(value => value.eventId === eventId);
  if (!event || !decision) throw new Error(`PROGRESSION_LIVE_EVENT_NOT_FOUND:${eventId}`);

  await validateDecisionRelationships(decision, { session });
  await repository.appendQualificationDecision(decision, { session });
  await validateContributionRelationships(event, decision, { session });
  await repository.appendContributionResult(event, decision, { session });

  const personal = projection.personal[event.beneficiaryId];
  if (!personal) throw new Error(`PROGRESSION_LIVE_PERSONAL_PROJECTION_NOT_FOUND:${event.beneficiaryId}`);
  await repository.storeProjection({ scope: 'personal', subjectId: event.beneficiaryId, projectionContext: projection.projectionContext, checkpoint: personal }, { session, rebuiltAt, preserveExisting: true });

  const factionId = event.affiliations.beneficiary.state === 'affiliated' ? event.affiliations.beneficiary.factionId : null;
  const faction = factionId ? projection.faction[factionId] : null;
  if (decision.contributionResult.faction !== 0 && (!factionId || !faction)) throw new Error('PROGRESSION_LIVE_FACTION_PROJECTION_NOT_FOUND');
  if (faction) await repository.storeProjection({ scope: 'faction', subjectId: factionId, projectionContext: projection.projectionContext, checkpoint: faction }, { session, rebuiltAt, preserveExisting: true });

  return {
    eventId,
    decisionId: decision.decisionId,
    beneficiaryId: event.beneficiaryId,
    factionId,
    contribution: decision.contributionResult,
    projectionContext: projection.projectionContext,
    personal,
    faction
  };
}

async function planProjection(options = {}) {
  const { inputs, decisions, projection } = await calculateProjection(options);
  const activeUsers = await User.find({ isActive: { $ne: false } }).select('_id').session(options.session || null).lean();
  const activeUserIds = new Set(activeUsers.map(user => String(user._id)));
  const eventsById = new Map(inputs.events.map(event => [event.eventId, event]));
  const activeSubjectsWithActivity = new Set(inputs.events.map(event => event.beneficiaryId).filter(userId => activeUserIds.has(userId)));
  const persistedDecisions = decisions.filter(decision => activeUserIds.has(eventsById.get(decision.eventId)?.beneficiaryId));
  const persistedContributions = persistedDecisions.map(decision => decision.contributionResult);
  const factionContributions = decisions.map(decision => decision.contributionResult);
  const personal = Object.fromEntries(Object.entries(projection.personal).filter(([subjectId]) => activeUserIds.has(subjectId)));
  const plan = {
    mode: 'plan',
    policyIdentity: {
      policyId: projection.projectionContext.policyId,
      version: projection.projectionContext.policyVersion,
      artifactDigest: projection.projectionContext.policyArtifactDigest
    },
    projectionContext: projection.projectionContext,
    counts: {
      usersScanned: activeUsers.length,
      subjectsWithActivity: activeSubjectsWithActivity.size,
      activityEvents: inputs.events.length,
      canonicalQualifications: decisions.length,
      decisions: persistedDecisions.length,
      qualified: persistedDecisions.filter(decision => decision.state === 'qualified').length,
      rejected: persistedDecisions.filter(decision => decision.state === 'rejected').length,
      contributions: persistedDecisions.length,
      personalContributions: persistedContributions.filter(value => value.personal !== 0).length,
      factionContributions: factionContributions.filter(value => value.faction !== 0).length,
      personalProjections: Object.keys(personal).length,
      factionProjections: Object.keys(projection.faction).length
    },
    totals: {
      personalContribution: roundTotal(persistedContributions.reduce((sum, value) => sum + value.personal, 0)),
      factionContribution: roundTotal(factionContributions.reduce((sum, value) => sum + value.faction, 0))
    },
    personal,
    faction: projection.faction,
    inactiveEventIds: projection.inactiveEventIds
  };
  return { ...plan, planDigest: `sha256:${crypto.createHash('sha256').update(stableJson(plan)).digest('hex')}` };
}

function roundTotal(value) { return Math.round(value * 100) / 100; }

async function rebuildFactionProjections({ rebuiltAt, session, ...options } = {}) {
  if (!session) throw new TypeError('global faction finalization requires a transaction session');
  const { projection } = await calculateProjection({ ...options, session });
  for (const [subjectId, checkpoint] of Object.entries(projection.faction)) {
    await repository.storeProjection({ scope: 'faction', subjectId, projectionContext: projection.projectionContext, checkpoint }, { session, rebuiltAt });
  }
  return { projectionContext: projection.projectionContext, faction: projection.faction };
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

async function rebuildSubjectProjection({ userId, ...options } = {}) {
  if (typeof userId !== 'string' || !userId || userId.length > 256) throw new TypeError('a bounded userId is required');
  if (options.policy) throw new TypeError('caller-supplied replay policies are not accepted; use policyIdentity');
  const resolvedPolicy = await resolvePersistedPolicy(options.policyIdentity, { session: options.session });
  const inputs = await repository.getOrderedReplayInputs({ session: options.session, beneficiaryId: userId });
  const evidenceByRef = Object.fromEntries(inputs.evidence.map(item => [item.evidenceId, item]));
  const replayContext = { ...(options.context || {}), evidenceByRef };
  const decisions = qualifyLedger(inputs.events, resolvedPolicy.qualification, replayContext);
  const rebuilt = project(inputs.events, decisions, resolvedPolicy, replayContext);
  const eventsById = new Map(inputs.events.map(event => [event.eventId, event]));
  await withOptionalTransaction({ transaction: true, session: options.session }, async transactionSession => {
    for (const decision of decisions) {
      await validateDecisionRelationships(decision, { session: transactionSession });
      await repository.appendQualificationDecision(decision, { session: transactionSession });
      await validateContributionRelationships(eventsById.get(decision.eventId), decision, { session: transactionSession });
      await repository.appendContributionResult(eventsById.get(decision.eventId), decision, { session: transactionSession });
    }
    const checkpoint = rebuilt.personal[userId];
    if (checkpoint) await repository.storeProjection({ scope: 'personal', subjectId: userId, projectionContext: rebuilt.projectionContext, checkpoint }, { session: transactionSession, rebuiltAt: options.rebuiltAt });
  });
  return {
    projectionContext: rebuilt.projectionContext,
    generationMetadata: rebuilt.generationMetadata,
    inactiveEventIds: rebuilt.inactiveEventIds,
    personal: rebuilt.personal[userId] || null,
    faction: rebuilt.faction
  };
}

function getProjection(scope, subjectId, projectionContextId) {
  if (!['personal', 'faction'].includes(scope)) throw new TypeError('projection scope must be personal or faction');
  return repository.getProjection(scope, subjectId, projectionContextId);
}

function getOrderedReplayInputs() { return repository.getOrderedReplayInputs(); }

async function withOptionalTransaction(options, operation) {
  if (options.session != null) {
    if (typeof options.session.inTransaction !== 'function') throw new TypeError('a valid MongoDB session is required');
    return operation(options.session);
  }
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

async function validateDecisionRelationships(decision, options = {}) {
  const [event, artifact, evidence] = await Promise.all([
    repository.getActivityEvent(decision.eventId, options),
    repository.getPolicyArtifact({ policyId: decision.policyId, version: decision.policyVersion, artifactDigest: decision.policyArtifactDigest }, options),
    repository.getEvidence(decision.evidenceRefs, options)
  ]);
  if (!event) throw new Error(`PROGRESSION_DECISION_EVENT_NOT_FOUND:${decision.eventId}`);
  if (!artifact) throw new Error('PROGRESSION_DECISION_POLICY_ARTIFACT_NOT_FOUND');
  const verified = verifyPolicyArtifact(artifact.canonicalPayload);
  if (verified.policyId !== decision.policyId || verified.version !== decision.policyVersion || verified.artifactDigest !== decision.policyArtifactDigest) throw new Error('PROGRESSION_DECISION_POLICY_ARTIFACT_MISMATCH');
  const found = new Set(evidence.map(item => item.evidenceId));
  const missing = decision.evidenceRefs.find(ref => !found.has(ref));
  if (missing) throw new Error(`PROGRESSION_DECISION_EVIDENCE_NOT_FOUND:${missing}`);
  const allowedRefs = new Set(event.canonicalPayload.correction?.evidenceRefs || event.canonicalPayload.evidenceRefs);
  if (decision.evidenceRefs.some(ref => !allowedRefs.has(ref))) throw new Error('PROGRESSION_DECISION_EVIDENCE_MISMATCH');
}

async function validateContributionRelationships(event, decision, options = {}) {
  const [storedEvent, storedDecision] = await Promise.all([
    repository.getActivityEvent(event.eventId, options),
    repository.getQualificationDecision(decision.decisionId, options)
  ]);
  if (!storedEvent) throw new Error(`PROGRESSION_CONTRIBUTION_EVENT_NOT_FOUND:${event.eventId}`);
  if (!storedDecision) throw new Error(`PROGRESSION_CONTRIBUTION_DECISION_NOT_FOUND:${decision.decisionId}`);
  if (storedDecision.eventId !== event.eventId || decision.eventId !== event.eventId || storedDecision.projectionContextId !== decision.projectionContextId) throw new Error('PROGRESSION_CONTRIBUTION_DECISION_EVENT_MISMATCH');
  const persistedEvent = storedEvent.canonicalPayload;
  if (stableJson(persistedEvent) !== stableJson(event)) throw new Error('PROGRESSION_CONTRIBUTION_EVENT_MISMATCH');
  if (persistedEvent.beneficiaryId !== event.beneficiaryId || persistedEvent.affiliations.beneficiary.state !== event.affiliations.beneficiary.state || persistedEvent.affiliations.beneficiary.factionId !== event.affiliations.beneficiary.factionId) throw new Error('PROGRESSION_CONTRIBUTION_BENEFICIARY_MISMATCH');
  if (stableJson(storedDecision.canonicalPayload) !== stableJson(decision)) throw new Error('PROGRESSION_CONTRIBUTION_DECISION_MISMATCH');
}

async function validateCorrectionRelationships(event, options = {}) {
  const correction = event.correction;
  const ids = [correction.targetEventId, correction.replacementEventId, correction.compensatingEventId].filter(Boolean);
  const related = await Promise.all(ids.map(eventId => repository.getActivityEvent(eventId, options)));
  const missingIndex = related.findIndex(value => !value);
  if (missingIndex >= 0) throw new Error(`PROGRESSION_CORRECTION_EVENT_NOT_FOUND:${ids[missingIndex]}`);
  const target = related[0].canonicalPayload;
  if (target.correction) throw new Error('PROGRESSION_CORRECTION_TARGET_INVALID');
  if (event.beneficiaryId !== target.beneficiaryId) throw new Error('PROGRESSION_CORRECTION_BENEFICIARY_MISMATCH');
  const evidence = await repository.getEvidence(correction.evidenceRefs, options);
  const byId = new Map(evidence.map(item => [item.evidenceId, item.canonicalPayload]));
  for (const ref of correction.evidenceRefs) {
    const item = byId.get(ref);
    if (!item) throw new Error(`PROGRESSION_CORRECTION_EVIDENCE_NOT_FOUND:${ref}`);
    if (item.subject.type !== 'activity_event' || item.subject.id !== target.eventId) throw new Error('PROGRESSION_CORRECTION_EVIDENCE_SUBJECT_MISMATCH');
  }
}

module.exports = Object.freeze({ SHADOW_MODE, USER_FACING_PROGRESSION_ENABLED, appendEvent, appendEvidence, appendDecision, appendPolicy, appendContribution, advanceLiveEvent, calculateProjection, planProjection, rebuildFactionProjections, rebuildProjection, rebuildUserProjection, rebuildSubjectProjection, getProjection, getOrderedReplayInputs });
