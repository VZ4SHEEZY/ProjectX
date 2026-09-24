'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const COLLECTION = 'progression_pipeline_leases';
const INDEXES = Object.freeze([
  [{ leaseKey: 1 }, { unique: true, name: 'leaseKey_1' }],
  [{ expiresAt: 1 }, { name: 'lease_expiry_v1' }]
]);

async function inspectMigration() {
  const exists = await mongoose.connection.db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  const current = exists ? await mongoose.connection.db.collection(COLLECTION).indexes() : [];
  const names = new Set(current.map(index => index.name));
  return { mode: 'preflight', destructiveChanges: 0, collection: { name: COLLECTION, exists, missingIndexes: INDEXES.map(([, options]) => options.name).filter(name => !names.has(name)) } };
}
async function applyMigration() {
  const before = await inspectMigration();
  if (!before.collection.exists) await mongoose.connection.db.createCollection(COLLECTION);
  for (const [keys, options] of INDEXES) await mongoose.connection.db.collection(COLLECTION).createIndex(keys, options);
  return { mode: 'apply', createdCollection: !before.collection.exists, indexesReady: INDEXES.length };
}
async function rollbackMigration() {
  const exists = await mongoose.connection.db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  if (!exists) return { mode: 'rollback', droppedCollection: false };
  if (await mongoose.connection.db.collection(COLLECTION).estimatedDocumentCount()) throw new Error('Release 3X rollback refused because progression_pipeline_leases contains data');
  await mongoose.connection.db.collection(COLLECTION).drop();
  return { mode: 'rollback', droppedCollection: true };
}
async function cli() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try { console.log(JSON.stringify(process.argv.includes('--apply') ? await applyMigration() : process.argv.includes('--rollback') ? await rollbackMigration() : await inspectMigration(), null, 2)); }
  finally { await mongoose.disconnect(); }
}
if (require.main === module) cli().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { COLLECTION, INDEXES, inspectMigration, applyMigration, rollbackMigration };
