/**
 * مكتبة الأمان المحسّنة - تحسينات الأمان والمصادقة
 * Enhanced Security Library - Security and authentication improvements
 */

import crypto from 'crypto';

// إعدادات الأمان
export const SECURITY_CONFIG = {
  // معدل محاولات تسجيل الدخول
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 دقيقة
    ATTEMPT_WINDOW: 5 * 60 * 1000, // 5 دقائق
  },
  
  // إعدادات الجلسة
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 ساعة
    REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 دقيقة قبل الانتهاء
    ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 أيام كحد أقصى
  },
  
  // إعدادات كلمة المرور
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE: 90 * 24 * 60 * 60 * 1000, // 90 يوم
  },
  
  // إعدادات CSRF
  CSRF: {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 60 * 60 * 1000, // 1 ساعة
  },
};

// تخزين محاولات تسجيل الدخول
class LoginAttemptTracker {
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();

  recordAttempt(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutTime?: number } {
    const now = Date.now();
    const existing = this.attempts.get(identifier) || { count: 0, lastAttempt: 0 };

    // التحقق من القفل
    if (existing.lockedUntil && existing.lockedUntil > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: existing.lockedUntil - now,
      };
    }

    // إعادة تعيين المحاولات القديمة
    if (now - existing.lastAttempt > SECURITY_CONFIG.LOGIN_ATTEMPTS.ATTEMPT_WINDOW) {
      existing.count = 0;
    }

    existing.count++;
    existing.lastAttempt = now;

    // التحقق من الحد الأقصى للمحاولات
    if (existing.count >= SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS) {
      existing.lockedUntil = now + SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION;
      this.attempts.set(identifier, existing);

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: SECURITY_CONFIG.LOGIN_ATTEMPTS.LOCKOUT_DURATION,
      };
    }

    this.attempts.set(identifier, existing);

    return {
      allowed: true,
      remainingAttempts: SECURITY_CONFIG.LOGIN_ATTEMPTS.MAX_ATTEMPTS - existing.count,
    };
  }

  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // تنظيف المحاولات القديمة
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

// التحقق من قوة كلمة المرور
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // الطول
  if (password.length >= SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
    score += 1;
  } else {
    feedback.push(`كلمة المرور يجب أن تكون على الأقل ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} أحرف`);
  }

  // الأحرف الكبيرة
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && /[A-Z]/.test(password)) {
    score += 1;
  } else if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE) {
    feedback.push('كلمة المرور يجب أن تحتوي على أحرف كبيرة');
  }

  // الأحرف الصغيرة
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && /[a-z]/.test(password)) {
    score += 1;
  } else if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE) {
    feedback.push('كلمة المرور يجب أن تحتوي على أحرف صغيرة');
  }

  // الأرقام
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && /\d/.test(password)) {
    score += 1;
  } else if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS) {
    feedback.push('كلمة المرور يجب أن تحتوي على أرقام');
  }

  // الرموز
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else if (SECURITY_CONFIG.PASSWORD.REQUIRE_SYMBOLS) {
    feedback.push('كلمة المرور يجب أن تحتوي على رموز');
  }

  // نقاط إضافية للطول والتعقيد
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/(?!.*\s)(?!.*[A-Za-z]{3,})(?!.*\d{3,})/.test(password)) score += 1;

  return {
    isValid: feedback.length === 0,
    score: Math.min(score, 10),
    feedback,
  };
}

// توليد رمز CSRF
export function generateCSRFToken(): string {
  return crypto.randomBytes(SECURITY_CONFIG.CSRF.TOKEN_LENGTH).toString('hex');
}

// التحقق من رمز CSRF
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}

// تشفير البيانات الحساسة
export function encryptSensitiveData(data: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// فك تشفير البيانات الحساسة
export function decryptSensitiveData(encryptedData: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// التحقق من سلامة الإدخال
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // إزالة HTML tags
    .replace(/javascript:/gi, '') // إزالة javascript protocols
    .replace(/on\w+=/gi, ''); // إزالة event handlers
}

// التحقق من عنوان IP
export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// التحقق من User Agent
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /php/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

// إنشاء بصمة الجلسة
export function createSessionFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Session fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

// التحقق من سلامة الرابط
export function validateURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// منع Clickjacking
export function setSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'",
  };
}

// تدقيق الأمان
export function auditSecurityEvent(event: {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PERMISSION_DENIED';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): void {
  const auditLog = {
    timestamp: new Date().toISOString(),
    ...event,
    fingerprint: createSessionFingerprint(),
  };
  
  // تخزين سجل التدقيق
  const existingLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
  existingLogs.push(auditLog);
  
  // الحفاظ على آخر 1000 سجل فقط
  if (existingLogs.length > 1000) {
    existingLogs.splice(0, existingLogs.length - 1000);
  }
  
  localStorage.setItem('security_audit_logs', JSON.stringify(existingLogs));
}

// تنظيف البيانات القديمة
export function cleanupSecurityData(): void {
  loginTracker.cleanup();
  
  // تنظيف سجلات التدقيق القديمة (أكبر من 30 يوم)
  const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const filteredLogs = logs.filter((log: any) => {
    return new Date(log.timestamp).getTime() > thirtyDaysAgo;
  });
  
  localStorage.setItem('security_audit_logs', JSON.stringify(filteredLogs));
}

// بدء تنظيف دوري
export function startSecurityCleanup(): void {
  // تنظيف كل ساعة
  setInterval(cleanupSecurityData, 60 * 60 * 1000);
  
  // تنظيف فوري عند البدء
  cleanupSecurityData();
}
