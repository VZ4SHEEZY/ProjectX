const PRODUCTION_API_ORIGIN = 'https://cyberdope-api.onrender.com';
const STAGING_API_ORIGIN = 'https://cyberdope-api-staging.onrender.com';

function originOf(value, name) {
  try { return new URL(value).origin; }
  catch { throw new Error(`${name} must be an absolute URL`); }
}

function socketOrigin(origin) {
  const url = new URL(origin);
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  return url.origin;
}

export function frontendDeployment(env = process.env) {
  const production = env.VERCEL_ENV !== 'preview';
  const apiOrigin = originOf(env.VITE_API_URL || `${PRODUCTION_API_ORIGIN}/api`, 'VITE_API_URL');
  const socketOriginBinding = originOf(env.VITE_SOCKET_URL || apiOrigin, 'VITE_SOCKET_URL');

  if (production && (apiOrigin !== PRODUCTION_API_ORIGIN || socketOriginBinding !== PRODUCTION_API_ORIGIN)) {
    throw new Error('Production VITE_API_URL and VITE_SOCKET_URL must target the production API');
  }

  const connectOrigins = new Set([
    PRODUCTION_API_ORIGIN,
    socketOrigin(PRODUCTION_API_ORIGIN),
    apiOrigin,
    socketOrigin(apiOrigin),
    socketOriginBinding,
    socketOrigin(socketOriginBinding),
    'https://sepolia.base.org'
  ]);
  if (production && (connectOrigins.has(STAGING_API_ORIGIN) || connectOrigins.has(socketOrigin(STAGING_API_ORIGIN)))) {
    throw new Error('Production CSP must not contain staging backend origins');
  }

  const csp = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://res.cloudinary.com; connect-src 'self' ${[...connectOrigins].join(' ')}; upgrade-insecure-requests`;
  return { production, apiOrigin, socketOrigin: socketOriginBinding, csp };
}

export function createVercelConfig({ appRoot = false, env = process.env } = {}) {
  const { csp } = frontendDeployment(env);
  return {
    ...(appRoot ? { $schema: 'https://openapi.vercel.sh/vercel.json' } : {}),
    installCommand: appRoot ? 'cd .. && npm ci' : 'npm ci',
    buildCommand: appRoot ? 'cd .. && npm run build -- --outDir app/dist' : 'npm run build',
    outputDirectory: 'dist',
    framework: 'vite',
    headers: [{ source: '/(.*)', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' }
    ] }],
    rewrites: [{ source: '/(.*)', destination: '/index.html' }]
  };
}

export const deploymentOrigins = Object.freeze({ PRODUCTION_API_ORIGIN, STAGING_API_ORIGIN });
