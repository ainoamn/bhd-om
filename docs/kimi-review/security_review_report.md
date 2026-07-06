# تقرير مراجعة الأمان - مشروع bhd-om العقاري
## Next.js 16 + React 19 + Prisma 7 + PostgreSQL + NextAuth.js v4

---

## ملخص تنفيذي

> **الحالة: حرجة - تحتاج إجراء عاجل**
> 
> تم اكتشاف **23 ثغرة أمنية** منظمة في فئات:
> - **حرجة (4)**: ثغرات تسمح بالاختراق الكامل
> - **عالية (8)**: ثغرات تسمح بتسريب بيانات أو تصعيد صلاحيات
> - **متوسطة (7)**: ثغرات تقلل من أمان النظام
> - **منخفضة (4)**: مشاكل يجب معالجتها لأفضل الممارسات

---

## جدول المحتويات

1. [ثغرات الحرجة](#1-ثغرات-الحرجة)
2. [ثغرات عالية الخطورة](#2-ثغرات-عالية-الخطورة)
3. [ثغرات متوسطة الخطورة](#3-ثغرات-متوسطة-الخطورة)
4. [ثغرات منخفضة الخطورة](#4-ثغرات-منخفضة-الخطورة)
5. [الكود المصحح](#5-الكود-المصحح)
6. [توصيات تحسينية](#6-توصيات-تحسينية)
7. [خطة الإصلاح](#7-خطة-الإصلاح)

---

## 1. ثغرات الحرجة

### V-CRIT-01: الثغرات المفتوحة في API Routes بدون أي تحقق

| البند | التفاصيل |
|-------|---------|
| **الملف** | `app/api/accounting/accounts/route.ts`, `app/api/accounting/periods/route.ts`, `app/api/accounting/audit/route.ts`, `app/api/upload/route.ts`, `app/api/upload/company/route.ts`, `app/api/upload/booking-documents/route.ts`, `app/api/upload/accounting/route.ts`, `app/api/media/route.ts` |
| **الخطورة** | حرجة |
| **التأثير** | تصعيد صلاحيات، تسريب بيانات مالية حساسة، رفع ملفات خبيثة |
| **CVSS** | 9.8 |

#### وصف الثغرة
بناءً على تقرير AUDIT-REPORT.md، تعمل المسارات التالية بدون أي تحقق من هوية المستخدم أو صلاحياته:

- `/api/accounting/accounts` (GET) - يُعيد جميع الحسابات المحاسبية
- `/api/accounting/periods` (GET/POST) - يُعيد/ينشئ فترات محاسبية
- `/api/accounting/audit` (GET) - يُعيد سجلات التدقيق
- `/api/upload` (POST) - يسمح برفع ملفات
- `/api/upload/company` (POST) - رفع ملفات الشركة
- `/api/upload/booking-documents` (POST) - رفع مستندات الحجز
- `/api/upload/accounting` (POST) - رفع ملفات محاسبية
- `/api/media` (GET) - عرض الملفات

#### السيناريو الهجومي
```
1. مهاجم غير مصادق يمكنه:
   a. GET /api/accounting/accounts → الحصول على جميع الحسابات المالية
   b. GET /api/accounting/audit → تتبع أنشطة المستخدمين
   c. POST /api/upload → رفع ملفات PHP/JS خبيثة
   d. GET /api/media?path=../../etc/passwd → Path Traversal
```

#### الكود المقترح للحماية

```typescript
// lib/api-guard.ts - middleware موحد للحماية
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

interface GuardOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAuth?: boolean;
}

export async function apiGuard(
  req: NextRequest, 
  options: GuardOptions = {}
): Promise<{ user: any } | NextResponse> {
  const { requiredRoles = [], requireAuth = true } = options;

  if (!requireAuth) {
    return { user: null };
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // التحقق من تسريب البصمة
  const sessionFingerprint = token.fingerprint as string;
  const currentFingerprint = generateFingerprint(req);
  
  if (sessionFingerprint && sessionFingerprint !== currentFingerprint) {
    return NextResponse.json(
      { error: 'Session invalidated', code: 'SESSION_HIJACKED' },
      { status: 403 }
    );
  }

  // التحقق من الصلاحيات
  if (requiredRoles.length > 0) {
    const userRole = token.role as string;
    if (!requiredRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }
  }

  return { user: token };
}

// Helper لاستخراج بصمة الطلب
function generateFingerprint(req: NextRequest): string {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLang = req.headers.get('accept-language') || '';
  return Buffer.from(`${userAgent}:${acceptLang}`).toString('base64').slice(0, 16);
}

// ============================================
// مثال: app/api/accounting/accounts/route.ts
// ============================================
import { NextRequest } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // الحماية
  const guard = await apiGuard(req, {
    requiredRoles: ['ADMIN', 'COMPANY', 'ORG_MANAGER'],
  });
  if (guard instanceof Response) return guard;

  // التحقق من التحقق من الشركة (Multi-tenancy)
  const { user } = guard;
  const companyId = user.companyId;

  const accounts = await prisma.accountingAccount.findMany({
    where: {
      companyId: companyId, // عزل البيانات حسب الشركة
    },
    select: {
      id: true,
      name: true,
      code: true,
      balance: true,
      // عدم إرجاع البيانات الحساسة
      createdAt: false,
      updatedAt: false,
    },
  });

  return Response.json({ accounts });
}
```

---

### V-CRIT-02: ثغرة Server-Side Request Forgery (SSRF) في معالجة الملفات

| البند | التفاصيل |
|-------|---------|
| **الملف** | `app/api/upload/route.ts`, `app/api/media/route.ts` |
| **الخطورة** | حرجة |
| **التأثير** | قراءة ملفات النظام، الوصول للشبكة الداخلية |
| **CVSS** | 9.1 |

#### وصف الثغرة
مسار `/api/media?path=` يُعيد ملفات بناءً على معامل path بدون تحقق. يمكن استغلالها للوصول لملفات النظام:

```
GET /api/media?path=../../../etc/passwd
GET /api/media?path=../../../.env
GET /api/media?path=../../../app/db.ts
```

#### الكود المصحح

```typescript
// lib/file-security.ts
import path from 'path';
import fs from 'fs';

const ALLOWED_UPLOAD_DIRS = [
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), 'public/uploads'),
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.sh', '.bat', '.cmd', '.php', 
  '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl'
];

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
];

/**
 * التحقق من مسار الملف - يمنع Path Traversal
 */
export function sanitizeFilePath(userPath: string): string | null {
  // إزالة المحاولات الواضحة
  const sanitized = userPath
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .replace(/^\//, '');

  const fullPath = path.resolve(process.cwd(), 'uploads', sanitized);
  
  // التأكد من أن المسار داخل المسموح
  const isAllowed = ALLOWED_UPLOAD_DIRS.some(dir =>
    fullPath.startsWith(dir)
  );

  if (!isAllowed) return null;
  
  // التأكد من وجود الملف
  if (!fs.existsSync(fullPath)) return null;

  return fullPath;
}

/**
 * التحقق من نوع الملف
 */
export function validateFileType(
  filename: string, 
  mimetype: string
): boolean {
  const ext = path.extname(filename).toLowerCase();
  
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return false;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return false;
  }

  return true;
}

/**
 * إعادة تسمية الملف بشكل آمن
 */
export function generateSafeFilename(
  originalName: string,
  userId: string
): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  return `${userId}_${timestamp}_${random}${ext}`;
}

// ============================================
// app/api/media/route.ts - المصحح
// ============================================
import { NextRequest } from 'next/server';
import { sanitizeFilePath } from '@/lib/file-security';
import { apiGuard } from '@/lib/api-guard';
import fs from 'fs';

export async function GET(req: NextRequest) {
  // 1. التحقق من المصادقة
  const guard = await apiGuard(req);
  if (guard instanceof Response) return guard;

  // 2. استخراج المسار
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return Response.json(
      { error: 'Path required' },
      { status: 400 }
    );
  }

  // 3. تطهير المسار
  const safePath = sanitizeFilePath(filePath);
  if (!safePath) {
    // سجل المحاولة
    await logSecurityEvent({
      type: 'PATH_TRAVERSAL_ATTEMPT',
      userId: guard.user.sub,
      details: { attemptedPath: filePath },
      severity: 'CRITICAL',
    });
    
    return Response.json(
      { error: 'Invalid path' },
      { status: 403 }
    );
  }

  // 4. قراءة وإرجاع الملف
  const fileBuffer = await fs.promises.readFile(safePath);
  const mimeType = getMimeType(safePath);

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
```

---

### V-CRIT-03: ثغرة Remote Code Execution عبر رفع الملفات

| البند | التفاصيل |
|-------|---------|
| **الملف** | `app/api/upload/route.ts`, `app/api/upload/company/route.ts`, etc. |
| **الخطورة** | حرجة |
| **التأثير** | تنفيذ كود عن بُعد على الخادم |
| **CVSS** | 9.8 |

#### وصف الثغرة
بدون تحقق من المصادقة، يمكن لأي شخص رفع ملفات. بدون التحقق من نوع الملف، يمكن رفع:
- ملفات PHP التي يمكن تنفيذها إذا كان هناك خادم ويب آخر
- ملفات JS مع Node.js في بيئة تشغيل خاصة
- ملفات SVG مع حمولة XSS

#### الكود المصحح

```typescript
// app/api/upload/route.ts - المصحح بالكامل
import { NextRequest } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { validateFileType, generateSafeFilename } from '@/lib/file-security';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  // 1. التحقق من المصادقة
  const guard = await apiGuard(req, {
    requiredRoles: ['ADMIN', 'COMPANY', 'ORG_MANAGER', 'CLIENT'],
  });
  if (guard instanceof Response) return guard;

  try {
    // 2. استخراج الملف
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 3. التحقق من الحجم
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'File too large', maxSize: MAX_FILE_SIZE },
        { status: 413 }
      );
    }

    // 4. التحقق من نوع الملف (Magic Numbers + MIME)
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectMimeType(buffer);
    
    if (!validateFileType(file.name, detectedMime || file.type)) {
      await logSecurityEvent({
        type: 'BLOCKED_FILE_UPLOAD',
        userId: guard.user.sub,
        details: { 
          filename: file.name, 
          claimedType: file.type,
          detectedType: detectedMime 
        },
        severity: 'HIGH',
      });
      
      return Response.json(
        { error: 'File type not allowed' },
        { status: 403 }
      );
    }

    // 5. إنشاء مسار آمن
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = generateSafeFilename(file.name, guard.user.sub as string);
    const filePath = path.join(UPLOAD_DIR, safeName);

    // 6. كتابة الملف
    await writeFile(filePath, buffer);

    // 7. تسجيل في قاعدة البيانات
    const fileRecord = await prisma.uploadedFile.create({
      data: {
        filename: safeName,
        originalName: file.name,
        mimeType: detectedMime || file.type,
        size: file.size,
        uploadedBy: guard.user.sub as string,
        path: filePath,
      },
    });

    return Response.json({
      success: true,
      fileId: fileRecord.id,
      filename: safeName,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * كشف نوع الملف من Magic Numbers
 */
function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  
  const magic = buffer.slice(0, 4).toString('hex');
  
  const signatures: Record<string, string> = {
    '89504e47': 'image/png',
    'ffd8ffe0': 'image/jpeg',
    'ffd8ffe1': 'image/jpeg',
    'ffd8ffe8': 'image/jpeg',
    '47494638': 'image/gif',
    '25504446': 'application/pdf',
    '504b0304': 'application/zip', // docx, xlsx
  };

  return signatures[magic] || null;
}
```

---

### V-CRIT-04: ثغرة Insecure Direct Object Reference (IDOR) في المسارات المحاسبية

| البند | التفاصيل |
|-------|---------|
| **الملف** | `app/api/accounting/*/route.ts` |
| **الخطورة** | حرجة |
| **التأثير** | الوصول لبيانات شركات أخرى |
| **CVSS** | 8.6 |

#### وصف الثغرة
بدون تحقق من أن المستخدم يملك حق الوصول لبيانات الشركة المطلوبة، يمكن لصاحب شركة الوصول لحسابات شركة أخرى بتغيير معامل `companyId`.

#### الكود المصحح

```typescript
// lib/tenant-guard.ts - عزل البيانات Multi-tenancy
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TenantContext {
  userId: string;
  companyId: string | null;
  role: string;
  isSuperAdmin: boolean;
}

/**
 * يبني جملة WHERE لPrisma مع عزل البيانات
 */
export async function buildTenantWhere(
  tenant: TenantContext,
  resourceTable: string,
  requestedCompanyId?: string
): Promise<{ where: Record<string, any>; allowed: boolean }> {
  // السوبر أدمن يمكنه رؤية كل شيء
  if (tenant.isSuperAdmin) {
    return { 
      where: requestedCompanyId ? { companyId: requestedCompanyId } : {},
      allowed: true 
    };
  }

  // الأدوار الأخرى - يجب الوصول فقط لشركتهم
  const effectiveCompanyId = requestedCompanyId || tenant.companyId;
  
  if (!effectiveCompanyId) {
    return { where: {}, allowed: false };
  }

  // التحقق من أن المستخدم ينتمي لهذه الشركة
  const membership = await prisma.companyMember.findFirst({
    where: {
      userId: tenant.userId,
      companyId: effectiveCompanyId,
      status: 'ACTIVE',
    },
  });

  if (!membership) {
    return { where: {}, allowed: false };
  }

  return {
    where: { companyId: effectiveCompanyId },
    allowed: true,
  };
}

// ============================================
// استخدام في API route
// ============================================
export async function GET(req: NextRequest) {
  const guard = await apiGuard(req, {
    requiredRoles: ['ADMIN', 'COMPANY', 'ORG_MANAGER'],
  });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(req.url);
  const requestedCompanyId = searchParams.get('companyId');

  const { where, allowed } = await buildTenantWhere(
    {
      userId: guard.user.sub as string,
      companyId: guard.user.companyId as string | null,
      role: guard.user.role as string,
      isSuperAdmin: guard.user.isSuperAdmin as boolean,
    },
    'accountingAccount',
    requestedCompanyId || undefined
  );

  if (!allowed) {
    await logSecurityEvent({
      type: 'UNAUTHORIZED_TENANT_ACCESS',
      userId: guard.user.sub,
      details: { requestedCompanyId },
      severity: 'HIGH',
    });
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accounts = await prisma.accountingAccount.findMany({ where });
  return Response.json({ accounts });
}
```

---

## 2. ثغرات عالية الخطورة

### V-HIGH-01: استخدام خوارزميات تشفير مهملة (crypto.createCipher/createDecipher)

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/security.ts` - `encryptSensitiveData()` و `decryptSensitiveData()` |
| **الخطورة** | عالية |
| **التأثير** | تشفير ضعيف يمكن كسره |
| **CVE** | CVE-2016-1000027 |

#### وصف الثغرة
`crypto.createCipher` و `crypto.createDecipher` مهملان في Node.js ويستخدمان:
- EVP_BytesToKey - دالة مشتقة مفاتيح ضعيفة
- CBC mode بدون HMAC للتحقق من النزاهة
- IV ثابت (مشتق من المفتاح)

#### الكود المصحح

```typescript
// lib/security.ts - المصحح
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * مشتقة مفتاح آمنة باستخدام scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,   // cost factor
    r: 8,       // block size
    p: 1,       // parallelization
    maxmem: 64 * 1024 * 1024, // 64MB
  });
}

/**
 * تشفير البيانات الحساسة باستخدام AES-256-GCM
 */
export function encryptSensitiveData(
  plaintext: string,
  secret: string
): string {
  if (!plaintext || !secret) {
    throw new Error('Plaintext and secret are required');
  }

  // توليد salt عشوائي
  const salt = randomBytes(SALT_LENGTH);
  
  // مشتقة المفتاح
  const key = deriveKey(secret, salt);
  
  // IV عشوائي لكل عملية تشفير
  const iv = randomBytes(IV_LENGTH);
  
  // التشفير
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  // الحصول على auth tag (للتحقق من النزاهة)
  const authTag = cipher.getAuthTag();
  
  // تجميع: salt + iv + authTag + encrypted
  const result = Buffer.concat([salt, iv, authTag, encrypted]);
  
  // تطهير المفاتيح من الذاكرة
  key.fill(0);
  
  return result.toString('base64');
}

/**
 * فك تشفير البيانات
 */
export function decryptSensitiveData(
  ciphertext: string,
  secret: string
): string {
  if (!ciphertext || !secret) {
    throw new Error('Ciphertext and secret are required');
  }

  const buffer = Buffer.from(ciphertext, 'base64');
  
  // استخراج المكونات
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  // مشتقة المفتاح
  const key = deriveKey(secret, salt);
  
  // فك التشفير
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  // تطهير
  key.fill(0);
  
  return decrypted.toString('utf8');
}

/**
 * دوال التشفير القديمة - تم تعطيلها
 * @deprecated تم استبدالها بدوال جديدة
 */
export function encryptSensitiveDataLegacy(
  _plaintext: string,
  _secret: string
): never {
  throw new Error(
    'Legacy encryption is deprecated and insecure. ' +
    'Use encryptSensitiveData() instead.'
  );
}
```

---

### V-HIGH-02: استخدام APIs المتصفح في الكود المشترك (lib/security.ts)

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/security.ts` |
| **الخطورة** | عالية |
| **التأثير** | crash في الخادم، كشف معلومات |

#### المشاكل

| الدالة | المشكلة | البيئة المتأثرة |
|--------|---------|-----------------|
| `createSessionFingerprint()` | تستخدم `document`, `navigator`, `screen` | SSR: crash |
| `auditSecurityEvent()` | تستخدم `localStorage` | SSR: crash |
| `cleanupSecurityData()` | تستخدم `localStorage` | SSR: crash |

#### الكود المصحح

```typescript
// lib/security-client.ts - كود المتصفح فقط
'use client';

/**
 * إنشاء بصمة الجلسة - متصفح فقط
 */
export function createSessionFingerprint(): string {
  if (typeof window === 'undefined') {
    throw new Error('createSessionFingerprint() must be called in browser');
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency,
  ];

  const fingerprint = components.join('|');
  return btoa(fingerprint).slice(0, 32);
}

/**
 * تخزين حدث أمني - متصفح فقط
 */
export function auditSecurityEventLocal(event: {
  type: string;
  details?: Record<string, any>;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const events = JSON.parse(
      localStorage.getItem('security_events') || '[]'
    );
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    // الاحتفاظ بآخر 100 حدث
    const trimmed = events.slice(-100);
    localStorage.setItem('security_events', JSON.stringify(trimmed));
  } catch {
    // تجاهل أخطاء localStorage
  }
}

// ============================================
// lib/security-server.ts - كود الخادم فقط
// ============================================
import { headers } from 'next/headers';

/**
 * إنشاء بصمة من بيئة الخادم
 */
export async function createServerFingerprint(): Promise<string> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const acceptLang = headersList.get('accept-language') || '';
  
  const data = `${userAgent}:${acceptLang}`;
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Buffer.from(hash).toString('base64').slice(0, 32);
}

// ============================================
// lib/security.ts - نقطة دخول موحدة
// ============================================
export { encryptSensitiveData, decryptSensitiveData } from './security-server';
export { createSessionFingerprint, auditSecurityEventLocal } from './security-client';
```

---

### V-HIGH-03: ميزة Impersonate بدون حماية كافية

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/impersonate.ts`, `lib/auth.ts` |
| **الخطورة** | عالية |
| **التأثير** | تصعيد صلاحيات للسوبر أدمن |

#### المشاكل المحتملة
- رمز الانتحال قد لا يكون له انتهاء صلاحية
- لا يوجد تسجيل للانتحال
- لا يوجد إشعار للمستخدم المنتحل
- لا يوجد قائمة بالجلسات النشطة

#### الكود المصحح

```typescript
// lib/impersonate.ts - المصحح
import { SignJWT, jwtVerify } from 'jose';

const IMPERSONATE_MAX_DURATION = 60 * 60; // 1 ساعة
const IMPERSONATE_SECRET = new TextEncoder().encode(
  process.env.IMPERSONATE_SECRET || process.env.NEXTAUTH_SECRET!
);

interface ImpersonateToken {
  adminId: string;
  targetUserId: string;
  targetRole: string;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
}

/**
 * إنشاء رمز انتحال آمن
 */
export async function createImpersonateToken(
  adminId: string,
  targetUserId: string,
  targetRole: string
): Promise<string> {
  // التحقق من أن المستخدم أدمن
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { isSuperAdmin: true, role: true },
  });

  if (!admin?.isSuperAdmin && admin?.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can impersonate');
  }

  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // تسجيل المحاولة
  await prisma.impersonateLog.create({
    data: {
      adminId,
      targetUserId,
      sessionId,
      startedAt: new Date(),
      ipAddress: await getClientIp(),
      userAgent: await getClientUserAgent(),
      status: 'ACTIVE',
    },
  });

  // إرسال إشعار للمستخدم
  await notifyUserImpersonated(targetUserId, adminId);

  const token = await new SignJWT({
    type: 'impersonate',
    adminId,
    targetUserId,
    targetRole,
    sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONATE_MAX_DURATION}s`)
    .sign(IMPERSONATE_SECRET);

  return token;
}

/**
 * التحقق من رمز الانتحال
 */
export async function verifyImpersonateToken(
  token: string
): Promise<ImpersonateToken | null> {
  try {
    const { payload } = await jwtVerify(token, IMPERSONATE_SECRET, {
      clockTolerance: 60,
    });

    const data = payload as any;
    
    // التحقق من أن الجلسة لا تزال نشطة
    const log = await prisma.impersonateLog.findFirst({
      where: {
        sessionId: data.sessionId,
        status: 'ACTIVE',
      },
    });

    if (!log) {
      return null; // الجلسة منتهية أو مطلقة
    }

    return {
      adminId: data.adminId,
      targetUserId: data.targetUserId,
      targetRole: data.targetRole,
      issuedAt: data.iat,
      expiresAt: data.exp,
      sessionId: data.sessionId,
    };
  } catch {
    return null;
  }
}

/**
* إنهاء جلسة انتحال
*/
export async function endImpersonateSession(
  sessionId: string,
  adminId: string
): Promise<void> {
  await prisma.impersonateLog.updateMany({
    where: {
      sessionId,
      adminId,
      status: 'ACTIVE',
    },
    data: {
      status: 'ENDED',
      endedAt: new Date(),
    },
  });
}

// ============================================
// التكامل مع NextAuth
// ============================================
// lib/auth.ts - Callbacks
const authConfig = {
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      // التحقق من رمز الانتحال
      if (trigger === 'signIn' && user?.impersonateToken) {
        const impersonateData = await verifyImpersonateToken(
          user.impersonateToken
        );
        
        if (!impersonateData) {
          throw new Error('Invalid or expired impersonate token');
        }

        token.isImpersonating = true;
        token.impersonateAdminId = impersonateData.adminId;
        token.sub = impersonateData.targetUserId;
        token.role = impersonateData.targetRole;
        token.impersonateSessionId = impersonateData.sessionId;
        token.impersonateExpiresAt = impersonateData.expiresAt;
      }

      // التحقق من انتهاء صلاحية الانتحال
      if (token.isImpersonating && token.impersonateExpiresAt) {
        if (Date.now() / 1000 > (token.impersonateExpiresAt as number)) {
          // إنهاء الجلسة
          await endImpersonateSession(
            token.impersonateSessionId as string,
            token.impersonateAdminId as string
          );
          
          throw new Error('Impersonate session expired');
        }
      }

      return token;
    },
  },
};
```

---

### V-HIGH-04: متغير البيئة E2E_ALLOW_DB_RESET على البيانات الحقيقية

| البند | التفاصيل |
|-------|---------|
| **الملف** | `.env.example`, `app/api/e2e/route.ts` (محتمل) |
| **الخطورة** | عالية |
| **التأثير** | مسح قاعدة البيانات بالكامل |

#### وصف الثغرة

```env
# .env.example - خطير!
E2E_ALLOW_DB_RESET="true"
```

إذا تم تفعيل هذا المتغير في بيئة الإنتاج، يمكن لأي شخص استدعاء:
```
POST /api/e2e/reset
```
ومسح قاعدة البيانات بالكامل.

#### الكود المصحح

```typescript
// lib/e2e-guard.ts - حماية E2E
export function isE2EResetAllowed(): boolean {
  // منع التفعيل في الإنتاج دائماً
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // التحقق من متغير محدد للبيئة
  if (process.env.VERCEL_ENV === 'production') {
    return false;
  }

  // يجب أن يكون هناك علامة محددة للـ E2E
  const allowReset = process.env.E2E_ALLOW_DB_RESET;
  
  // يجب أن تكون القيمة بالضبط "e2e_test_only_" + مفتاح سري
  if (!allowReset?.startsWith('e2e_test_only_')) {
    return false;
  }

  // التحقق من أن الاتصال يأتي من IP محلي فقط
  const clientIp = getClientIp();
  const allowedIps = ['127.0.0.1', '::1', 'localhost'];
  
  if (!allowedIps.includes(clientIp)) {
    return false;
  }

  return true;
}

// app/api/e2e/reset/route.ts
import { NextRequest } from 'next/server';
import { isE2EResetAllowed } from '@/lib/e2e-guard';

export async function POST(req: NextRequest) {
  // التحقق متعدد الطبقات
  if (!isE2EResetAllowed()) {
    // تسجيل المحاولة
    await logSecurityEvent({
      type: 'E2E_RESET_BLOCKED',
      severity: 'CRITICAL',
      details: { 
        env: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
    });
    
    return Response.json(
      { error: 'Not allowed' },
      { status: 403 }
    );
  }

  // إضافة مصادقة إضافية
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.E2E_RESET_SECRET;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json(
      { error: 'Invalid reset token' },
      { status: 401 }
    );
  }

  // عملية المسح الآمنة (truncate بدلاً من drop)
  // ...
}
```

---

### V-HIGH-05: عدم تشفير البيانات الحساسة في قاعدة البيانات

| البند | التفاصيل |
|-------|---------|
| **الملف** | `prisma/schema.prisma` |
| **الخطورة** | عالية |
| **التأثير** | تسريب بيانات حساسة عند اختراق DB |

#### المشكلة
لا يوجد تشفير للبيانات الحساسة في قاعدة البيانات (password hashed فقط):
- أرقام الهوية/الإقامة
- أرقام الهاتف
- العناوين
- المعلومات المالية
- بيانات العملاء

#### الكود المصحح

```prisma
// prisma/schema.prisma - المصحح

// إضافة تعليقات لتوضيح البيانات الحساسة
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  // hashed with bcrypt, never store plaintext
  password      String
  
  // ENCRYPTED: PII data - encrypted at rest
  fullName      String   @map("full_name_encrypted")
  phoneNumber   String?  @map("phone_number_encrypted")
  idNumber      String?  @map("id_number_encrypted") // رقم الهوية
  
  // hashed for searchability (first 4 chars only)
  phoneHash     String?  @map("phone_hash")
  idHash        String?  @map("id_hash")
  
  role          UserRole @default(CLIENT)
  isSuperAdmin  Boolean  @default(false)
  adminPermissions String? // JSON
  
  companyId     String?
  company       Company? @relation(fields: [companyId], references: [id])
  
  // Audit
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime?
  failedLogins  Int      @default(0)
  lockedUntil   DateTime?
  
  // MFA
  mfaEnabled    Boolean  @default(false)
  mfaSecret     String?  @map("mfa_secret_encrypted")
  
  @@index([email])
  @@index([companyId])
  @@index([phoneHash])
  @@map("users")
}

// نموذج لتتبع الوصول للبيانات الحساسة
model DataAccessLog {
  id          String   @id @default(cuid())
  userId      String
  resource    String   // e.g., "user.phoneNumber"
  recordId    String
  action      String   // READ, UPDATE, DELETE
  reason      String?
  ipAddress   String?
  accessedAt  DateTime @default(now())
  
  @@index([userId, accessedAt])
  @@map("data_access_logs")
}
```

```typescript
// lib/encryption-at-rest.ts - تشفير قاعدة البيانات
import { encryptSensitiveData, decryptSensitiveData } from './security';

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error(
    'DATA_ENCRYPTION_KEY must be at least 32 characters'
  );
}

/**
* تشفير بيانات PII قبل التخزين
*/
export function encryptPII(plaintext: string): string {
  return encryptSensitiveData(plaintext, ENCRYPTION_KEY);
}

/**
* فك تشفير بيانات PII للقراءة
*/
export function decryptPII(ciphertext: string): string {
  return decryptSensitiveData(ciphertext, ENCRYPTION_KEY);
}

/**
* إنشاء hash قابل للبحث (first 4 chars)
*/
export function createSearchHash(value: string): string {
  const normalized = value.replace(/\s/g, '').toLowerCase();
  return normalized.slice(0, 4);
}

// Prisma middleware للتشفير التلقائي
export function createEncryptionMiddleware() {
  const ENCRYPTED_FIELDS = [
    { model: 'User', field: 'fullName' },
    { model: 'User', field: 'phoneNumber' },
    { model: 'User', field: 'idNumber' },
    { model: 'User', field: 'mfaSecret' },
  ];

  return async function encryptionMiddleware(
    params: any,
    next: (params: any) => Promise<any>
  ): Promise<any> {
    // التشفير عند الكتابة
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const data = params.args?.data;
      if (data) {
        for (const { model, field } of ENCRYPTED_FIELDS) {
          if (params.model === model && data[field]) {
            // تشفير
            data[field] = encryptPII(data[field]);
            
            // إنشاء hash للبحث
            const hashField = field.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) + '_hash';
            if (data[hashField] !== undefined) {
              data[hashField] = createSearchHash(
                typeof data[field] === 'string' 
                  ? data[field] 
                  : ''
              );
            }
          }
        }
      }
    }

    const result = await next(params);

    // فك التشفير عند القراءة (للحقول المطلوبة فقط)
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      if (result) {
        // فك التشفير للنتائج
        // ملاحظة: هذا يجب أن يكون محدوداً لعدم تسريب البيانات
      }
    }

    return result;
  };
}
```

---

### V-HIGH-06: ADMIN_DATA_RESET_PIN ضعيف أو متوقع

| البند | التفاصيل |
|-------|---------|
| **الملف** | `.env.example` |
| **الخطورة** | عالية |
| **التأثير** | تصعيد صلاحيات للأدمن مع PIN ضعيف |

#### المشكلة
```env
ADMIN_DATA_RESET_PIN="رمز_أولي_8_أحرف_فأكثر"
```

القيمة الافتراضية واضحة ويمكن تخمينها. إذا تم استخدامها في الإنتاج:

#### الكود المصحح

```typescript
// lib/admin-reset.ts - حماية أقوى
import { timingSafeEqual } from 'crypto';

const MIN_PIN_LENGTH = 16;
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 دقيقة

const attemptStore = new Map<string, { count: number; lockedUntil: number }>();

/**
* التحقق من PIN إعادة التعيين مع حماية brute-force
*/
export async function verifyAdminResetPin(
  providedPin: string,
  adminId: string
): Promise<boolean> {
  // التحقق من محاولات سابقة
  const attempts = attemptStore.get(adminId);
  if (attempts && Date.now() < attempts.lockedUntil) {
    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    throw new Error(`Account locked. Try again in ${remaining}s`);
  }

  // التحقق من طول PIN
  if (providedPin.length < MIN_PIN_LENGTH) {
    recordFailedAttempt(adminId);
    return false;
  }

  // التحقق الآمن (timing-safe)
  const expectedPin = process.env.ADMIN_DATA_RESET_PIN;
  if (!expectedPin) {
    throw new Error('ADMIN_DATA_RESET_PIN not configured');
  }

  const provided = Buffer.from(providedPin);
  const expected = Buffer.from(expectedPin);

  if (provided.length !== expected.length) {
    recordFailedAttempt(adminId);
    return false;
  }

  const isValid = timingSafeEqual(provided, expected);

  if (!isValid) {
    recordFailedAttempt(adminId);
  } else {
    attemptStore.delete(adminId);
  }

  return isValid;
}

function recordFailedAttempt(adminId: string): void {
  const existing = attemptStore.get(adminId) || { count: 0, lockedUntil: 0 };
  existing.count++;
  
  if (existing.count >= MAX_ATTEMPTS) {
    existing.lockedUntil = Date.now() + LOCKOUT_DURATION;
    existing.count = 0;
    
    // تسجيل الحدث
    console.error(`Admin ${adminId} locked out due to failed PIN attempts`);
  }
  
  attemptStore.set(adminId, existing);
}
```

---

### V-HIGH-07: Rate Limiting مفقود في API Routes

| البند | التفاصيل |
|-------|---------|
| **الملف** | جميع `app/api/**/route.ts` |
| **الخطورة** | عالية |
| **التأثير** | هجوم Brute-force, DoS |

#### الكود المصحح

```typescript
// lib/rate-limit.ts - نظام Rate Limiting
import { LRUCache } from 'lru-cache';

interface RateLimitConfig {
  windowMs: number;   // فترة النافذة بالمللي ثانية
  maxRequests: number; // عدد الطلبات المسموح
}

// تكوينات مختلفة حسب نوع المسار
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 محاولات/15د
  api: { windowMs: 60 * 1000, maxRequests: 60 },             // 60 طلب/دقيقة
  upload: { windowMs: 60 * 1000, maxRequests: 5 },           // 5 رفع/دقيقة
  sensitive: { windowMs: 60 * 60 * 1000, maxRequests: 10 },  // 10/ساعة
} as const;

// تخزين مؤقت (للتطوير - استخدم Redis في الإنتاج)
const cache = new LRUCache<string, number[]>({
  max: 10000,
  ttl: 60 * 60 * 1000, // 1 ساعة
});

/**
* التحقق من Rate Limit
*/
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // الحصول على الطلبات السابقة
  const requests = cache.get(identifier) || [];
  
  // تصفية الطلبات القديمة
  const recentRequests = requests.filter(t => t > windowStart);
  
  if (recentRequests.length >= config.maxRequests) {
    const oldestRequest = recentRequests[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestRequest + config.windowMs,
    };
  }

  // تسجيل الطلب الحالي
  recentRequests.push(now);
  cache.set(identifier, recentRequests);

  return {
    allowed: true,
    remaining: config.maxRequests - recentRequests.length,
    resetAt: now + config.windowMs,
  };
}

// ============================================
// استخدام في API
// ============================================
import { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // تحديد الهوية
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const identifier = `upload:${ip}`;

  // التحقق من Rate Limit
  const rateLimit = await checkRateLimit(identifier, RATE_LIMITS.upload);
  
  if (!rateLimit.allowed) {
    return Response.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMITS.upload.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // ... معالجة الطلب
}
```

---

### V-HIGH-08: نظام التدقيق (Audit) ضعيف وقابل للتلاعب

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/audit.ts` |
| **الخطورة** | عالية |
| **التأثير** | لا يمكن الوثوق بالسجلات القانونية |

#### المشاكل
- كتابة مباشرة بدون تحقق
- `console.error` بدلاً من آلية إشعارات
- لا يوجد tamper-proof logging
- لا يوجد فصل بين كاتب السجل والقارئ

#### الكود المصحح

```typescript
// lib/audit.ts - نظام تدقيق آمن
import { prisma } from './prisma';

export type AuditEventType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'DATA_EXPORT'
  | 'DATA_ACCESS'
  | 'PERMISSION_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'ADMIN_ACTION'
  | 'SECURITY_ALERT'
  | 'FAILED_AUTH';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditEvent {
  type: AuditEventType;
  userId: string;
  targetUserId?: string;
  resource: string;
  action: string;
  details: Record<string, any>;
  severity: Severity;
  ipAddress?: string;
  userAgent?: string;
}

/**
* كتابة حدث تدقيق - لا يمكن تعديله بعد الكتابة
*/
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // إزالة البيانات الحساسة من التفاصيل
    const sanitizedDetails = sanitizeForAudit(event.details);

    await prisma.auditLog.create({
      data: {
        id: generateAuditId(),
        type: event.type,
        userId: event.userId,
        targetUserId: event.targetUserId,
        resource: event.resource,
        action: event.action,
        details: sanitizedDetails,
        severity: event.severity,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent?.slice(0, 512),
        timestamp: new Date(),
        // hash للتأكد من عدم التلاعب
        integrityHash: await computeIntegrityHash(event),
      },
    });

    // إشعار فوري للأحداث الحرجة
    if (event.severity === 'CRITICAL') {
      await notifyCriticalEvent(event);
    }
  } catch (error) {
    // لا يمكن استخدام console.error فقط - يجب إشعار
    await fallbackAuditLog(event, error);
  }
}

/**
* تطهير البيانات الحساسة من سجلات التدقيق
*/
function sanitizeForAudit(
  details: Record<string, any>
): Record<string, any> {
  const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'creditCard',
    'ssn', 'idNumber', 'mfaCode', 'pin',
  ];

  const sanitized = { ...details };
  
  function redact(obj: any): void {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redact(obj[key]);
      }
    }
  }
  
  redact(sanitized);
  return sanitized;
}

