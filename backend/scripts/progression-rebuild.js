'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const rebuild = require('../progression/operations/rebuild');
const { operationsEnabled, policyIdentity } = require('../progression/operations/config');

async function main() {
  if (!operationsEnabled()) throw new Error('PROGRESSION_OPERATIONS_ENABLED must be explicitly true');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const identity = policyIdentity();
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const userId = argument('--user');
    if (userId) console.log(JSON.stringify(await rebuild.runUser({ userId, policyIdentity: identity }), null, 2));
    else {
      const operationKey = argument('--operation') || `release-3e-rebuild:${identity.artifactDigest}`;
      let result; do { result = await rebuild.runGlobalBatch({ operationKey, policyIdentity: identity, batchSize: argument('--batch-size'), concurrency: argument('--concurrency') }); console.log(JSON.stringify({ complete: result.complete, cursor: result.operation.cursor, stats: result.operation.stats })); } while (!result.complete);
    }
  } finally { await mongoose.disconnect(); }
}
function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
