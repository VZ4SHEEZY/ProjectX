'use strict';

const crypto = require('node:crypto');
const { SPECIALTIES, appendLogicalLedger, isCanonicalTimestamp, stableJson } = require('./contracts');
const { loadPolicy } = require('./policy-runtime');
const { resolveEffectiveEvidence } = require('./evidence');
const { canonicalGeneration } = require('./generation');
const { projectionContext, ORDERING_VERSION } = require('./context');
const { assertProducerRegistry } = require('./producer');
const { assertCorrectionAuthorizationContract, COMPENSATION_CONTRACTS } = require('./authority');

const BANDS = Object.freeze([[100, 'Apex'], [76, 'Legendary'], [51, 'Elite'], [26, 'Influential'], [11, 'Established'], [1, 'Initiation']]);
const NEGATING = new Set(['moderation_reversal', 'reversal', 'refund', 'chargeback', 'chain_reorganization', 'supersession', 'amendment', 'compensation']);
const PUBLIC_EXPLANATIONS = new Set(['CROSS_COMMUNITY_REACH', 'ACTIVITY_NOT_QUALIFIED']);

function levelFromContribution(total) { return Math.min(100, Math.max(1, Math.floor(Math.sqrt(Math.max(0, total) / 8)) + 1)); }

function resolveEffectiveEventGraph(events, options = {}) {
  const cutoff = options.cutoff || '9999-12-31T23:59:59.999Z';
  const watermark = options.watermark || cutoff;
  const correctionGraphGeneration = canonicalGeneration(options.correctionGraphGeneration || '1', 'correctionGraphGeneration');
  const evidenceGeneration = canonicalGeneration(options.evidenceGeneration || '1', 'evidenceGeneration');
  if (!isCanonicalTimestamp(cutoff) || !isCanonicalTimestamp(watermark)) throw new TypeError('graph cutoff/watermark must be canonical UTC ISO-8601');
  const ledger = appendLogicalLedger(events).filter(event => event.ingestedAt <= watermark);
  const byId = new Map(ledger.map(event => [event.eventId, event]));
  const evidenceState = resolveEffectiveEvidence(Object.values(options.evidenceByRef || {}), { cutoff });
  const candidates = ledger.filter(event => event.correction && event.correction.effectiveAt <= cutoff);
  const edges = new Map(candidates.map(event => [event.eventId, event.correction.targetEventId]));
  for (const start of edges.keys()) { const seen = new Set(); let cursor = start; while (edges.has(cursor)) { if (seen.has(cursor)) throw new Error('CORRECTION_GRAPH_CYCLE'); seen.add(cursor); cursor = edges.get(cursor); } }
  const validated = candidates.map(event => {
    const correction = event.correction;
    const target = byId.get(correction.targetEventId);
    if (!target) throw new Error(`CORRECTION_TARGET_NOT_FOUND:${correction.targetEventId}`);
    if (target.correction) throw new Error('CORRECTION_ON_CORRECTION_UNAUTHORIZED');
    const evidence = correction.evidenceRefs.map(ref => evidenceState.byId.get(ref));
    if (evidence.some(item => !item)) throw new Error(`CORRECTION_EVIDENCE_NOT_FOUND:${event.eventId}`);
    if (evidence.some(item => item.generation !== evidenceGeneration)) throw new Error(`CORRECTION_EVIDENCE_GENERATION_MISMATCH:${event.eventId}`);
    if (evidence.some(item => item.subject.type !== 'activity_event' || item.subject.id !== target.eventId)) throw new Error('CORRECTION_EVIDENCE_SUBJECT_MISMATCH');
    if (!options.authorization) throw new Error('CORRECTION_AUTHORIZATION_REQUIRED');
    if (!options.producerRegistry || !options.authenticatedProducerContext) throw new Error('CORRECTION_AUTHENTICATED_PRODUCER_REQUIRED');
    const trustedRegistry = assertProducerRegistry(options.producerRegistry);
    const trustedAuthorization = assertCorrectionAuthorizationContract(options.authorization);
    const authenticatedContext = trustedRegistry.assertContext(options.authenticatedProducerContext, 'correction');
    const rule = trustedAuthorization.authorize(event, target, evidence, authenticatedContext);
    const replacementId = correction.replacementEventId || correction.compensatingEventId;
    const replacement = replacementId ? byId.get(replacementId) : null;
    if (replacementId && !replacement) throw new Error(`CORRECTION_REPLACEMENT_NOT_FOUND:${replacementId}`);
    if (replacement) {
      if (replacement.correction || replacement.eventType !== target.eventType || replacement.activityClass !== target.activityClass || replacement.occurredAt > correction.effectiveAt) throw new Error('CORRECTION_REPLACEMENT_INVALID');
      if (['amendment', 'supersession'].includes(correction.type) && (replacement.sourceIdentity.objectType !== target.sourceIdentity.objectType || replacement.sourceIdentity.objectId !== target.sourceIdentity.objectId || evidence.some(item => item.type === 'moderation' && item.body.replacementVersion !== replacement.sourceIdentity.version))) throw new Error('CORRECTION_REPLACEMENT_INVALID');
      if (correction.type === 'compensation') {
        const contract = COMPENSATION_CONTRACTS[correction.type];
        const finality = evidence.find(item => item.type === 'economic_finality');
        if (!contract || target.economic?.state !== 'finalized' || !contract.eventStates.includes(replacement.economic?.state) || replacement.economic?.amountMinor !== target.economic.amountMinor || replacement.economic?.currency !== target.economic.currency || replacement.actorId !== target.actorId || replacement.beneficiaryId !== target.beneficiaryId || replacement.object?.type !== target.object?.type || replacement.object?.id === target.object.id || finality?.body.transactionRef === replacement.object?.id || finality?.body.compensatingTransactionRef !== replacement.object?.id || finality?.body.recipientId !== target.actorId || finality?.body.direction !== contract.direction || finality?.body.amountSign !== contract.amountSign) throw new Error('COMPENSATION_EVENT_INVALID');
      }
    }
    return { event, correction, target, rule };
  });
  const groups = new Map();
  for (const item of validated) { const group = groups.get(item.target.eventId) || []; group.push(item); groups.set(item.target.eventId, group); }
  const winners = [];
  for (const [targetId, group] of groups) {
    const sequences = new Set();
    for (const item of group) { const key = `${item.rule.precedence}:${item.correction.sequence}`; if (sequences.has(key)) throw new Error(`CORRECTION_SEQUENCE_CONFLICT:${targetId}:${item.correction.sequence}`); sequences.add(key); }
    const byAuthority = new Map();
    for (const item of group.sort(compareCorrections)) {
      const prior = byAuthority.get(item.rule.precedence);
      if (!prior && item.correction.sequence !== 1) throw new Error(`CORRECTION_SEQUENCE_MUST_START_AT_ONE:${targetId}`);
      if (prior && item.correction.sequence !== prior.correction.sequence + 1) throw new Error(`CORRECTION_SEQUENCE_NON_MONOTONIC:${targetId}`);
      byAuthority.set(item.rule.precedence, item);
    }
    const ordered = [...group].sort(compareCorrections);
    const winner = ordered[ordered.length - 1];
    if (ordered.some(item => item !== winner && item.rule.precedence === winner.rule.precedence && item.correction.sequence === winner.correction.sequence)) throw new Error('CORRECTION_SEMANTIC_CONFLICT');
    winners.push(winner);
  }
  const inactive = new Set(winners.filter(item => NEGATING.has(item.correction.type)).map(item => item.target.eventId));
  const corrections = winners.map(item => item.event).sort((a, b) => a.eventId.localeCompare(b.eventId));
  const digest = sha256(stableJson(corrections.map(event => ({ eventId: event.eventId, correction: event.correction }))));
  return { effectiveEvents: ledger.filter(event => !event.correction && !inactive.has(event.eventId)), inactiveEventIds: [...inactive].sort(), corrections, correctionGraphDigest: digest, correctionGraphGeneration, evidenceSetDigest: evidenceState.digest, cutoff, watermark };
}