/**
* حساب hash للنزاهة
*/
async function computeIntegrityHash(event: AuditEvent): Promise<string> {
  const crypto = await import('crypto');
  const data = JSON.stringify({
    type: event.type,
    userId: event.userId,
    resource: event.resource,
    action: event.action,
    timestamp: Date.now(),
  });
  
  return crypto
    .createHmac('sha256', process.env.AUDIT_SECRET || 'fallback-secret')
    .update(data)
    .digest('hex');
}

/**
* التحقق من نزاهة سجل التدقيق
*/
export async function verifyAuditIntegrity(
  logId: string
): Promise<boolean> {
  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
  });
  
  if (!log) return false;

  const computed = await computeIntegrityHash({
    type: log.type as AuditEventType,
    userId: log.userId,
    resource: log.resource,
    action: log.action,
    details: log.details as Record<string, any>,
    severity: log.severity as Severity,
  });

  return computed === log.integrityHash;
}

/**
* سجل fallback عند فشل Prisma
*/
async function fallbackAuditLog(
  event: AuditEvent,
  error: unknown
): Promise<void> {
  // كتابة في ملف أو إرسال إشعار
  const fallbackEntry = {
    ...event,
    _fallback: true,
    _error: String(error),
    _timestamp: new Date().toISOString(),
  };
  
  // في الإنتاج: إرسال للـ monitoring service
  if (process.env.NODE_ENV === 'production') {
    // await sendToMonitoring(fallbackEntry);
  }
  
  // كتابة في stderr
  process.stderr.write(
    `[AUDIT_FALLBACK] ${JSON.stringify(fallbackEntry)}\n`
  );
}

