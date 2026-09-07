'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const COLLECTION = 'progression_operations';
const INDEXES = Object.freeze([
  [{ operationKey: 1 }, { unique: true, name: 'operationKey_1' }],
  [{ kind: 1, status: 1, updatedAt: -1 }, { name: 'progression_operation_status_v1' }]
]);

async function transactionPreflight() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  return classifyDeployment(hello);
}

function classifyDeployment(hello = {}) {
  return {
    deployment: hello.setName ? 'replica-set' : hello.msg === 'isdbgrid' ? 'sharded' : 'standalone',
    transactionCapable: Boolean(hello.setName || hello.msg === 'isdbgrid'),
    maxWireVersion: hello.maxWireVersion
  };
}

async function inspectMigration() {
  const capability = await transactionPreflight();
  const exists = await mongoose.connection.db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  const current = exists ? await mongoose.connection.db.collection(COLLECTION).indexes() : [];
  const names = new Set(current.map(index => index.name));
  return { mode: 'preflight', release: '3e', destructiveChanges: 0, capability, collection: { name: COLLECTION, exists, missingIndexes: INDEXES.map(([, options]) => options.name).filter(name => !names.has(name)) } };
}

async function applyMigration() {
  const before = await inspectMigration();
  if (!before.capability.transactionCapable) throw new Error('Release 3E requires a replica set or sharded MongoDB deployment');
  if (!before.collection.exists) await mongoose.connection.db.createCollection(COLLECTION);
  for (const [keys, options] of INDEXES) await mongoose.connection.db.collection(COLLECTION).createIndex(keys, options);
  return { mode: 'apply', release: '3e', createdCollection: !before.collection.exists, indexesReady: INDEXES.length, capability: before.capability };
}

async function rollbackMigration() {
  const exists = await mongoose.connection.db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  if (!exists) return { mode: 'rollback', droppedCollection: false };
  const count = await mongoose.connection.db.collection(COLLECTION).estimatedDocumentCount();
  if (count) throw new Error('Release 3E rollback refused: retain operation checkpoints for audit and recovery');
  await mongoose.connection.db.collection(COLLECTION).drop();
  return { mode: 'rollback', droppedCollection: true };
}

async function cli() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (process.argv.includes('--apply') && process.env.CONFIRM_RELEASE_3E_MIGRATION !== 'APPLY') throw new Error('Set CONFIRM_RELEASE_3E_MIGRATION=APPLY to mutate');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const result = process.argv.includes('--rollback') ? await rollbackMigration() : process.argv.includes('--apply') ? await applyMigration() : await inspectMigration();
    console.log(JSON.stringify(result, null, 2));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) cli().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { COLLECTION, INDEXES, classifyDeployment, transactionPreflight, inspectMigration, applyMigration, rollbackMigration };
