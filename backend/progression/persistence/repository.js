'use strict';

const { stableJson } = require('../contracts');
const ActivityEvent = require('../../models/ProgressionActivityEvent');
const Evidence = require('../../models/ProgressionEvidence');
const QualificationDecision = require('../../models/ProgressionQualificationDecision');
const CorrectionRelationship = require('../../models/ProgressionCorrectionRelationship');
const ContributionResult = require('../../models/ProgressionContributionResult');
const PolicyArtifact = require('../../models/ProgressionPolicyArtifact');
const Projection = require('../../models/ProgressionProjection');

async function insertCanonical(Model, identity, document, payloadField = 'canonicalPayload', options = {}) {
  const prior = await Model.findOne(identity).select(`+${payloadField}`).session(options.session || null).lean();
  if (prior) {
    if (stableJson(prior[payloadField]) !== stableJson(document[payloadField])) throw new Error(`PROGRESSION_CANONICAL_IDENTITY_COLLISION:${Model.modelName}`);
    return [prior];
  }
  try {
    return await Model.create([{ ...document, [payloadField]: document[payloadField] }], sessionOption(options));
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await Model.findOne(identity).select(`+${payloadField}`).session(options.session || null).lean();
    if (!existing || stableJson(existing[payloadField]) !== stableJson(document[payloadField])) {
      throw new Error(`PROGRESSION_CANONICAL_IDENTITY_COLLISION:${Model.modelName}`);
    }
    return [existing];
  }
}

async function appendActivityEvent(event, options = {}) {
  const document = {
    eventId: event.eventId, idempotencyKey: event.idempotencyKey, schemaVersion: event.schemaVersion,
    eventType: event.eventType, activityClass: event.activityClass, actorId: event.actorId,
    beneficiaryId: event.beneficiaryId, occurredAt: event.occurredAt, ingestedAt: event.ingestedAt,
    producer: event.provenance.producer, correctionTargetEventId: event.correction?.targetEventId || null,
    canonicalPayload: event
  };
  const [stored] = await insertCanonical(ActivityEvent, { eventId: event.eventId }, document, 'canonicalPayload', options);
  return stored;
}

async function appendEvidence(evidence, options = {}) {
  const document = {
    evidenceId: evidence.evidenceId, evidenceDigest: evidence.evidenceDigest, type: evidence.type,
    contractVersion: evidence.contractVersion, producer: evidence.producer, generation: evidence.generation,
    subjectType: evidence.subject.type, subjectId: evidence.subject.id, observedAt: evidence.observedAt,
    supersedesEvidenceId: evidence.supersedesEvidenceId, privacyClassification: evidence.privacyClassification,
    retentionClass: evidence.retentionClass, canonicalPayload: evidence
  };
  const [stored] = await insertCanonical(Evidence, { evidenceId: evidence.evidenceId }, document, 'canonicalPayload', options);
  return stored;
}

async function appendQualificationDecision(decision, options = {}) {
  const document = {
    decisionId: decision.decisionId, eventId: decision.eventId, policyId: decision.policyId,
    policyVersion: decision.policyVersion, policyArtifactDigest: decision.policyArtifactDigest,
    projectionContextId: decision.projectionContextId, evaluationGeneration: decision.evaluationGeneration,
    evidenceGeneration: decision.evidenceGeneration, correctionGraphGeneration: decision.correctionGraphGeneration,
    evaluatedAt: decision.evaluatedAt, state: decision.state, canonicalPayload: decision
  };
  const [stored] = await insertCanonical(QualificationDecision, { decisionId: decision.decisionId }, document, 'canonicalPayload', options);
  return stored;
}

async function appendCorrectionRelationship(event, options = {}) {
  if (!event.correction) throw new TypeError('correction event is required');
  const value = event.correction;
  const payload = { correctionEventId: event.eventId, ...value };
  const document = {
    correctionEventId: event.eventId, targetEventId: value.targetEventId, type: value.type,
    sequence: value.sequence, authorityVersion: value.authorityVersion, effectiveAt: value.effectiveAt,
    replacementEventId: value.replacementEventId || null, compensatingEventId: value.compensatingEventId || null,
    evidenceRefs: value.evidenceRefs, canonicalPayload: payload
  };
  // The relationship fields themselves are canonical; use a transient payload solely for collision comparison.
  const Comparable = CorrectionRelationship;
  const prior = await Comparable.findOne({ correctionEventId: event.eventId }).session(options.session || null).lean();
  if (prior) {
    if (stableJson(relationshipValue(prior)) !== stableJson(payload)) throw new Error('PROGRESSION_CANONICAL_IDENTITY_COLLISION:ProgressionCorrectionRelationship');
    return prior;
  }
  try { return (await Comparable.create([omitPayload(document)], sessionOption(options)))[0]; }
  catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await Comparable.findOne({ correctionEventId: event.eventId }).lean();
    if (!existing || stableJson(relationshipValue(existing)) !== stableJson(payload)) throw new Error('PROGRESSION_CANONICAL_IDENTITY_COLLISION:ProgressionCorrectionRelationship');
    return existing;
  }
}

