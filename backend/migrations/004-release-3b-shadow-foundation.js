'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const DEFINITIONS = Object.freeze([
  ['progression_activity_events', [
    [{ eventId: 1 }, { unique: true, name: 'eventId_1' }],
    [{ idempotencyKey: 1 }, { unique: true, name: 'idempotencyKey_1' }],
    [{ beneficiaryId: 1, occurredAt: 1, producer: 1, eventId: 1 }, { name: 'beneficiary_replay_order_v1' }],
    [{ correctionTargetEventId: 1 }, { sparse: true, name: 'correctionTargetEventId_1' }]
  ]],
  ['progression_evidence', [
    [{ evidenceId: 1 }, { unique: true, name: 'evidenceId_1' }],
    [{ evidenceDigest: 1 }, { unique: true, name: 'evidenceDigest_1' }],
    [{ subjectType: 1, subjectId: 1, observedAt: 1, evidenceId: 1 }, { name: 'evidence_subject_order_v1' }],
    [{ supersedesEvidenceId: 1 }, { sparse: true, name: 'supersedesEvidenceId_1' }]
  ]],
  ['progression_qualification_decisions', [
    [{ decisionId: 1 }, { unique: true, name: 'decisionId_1' }],
    [{ eventId: 1, projectionContextId: 1 }, { unique: true, name: 'event_context_1' }],
    [{ projectionContextId: 1, eventId: 1 }, { name: 'context_event_1' }]
  ]],
  ['progression_correction_relationships', [
    [{ correctionEventId: 1 }, { unique: true, name: 'correctionEventId_1' }],
    [{ targetEventId: 1, authorityVersion: 1, sequence: 1 }, { name: 'correction_target_order_v1' }]
  ]],
  ['progression_contribution_results', [
    [{ decisionId: 1 }, { unique: true, name: 'decisionId_1' }],
    [{ beneficiaryId: 1, projectionContextId: 1, eventId: 1 }, { name: 'personal_contribution_replay_v1' }],
    [{ factionId: 1, projectionContextId: 1, eventId: 1 }, { sparse: true, name: 'faction_contribution_replay_v1' }]
  ]],
  ['progression_policy_artifacts', [
    [{ artifactDigest: 1 }, { unique: true, name: 'artifactDigest_1' }],
    [{ policyId: 1, version: 1 }, { unique: true, name: 'policy_version_1' }]
  ]],
  ['progression_projections', [
    [{ scope: 1, subjectId: 1, projectionContextId: 1 }, { unique: true, name: 'projection_checkpoint_1' }],
    [{ scope: 1, subjectId: 1, rebuiltAt: -1 }, { name: 'projection_latest_1' }]
  ]]
]);

async function inspectMigration() {
  const existing = new Set((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name));
  const collections = [];
  for (const [name, indexes] of DEFINITIONS) {
    const current = existing.has(name) ? await mongoose.connection.db.collection(name).indexes() : [];
    const names = new Set(current.map(index => index.name));
    collections.push({ name, exists: existing.has(name), missingIndexes: indexes.map(([, options]) => options.name).filter(indexName => !names.has(indexName)) });
  }
  return { mode: 'preflight', destructiveChanges: 0, collections };
}

async function applyMigration() {
  const before = await inspectMigration();
  for (const [name, indexes] of DEFINITIONS) {
    if (!(await mongoose.connection.db.listCollections({ name }, { nameOnly: true }).hasNext())) await mongoose.connection.db.createCollection(name);
    const collection = mongoose.connection.db.collection(name);
    for (const [keys, options] of indexes) await collection.createIndex(keys, options);
  }
  return { mode: 'apply', createdCollections: before.collections.filter(item => !item.exists).map(item => item.name), indexesReady: DEFINITIONS.reduce((sum, [, indexes]) => sum + indexes.length, 0) };
}

async function rollbackMigration({ allowDataLoss = false } = {}) {
  const existing = new Set((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name));
  const nonEmpty = [];
  for (const [name] of DEFINITIONS) if (existing.has(name) && await mongoose.connection.db.collection(name).estimatedDocumentCount()) nonEmpty.push(name);
  if (nonEmpty.length && !allowDataLoss) throw new Error(`Release 3B rollback refused because collections contain data: ${nonEmpty.join(', ')}`);
  const dropped = [];
  for (const [name] of [...DEFINITIONS].reverse()) if (existing.has(name)) { await mongoose.connection.db.collection(name).drop(); dropped.push(name); }
  return { mode: 'rollback', droppedCollections: dropped };
}

async function cli() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const apply = process.argv.includes('--apply'); const rollback = process.argv.includes('--rollback');
  if (apply && rollback) throw new Error('--apply and --rollback are mutually exclusive');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const result = rollback ? await rollbackMigration({ allowDataLoss: process.argv.includes('--allow-data-loss') }) : apply ? await applyMigration() : await inspectMigration();
    console.log(JSON.stringify(result, null, 2));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) cli().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { DEFINITIONS, inspectMigration, applyMigration, rollbackMigration };