function compareCorrections(a, b) { return a.rule.precedence - b.rule.precedence || a.correction.sequence - b.correction.sequence || a.correction.effectiveAt.localeCompare(b.correction.effectiveAt) || a.event.eventId.localeCompare(b.event.eventId); }

function selectDecisions(decisions, policy, expectedContext) {
  const { qualificationDecision } = require('./qualification');
  const selected = new Map(); let generation = null;
  for (const decision of decisions) {
    let canonical; try { canonical = qualificationDecision(decision); } catch (error) { throw new Error(`QUALIFICATION_DECISION_INVALID:${error.message}`); }
    if (canonical.policyVersion !== policy.version || canonical.policyArtifactDigest !== policy.artifactDigest) throw new Error('DECISION_POLICY_MISMATCH');
    if (canonical.projectionContextId !== expectedContext.projectionContextId) throw new Error('DECISION_PROJECTION_CONTEXT_MISMATCH');
    generation ||= canonical.evaluationGeneration;
    if (generation !== canonical.evaluationGeneration) throw new Error('MIXED_EVALUATION_GENERATIONS');
    if (selected.has(canonical.eventId)) throw new Error(`DUPLICATE_DECISION_IDENTITY:${canonical.eventId}`);
    selected.set(canonical.eventId, canonical);
  }
  return { byEventId: selected, generation };
}

