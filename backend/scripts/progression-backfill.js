'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const backfill = require('../progression/operations/backfill');
const { operationsEnabled } = require('../progression/operations/config');

async function main() {
  if (!operationsEnabled()) throw new Error('PROGRESSION_OPERATIONS_ENABLED must be explicitly true');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const dryRun = !process.argv.includes('--apply');
  if (!dryRun && process.env.CONFIRM_PROGRESSION_BACKFILL !== 'APPLY') throw new Error('Set CONFIRM_PROGRESSION_BACKFILL=APPLY to enqueue');
  const operationKey = argument('--operation') || `release-3e-posts-${dryRun ? 'dry-run' : 'apply'}`;
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const check = await backfill.preflight();
    if (!check.transactionCapable) throw new Error('Backfill requires a replica set or sharded MongoDB deployment');
    console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'apply', preflight: check }, null, 2));
    let result;
    do {
      result = await backfill.runBatch({ operationKey, dryRun, batchSize: argument('--batch-size') });
      console.log(JSON.stringify({ complete: result.complete, cursor: result.operation.cursor, stats: result.operation.stats }));
    } while (!result.complete);
  } finally { await mongoose.disconnect(); }
}

function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
