/** سر الجلسة — إلزامي في الإنتاج */
export function getAuthSecret(): string {
  const secret = (process.env.NEXTAUTH_SECRET || '').trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'development') {
    return 'bhd-dev-secret-not-for-production';
  }
  throw new Error('NEXTAUTH_SECRET is required in production');
}
