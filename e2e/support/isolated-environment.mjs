import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const frontendPort = process.env.E2E_FRONTEND_PORT || '4173';
const apiPort = process.env.E2E_API_PORT || '5001';
const frontendURL = `http://127.0.0.1:${frontendPort}`;
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const mongoose = require('../../backend/node_modules/mongoose');

// Pin the database engine so local and CI runs use the same wire/storage behavior.
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
const runId = crypto.randomBytes(5).toString('hex');
const qaSecret = crypto.randomBytes(32).toString('base64url');
const children = [];
const launch = (command, args, env) => {
  const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, ...env } });
  children.push(child);
  return child;
};
const waitFor = async (url, attempts = 120) => {
  for (let i = 0; i < attempts; i += 1) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Isolated service did not become healthy: ${new URL(url).origin}`);
};

launch(process.execPath, ['backend/server.js'], {
  NODE_ENV: 'test', PORT: apiPort, MONGODB_URI: mongo.getUri('cyberdope-e2e'),
  JWT_SECRET: crypto.randomBytes(48).toString('base64url'), JWT_EXPIRE: '5m',
  QA_E2E_ENABLED: 'true', QA_E2E_SECRET: qaSecret,
  RATE_LIMIT_MAX: '2000',
  FRONTEND_URL: frontendURL, PAYMENT_EXECUTION_ENABLED: 'false',
  USER_FACING_PROGRESSION_ENABLED: 'true', VITE_USER_FACING_PROGRESSION_ENABLED: 'true', PROGRESSION_ROLLOUT_STAGE: '4',
  OUTRIDER_ENV: 'test', OUTRIDER_ENABLED: 'true', OUTRIDER_GLASS_ENABLED: 'true', OUTRIDER_OBSERVER_ENABLED: 'true'
});
await waitFor(`${apiOrigin}/api/health`);
const seedResponse = await fetch(`${apiOrigin}/api/qa/seed`, {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-qa-e2e-secret': qaSecret }, body: JSON.stringify({ runId })
});
if (!seedResponse.ok) throw new Error('Unable to seed isolated QA accounts');
const runtime = await seedResponse.json();
// Seed only the isolated in-memory world; no runtime execution is enabled.
await mongoose.connect(mongo.getUri('cyberdope-e2e'));
await require('../../backend/models/OutriderWorldSpace').create({ spaceId: 'outrider-hub', name: 'Outrider Hub', kind: 'commons', visibility: 'public' });
// Synthetic presentation checkpoints belong only to this disposable test database.
const Projection = require('../../backend/models/ProgressionProjection');
const checkpoint = { projectionContextId: 'release-b-ui-fixture', policyId: 'ui-fixture', policyVersion: '1', policyArtifactDigest: 'fixture', evaluationGeneration: 'fixture', projectionContext: {}, rebuiltAt: new Date() };
const independentId = runtime.users.find(user => user.role === 'primary').id;
const memberId = runtime.certification.factionProfiles[0].id;
await Projection.create([
  { ...checkpoint, scope: 'personal', subjectId: independentId, checkpoint: { contribution: 10, specialties: { social: 10 } } },
  { ...checkpoint, scope: 'personal', subjectId: memberId, checkpoint: { contribution: 40, specialties: { creation: 30, social: 10 } } },
  { ...checkpoint, scope: 'faction', subjectId: 'neon_wraith', checkpoint: { total: 120, contributors: { [memberId]: 25 } } }
]);
await mongoose.disconnect();
const runtimeFile = process.env.E2E_RUNTIME_FILE || '.e2e/runtime.json';
await mkdir((await import('node:path')).dirname(runtimeFile), { recursive: true });
await writeFile(runtimeFile, JSON.stringify({ ...runtime, qaSecret, apiURL: `${apiOrigin}/api` }), { mode: 0o600 });
launch(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', frontendPort, '--strictPort'], {
  VITE_API_URL: `${apiOrigin}/api`, VITE_SOCKET_URL: apiOrigin,
  VITE_USER_FACING_PROGRESSION_ENABLED: 'true', VITE_PROGRESSION_ROLLOUT_STAGE: '4', VITE_OUTRIDER_ENABLED: 'true'
});
const cleanup = async () => {
  for (const child of children) child.kill('SIGTERM');
  await mongo.stop();
  process.exit(0);
};
process.once('SIGTERM', cleanup);
process.once('SIGINT', cleanup);
await new Promise(() => {});