function project(events, decisions, policy, options = {}) {
  const runtimePolicy = loadPolicy(policy.artifact);
  const graph = resolveEffectiveEventGraph(events, options);
  const first = decisions[0];
  const expectedContext = projectionContext({ ledgerCutoff: graph.cutoff, watermark: graph.watermark, evaluationGeneration: options.evaluationGeneration || first?.evaluationGeneration || '1', evidenceGeneration: options.evidenceGeneration || first?.evidenceGeneration || '1', correctionGraphGeneration: options.correctionGraphGeneration || '1', policyId: runtimePolicy.artifact.policyId, policyVersion: runtimePolicy.version, policyArtifactDigest: runtimePolicy.artifactDigest, evidenceContextDigest: graph.evidenceSetDigest, correctionGraphDigest: graph.correctionGraphDigest, orderingVersion: options.orderingVersion || ORDERING_VERSION });
  const { byEventId, generation } = selectDecisions(decisions, runtimePolicy, expectedContext);
  const users = new Map(); const factions = new Map();
  for (const event of graph.effectiveEvents) {
    const decision = byEventId.get(event.eventId); if (!decision || decision.factor <= 0) continue;
    const contribution = decision.contributionResult; const publicCategories = contribution.publicExplanationCategories;
    if (publicCategories.some(value => !PUBLIC_EXPLANATIONS.has(value))) throw new Error('PUBLIC_EXPLANATION_NOT_ALLOWED');
    const user = getUser(users, event.beneficiaryId); user.total += contribution.personal;
    for (const [specialty, value] of Object.entries(contribution.specialties || {})) user.specialties[specialty] += value;
    user.crossFactionInfluence += contribution.crossFactionInfluence || 0; user.reasons.push(...publicCategories);
    const affiliation = event.affiliations.beneficiary;
    if (affiliation.state === 'affiliated' && contribution.faction > 0) { const faction = factions.get(affiliation.factionId) || { total: 0, contributors: {} }; faction.total += contribution.faction; faction.contributors[event.beneficiaryId] = (faction.contributors[event.beneficiaryId] || 0) + contribution.faction; factions.set(affiliation.factionId, faction); }
  }
  const personal = Object.fromEntries([...users].sort().map(([id, value]) => [id, { level: levelFromContribution(value.total), band: BANDS.find(([minimum]) => levelFromContribution(value.total) >= minimum)[1], contribution: round(value.total), specialties: mapRound(value.specialties), crossFactionInfluence: round(value.crossFactionInfluence), publicExplanationCategories: [...new Set(value.reasons)].sort() }]));
  const faction = Object.fromEntries([...factions].sort().map(([id, value]) => [id, { total: round(value.total), contributors: mapRound(value.contributors) }]));
  return { policyVersion: runtimePolicy.version, evaluationGeneration: generation, projectionContext: expectedContext, generationMetadata: { ledgerCutoff: graph.cutoff, watermark: graph.watermark, correctionGraphDigest: graph.correctionGraphDigest, correctionGraphGeneration: expectedContext.correctionGraphGeneration, effectiveEvidenceSetDigest: graph.evidenceSetDigest, evidenceGeneration: expectedContext.evidenceGeneration, policyArtifactDigest: runtimePolicy.artifactDigest, evaluationGeneration: generation, canonicalOrderingVersion: expectedContext.orderingVersion, projectionContextId: expectedContext.projectionContextId }, inactiveEventIds: graph.inactiveEventIds, personal, faction };
}

function getUser(users, id) { if (!users.has(id)) users.set(id, { total: 0, specialties: Object.fromEntries(SPECIALTIES.map(key => [key, 0])), crossFactionInfluence: 0, reasons: [] }); return users.get(id); }
function round(value) { return Math.round(value * 100) / 100; }
function mapRound(value) { return Object.fromEntries(Object.entries(value).map(([key, score]) => [key, round(score)])); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { BANDS, PUBLIC_EXPLANATIONS, levelFromContribution, resolveEffectiveEventGraph, project };
