const REQUIRED_IN_PRODUCTION = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'MONGODB_URI'
];

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function getMissingRequiredEnv() {
  return REQUIRED_IN_PRODUCTION.filter((key) => !String(process.env[key] || '').trim());
}

function validateEnv() {
  const missing = getMissingRequiredEnv();
  if (isProduction() && missing.length) {
    throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
  }

  if (!String(process.env.ADMIN_EMAILS || '').trim()) {
    console.warn('[env] ADMIN_EMAILS is empty. No bootstrap super admin emails are configured.');
  }

  if (!String(process.env.CORS_ORIGINS || '').trim() && isProduction()) {
    console.warn('[env] CORS_ORIGINS is empty in production. Requests from unexpected origins may be blocked or allowed depending on deployment topology.');
  }
}

module.exports = { validateEnv, isProduction, getMissingRequiredEnv };
