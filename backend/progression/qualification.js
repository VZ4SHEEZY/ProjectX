'use strict';

const { QUALIFICATION_STATES, appendLogicalLedger, deepFreeze, stableId, stableJson } = require('./contracts');

class QualificationPolicy {
  constructor(definition) {
    if (!definition?.version || !definition?.artifactDigest || typeof definition.evaluate !== 'function') throw new TypeError('policy requires version, artifactDigest, and evaluate(event, context)');
    this.version = definition.version;
    this.artifactDigest = definition.artifactDigest;
    this.evaluate = definition.evaluate;
  }
}

function qualificationDecision(input) {
  const identity = { eventId: input.eventId, policyVersion: input.policyVersion, evaluationGeneration: input.evaluationGeneration };
  for (const [field, value] of Object.entries(identity)) if (typeof value !== 'string' || !value) throw new TypeError(`qualification decision requires ${field}`);
  if (!QUALIFICATION_STATES.includes(input.state)) throw new TypeError(`unsupported qualification state: ${input.state}`);
  if (!input.policyArtifactDigest || !input.evaluatedAt) throw new TypeError('qualification decision requires policyArtifactDigest and evaluatedAt');
  const factor = clamp(input.factor ?? (input.state === 'qualified' ? 1 : 0), 0, 1);
  return deepFreeze({
    decisionId: input.decisionId || stableId(stableJson(identity)),
    ...identity,
    state: input.state,
    factor,
    contributionResult: input.contributionResult || { factor },
    reasonCodes: uniqueStrings(input.reasonCodes || []),
    evidenceRefs: uniqueStrings(input.evidenceRefs || []),
    evaluatedAt: input.evaluatedAt,
    policyArtifactDigest: input.policyArtifactDigest,
    signals: input.signals || {}
  });
}

function qualifyLedger(events, policy, context = {}) {
  const generation = context.evaluationGeneration || 'simulation-generation-1';
  const ordered = appendLogicalLedger(events).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
  const priorQualified = [];
  return ordered.map(event => {
    const evidence = (event.evidenceRefs || []).map(ref => context.evidenceByRef?.[ref]).filter(Boolean);
    if (!event.correction && evidence.length !== event.evidenceRefs.length) throw new Error(`EVIDENCE_NOT_FOUND:${event.eventId}`);
    const result = event.correction
      ? { state: 'rejected', factor: 0, reasonCodes: ['CORRECTION_FACT_NOT_CONTRIBUTION'], evidenceRefs: event.correction.evidenceRefs }
      : policy.evaluate(event, { evidence, priorQualified: Object.freeze([...priorQualified]), cutoff: context.cutoff || null });
    const decision = qualificationDecision({
      eventId: event.eventId,
      policyVersion: policy.version,
      evaluationGeneration: generation,
      evaluatedAt: context.evaluatedAt || '2026-08-28T00:00:00.000Z',
      policyArtifactDigest: policy.artifactDigest,
      ...result,
      signals: Object.assign({}, ...evidence.map(item => item.body.signals || item.body))
    });
    if (decision.factor > 0) priorQualified.push(Object.freeze({ eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, factor: decision.factor }));
    return decision;
  });
}

function uniqueStrings(values) { return [...new Set(values)].sort(); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }

module.exports = { QualificationPolicy, qualificationDecision, qualifyLedger };
