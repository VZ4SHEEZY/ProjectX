'use strict';

const { deepFreeze } = require('./contracts');

class QualificationPolicy {
  constructor(definition) {
    if (!definition?.version || typeof definition.evaluate !== 'function') throw new TypeError('policy requires version and evaluate(event, context)');
    this.version = definition.version;
    this.evaluate = definition.evaluate;
  }
}

function qualifyLedger(events, policy, context = {}) {
  const seenIds = new Set();
  const seenKeys = new Set();
  const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
  return ordered.map((event, index) => {
    const duplicate = seenIds.has(event.eventId) || seenKeys.has(event.idempotencyKey);
    seenIds.add(event.eventId); seenKeys.add(event.idempotencyKey);
    const decision = duplicate
      ? { state: 'rejected', factor: 0, reasonCodes: ['DUPLICATE_EVENT'] }
      : policy.evaluate(event, { ...context, priorEvents: ordered.slice(0, index) });
    return deepFreeze({
      eventId: event.eventId,
      policyVersion: policy.version,
      evaluatedAt: context.evaluatedAt || '2026-08-28T00:00:00.000Z',
      state: decision.state,
      factor: clamp(decision.factor ?? (decision.state === 'qualified' ? 1 : 0), 0, 1),
      reasonCodes: [...new Set(decision.reasonCodes || [])].sort(),
      signals: decision.signals || {}
    });
  });
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }

module.exports = { QualificationPolicy, qualifyLedger };