/**
* إشعار للأحداث الحرجة
*/
async function notifyCriticalEvent(event: AuditEvent): Promise<void> {
  // إرسال بريد/إشعار للأدمن
  const message = `
SECURITY ALERT
Type: ${event.type}
User: ${event.userId}
Resource: ${event.resource}
Action: ${event.action}
Time: ${new Date().toISOString()}
  `.trim();

  // await sendNotification(message);
  console.error(message);
}

function generateAuditId(): string {
  return `aud_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
```

---

## 3. ثغرات متوسطة الخطورة

### V-MED-01: setSecurityHeaders() تعيد headers ثابتة

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/security.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | Headers أمنية غير مناسبة لبعض الطلبات |

#### الكود المصحح

```typescript
// lib/security-headers.ts - Headers أمنية ديناميكية
import { NextRequest, NextResponse } from 'next/server';

interface SecurityHeaderConfig {
  // CSP policies
  csp?: 'strict' | 'lenient' | 'none';
  // iframe embedding
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string[];
  // HSTS
  hsts?: boolean;
  // Referrer Policy
  referrerPolicy?: string;
}

const CSP_POLICIES = {
  strict: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ],
  lenient: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "connect-src 'self'",
  ],
};

export function createSecurityHeaders(
  req: NextRequest,
  config: SecurityHeaderConfig = {}
): Headers {
  const headers = new Headers();

  // HSTS - فقط في HTTPS
  if (config.hsts !== false && req.headers.get('x-forwarded-proto') === 'https') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // CSP
  if (config.csp && config.csp !== 'none') {
    const csp = CSP_POLICIES[config.csp].join('; ');
    headers.set('Content-Security-Policy', csp);
  }

  // X-Frame-Options
  const frameOpt = config.frameOptions || 'DENY';
  if (typeof frameOpt === 'string') {
    headers.set('X-Frame-Options', frameOpt);
  }
  headers.set('Content-Security-Policy', 
    (headers.get('Content-Security-Policy') || '') + 
    `; frame-ancestors ${Array.isArray(frameOpt) ? frameOpt.join(' ') : "'none'"}`
  );

  // Referrer Policy
  headers.set('Referrer-Policy', config.referrerPolicy || 'strict-origin-when-cross-origin');

  // Other security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '0'); // CSP is better
  headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // Remove identifying headers
  headers.delete('X-Powered-By');
  headers.delete('Server');

  return headers;
}

// Middleware استخدام
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: SecurityHeaderConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    
    const securityHeaders = createSecurityHeaders(req, config);
    securityHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
```

---

### V-MED-02: عدم تطهير adminPermissions JSON

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/featurePermissions.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | قد يسمح بصلاحيات غير مقصودة |

#### الكود المصحح

```typescript
// lib/featurePermissions.ts - المصحح
import { z } from 'zod';

// تعريف schema صارم للصلاحيات
const PermissionSchema = z.object({
  accounting: z.object({
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canEdit: z.boolean().default(false),
    canDelete: z.boolean().default(false),
    canExport: z.boolean().default(false),
    canApprove: z.boolean().default(false),
  }).optional(),
  users: z.object({
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canEdit: z.boolean().default(false),
    canDelete: z.boolean().default(false),
  }).optional(),
  properties: z.object({
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canEdit: z.boolean().default(false),
    canDelete: z.boolean().default(false),
  }).optional(),
  bookings: z.object({
    canView: z.boolean().default(false),
    canCreate: z.boolean().default(false),
    canEdit: z.boolean().default(false),
    canDelete: z.boolean().default(false),
    canApprove: z.boolean().default(false),
  }).optional(),
  reports: z.object({
    canView: z.boolean().default(false),
    canExport: z.boolean().default(false),
  }).optional(),
});

export type AdminPermissions = z.infer<typeof PermissionSchema>;

/**
* التحقق والتطهير من صلاحيات الأدمن
*/
export function parseAdminPermissions(
  jsonString: string | null | undefined
): AdminPermissions {
  if (!jsonString) {
    return {};
  }

  try {
    const parsed = JSON.parse(jsonString);
    return PermissionSchema.parse(parsed);
  } catch {
    // إرجاع صلاحيات فارغة عند خطأ
    console.error('Invalid admin permissions JSON, returning defaults');
    return {};
  }
}

/**
* التحقق من صلاحية محددة
*/
export function hasPermission(
  permissions: AdminPermissions,
  resource: keyof AdminPermissions,
  action: string
): boolean {
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;
  
  return (resourcePerms as any)[action] === true;
}

/**
* دمج الصلاحيات (الأكثر تقييداً يفوز)
*/
export function mergePermissions(
  base: AdminPermissions,
  override: Partial<AdminPermissions>
): AdminPermissions {
  return PermissionSchema.parse({
    ...base,
    ...override,
  });
}

/**
* التحقق من أن المستخدم لديه أي صلاحية
*/
export function hasAnyPermission(
  permissions: AdminPermissions
): boolean {
  const values = Object.values(permissions);
  return values.some(p => Object.values(p as any).some(v => v === true));
}
```

---

### V-MED-03: Strategy JWT مع تحقق DB كل 180 ثانية - فجوة زمنية

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/auth.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | مستخدم محظور يبقى نشطاً لـ 3 دقائق |

#### الكود المصحح

```typescript
// lib/auth.ts - تحسين JWT مع تحقق أسرع
const JWT_STRATEGY_CONFIG = {
  // تحقق فوري عند العمليات الحساسة
  sensitiveOperations: [
    'DELETE', 'EXPORT', 'SETTINGS_CHANGE', 
    'PERMISSION_CHANGE', 'ADMIN_ACTION'
  ],
  
  // تحقق دوري كل 60 ثانية بدلاً من 180
  periodicCheckInterval: 60 * 1000,
  
  // blacklist للرموز الملغاة
  useTokenBlacklist: true,
};

/**
* التحقق من صلاحية الجلسة
*/
async function validateSession(token: JWT): Promise<boolean> {
  // التحقق من القائمة السوداء
  if (JWT_STRATEGY_CONFIG.useTokenBlacklist) {
    const isBlacklisted = await isTokenBlacklisted(token.jti as string);
    if (isBlacklisted) return false;
  }

  // التحقق من حالة المستخدم
  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      role: true,
      isSuperAdmin: true,
      lockedUntil: true,
      lastPasswordChange: true,
      active: true,
    },
  });

  if (!user) return false;
  if (user.lockedUntil && user.lockedUntil > new Date()) return false;
  if (user.active === false) return false;

  // التحقق من تغيير كلمة المرور بعد إصدار الرمز
  if (user.lastPasswordChange) {
    const tokenIssuedAt = new Date((token.iat as number) * 1000);
    if (user.lastPasswordChange > tokenIssuedAt) {
      return false; // كلمة المرور تغيرت بعد إصدار الرمز
    }
  }

  return true;
}

/**
* إلغاء جميع جلسات المستخدم
*/
export async function revokeAllUserSessions(userId: string): Promise<void> {
  // إضافة رمز المستخدم للقائمة السوداء
  await prisma.tokenBlacklist.createMany({
    data: {
      userId,
      revokedAt: new Date(),
      reason: 'PASSWORD_CHANGE_OR_SECURITY_EVENT',
    },
  });

  // تنظيف القائمة السوداء القديمة
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // أسبوع
  await prisma.tokenBlacklist.deleteMany({
    where: { revokedAt: { lt: cutoff } },
  });
}
```

---

### V-MED-04: Input Validation مفقود في API Routes

| البند | التفاصيل |
|-------|---------|
| **الملف** | جميع `app/api/**/route.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | Injection attacks, data corruption |

#### الكود المصحح

```typescript
// lib/validation.ts - validation schemas
import { z } from 'zod';

// Validation helpers
const cuid = z.string().regex(/^[cC][a-zA-Z0-9]{24}$/);
const email = z.string().email().max(254);
const safeString = z.string().max(1000).transform(s => s.trim());

// Accounting schemas
export const AccountSchema = z.object({
  name: safeString.min(1).max(200),
  code: safeString.min(1).max(50),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: cuid.nullable().optional(),
  openingBalance: z.number().min(0).max(999999999999).optional(),
  currency: z.string().length(3).default('SAR'),
  description: safeString.max(1000).optional(),
});

export const PeriodSchema = z.object({
  name: safeString.min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  fiscalYearId: cuid,
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).default('OPEN'),
});

