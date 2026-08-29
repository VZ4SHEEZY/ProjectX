'use strict';

const { deepFreeze } = require('./contracts');

const AUTHORITY_PRECEDENCE = Object.freeze({ DOMAIN: 100, ECONOMIC: 200, MODERATION: 300 });
const TYPE_RULES = Object.freeze({
  moderation_reversal: { authorityClass: 'MODERATION', evidenceType: 'moderation' },
  refund: { authorityClass: 'ECONOMIC', evidenceType: 'economic_finality', targetClass: 'TRANSACT' },
  chargeback: { authorityClass: 'ECONOMIC', evidenceType: 'economic_finality', targetClass: 'TRANSACT' },
  reversal: { authorityClass: 'ECONOMIC', evidenceType: 'economic_finality', targetClass: 'TRANSACT' },
  chain_reorganization: { authorityClass: 'ECONOMIC', evidenceType: 'economic_finality', targetClass: 'TRANSACT' },
  amendment: { authorityClass: 'DOMAIN', evidenceType: 'moderation', replacement: true },
  supersession: { authorityClass: 'DOMAIN', evidenceType: 'moderation', replacement: true },
  compensation: { authorityClass: 'ECONOMIC', evidenceType: 'economic_finality', targetClass: 'TRANSACT', compensating: true }
});

function correctionAuthorizationContract(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new TypeError('correction authorization contract requires entries');
  const byProducer = new Map();
  for (const entry of entries) {
    requireString(entry.producer, 'producer');
    if (!AUTHORITY_PRECEDENCE[entry.authorityClass]) throw new TypeError('unsupported correction authority class');
    if (!Array.isArray(entry.correctionTypes) || !entry.correctionTypes.length) throw new TypeError('authority requires correctionTypes');
    if (!Array.isArray(entry.eventTypePatterns) || !entry.eventTypePatterns.length) throw new TypeError('authority requires eventTypePatterns');
    if (!Array.isArray(entry.evidenceProducers) || !entry.evidenceProducers.length) throw new TypeError('authority requires evidenceProducers');
    if (!entry.evidenceContractVersions || typeof entry.evidenceContractVersions !== 'object') throw new TypeError('authority requires evidenceContractVersions');
    requireString(entry.version, 'version');
    if (byProducer.has(entry.producer)) throw new TypeError(`duplicate correction producer: ${entry.producer}`);
    byProducer.set(entry.producer, deepFreeze({ ...entry, correctionTypes: [...entry.correctionTypes], eventTypePatterns: [...entry.eventTypePatterns], evidenceProducers: [...entry.evidenceProducers] }));
  }
  return deepFreeze({
    authorize(correctionEvent, target, evidence, authenticatedProducer) {
      if (authenticatedProducer !== correctionEvent.provenance.producer) throw new Error('CORRECTION_PRODUCER_ASSERTION_MISMATCH');
      const producer = authenticatedProducer;
      const authority = byProducer.get(producer);
      const rule = TYPE_RULES[correctionEvent.correction.type];
      if (!authority || !rule) throw new Error(`CORRECTION_PRODUCER_UNAUTHORIZED:${producer}`);
      if (correctionEvent.provenance.authority !== authority.authorityClass) throw new Error('CORRECTION_AUTHORITY_CLASS_MISMATCH');
      if (authority.authorityClass !== rule.authorityClass || !authority.correctionTypes.includes(correctionEvent.correction.type)) throw new Error('CORRECTION_TYPE_UNAUTHORIZED');
      if (!authority.eventTypePatterns.some(pattern => matches(pattern, target.eventType))) throw new Error('CORRECTION_TARGET_DOMAIN_UNAUTHORIZED');
      if (rule.targetClass && target.activityClass !== rule.targetClass) throw new Error('CORRECTION_TARGET_TYPE_INVALID');
      if (correctionEvent.correction.authorityVersion !== authority.version) throw new Error('CORRECTION_AUTHORITY_VERSION_MISMATCH');
      if (!evidence.some(item => item.type === rule.evidenceType && authority.evidenceProducers.includes(item.producer))) throw new Error('CORRECTION_EVIDENCE_AUTHORITY_MISMATCH');
      if (evidence.some(item => item.type === rule.evidenceType && authority.evidenceContractVersions[item.type] !== item.contractVersion)) throw new Error('CORRECTION_EVIDENCE_VERSION_MISMATCH');
      if (evidence.some(item => item.type === rule.evidenceType && item.body.authorityRef !== item.producer)) throw new Error('CORRECTION_EVIDENCE_AUTHORITY_REFERENCE_MISMATCH');
      if (evidence.some(item => item.observedAt > correctionEvent.correction.effectiveAt)) throw new Error('CORRECTION_EVIDENCE_NOT_EFFECTIVE');
      validateCorrectionSemantics(correctionEvent, target, evidence, rule);
      return { ...rule, precedence: AUTHORITY_PRECEDENCE[authority.authorityClass] };
    }
  });
}

function validateCorrectionSemantics(correctionEvent, target, evidence, rule) {
  const type = correctionEvent.correction.type;
  const item = evidence.find(value => value.type === rule.evidenceType);
  if (!item) throw new Error('CORRECTION_EVIDENCE_SEMANTICS_INVALID');
  if (type === 'moderation_reversal') {
    if (!['reversed', 'removed', 'invalidated'].includes(item.body.outcome) || item.body.targetEventId !== target.eventId || !sameRef(item.body.targetObject, target.object || target.subject)) throw new Error('CORRECTION_EVIDENCE_SEMANTICS_INVALID');
  } else if (['refund', 'chargeback', 'reversal', 'chain_reorganization', 'compensation'].includes(type)) {
    const expected = { refund: 'refund', chargeback: 'chargeback', reversal: 'reversed', chain_reorganization: 'chain_reorganization', compensation: 'reversed' }[type];
    if (item.body.transactionRef !== target.object?.id || item.body.state !== expected) throw new Error('CORRECTION_EVIDENCE_SEMANTICS_INVALID');
    if (type === 'chain_reorganization' && !item.body.blockRef) throw new Error('CORRECTION_EVIDENCE_SEMANTICS_INVALID');
  } else if (['amendment', 'supersession'].includes(type)) {
    const replacementId = correctionEvent.correction.replacementEventId;
    if (item.body.outcome !== (type === 'amendment' ? 'amended' : 'superseded') || item.body.targetEventId !== target.eventId || item.body.replacementEventId !== replacementId || !sameRef(item.body.targetObject, target.object || target.subject) || item.body.priorVersion !== target.sourceIdentity.version || !item.body.replacementVersion) throw new Error('CORRECTION_EVIDENCE_SEMANTICS_INVALID');
  }
}

function sameRef(left, right) { return !!left && !!right && left.type === right.type && left.id === right.id; }

function matches(pattern, value) { return pattern.endsWith('*') ? value.startsWith(pattern.slice(0, -1)) : pattern === value; }
function requireString(value, name) { if (typeof value !== 'string' || !value) throw new TypeError(`authority requires ${name}`); }

module.exports = { AUTHORITY_PRECEDENCE, TYPE_RULES, correctionAuthorizationContract };
