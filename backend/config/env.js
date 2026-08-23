const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const PRODUCTION_STORAGE_ENV = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

const validateEnv = (env = process.env) => {
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (env.NODE_ENV === 'production') {
    const missingStorage = PRODUCTION_STORAGE_ENV.filter((name) => !env[name]?.trim());
    if (missingStorage.length) {
      throw new Error(`Missing durable storage environment variables: ${missingStorage.join(', ')}`);
    }
  }
};

const allowedOrigins = (env = process.env) => [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://project-x-sage-nine.vercel.app',
  ...(env.FRONTEND_URL || '').split(',').map((origin) => origin.trim())
].filter(Boolean);

const createCorsOrigin = (env = process.env) => {
  const origins = allowedOrigins(env);

  return (origin, callback) => {
    if (!origin || origins.includes(origin)) return callback(null, true);
    const error = new Error('Origin not allowed by CORS');
    error.status = 403;
    callback(error);
  };
};

module.exports = { validateEnv, allowedOrigins, createCorsOrigin };
