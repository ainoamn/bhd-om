/**
 * أدوات الأمان (Security Utilities)
 * ==================================
 * إصلاح المشاكل المعروفة:
 * - createSessionFingerprint: كانت تستخدم document/navigator/screen (متصفح فقط) → إصلاح: دعم SSR
 * - auditSecurityEvent: كانت تستخدم localStorage (متصفح فقط) → إصلاح: دعم SSR + سيرفر
 * - encryptSensitiveData: كانت تستخدم crypto.createCipher المهمل → إصلاح: AES-256-GCM
 * - decryptSensitiveData: كانت تستخدم crypto.createDecipher المهمل → إصلاح: AES-256-GCM
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

// ==========================================
// الأنواع والواجهات
// ==========================================

/** بيانات بصمة الجلسة */
export interface SessionFingerprint {
  /** معرف فريد للجهاز */
  deviceId: string;
  /** نوع المتصفح/العميل */
  userAgent: string;
  /** اللغة المفضلة */
  language: string;
  /** دقة الشاشة */
  screenResolution: string;
  /** المنطقة الزمنية */
  timezone: string;
  /** لون العمق */
  colorDepth: number;
  /** هل يدعم اللمس */
  touchSupport: boolean;
  /** معرف الجلسة */
  sessionId: string;
  /** طابع زمني */
  timestamp: number;
}

/** أنواع أحداث الأمان */
export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "UNAUTHORIZED_ACCESS"
  | "SUSPICIOUS_ACTIVITY"
  | "SESSION_EXPIRED"
  | "BRUTE_FORCE_ATTEMPT"
  | "DATA_EXPORT"
  | "SETTINGS_CHANGE";

/** بيانات حدث الأمان */
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: number;
}

/** نتيجة التشفير */
export interface EncryptionPayload {
  encrypted: string;
  iv: string;
  tag: string;
  keyId: string;
  timestamp: number;
}

// ==========================================
// إصلاح 1: بصمة الجلسة - دعم SSR
// ==========================================

/**
 * إنشاء بصمة جلسة آمنة
 * 
 * المشكلة الأصلية: كانت تستخدم document, navigator, screen مباشرة
 * وهي متغيرات غير متوفرة في SSR (Server-Side Rendering)
 * 
 * الإصلاح: فصل المنطق إلى دالتين:
 * - createSessionFingerprintServer: للخادم (Server)
 * - createSessionFingerprintClient: للمتصفح (Client)
 * - createSessionFingerprint: للكشف التلقائي
 */

/**
 * إنشاء بصمة جلسة من الخادم (SSR-safe)
 * تستخدم معلومات الطلب HTTP فقط
 */
export function createSessionFingerprintServer(
  requestHeaders: Headers,
  sessionId: string
): SessionFingerprint {
  const userAgent = requestHeaders.get("user-agent") || "unknown";
  
  // إنشاء deviceId من الـ userAgent + sessionId
  const deviceId = crypto
    .createHash("sha256")
    .update(`${userAgent}:${sessionId}`)
    .digest("hex")
    .slice(0, 32);

  return {
    deviceId,
    userAgent: userAgent.slice(0, 200),
    language: requestHeaders.get("accept-language") || "unknown",
    screenResolution: "unknown",
    timezone: "unknown",
    colorDepth: 0,
    touchSupport: false,
    sessionId: hashSessionId(sessionId),
    timestamp: Date.now(),
  };
}

/**
 * إنشاء بصمة جلسة من المتصفح (Client-side only)
 * يجب استدعاؤها فقط في useEffect أو في event handlers
 */
export function createSessionFingerprintClient(sessionId: string): SessionFingerprint {
  // التحقق من وجود window (في المتصفح فقط)
  if (typeof window === "undefined") {
    // في SSR، نعيد بصمة أساسية
    return createBasicFingerprint(sessionId);
  }

  const screen = window.screen;
  const navigator = window.navigator;

  const screenResolution = screen
    ? `${screen.width}x${screen.height}`
    : "unknown";
  
  const language = navigator?.language || "unknown";
  const colorDepth = screen?.colorDepth || 0;
  const touchSupport = "ontouchstart" in window;

  // إنشاء deviceId من معلومات الجهاز
  const deviceInfo = [
    navigator?.userAgent || "",
    screenResolution,
    language,
    navigator?.platform || "",
    colorDepth.toString(),
    (navigator?.hardwareConcurrency || 0).toString(),
  ].join("|");

  const deviceId = crypto
    .createHash("sha256")
    .update(deviceInfo)
    .digest("hex")
    .slice(0, 32);

  return {
    deviceId,
    userAgent: (navigator?.userAgent || "unknown").slice(0, 200),
    language,
    screenResolution,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    colorDepth,
    touchSupport,
    sessionId: hashSessionId(sessionId),
    timestamp: Date.now(),
  };
}

