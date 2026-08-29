'use strict';

const crypto = require('node:crypto');
const { QUALIFICATION_STATES, SPECIALTIES, appendLogicalLedger, deepFreeze, isCanonicalTimestamp, stableId, stableJson, qualificationDecisionIdentity } = require('./contracts');
const { resolveEffectiveEvidence, validateEvidenceForEvent, assertNonOverlappingReach } = require('./evidence');
const { resolveEffectiveEventGraph } = require('./projection');
const { loadPolicy } = require('./policy-runtime');
const { canonicalGeneration } = require('./generation');
const { projectionContext, ORDERING_VERSION } = require('./context');

function qualificationDecision(input) {
  const allowed = ['decisionId', 'eventId', 'policyId', 'policyVersion', 'evaluationGeneration', 'evidenceGeneration', 'correctionGraphGeneration', 'evidenceSetDigest', 'correctionGraphDigest', 'projectionContextId', 'cutoff', 'watermark', 'policyArtifactDigest', 'state', 'factor', 'contributionResult', 'reasonCodes', 'evidenceRefs', 'evaluatedAt', 'signals'];
  if (!input || Object.keys(input).some(key => !allowed.includes(key))) throw new TypeError('qualification decision contains unsupported fields');
  for (const field of allowed.filter(field => field !== 'decisionId')) if (!(field in input)) throw new TypeError(`qualification decision requires ${field}`);
  for (const field of ['eventId', 'policyId', 'policyVersion', 'evidenceSetDigest', 'correctionGraphDigest', 'projectionContextId', 'cutoff', 'watermark', 'policyArtifactDigest']) if (typeof input[field] !== 'string' || !input[field]) throw new TypeError(`qualification decision requires ${field}`);
  if (!/^[a-f0-9]{32}$/.test(input.eventId)) throw new TypeError('qualification decision eventId must be a canonical ID');
  for (const field of ['policyId', 'policyVersion']) if (input[field].length > 256) throw new TypeError(`qualification decision ${field} must be bounded`);
  const evaluationGeneration = canonicalGeneration(input.evaluationGeneration, 'evaluationGeneration');
  const evidenceGeneration = canonicalGeneration(input.evidenceGeneration, 'evidenceGeneration');
  const correctionGraphGeneration = canonicalGeneration(input.correctionGraphGeneration, 'correctionGraphGeneration');
  if (!isCanonicalTimestamp(input.evaluatedAt)) throw new TypeError('qualification decision evaluatedAt must be canonical UTC ISO-8601');
  if (!isCanonicalTimestamp(input.cutoff) || !isCanonicalTimestamp(input.watermark)) throw new TypeError('qualification decision cutoff/watermark must be canonical UTC ISO-8601');
  if (![input.policyArtifactDigest, input.evidenceSetDigest, input.correctionGraphDigest, input.projectionContextId].every(value => /^sha256:[a-f0-9]{64}$/.test(value))) throw new TypeError('qualification decision digest shape invalid');
  if (!QUALIFICATION_STATES.includes(input.state)) throw new TypeError(`unsupported qualification state: ${input.state}`);
  const evidenceRefs = uniqueStrings(input.evidenceRefs || []);
  if (evidenceRefs.some(value => !/^[a-f0-9]{32}$/.test(value))) throw new TypeError('qualification evidenceRefs must be canonical IDs');
  const factor = clamp(input.factor ?? (input.state === 'qualified' ? 1 : 0), 0, 1);
  const material = { eventId: input.eventId, policyId: input.policyId, policyVersion: input.policyVersion, policyArtifactDigest: input.policyArtifactDigest, evaluationGeneration, evidenceGeneration, correctionGraphGeneration, evidenceSetDigest: input.evidenceSetDigest, correctionGraphDigest: input.correctionGraphDigest, projectionContextId: input.projectionContextId, cutoff: input.cutoff, watermark: input.watermark, state: input.state, factor, contributionResult: canonicalContribution(input.contributionResult), reasonCodes: uniqueStrings(input.reasonCodes), evidenceRefs, evaluatedAt: input.evaluatedAt, signals: sanitizeSignals(input.signals) };
  const derivedDecisionId = stableId(stableJson(qualificationDecisionIdentity(material)));
  if (input.decisionId && input.decisionId !== derivedDecisionId) throw new TypeError('decisionId must match complete qualification identity');
  return deepFreeze({ decisionId: derivedDecisionId, ...material });
}