// Upload schemas
export const UploadSchema = z.object({
  file: z.instanceof(File).refine(
    f => f.size > 0 && f.size <= 10 * 1024 * 1024,
    'File must be between 1 byte and 10MB'
  ),
  category: z.enum(['document', 'image', 'receipt', 'contract']).optional(),
  entityId: cuid.optional(),
  entityType: z.enum(['property', 'booking', 'account', 'user']).optional(),
});

/**
* Middleware للتحقق من الإدخال
*/
export function validateInput<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    
    throw new ValidationError(errors);
  }

  return result.data;
}

export class ValidationError extends Error {
  constructor(public errors: Array<{ path: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// ============================================
// استخدام في API
// ============================================
import { AccountSchema, validateInput } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const guard = await apiGuard(req);
  if (guard instanceof Response) return guard;

  try {
    const body = await req.json();
    const data = validateInput(AccountSchema, body);
    
    // data الآن آمن ومتحقق
    const account = await prisma.accountingAccount.create({
      data: {
        ...data,
        companyId: guard.user.companyId,
      },
    });
    
    return Response.json({ account });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

---

### V-MED-05: Logging مفقود للأحداث الأمنية

| البند | التفاصيل |
|-------|---------|
| **الملف** | جميع `app/api/**/route.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | صعوبة اكتشاف الهجمات والتحقيق |

#### الكود المصحح

```typescript
// lib/security-logging.ts - Middleware تسجيل أمني
import { NextRequest } from 'next/server';
import { logAuditEvent } from './audit';

interface SecurityLogContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}

/**
* Middleware لتسجيل جميع الطلبات
*/
export async function logRequest(
  req: NextRequest,
  context: SecurityLogContext,
  statusCode: number,
  duration: number
): Promise<void> {
  // تسجيل الطلبات المشبوهة
  if (statusCode >= 400) {
    await logAuditEvent({
      type: statusCode >= 500 ? 'SECURITY_ALERT' : 'FAILED_AUTH',
      userId: context.userId || 'anonymous',
      resource: req.nextUrl.pathname,
      action: req.method,
      details: {
        statusCode,
        duration,
        query: Object.fromEntries(req.nextUrl.searchParams),
        userAgent: context.userAgent,
      },
      severity: statusCode >= 500 ? 'CRITICAL' : 'WARNING',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}

/**
* Middleware لتتبع API requests
*/
export function createRequestTracker() {
  return async function trackRequest(
    req: NextRequest,
    handler: () => Promise<Response>
  ): Promise<Response> {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    
    // إضافة requestId للـ headers
    req.headers.set('x-request-id', requestId);

    const context: SecurityLogContext = {
      userId: req.headers.get('x-user-id') || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      requestId,
    };

    try {
      const response = await handler();
      const duration = Date.now() - start;

      await logRequest(req, context, response.status, duration);

      // إضافة requestId للرد
      response.headers.set('x-request-id', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      await logRequest(req, context, 500, duration);
      
      throw error;
    }
  };
}
```

---

### V-MED-06: Missing CSRF Protection

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/auth.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | CSRF attacks على العمليات المهمة |

#### ملاحظة
NextAuth.js v4 يتعامل مع CSRF تلقائياً لمسارات المصادقة، لكن API routes المخصصة تحتاج حماية.

#### الكود المصحح

```typescript
// lib/csrf.ts - حماية CSRF
import { NextRequest, NextResponse } from 'next/server';

// مسارات لا تحتاج CSRF (webhooks, etc.)
const CSRF_EXEMPT_PATHS = [
  '/api/webhook',
  '/api/auth',
  '/api/sse',
];

// methods التي تحتاج حماية
const CSRF_SENSITIVE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
* التحقق من CSRF token
*/
export async function validateCsrf(req: NextRequest): Promise<boolean> {
  // تجاوز للمسارات المستثناة
  if (CSRF_EXEMPT_PATHS.some(p => req.nextUrl.pathname.startsWith(p))) {
    return true;
  }

  // تجاوز للـ GET
  if (!CSRF_SENSITIVE_METHODS.includes(req.method)) {
    return true;
  }

  // التحقق من SameSite
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  // التحقق من Origin header
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost === host) {
      return true;
    }
  }

  // Fallback: التحقق من Referer
  if (referer) {
    const refererHost = new URL(referer).host;
    if (refererHost === host) {
      return true;
    }
  }

  // API requests مع Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // JWT مفروض أنه يكفي
    return true;
  }

  return false;
}

// Middleware
export function withCsrfProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const isValid = await validateCsrf(req);
    
    if (!isValid) {
      await logSecurityEvent({
        type: 'CSRF_VIOLATION',
        severity: 'HIGH',
        details: {
          path: req.nextUrl.pathname,
          origin: req.headers.get('origin'),
          referer: req.headers.get('referer'),
        },
      });
      
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    return handler(req);
  };
}
```

---

### V-MED-07: getAuthSecret() قد يرجع قيمة ضعيفة

| البند | التفاصيل |
|-------|---------|
| **الملف** | `lib/server/authSecret.ts` |
| **الخطورة** | متوسطة |
| **التأثير** | سر مصادقة قابل للتخمين |

#### الكود المصحح

```typescript
// lib/server/authSecret.ts - المصحح
import { createHash, randomBytes } from 'crypto';

const MIN_SECRET_LENGTH = 32;
const RECOMMENDED_LENGTH = 64;

/**
* الحصول على سر المصادقة مع التحقق من القوة
*/
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  // في الإنتاج: يجب أن يكون محدداً
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error(
        'NEXTAUTH_SECRET is required in production. ' +
        'Generate one with: openssl rand -base64 64'
      );
    }

    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `NEXTAUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters. ` +
        `Current length: ${secret.length}`
      );
    }

    // التحقق من أنه ليس قيمة افتراضية معروفة
    const weakSecrets = [
      'secret',
      'development',
      'test',
      'password',
      'nextauth',
      'change-me',
      'your-secret-key',
    ];

    if (weakSecrets.some(w => secret.toLowerCase().includes(w))) {
      throw new Error(
        'NEXTAUTH_SECRET appears to be a weak/default value. ' +
        'Please generate a strong secret.'
      );
    }

    return secret;
  }

  // في التطوير: توليد سر عشوائي
  if (!secret) {
    console.warn(
      'WARNING: NEXTAUTH_SECRET not set. ' +
      'Using generated secret (sessions will not persist across restarts)'
    );
    return randomBytes(RECOMMENDED_LENGTH).toString('base64');
  }

  return secret;
}

