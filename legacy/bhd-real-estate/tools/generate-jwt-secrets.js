/**
 * توليد أسرار JWT للإنتاج.
 * node tools/generate-jwt-secrets.js
 */
import crypto from 'crypto';

const access = crypto.randomBytes(48).toString('base64url');
const refresh = crypto.randomBytes(48).toString('base64url');
const registration = crypto.randomBytes(24).toString('base64url');
const pg = crypto.randomBytes(24).toString('base64url');

console.log('# أضف إلى deploy/.env.prod');
console.log(`JWT_ACCESS_SECRET=${access}`);
console.log(`JWT_REFRESH_SECRET=${refresh}`);
console.log(`SAAS_REGISTRATION_SECRET=${registration}`);
console.log(`POSTGRES_PASSWORD=${pg}`);