/**
 * إنشاء بصمة جلسة (تكشف تلقائياً البيئة)
 * 
 * في الخادم: تستخدم معلومات الطلب
 * في العميل: تستخدم معلومات المتصفح
 */
export function createSessionFingerprint(
  sessionId: string,
  requestHeaders?: Headers
): SessionFingerprint {
  // إذا كان هناك headers، نحن في الخادم
  if (requestHeaders) {
    return createSessionFingerprintServer(requestHeaders, sessionId);
  }

  // إذا لم يكن هناك headers، نحاول المتصفح
  if (typeof window !== "undefined") {
    return createSessionFingerprintClient(sessionId);
  }

  // SSR fallback
  return createBasicFingerprint(sessionId);
}

/**
 * بصمة أساسية (fallback)
 */
function createBasicFingerprint(sessionId: string): SessionFingerprint {
  return {
    deviceId: "ssr-unknown",
    userAgent: "ssr",
    language: "unknown",
    screenResolution: "unknown",
    timezone: "unknown",
    colorDepth: 0,
    touchSupport: false,
    sessionId: hashSessionId(sessionId),
    timestamp: Date.now(),
  };
}

/**
 * هاش معرف الجلسة للتخزين الآمن
 */
function hashSessionId(sessionId: string): string {
  return crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
}

/**
// مقارنة بصمتين للجلسة
 * تُستخدم للكشف عن سرقة الجلسة
 */
export function compareFingerprints(
  fp1: SessionFingerprint,
  fp2: SessionFingerprint
): { match: boolean; confidence: number; differences: string[] } {
  const differences: string[] = [];
  let matchScore = 0;
  const totalChecks = 5;

  if (fp1.deviceId === fp2.deviceId) matchScore++;
  else differences.push("deviceId");

  // UserAgent قد يتغير قليلاً مع التحديثات
  const ua1 = fp1.userAgent.split(" ").slice(0, 3).join(" ");
  const ua2 = fp2.userAgent.split(" ").slice(0, 3).join(" ");
  if (ua1 === ua2) matchScore++;
  else differences.push("userAgent");

  if (fp1.screenResolution === fp2.screenResolution) matchScore++;
  else if (fp1.screenResolution !== "unknown") differences.push("screenResolution");
  else matchScore++; // unknown يعتبر match

  if (fp1.language === fp2.language) matchScore++;
  else differences.push("language");

  if (fp1.timezone === fp2.timezone) matchScore++;
  else if (fp1.timezone !== "unknown") differences.push("timezone");
  else matchScore++;

  const confidence = (matchScore / totalChecks) * 100;

  return {
    match: confidence >= 60,
    confidence,
    differences,
  };
}

// ==========================================
// إصلاح 2: تدقيق أحداث الأمان - دعم SSR
// ==========================================

/**
// تدقيق حدث أمان
 * 
 * المشكلة الأصلية: كانت تستخدم localStorage مباشرة (متصفح فقط)
 * 
 * الإصلاح: فصل التخزين إلى واجهة مع Prisma للخادم
 * ودعم localStorage للمتصفح كـ cache
 */

// Queue للأحداث في الذاكرة (للخادم)
const eventQueue: SecurityEvent[] = [];
const MAX_QUEUE_SIZE = 1000;

/**
 * تدقيق حدث أمان (Server-safe)
 * 
 * في الخادم: يحفظ في Prisma audit log مباشرة
 * في المتصفح: يحفظ في localStorage كـ cache
 */
export async function auditSecurityEvent(
  event: Omit<SecurityEvent, "timestamp">,
  prisma?: PrismaClient
): Promise<void> {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: Date.now(),
  };

  // محاولة الحفظ في قاعدة البيانات أولاً (الخادم)
  if (prisma) {
    try {
      await prisma.auditLog.create({
        data: {
          action: event.type,
          entityType: "SECURITY_EVENT",
          entityId: event.userId || "system",
          userId: event.userId,
          severity: event.severity,
          details: JSON.stringify({
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            ...event.details,
          }),
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
      return;
    } catch (error) {
      console.error("فشل حفظ حدث الأمان في قاعدة البيانات:", error);
      // الاستمرار للحفظ في الذاكرة المؤقتة
    }
  }

  // في المتصفح: استخدام localStorage كـ cache
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storageKey = "security_events_queue";
      const existing = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      ) as SecurityEvent[];
      
      existing.push(fullEvent);
      
      // الاحتفاظ بآخر 100 حدث فقط
      const trimmed = existing.slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error("فشل حفظ حدث الأمان في localStorage:", error);
    }
  }

  // الحفظ في ذاكرة الخادم المؤقتة
  eventQueue.push(fullEvent);
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }
}