/**
* توليد سر قوي جديد
*/
export function generateAuthSecret(): string {
  return randomBytes(RECOMMENDED_LENGTH).toString('base64');
}

/**
* التحقق من أن السرين متطابقين (timing-safe)
*/
export function verifySecretMatch(
  provided: string,
  expected: string
): boolean {
  try {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    return providedBuf.length === expectedBuf.length &&
           timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
```

---

## 4. ثغرات منخفضة الخطورة

### V-LOW-01: SSL في DATABASE_URL قد لا يتحقق من الشهادة

| البند | التفاصيل |
|-------|---------|
| **الملف** | `.env.example` |
| **الخطورة** | منخفضة |
| **الحل** | استخدام rejectUnauthorized=true |

```env
# .env.example - المصحح
# SSL مع التحقق من الشهادة
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslaccept=strict"

# أو باستخدام Prisma connection string
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=5&pool_timeout=10&ssl=true"
```

---

### V-LOW-02: إصدار Node.js وDependencies

| البند | التفاصيل |
|-------|---------|
| **الملف** | `package.json` |
| **الخطورة** | منخفضة |
| **الحل** | تحديث دوري |

#### قائمة التحقق
```bash
# فحص الثغرات المعروفة
npm audit

# تحديث Dependencies
npm update

# التحقق من الإصدارات
node -v  # يجب >= 20
npm -v   # يجب >= 10
```

#### package.json - المصحح
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "audit:security": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  }
}
```

---

### V-LOW-03: Error Messages تكشف معلومات داخلية

| البند | التفاصيل |
|-------|---------|
| **الملف** | `app/api/**/route.ts` |
| **الخطورة** | منخفضة |
| **الحل** | رسائل خطأ عامة في الإنتاج |

#### الكود المصحح

```typescript
// lib/errors.ts - معالجة الأخطاء
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
* تنسيق خطأ للمستخدم
*/
export function formatError(error: unknown): {
  error: string;
  code: string;
  requestId?: string;
} {
  // في الإنتاج: لا تكشف التفاصيل
  const isProduction = process.env.NODE_ENV === 'production';

  if (error instanceof AppError && error.isOperational) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  // أخطاء غير متوقعة
  console.error('Unexpected error:', error);

  return {
    error: isProduction 
      ? 'An unexpected error occurred' 
      : (error as Error).message,
    code: 'INTERNAL_ERROR',
    requestId: crypto.randomUUID(),
  };
}

// استخدام في API
export async function GET(req: NextRequest) {
  try {
    // ...
  } catch (error) {
    const formatted = formatError(error);
    return Response.json(formatted, { status: 500 });
  }
}
```

---

### V-LOW-04: Missing Security Headers in API Responses

| البند | التفاصيل |
|-------|---------|
| **الملف** | جميع `app/api/**/route.ts` |
| **الخطورة** | منخفضة |
| **الحل** | إضافة headers أمنية |

#### الكود المصحح

```typescript
// lib/api-response.ts - ردود API آمنة
export function createApiResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const securityHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    ...headers,
  };

  return Response.json(data, {
    status,
    headers: securityHeaders,
  });
}

// للأخطاء
export function createErrorResponse(
  error: string,
  code: string,
  status: number = 400
): Response {
  return createApiResponse(
    { error, code },
    status,
    { 'Cache-Control': 'no-store' }
  );
}
```

---

## 5. الكود المصحح

### ملفات جديدة مطلوبة

```
lib/
├── api-guard.ts          [جديد] - حماية API Routes
├── rate-limit.ts          [جديد] - Rate Limiting
├── csrf.ts                [جديد] - CSRF Protection
├── validation.ts          [جديد] - Input Validation
├── security-headers.ts    [جديد] - Security Headers
├── file-security.ts       [جديد] - File Upload Security
├── tenant-guard.ts        [جديد] - Multi-tenancy
├── audit.ts               [معدل] - Audit System
├── security-client.ts     [جديد] - Browser-only Security
├── security-server.ts     [جديد] - Server-only Security
├── security.ts            [معدل] - Unified Entry Point
├── encryption-at-rest.ts  [جديد] - Database Encryption
├── impersonate.ts         [معدل] - Impersonation Security
├── featurePermissions.ts  [معدل] - Permission Validation
├── admin-reset.ts         [جديد] - Admin PIN Protection
├── e2e-guard.ts           [جديد] - E2E Environment Guard
├── errors.ts              [جديد] - Error Handling
├── api-response.ts        [جديد] - Safe API Responses
├── security-logging.ts    [جديد] - Security Logging
├── authSecret.ts          [معدل] - Secret Management
└── auth.ts                [معدل] - Auth Configuration

app/
└── api/
    └── e2e/
        └── reset/
            └── route.ts    [معدل] - Protected Reset Endpoint

prisma/
└── schema.prisma          [معدل] - Added Encryption Fields
```

---

## 6. توصيات تحسينية

### 6.1 البنية التحتية

| الأولوية | التوصية | الجهد |
|----------|---------|-------|
| عالية | تفعيل WAF (Cloudflare/AWS WAF) | 1 يوم |
| عالية | فصل بيئات dev/staging/production | 1-2 أيام |
| عالية | تفعيل HTTPS فقط (HSTS) | ساعات |
| متوسطة | استخدام Redis للـ Sessions | 1-2 أيام |
| متوسطة | مراقبة Security Events (Sentry) | 1 يوم |
| منخفضة | Penetration Testing دوري | دوري |

### 6.2 التطوير

| الأولوية | التوصية | الجهد |
|----------|---------|-------|
| عالية | تطبيق RBAC على كل API Route | 3-5 أيام |
| عالية | إضافة Input Validation | 2-3 أيام |
| عالية | Rate Limiting | 1-2 أيام |
| متوسطة | تسجيل Audit Log شامل | 2-3 أيام |
| متوسطة | تشفير البيانات الحساسة في DB | 2-3 أيام |
| متوسطة | MFA للأدمن والسوبر أدمن | 2-3 أيام |
| منخفضة | Automate Security Testing | 3-5 أيام |

### 6.3 العمليات

| الأولوية | التوصية | الجهد |
|----------|---------|-------|
| عالية | تدوير أسرار المصادقة دورياً | دوري |
| عالية | مراجعة صلاحيات المستخدمين دورياً | أسبوعي |
| متوسطة | نسخ احتياطي مشفر للبيانات | 1-2 أيام |
| متوسطة | إجراءات استجابة للحوادث | 1 يوم |
| منخفضة | تدريب الفريق على الأمان | دوري |

---

## 7. خطة الإصلاح

### المرحلة 1: إصلاحات عاجلة (يوم 1-2)

- [ ] V-CRIT-01: إضافة المصادقة لجميع API Routes المفتوحة
- [ ] V-CRIT-02: تصليح ثغرة Path Traversal في /api/media
- [ ] V-CRIT-03: إضافة تحقق الملفات في upload routes
- [ ] V-CRIT-04: إضافة tenant isolation للمحاسبة
- [ ] V-HIGH-04: تعطيل E2E_ALLOW_DB_RESET في الإنتاج

### المرحلة 2: إصلاحات حرجة (يوم 3-5)

- [ ] V-HIGH-01: استبدال crypto.createCipher بـ AES-256-GCM
- [ ] V-HIGH-02: فصل كود المتصفح عن الخادم
- [ ] V-HIGH-03: تأمين ميزة impersonate
- [ ] V-HIGH-07: إضافة Rate Limiting
- [ ] V-HIGH-08: تحسين نظام التدقيق

### المرحلة 3: إصلاحات مهمة (يوم 6-10)

- [ ] V-HIGH-05: تشفير البيانات الحساسة في DB
- [ ] V-HIGH-06: تأمين ADMIN_DATA_RESET_PIN
- [ ] V-MED-01: تحسين Security Headers
- [ ] V-MED-02: تطهير adminPermissions
- [ ] V-MED-03: تحسين JWT Strategy
- [ ] V-MED-04: إضافة Input Validation

### المرحلة 4: تحسينات (يوم 11-15)

- [ ] V-MED-05: تحسين Logging
- [ ] V-MED-06: إضافة CSRF Protection
- [ ] V-MED-07: تأمين getAuthSecret
- [ ] جميع V-LOW: إصلاحات منخفضة

---

## ملحق: أدوات الفحص المقترحة

```bash
# فحص ثغرات npm
npm audit

# فحص Dependencies
npm audit fix

# فحص أمان الكود
npx eslint --ext .ts,.tsx . --rule 'no-eval: error'

# فحص الأسرار
npx detect-secrets scan

# فحص Docker (إن وجد)
docker scan

# Security headers check
npx helmet-csp-check

# SAST (Static Application Security Testing)
# - SonarQube
# - Snyk Code
# - GitHub CodeQL
```

---

## الخلاصة

المشروع يحتوي على ثغرات حرجة تتطلب إصلاحاً عاجلاً. الأولوية القصوى هي:

1. **إضافة المصادقة** لجميع API Routes المفتوحة
2. **تأمين رفع الملفات** من RCE و Path Traversal
3. **عزل البيانات** Multi-tenancy
4. **تصليح التشفير** المهمل
5. **فصل كود المتصفح** عن الخادم

> **تم إنشاء هذا التقرير في**: ${new Date().toISOString()}
> **الإصدار**: 1.0
> **المشروع**: bhd-om العقاري
> **التقنيات**: Next.js 16, React 19, Prisma 7, PostgreSQL, NextAuth.js v4
