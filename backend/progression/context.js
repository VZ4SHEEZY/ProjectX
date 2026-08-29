'use strict';

const crypto = require('node:crypto');
const { deepFreeze, isCanonicalTimestamp, stableJson } = require('./contracts');
const { canonicalGeneration } = require('./generation');

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const ORDERING_VERSION = 'event-time-producer-event-id-v1';

function projectionContext(input) {
  const allowed = ['ledgerCutoff', 'watermark', 'evaluationGeneration', 'evidenceGeneration', 'correctionGraphGeneration', 'policyId', 'policyVersion', 'policyArtifactDigest', 'evidenceContextDigest', 'correctionGraphDigest', 'orderingVersion', 'projectionContextId'];
  if (!input || Object.keys(input).some(key => !allowed.includes(key))) throw new TypeError('projection context contains unsupported fields');
  if (!isCanonicalTimestamp(input.ledgerCutoff) || !isCanonicalTimestamp(input.watermark)) throw new TypeError('projection context timestamps must be canonical UTC ISO-8601');
  const material = {
    ledgerCutoff: input.ledgerCutoff,
    watermark: input.watermark,
    evaluationGeneration: canonicalGeneration(input.evaluationGeneration, 'evaluationGeneration'),
    evidenceGeneration: canonicalGeneration(input.evidenceGeneration, 'evidenceGeneration'),
    correctionGraphGeneration: canonicalGeneration(input.correctionGraphGeneration, 'correctionGraphGeneration'),
    policyId: bounded(input.policyId, 'policyId'),
    policyVersion: bounded(input.policyVersion, 'policyVersion'),
    policyArtifactDigest: digest(input.policyArtifactDigest, 'policyArtifactDigest'),
    evidenceContextDigest: digest(input.evidenceContextDigest, 'evidenceContextDigest'),
    correctionGraphDigest: digest(input.correctionGraphDigest, 'correctionGraphDigest'),
    orderingVersion: bounded(input.orderingVersion || ORDERING_VERSION, 'orderingVersion')
  };
  const projectionContextId = sha256(stableJson(material));
  if (input.projectionContextId && input.projectionContextId !== projectionContextId) throw new TypeError('projectionContextId must match canonical replay context');
  return deepFreeze({ ...material, projectionContextId });
}

function digest(value, name) { if (!DIGEST.test(value || '')) throw new TypeError(`${name} must be a canonical sha256 digest`); return value; }
function bounded(value, name) { if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError(`${name} must be a bounded non-empty string`); return value; }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { DIGEST, ORDERING_VERSION, projectionContext };