/**
 * مزامنة أحداث الأمان من localStorage إلى الخادم
 * يُستدعى عند تسجيل الدخول أو بشكل دوري
 */
export async function syncSecurityEvents(prisma: PrismaClient): Promise<number> {
  if (typeof window === "undefined") return 0;

  try {
    const storageKey = "security_events_queue";
    const events = JSON.parse(
      localStorage.getItem(storageKey) || "[]"
    ) as SecurityEvent[];

    let synced = 0;
    for (const event of events) {
      try {
        await prisma.auditLog.create({
          data: {
            action: event.type,
            entityType: "SECURITY_EVENT",
            entityId: event.userId || "system",
            userId: event.userId,
            severity: event.severity,
            details: JSON.stringify(event.details ?? {}),
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
          },
        });
        synced++;
      } catch (error) {
        console.error("فشل مزامنة حدث:", error);
      }
    }

    // مسح localStorage بعد المزامنة الناجحة
    localStorage.removeItem(storageKey);

    // مزامنة queue الذاكرة أيضاً
    while (eventQueue.length > 0) {
      const event = eventQueue.shift();
      if (event) {
        try {
          await prisma.auditLog.create({
            data: {
              action: event.type,
              entityType: "SECURITY_EVENT",
              entityId: event.userId || "system",
              userId: event.userId,
              severity: event.severity,
              details: JSON.stringify(event.details ?? {}),
              ipAddress: event.ipAddress,
              userAgent: event.userAgent,
            },
          });
          synced++;
        } catch (error) {
          console.error("فشل مزامنة حدث من الذاكرة:", error);
        }
      }
    }

    return synced;
  } catch (error) {
    console.error("فشل مزامنة أحداث الأمان:", error);
    return 0;
  }
}

/**
 * الحصول على أحداث الأمان المعلقة
 */
export function getPendingSecurityEvents(): SecurityEvent[] {
  return [...eventQueue];
}

// ==========================================
// إصلاح 3 & 4: تشفير AES-256-GCM (بدلاً من createCipher المهمل)
// ==========================================

/**
// خوارزمية التشفير الآمنة
 * 
 * المشكلة الأصلية: استخدام crypto.createCipher / crypto.createDecipher
 * وهي دوال مهملة وغير آمنة
 * 
 * الإصلاح: استخدام AES-256-GCM مع:
 * - IV فريد لكل عملية تشفير
 * - علامة مصادقة (Auth Tag) للتحقق من السلامة
 * - HKDF لاشتقاق المفاتيح
 */

/** خوارزمية التشفير */
const ALGORITHM = "aes-256-gcm";
/** طول IV بالبايت */
const IV_LENGTH = 16;
/** طول علامة المصادقة */
const AUTH_TAG_LENGTH = 16;
/** طول مفتاح AES-256 */
const KEY_LENGTH = 32;

/**
// اشتقاق مفتاح من مفتاح السيد
 */
function deriveKeyFromMaster(masterKey: string, salt?: Buffer): Buffer {
  const saltBuffer = salt || crypto.randomBytes(32);
  return crypto.pbkdf2Sync(masterKey, saltBuffer, 100000, KEY_LENGTH, "sha256");
}

/**
 * تشفير البيانات الحساسة باستخدام AES-256-GCM
 * 
 * المشكلة الأصلية: كانت تستخدم crypto.createCipher (مهمل)
 * الإصلاح: تستخدم AES-256-GCM مع IV عشوائي
 * 
 * @param data البيانات المراد تشفيرها
 * @param key مفتاح التشفير (من متغير البيئة)
 * @returns نتيجة التشفير
 */