function qualifyLedger(events, policy, context = {}) {
  const runtimePolicy = loadPolicy(policy.artifact);
  const artifact = runtimePolicy.artifact;
  const generation = canonicalGeneration(context.evaluationGeneration || '1', 'evaluationGeneration');
  const evidenceGeneration = canonicalGeneration(context.evidenceGeneration || '1', 'evidenceGeneration');
  const correctionGraphGeneration = canonicalGeneration(context.correctionGraphGeneration || '1', 'correctionGraphGeneration');
  const cutoff = context.cutoff || context.ledgerCutoff || '9999-12-31T23:59:59.999Z';
  const watermark = context.watermark || cutoff;
  const evaluatedAt = context.evaluatedAt || '2026-08-28T00:00:00.000Z';
  if (!isCanonicalTimestamp(cutoff) || !isCanonicalTimestamp(watermark) || !isCanonicalTimestamp(evaluatedAt)) throw new TypeError('qualification generation timestamps must be canonical UTC ISO-8601');
  const ledger = appendLogicalLedger(events).filter(event => event.ingestedAt <= watermark);
  const evidenceState = resolveEffectiveEvidence(Object.values(context.evidenceByRef || {}), { cutoff });
  const evidenceProducers = context.evidenceProducers || Object.fromEntries(Object.keys(artifact.evidenceContractVersions).map(type => [type, ['release-3a-simulator']]));
  const graph = resolveEffectiveEventGraph(ledger, { ...context, cutoff, watermark, correctionGraphGeneration });
  const replayContext = projectionContext({ ledgerCutoff: cutoff, watermark, evaluationGeneration: generation, evidenceGeneration, correctionGraphGeneration, policyId: artifact.policyId, policyVersion: artifact.version, policyArtifactDigest: artifact.artifactDigest, evidenceContextDigest: evidenceState.digest, correctionGraphDigest: graph.correctionGraphDigest, orderingVersion: ORDERING_VERSION });
  const inactive = new Set(graph.inactiveEventIds);
  const ordered = ledger.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.provenance.producer.localeCompare(b.provenance.producer) || a.eventId.localeCompare(b.eventId));
  const priorQualified = [];
  const consumedReach = [];
  return ordered.map(event => {
    const refs = event.correction ? event.correction.evidenceRefs : event.evidenceRefs;
    const evidence = refs.map(ref => evidenceState.byId.get(ref));
    if (evidence.some(item => !item)) throw new Error(`EVIDENCE_NOT_FOUND:${event.eventId}`);
    if (!event.correction) validateEvidenceForEvent(event, evidence, { contractVersions: artifact.evidenceContractVersions, producers: evidenceProducers, generation: evidenceGeneration, eligibility: artifact.evidenceEligibility });
    if (!event.correction) { consumedReach.push(...evidence.filter(item => item.type === 'reach')); assertNonOverlappingReach(consumedReach); }
    const result = event.correction ? { state: 'rejected', factor: 0, reasonCodes: ['CORRECTION_FACT_NOT_CONTRIBUTION'], evidenceRefs: refs } : runtimePolicy.evaluate(event, { evidence, priorQualified: Object.freeze([...priorQualified]), cutoff, config: artifact.config });
    const consumed = uniqueStrings(result.evidenceRefs || refs);
    if (consumed.some(ref => !refs.includes(ref))) throw new Error('POLICY_EVIDENCE_OUTSIDE_ALLOWED_SET');
    const signals = sanitizeSignals(Object.assign({}, ...evidence.map(item => item.body.signals || item.body)));
    const factor = clamp(result.factor ?? (result.state === 'qualified' ? 1 : 0), 0, 1);
    const contributionResult = event.correction ? emptyContribution() : runtimePolicy.contribution(event, { ...result, factor, signals, config: artifact.config });
    const decision = qualificationDecision({ eventId: event.eventId, policyId: artifact.policyId, policyVersion: artifact.version, evaluationGeneration: generation, evidenceGeneration, correctionGraphGeneration, evaluatedAt, policyArtifactDigest: artifact.artifactDigest, evidenceSetDigest: evidenceState.digest, correctionGraphDigest: graph.correctionGraphDigest, projectionContextId: replayContext.projectionContextId, evidenceRefs: consumed, cutoff, watermark, ...result, factor, contributionResult, signals });
    if (decision.factor > 0 && !inactive.has(event.eventId)) priorQualified.push(Object.freeze({ eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, factor: decision.factor }));
    return decision;
  });
}

function sanitizeSignals(signals) { const allowed = ['uniquePeople', 'uniqueFactions', 'trustConfidence', 'valueSignal', 'engagementDiversity', 'linkedAccount', 'linkedWallet', 'circularTransfer', 'sybilConfidence', 'botGenerated', 'botDisclosure', 'velocityPerHour', 'repeatOrdinal', 'reciprocalDensity', 'sameFactionDensity', 'lowValueRatio', 'uniqueSupporters', 'moderated', 'abusive', 'reportManipulation']; const result = Object.fromEntries(Object.entries(signals).filter(([key]) => allowed.includes(key))); for (const [key, value] of Object.entries(result)) if (typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) throw new TypeError(`qualification signal ${key} must be boolean or finite number`); return result; }
function canonicalContribution(value) {
  if (!value || Object.keys(value).some(key => !['personal', 'specialties', 'crossFactionInfluence', 'faction', 'publicExplanationCategories'].includes(key))) throw new TypeError('qualification contributionResult is required and closed');
  for (const field of ['personal', 'crossFactionInfluence', 'faction']) if (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || Math.abs(value[field]) > 1e12) throw new TypeError(`qualification contributionResult ${field} invalid`);
  if (!value.specialties || Object.keys(value.specialties).length > 16) throw new TypeError('qualification contributionResult specialties invalid');
  for (const [key, score] of Object.entries(value.specialties)) if (!SPECIALTIES.includes(key) || typeof score !== 'number' || !Number.isFinite(score) || Math.abs(score) > 1e12) throw new TypeError('qualification contributionResult specialty invalid');
  const publicExplanationCategories = uniqueStrings(value.publicExplanationCategories);
  return { personal: value.personal, specialties: { ...value.specialties }, crossFactionInfluence: value.crossFactionInfluence, faction: value.faction, publicExplanationCategories };
}
function emptyContribution() { return { personal: 0, specialties: {}, crossFactionInfluence: 0, faction: 0, publicExplanationCategories: [] }; }
function uniqueStrings(values) { if (!Array.isArray(values) || values.length > 64 || values.some(value => typeof value !== 'string' || !value || value.length > 128)) throw new TypeError('evidence/reason references must be bounded strings'); return [...new Set(values)].sort(); }
function clamp(value, min, max) { if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('qualification factor must be a finite number'); return Math.min(max, Math.max(min, value)); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { qualificationDecision, qualifyLedger };