async function appendContributionResult(event, decision, options = {}) {
  const contribution = decision.contributionResult;
  const factionId = event.affiliations.beneficiary.state === 'affiliated' ? event.affiliations.beneficiary.factionId : null;
  const document = { decisionId: decision.decisionId, eventId: event.eventId, projectionContextId: decision.projectionContextId, beneficiaryId: event.beneficiaryId, factionId, personal: contribution.personal, faction: contribution.faction, canonicalPayload: contribution };
  const [stored] = await insertCanonical(ContributionResult, { decisionId: decision.decisionId }, document, 'canonicalPayload', options);
  return stored;
}

async function appendPolicyArtifact(artifact, options = {}) {
  const document = { policyId: artifact.policyId, version: artifact.version, artifactDigest: artifact.artifactDigest, codeDigest: artifact.codeDigest, canonicalPayload: artifact };
  const [stored] = await insertCanonical(PolicyArtifact, { artifactDigest: artifact.artifactDigest }, document, 'canonicalPayload', options);
  return stored;
}

async function getActivityEvent(eventId, options = {}) {
  return ActivityEvent.findOne({ eventId }).select('+canonicalPayload').session(options.session || null).lean();
}

async function getEvidence(evidenceIds, options = {}) {
  return Evidence.find({ evidenceId: { $in: evidenceIds } }).select('+canonicalPayload').session(options.session || null).lean();
}

async function getQualificationDecision(decisionId, options = {}) {
  return QualificationDecision.findOne({ decisionId }).select('+canonicalPayload').session(options.session || null).lean();
}

async function getPolicyArtifact(identity, options = {}) {
  const query = {};
  if (identity.policyId) query.policyId = identity.policyId;
  if (identity.version) query.version = identity.version;
  if (identity.artifactDigest) query.artifactDigest = identity.artifactDigest;
  return PolicyArtifact.findOne(query).select('+canonicalPayload').session(options.session || null).lean();
}

async function storeProjection({ scope, subjectId, projectionContext, checkpoint }, options = {}) {
  return Projection.findOneAndUpdate(
    { scope, subjectId, projectionContextId: projectionContext.projectionContextId },
    { $set: { policyId: projectionContext.policyId, policyVersion: projectionContext.policyVersion, policyArtifactDigest: projectionContext.policyArtifactDigest, evaluationGeneration: projectionContext.evaluationGeneration, projectionContext, checkpoint, rebuiltAt: options.rebuiltAt || new Date() } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true, session: options.session }
  );
}

function getProjection(scope, subjectId, projectionContextId) {
  return Projection.findOne({ scope, subjectId, projectionContextId }).select('+projectionContext +checkpoint').lean();
}

async function getOrderedReplayInputs(options = {}) {
  const eventQuery = options.beneficiaryId ? { beneficiaryId: String(options.beneficiaryId) } : {};
  const eventDocs = await ActivityEvent.find(eventQuery).select('+canonicalPayload').sort({ occurredAt: 1, producer: 1, eventId: 1 }).session(options.session || null).lean();
  const evidenceRefs = [...new Set(eventDocs.flatMap(value => value.canonicalPayload.correction?.evidenceRefs || value.canonicalPayload.evidenceRefs || []))];
  const evidenceQuery = options.beneficiaryId ? { evidenceId: { $in: evidenceRefs } } : {};
  const evidenceDocs = await Evidence.find(evidenceQuery).select('+canonicalPayload').sort({ observedAt: 1, evidenceId: 1 }).session(options.session || null).lean();
  return { events: eventDocs.map(value => value.canonicalPayload), evidence: evidenceDocs.map(value => value.canonicalPayload) };
}

function sessionOption(options) { return options.session ? { session: options.session } : {}; }
function omitPayload(value) { const { canonicalPayload, ...rest } = value; return rest; }
function relationshipValue(value) { return { correctionEventId: value.correctionEventId, targetEventId: value.targetEventId, type: value.type, effectiveAt: value.effectiveAt, evidenceRefs: value.evidenceRefs, sequence: value.sequence, authorityVersion: value.authorityVersion, ...(value.replacementEventId ? { replacementEventId: value.replacementEventId } : {}), ...(value.compensatingEventId ? { compensatingEventId: value.compensatingEventId } : {}) }; }

module.exports = { appendActivityEvent, appendEvidence, appendQualificationDecision, appendCorrectionRelationship, appendContributionResult, appendPolicyArtifact, getActivityEvent, getEvidence, getQualificationDecision, getPolicyArtifact, storeProjection, getProjection, getOrderedReplayInputs };