export function encryptSensitiveData(data: string, key: string): EncryptionPayload {
  try {
    if (!data) {
      throw new Error("البيانات المراد تشفيرها فارغة");
    }

    if (!key || key.length < 16) {
      throw new Error("مفتاح التشفير غير صالح: يجب أن يكون 16 حرف على الأقل");
    }

    // اشتقاق مفتاح آمن
    const salt = crypto.randomBytes(32);
    const derivedKey = deriveKeyFromMaster(key, salt);

    // إنشاء IV عشوائي
    const iv = crypto.randomBytes(IV_LENGTH);

    // إنشاء cipher باستخدام AES-256-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // تشفير البيانات
    const encrypted = Buffer.concat([
      cipher.update(data, "utf-8"),
      cipher.final(),
    ]);

    // الحصول على علامة المصادقة
    const tag = cipher.getAuthTag();

    // تنظيف المفتاح من الذاكرة
    derivedKey.fill(0);

    return {
      encrypted: Buffer.concat([salt, encrypted]).toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyId: "master-derived",
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("خطأ في التشفير:", error);
    throw new Error(
      `فشل تشفير البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
    );
  }
}

/**
 * فك تشفير البيانات الحساسة باستخدام AES-256-GCM
 * 
 * المشكلة الأصلية: كانت تستخدم crypto.createDecipher (مهمل)
 * الإصلاح: تستخدم AES-256-GCM مع التحقق من علامة المصادقة
 * 
 * @param payload نتيجة التشفير
 * @param key مفتاح التشفير الأصلي
 * @returns البيانات المفكوكة التشفير
 */
export function decryptSensitiveData(payload: EncryptionPayload, key: string): string {
  try {
    if (!payload || !payload.encrypted) {
      throw new Error("بيانات التشفير فارغة");
    }

    if (!key || key.length < 16) {
      throw new Error("مفتاح فك التشفير غير صالح");
    }

    // فك ترميز البيانات
    const encryptedBuffer = Buffer.from(payload.encrypted, "base64");
    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");

    // استخراج الملح والبيانات المشفرة
    const salt = encryptedBuffer.slice(0, 32);
    const encrypted = encryptedBuffer.slice(32);

    // اشتقاق المفتاح
    const derivedKey = deriveKeyFromMaster(key, salt);

    // إنشاء decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // تعيين علامة المصادقة
    decipher.setAuthTag(tag);

    // فك التشفير
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // تنظيف المفتاح من الذاكرة
    derivedKey.fill(0);

    return decrypted.toString("utf-8");
  } catch (error) {
    console.error("خطأ في فك التشفير:", error);
    throw new Error(
      `فشل فك تشفير البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
    );
  }
}

// ==========================================
// تشفير إضافي
// ==========================================

/**
 * تشفير باستخدام مفتاح السيد من متغير البيئة
 */
export function encryptWithEnvKey(data: string): EncryptionPayload {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error("ENCRYPTION_MASTER_KEY غير محدد في متغيرات البيئة");
  }
  return encryptSensitiveData(data, masterKey);
}

/**
 * فك التشفير باستخدام مفتاح السيد من متغير البيئة
 */
export function decryptWithEnvKey(payload: EncryptionPayload): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error("ENCRYPTION_MASTER_KEY غير محدد في متغيرات البيئة");
  }
  return decryptSensitiveData(payload, masterKey);
}

// ==========================================
// أدوات أمان إضافية
// ==========================================

/**
// إنشاء توكن آمن
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * هاش كلمة المرور (bcrypt-style)
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * التحقق من كلمة المرور
 */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex") === key);
    });
  });
}

/**
// إنشاء CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const secret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");
  return crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("hex");
}

/**
 * التحقق من CSRF token
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const expected = generateCsrfToken(sessionId);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
// تقييد معدل الطلبات (Rate Limit)
 * نسخة بسيطة باستخدام Map (للإنتاج استخدم Redis)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // إنشاء سجل جديد
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
// تنظيف rate limit map (يُستدعى بشكل دوري)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// ==========================================
// حماية إضافية
// ==========================================

/**
// تعقيم المدخلات (Input Sanitization)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // إزالة HTML tags
    .trim()
    .slice(0, 1000); // حد أقصى 1000 حرف
}

/**
 * التحقق من قوة كلمة المرور
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push("كلمة المرور يجب أن تكون 8 أحرف على الأقل");

  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  else feedback.push("يجب أن تحتوي على حرف كبير");

  if (/[a-z]/.test(password)) score++;
  else feedback.push("يجب أن تحتوي على حرف صغير");

  if (/[0-9]/.test(password)) score++;
  else feedback.push("يجب أن تحتوي على رقم");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push("يجب أن تحتوي على رمز خاص");

  return {
    valid: score >= 4,
    score,
    feedback,
  };
}

export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

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
  return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
}

export function cleanupSecurityData(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  const storageKeys = ["security_audit_logs", "security_events_queue"];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const logs = JSON.parse(raw) as Array<{ timestamp?: number | string }>;
      const filtered = logs.filter((log) => {
        const ts = typeof log.timestamp === "number"
          ? log.timestamp
          : new Date(log.timestamp || 0).getTime();
        return ts > thirtyDaysAgo;
      });
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      // ignore malformed cache entries
    }
  }

  cleanupRateLimitMap();
}
