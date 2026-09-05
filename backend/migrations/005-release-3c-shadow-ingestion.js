'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const COLLECTION = 'progression_outbox';
const INDEXES = Object.freeze([
  [{ eventId: 1 }, { unique: true, name: 'eventId_1' }],
  [{ status: 1, availableAt: 1, createdAt: 1, eventId: 1 }, { name: 'progression_outbox_delivery_v1' }]
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
async function rollbackMigration({ allowDataLoss = false } = {}) {
  const exists = await mongoose.connection.db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();
  if (!exists) return { mode: 'rollback', droppedCollection: false };
  if (await mongoose.connection.db.collection(COLLECTION).estimatedDocumentCount() && !allowDataLoss) throw new Error('Release 3C rollback refused because progression_outbox contains data');
  await mongoose.connection.db.collection(COLLECTION).drop(); return { mode: 'rollback', droppedCollection: true };
}
async function cli() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try { console.log(JSON.stringify(process.argv.includes('--rollback') ? await rollbackMigration({ allowDataLoss: process.argv.includes('--allow-data-loss') }) : process.argv.includes('--apply') ? await applyMigration() : await inspectMigration(), null, 2)); }
  finally { await mongoose.disconnect(); }
}
if (require.main === module) cli().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { COLLECTION, INDEXES, inspectMigration, applyMigration, rollbackMigration };
