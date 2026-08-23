const crypto = require('crypto');
const mongoose = require('mongoose');

const startedAt = new Date();
const counters = {
  requests: 0,
  responses4xx: 0,
  responses5xx: 0,
  errors: 0,
  authFailures: 0,
  socketConnections: 0,
  socketDisconnects: 0,
  socketErrors: 0,
  uploadFailures: 0,
  storageFailures: 0
};
const recentErrors = [];
const MAX_RECENT_ERRORS = 25;

const safeError = (error) => ({
  name: error?.name || 'Error',
  code: typeof error?.code === 'string' ? error.code.slice(0, 64) : undefined
});

const write = (level, event, fields = {}) => {
  const entry = { timestamp: new Date().toISOString(), level, event, ...fields };
  const output = JSON.stringify(entry);
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(output);
};

const increment = (metric, amount = 1) => {
  if (Object.hasOwn(counters, metric)) counters[metric] += amount;
};

const recordError = (event, error, fields = {}) => {
  increment('errors');
  const entry = { timestamp: new Date().toISOString(), event, ...fields, error: safeError(error) };
  recentErrors.push(entry);
  if (recentErrors.length > MAX_RECENT_ERRORS) recentErrors.shift();
  write('error', event, { ...fields, error: safeError(error) });
};

const requestContext = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = /^[a-zA-Z0-9._-]{1,100}$/.test(incoming || '') ? incoming : crypto.randomUUID();
  res.set('x-request-id', req.id);
  increment('requests');
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (res.statusCode >= 500) increment('responses5xx');
    else if (res.statusCode >= 400) increment('responses4xx');
    write(res.statusCode >= 500 ? 'error' : 'info', 'http_request', {
      requestId: req.id,
      method: req.method,
      path: req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path,
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e6)
    });
  });
  next();
};

const versionMetadata = () => ({
  version: process.env.npm_package_version || require('../package.json').version,
  revision: (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown').slice(0, 40),
  environment: process.env.NODE_ENV || 'development',
  deployedAt: process.env.RENDER_DEPLOY_TIMESTAMP || null,
  service: process.env.RENDER_SERVICE_NAME || 'cyberdope-api'
});

const diagnostics = () => ({
  status: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
  startedAt: startedAt.toISOString(),
  uptimeSeconds: Math.floor(process.uptime()),
  database: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
  metrics: { ...counters },
  recentErrors: recentErrors.map((item) => ({ ...item })),
  deployment: versionMetadata()
});

const errorHandler = (err, req, res, next) => {
  recordError('unhandled_http_error', err, {
    requestId: req.id,
    method: req.method,
    path: req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched'
  });
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

const resetForTests = () => {
  Object.keys(counters).forEach((key) => { counters[key] = 0; });
  recentErrors.length = 0;
};

module.exports = { write, increment, recordError, requestContext, versionMetadata, diagnostics, errorHandler, resetForTests };
