'use strict';

const crypto = require('node:crypto');
const { QUALIFICATION_STATES, appendLogicalLedger, deepFreeze, isCanonicalTimestamp, stableId, stableJson } = require('./contracts');
const { resolveEffectiveEvidence, validateEvidenceForEvent, assertNonOverlappingReach } = require('./evidence');
const { resolveEffectiveEventGraph } = require('./projection');
const { verifyPolicyArtifact } = require('./policy-artifact');

class QualificationPolicy {
  constructor(definition) {
    if (!definition?.artifact || typeof definition.evaluate !== 'function') throw new TypeError('policy requires a verified artifact and evaluate(event, context)');
    this.artifact = verifyPolicyArtifact(definition.artifact);
    this.version = this.artifact.version;
    this.artifactDigest = this.artifact.artifactDigest;
    this.evaluate = definition.evaluate;
  }
}

function qualificationDecision(input) {
  for (const field of ['eventId', 'policyId', 'policyVersion', 'evaluationGeneration', 'evidenceSetDigest', 'cutoff', 'watermark', 'policyArtifactDigest']) if (typeof input[field] !== 'string' || !input[field]) throw new TypeError(`qualification decision requires ${field}`);
  if (!isCanonicalTimestamp(input.evaluatedAt)) throw new TypeError('qualification decision evaluatedAt must be canonical UTC ISO-8601');
  if (!isCanonicalTimestamp(input.cutoff) || !isCanonicalTimestamp(input.watermark)) throw new TypeError('qualification decision cutoff/watermark must be canonical UTC ISO-8601');
  if (!/^sha256:[a-f0-9]{64}$/.test(input.policyArtifactDigest) || !/^sha256:[a-f0-9]{64}$/.test(input.evidenceSetDigest)) throw new TypeError('qualification decision digest shape invalid');
  if (!QUALIFICATION_STATES.includes(input.state)) throw new TypeError(`unsupported qualification state: ${input.state}`);
  const evidenceRefs = uniqueStrings(input.evidenceRefs || []);
  const identity = { eventId: input.eventId, policyId: input.policyId, policyVersion: input.policyVersion, policyArtifactDigest: input.policyArtifactDigest, evaluationGeneration: input.evaluationGeneration, evidenceSetDigest: input.evidenceSetDigest, cutoff: input.cutoff, watermark: input.watermark };
  const derivedDecisionId = stableId(stableJson(identity));
  if (input.decisionId && input.decisionId !== derivedDecisionId) throw new TypeError('decisionId must match complete qualification identity');
  const factor = clamp(input.factor ?? (input.state === 'qualified' ? 1 : 0), 0, 1);
  return deepFreeze({ decisionId: derivedDecisionId, ...identity, state: input.state, factor, contributionResult: { factor }, reasonCodes: uniqueStrings(input.reasonCodes || []), evidenceRefs, evaluatedAt: input.evaluatedAt, signals: sanitizeSignals(input.signals || {}) });
}

function qualifyLedger(events, policy, context = {}) {
  const artifact = verifyPolicyArtifact(policy.artifact);
  const generation = context.evaluationGeneration || 'simulation-generation-1';
  const cutoff = context.cutoff || context.ledgerCutoff || '9999-12-31T23:59:59.999Z';
  const watermark = context.watermark || cutoff;
  const evaluatedAt = context.evaluatedAt || '2026-08-28T00:00:00.000Z';
  if (!isCanonicalTimestamp(cutoff) || !isCanonicalTimestamp(watermark) || !isCanonicalTimestamp(evaluatedAt)) throw new TypeError('qualification generation timestamps must be canonical UTC ISO-8601');
  const ledger = appendLogicalLedger(events).filter(event => event.ingestedAt <= watermark);
  const evidenceState = resolveEffectiveEvidence(Object.values(context.evidenceByRef || {}), { cutoff });
  const evidenceProducers = context.evidenceProducers || Object.fromEntries(Object.keys(artifact.evidenceContractVersions).map(type => [type, ['release-3a-simulator']]));
  const graph = ledger.some(event => event.correction) ? resolveEffectiveEventGraph(ledger, { ...context, cutoff, watermark }) : { inactiveEventIds: [] };
  const inactive = new Set(graph.inactiveEventIds);
  const ordered = ledger.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.provenance.producer.localeCompare(b.provenance.producer) || a.eventId.localeCompare(b.eventId));
  const priorQualified = [];
  const consumedReach = [];
  return ordered.map(event => {
    const refs = event.correction ? event.correction.evidenceRefs : event.evidenceRefs;
    const evidence = refs.map(ref => evidenceState.byId.get(ref));
    if (evidence.some(item => !item)) throw new Error(`EVIDENCE_NOT_FOUND:${event.eventId}`);
    if (!event.correction) validateEvidenceForEvent(event, evidence, { contractVersions: artifact.evidenceContractVersions, producers: evidenceProducers, generation: context.evidenceGeneration });
    if (!event.correction) { consumedReach.push(...evidence.filter(item => item.type === 'reach')); assertNonOverlappingReach(consumedReach); }
    const result = event.correction ? { state: 'rejected', factor: 0, reasonCodes: ['CORRECTION_FACT_NOT_CONTRIBUTION'], evidenceRefs: refs } : policy.evaluate(event, { evidence, priorQualified: Object.freeze([...priorQualified]), cutoff });
    const consumed = uniqueStrings(result.evidenceRefs || refs);
    if (consumed.some(ref => !refs.includes(ref))) throw new Error('POLICY_EVIDENCE_OUTSIDE_ALLOWED_SET');
    const digest = sha256(stableJson(consumed.map(ref => ({ evidenceId: ref, evidenceDigest: evidenceState.byId.get(ref).evidenceDigest }))));
    const decision = qualificationDecision({ eventId: event.eventId, policyId: artifact.policyId, policyVersion: artifact.version, evaluationGeneration: generation, evaluatedAt, policyArtifactDigest: artifact.artifactDigest, evidenceSetDigest: digest, evidenceRefs: consumed, cutoff, watermark, ...result, signals: Object.assign({}, ...evidence.map(item => item.body.signals || item.body)) });
    if (decision.factor > 0 && !inactive.has(event.eventId)) priorQualified.push(Object.freeze({ eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, factor: decision.factor }));
    return decision;
  });
}

function sanitizeSignals(signals) { const allowed = ['uniquePeople', 'uniqueFactions', 'trustConfidence', 'valueSignal', 'engagementDiversity', 'linkedAccount', 'linkedWallet', 'circularTransfer', 'sybilConfidence', 'botGenerated', 'botDisclosure', 'velocityPerHour', 'repeatOrdinal', 'reciprocalDensity', 'sameFactionDensity', 'lowValueRatio', 'uniqueSupporters', 'moderated', 'abusive', 'reportManipulation']; return Object.fromEntries(Object.entries(signals).filter(([key]) => allowed.includes(key))); }
function uniqueStrings(values) { if (!Array.isArray(values) || values.length > 64) throw new TypeError('evidence/reason reference count exceeds bound'); return [...new Set(values)].sort(); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { QualificationPolicy, qualificationDecision, qualifyLedger };
