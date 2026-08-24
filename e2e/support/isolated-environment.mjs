import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

// Pin the database engine so local and CI runs use the same wire/storage behavior.
const mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
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
  NODE_ENV: 'test', PORT: '5001', MONGODB_URI: mongo.getUri('cyberdope-e2e'),
  JWT_SECRET: crypto.randomBytes(48).toString('base64url'), JWT_EXPIRE: '5m',
  QA_E2E_ENABLED: 'true', QA_E2E_SECRET: qaSecret,
  RATE_LIMIT_MAX: '2000',
  FRONTEND_URL: 'http://127.0.0.1:4173', PAYMENT_EXECUTION_ENABLED: 'false'
});
await waitFor('http://127.0.0.1:5001/api/health');
const seedResponse = await fetch('http://127.0.0.1:5001/api/qa/seed', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-qa-e2e-secret': qaSecret }, body: JSON.stringify({ runId })
});
if (!seedResponse.ok) throw new Error('Unable to seed isolated QA accounts');
const runtime = await seedResponse.json();
await mkdir('.e2e', { recursive: true });
await writeFile('.e2e/runtime.json', JSON.stringify({ ...runtime, qaSecret, apiURL: 'http://127.0.0.1:5001/api' }), { mode: 0o600 });
launch(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  VITE_API_URL: 'http://127.0.0.1:5001/api', VITE_SOCKET_URL: 'http://127.0.0.1:5001'
});
const cleanup = async () => {
  for (const child of children) child.kill('SIGTERM');
  await mongo.stop();
  process.exit(0);
};
process.once('SIGTERM', cleanup);
process.once('SIGINT', cleanup);
await new Promise(() => {});
