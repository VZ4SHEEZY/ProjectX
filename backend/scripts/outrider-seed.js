'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Faction = require('../models/Faction');
const repository = require('../outrider/persistence/repository');
const { OutriderSeedService } = require('../outrider/services/seedService');
const { assertIsolated } = require('../migrations/008-outrider-phase-1');

async function seed(env = process.env) {
  const uri = env.OUTRIDER_MONGODB_URI || env.MONGODB_URI;
  assertIsolated(uri, env.OUTRIDER_ENV);
  if (!mongoose.isValidObjectId(env.OUTRIDER_SEED_GRANTED_BY_USER_ID)) throw new Error('OUTRIDER_SEED_CANONICAL_GRANTOR_REQUIRED');
  await mongoose.connect(uri);
  try {
    const factions = await Faction.find({ status: 'active' }).sort({ key: 1 }).lean();
    if (!factions.length) throw new Error('OUTRIDER_SEED_REQUIRES_CANONICAL_FACTIONS');
    const result = await new OutriderSeedService({ repository }).seed({ factions, grantedBy: new mongoose.Types.ObjectId(env.OUTRIDER_SEED_GRANTED_BY_USER_ID) });
    return { database: mongoose.connection.name, factionCount: factions.length, agentCount: result.agents.length, spaceCount: result.spaces };
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) seed().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { seed };
