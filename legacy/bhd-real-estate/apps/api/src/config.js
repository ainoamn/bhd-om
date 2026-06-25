import 'dotenv/config';
import path from 'path';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT || '3790', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-only-change-me-access-secret-32chars'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-change-me-refresh-secret-32chars'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3789')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  fileStorageDir: process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'data', 'files'),
  saasRegistrationSecret: process.env.SAAS_REGISTRATION_SECRET || '',
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || '',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
};
