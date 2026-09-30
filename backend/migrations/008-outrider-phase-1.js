'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const models = [
  require('../models/OutriderAgent'), require('../models/OutriderAgentMemory'), require('../models/OutriderAgentExecution'),
  require('../models/OutriderCapabilityGrant'), require('../models/OutriderWorldSpace'), require('../models/OutriderWorldEvent'),
  require('../models/OutriderAgentRelationship'), require('../models/OutriderObserverSession'), require('../models/OutriderArtifact'),
  require('../models/OutriderConversation'), require('../models/OutriderWorldSignal'), require('../models/OutriderProposal'), require('../models/OutriderGlassAudit')
];
function assertIsolated(uri, environment) {
  if (!['development', 'staging'].includes(environment)) throw new Error('OUTRIDER_MIGRATION_REQUIRES_DEVELOPMENT_OR_STAGING');
  const name = new URL(uri).pathname.replace(/^\//, '').split('?')[0];
  if (!name || name === 'cyberdope' || !/(staging|development|dev|outrider)/i.test(name)) throw new Error('OUTRIDER_DATABASE_NOT_ISOLATED');
  return name;
}
async function migrate(env = process.env) {
  const uri = env.OUTRIDER_MONGODB_URI || env.MONGODB_URI; assertIsolated(uri, env.OUTRIDER_ENV);
  await mongoose.connect(uri, { autoIndex: false, autoCreate: true });
  try { for (const model of models) await model.syncIndexes(); return { database: mongoose.connection.name, models: models.length }; }
  finally { await mongoose.disconnect(); }
}
if (require.main === module) migrate().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertIsolated, migrate };
