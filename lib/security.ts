/**
 * مكتبة الأمان المحسّنة - BHD-OM
 * ================================
 * إصلاح المشاكل المعروفة:
 * - createSessionFingerprint: دعم SSR (لا يستخدم document/navigator في الخادم)
 * - auditSecurityEvent: تخزين في Prisma + fallback لـ localStorage في المتصفح
 * - encryptSensitiveData: AES-256-GCM بـ createCipheriv (وليس createCipher المهمل)
 * - decryptSensitiveData: AES-256-GCM بـ createDecipheriv
 */

import crypto from 'crypto';

// ==========================================
// إعدادات الأمان
// ==========================================

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const SECURITY_CONFIG = {
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: envInt('MAX_LOGIN_ATTEMPTS', 5),
    LOCKOUT_DURATION: envInt('LOCKOUT_DURATION_MINUTES', 15) * 60 * 1000,
    ATTEMPT_WINDOW: 5 * 60 * 1000,
  },
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000,
    REFRESH_THRESHOLD: 30 * 60 * 1000,
    ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE: 90 * 24 * 60 * 60 * 1000,
  },
  CSRF: {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 60 * 60 * 1000,
  },
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm' as const,
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    AUTH_TAG_LENGTH: 16,
    SALT_LENGTH: 32,
  },
};

// ==========================================
// أنواع الأخطاء
// ==========================================

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

// ==========================================
// تخزين محاولات تسجيل الدخول
// ==========================================

class LoginAttemptTracker {
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();

  recordAttempt(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutTime?: number } {
    const now = Date.now();
    const existing = this.attempts.get(identifier) || { count: 0, lastAttempt: 0 };

    if (existing.lockedUntil && existing.lockedUntil > now) {
      return { allowed: false, remainingAttempts: 0, lockoutTime: existing.lockedUntil - now };
    }

    if (now - existing.lastAttempt > SECURITY_CONFIG.LOGIN_ATTEMPTS.ATTEMPT_WINDOW) {
      existing.count = 0;
    }

    existing.count++;
    existing.lastAttempt = now;

    if (existing.count >= SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS) {
      existing.lockedUntil = now + SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION;
      this.attempts.set(identifier, existing);
      return { allowed: false, remainingAttempts: 0, lockoutTime: SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION };
    }

    this.attempts.set(identifier, existing);
    return { allowed: true, remainingAttempts: SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS - existing.count };
  }

  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (now - attempt.lastAttempt > SECURITY_CONFIG.LOGIN_ATTEMPTS.ATTEMPT_WINDOW * 2) {
        this.attempts.delete(key);
      }
    }
  }
}

export const loginTracker = new LoginAttemptTracker();

// ==========================================
// التحقق من قوة كلمة المرور
// ==========================================

export function validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= SECURITY_CONFIG.PASSWORD.MIN_LENGTH) score += 1;
  else feedback.push(`كلمة المرور يجب أن تكون على الأقل ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} أحرف`);

  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && /[A-Z]/.test(password)) score += 1;
  else if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE) feedback.push('كلمة المرور يجب أن تحتوي على أحرف كبيرة');

  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && /[a-z]/.test(password)) score += 1;
  else if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE) feedback.push('كلمة المرور يجب أن تحتوي على أحرف صغيرة');

  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && /\d/.test(password)) score += 1;
  else if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS) feedback.push('كلمة المرور يجب أن تحتوي على أرقام');

  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS && /[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else if (SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS) feedback.push('كلمة المرور يجب أن تحتوي على رموز');

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  return { isValid: feedback.length === 0, score: Math.min(score, 7), feedback };
}

// ==========================================
// توليد رمز CSRF
// ==========================================

export function generateCSRFToken(): string {
  return crypto.randomBytes(SECURITY_CONFIG.CSRF.TOKEN_LENGTH).toString('hex');
}

// ==========================================
// إصلاح 1: بصمة الجلسة - SSR-safe
// ==========================================

export function createSessionFingerprint(req?: { headers?: Record<string, string | string[] | undefined>; ip?: string }): string {
  const parts: string[] = [];
  
  if (typeof window === 'undefined') {
    // SSR: استخدم بيانات الطلب
    parts.push('server');
    if (req?.ip) parts.push(req.ip);
    const ua = req?.headers?.['user-agent'];
    if (typeof ua === 'string') parts.push(ua);
  } else {
    // Client: استخدم بيانات المتصفح
    parts.push('client');
    parts.push(navigator.userAgent || '');
    parts.push(navigator.language || '');
    parts.push(`${screen.width}x${screen.height}`);
    parts.push(String(new Date().getTimezoneOffset()));
  }
  
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

// ==========================================
// إصلاح 2: التشفير - AES-256-GCM
// ==========================================

function getMasterKey(): Buffer {
  const encKey = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (encKey) {
    return crypto.scryptSync(encKey, 'bhd-om-salt', SECURITY_CONFIG.ENCRYPTION.KEY_LENGTH);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new EncryptionError('ENCRYPTION_MASTER_KEY is required in production');
  }
  const fallback = process.env.NEXTAUTH_SECRET?.trim();
  if (!fallback) {
    throw new EncryptionError('ENCRYPTION_MASTER_KEY or NEXTAUTH_SECRET must be set');
  }
  return crypto.scryptSync(fallback, 'bhd-om-salt', SECURITY_CONFIG.ENCRYPTION.KEY_LENGTH);
}

export function encryptSensitiveData(plaintext: string): string {
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH);
    const cipher = crypto.createCipheriv(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function decryptSensitiveData(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new DecryptionError('Invalid encrypted data format');
    }
    
    const key = getMasterKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    if (error instanceof DecryptionError) throw error;
    throw new DecryptionError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==========================================
// إصلاح 3: التدقيق - دعم SSR + Client
// ==========================================

export type SecurityEventType = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export function auditSecurityEvent(event: SecurityEvent): void {
  const auditLog = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  if (typeof window === 'undefined') {
    void import('@/lib/server/securityAudit').then(({ logSecurityEventServer }) =>
      logSecurityEventServer(event)
    );
  } else {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      existingLogs.push(auditLog);
      if (existingLogs.length > 1000) existingLogs.splice(0, existingLogs.length - 1000);
      localStorage.setItem('security_audit_logs', JSON.stringify(existingLogs));
    } catch {
      /* ignore */
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[SECURITY_AUDIT]', auditLog);
  }
}

// ==========================================
// تنظيف البيانات
// ==========================================

export function cleanupSecurityData(): void {
  loginTracker.cleanup();
  
  if (typeof window !== 'undefined') {
    try {
      const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filtered = logs.filter((log: any) => new Date(log.timestamp).getTime() > thirtyDaysAgo);
      localStorage.setItem('security_audit_logs', JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

export function startSecurityCleanup(): void {
  setInterval(cleanupSecurityData, 60 * 60 * 1000);
  cleanupSecurityData();
}

// ==========================================
// أدوات مساعدة
// ==========================================

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i, /perl/i, /php/i,
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
}
