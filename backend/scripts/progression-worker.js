'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { startShadowWorker } = require('../progression/runtime/worker');
const { dedicatedWorkerEnabled } = require('../progression/operations/config');
const { policyIdentity } = require('../progression/operations/config');
const { startRebuildScheduler } = require('../progression/operations/scheduler');
const metrics = require('../progression/operations/metrics');
const { startMonitor } = require('../progression/operations/alerts');

async function main() {
  if (!dedicatedWorkerEnabled()) throw new Error('PROGRESSION_OPERATIONS_ENABLED and PROGRESSION_SHADOW_WORKER_ENABLED must both be explicitly true');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const stop = startShadowWorker({ intervalMs: process.env.PROGRESSION_WORKER_POLL_MS, batchSize: process.env.PROGRESSION_WORKER_BATCH_SIZE, concurrency: process.env.PROGRESSION_WORKER_CONCURRENCY, maxAttempts: process.env.PROGRESSION_WORKER_MAX_ATTEMPTS });
  const stopScheduler = process.env.PROGRESSION_REBUILD_SCHEDULER_ENABLED === 'true'
    ? startRebuildScheduler({ policyIdentity: policyIdentity(), cadenceMs: process.env.PROGRESSION_REBUILD_CADENCE_MS, batchSize: process.env.PROGRESSION_REBUILD_BATCH_SIZE, concurrency: process.env.PROGRESSION_REBUILD_CONCURRENCY })
    : async () => {};
  const stopAlerts = startMonitor({ snapshot: () => metrics.snapshot(), intervalMs: process.env.PROGRESSION_ALERT_POLL_MS });
  const shutdown = async signal => { console.log(`${signal} received, draining progression worker`); await Promise.all([stop(), stopScheduler(), stopAlerts()]); await mongoose.disconnect(); process.exit(0); };
  process.once('SIGTERM', () => shutdown('SIGTERM')); process.once('SIGINT', () => shutdown('SIGINT'));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
