import test from 'node:test';
import assert from 'node:assert/strict';
import { createVercelConfig, deploymentOrigins, frontendDeployment } from '../vercel-config.mjs';

const productionEnv = {
  VERCEL_ENV: 'production',
  VITE_API_URL: `${deploymentOrigins.PRODUCTION_API_ORIGIN}/api`,
  VITE_SOCKET_URL: deploymentOrigins.PRODUCTION_API_ORIGIN
};
const stagingEnv = {
  VERCEL_ENV: 'preview',
  VITE_API_URL: `${deploymentOrigins.STAGING_API_ORIGIN}/api`,
  VITE_SOCKET_URL: deploymentOrigins.STAGING_API_ORIGIN
};

test('production binding and CSP include production and exclude staging', () => {
  const deployment = frontendDeployment(productionEnv);
  assert.equal(deployment.apiOrigin, deploymentOrigins.PRODUCTION_API_ORIGIN);
  assert.equal(deployment.socketOrigin, deploymentOrigins.PRODUCTION_API_ORIGIN);
  assert.match(deployment.csp, /https:\/\/cyberdope-api\.onrender\.com/);
  assert.match(deployment.csp, /wss:\/\/cyberdope-api\.onrender\.com/);
  assert.doesNotMatch(deployment.csp, /cyberdope-api-staging/);
  assert.throws(() => frontendDeployment({ ...productionEnv, VITE_API_URL: `${deploymentOrigins.STAGING_API_ORIGIN}/api` }), /must target the production API/);
});

test('preview binding and CSP permit staging API and socket while retaining required production origins', () => {
  const deployment = frontendDeployment(stagingEnv);
  assert.equal(deployment.apiOrigin, deploymentOrigins.STAGING_API_ORIGIN);
  assert.equal(deployment.socketOrigin, deploymentOrigins.STAGING_API_ORIGIN);
  for (const origin of [deploymentOrigins.PRODUCTION_API_ORIGIN, deploymentOrigins.STAGING_API_ORIGIN, 'wss://cyberdope-api-staging.onrender.com']) assert.ok(deployment.csp.includes(origin), origin);
});

test('both Vercel project-root configurations use the environment-derived CSP', () => {
  const root = createVercelConfig({ env: stagingEnv });
  const app = createVercelConfig({ appRoot: true, env: stagingEnv });
  assert.equal(root.headers[0].headers[0].value, app.headers[0].headers[0].value);
  assert.equal(root.buildCommand, 'npm run build');
  assert.equal(app.buildCommand, 'cd .. && npm run build -- --outDir app/dist');
});
