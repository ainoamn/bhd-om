# نظام الأرشفة والتشفير - BHD-OM

نظام متكامل للأرشفة والتشفير لمشروع bhd-om العقاري، يدعم Next.js 16 + React 19 + Prisma 7 + PostgreSQL.

## هيكل المشروع

```
.
├── prisma/
│   └── schema.prisma          # مخطط قاعدة البيانات مع موديلات الأرشفة والتشفير
├── lib/
│   ├── archive/
│   │   ├── archiveEngine.ts   # محرك الأرشفة الرئيسي
│   │   ├── archivePolicy.ts   # إدارة سياسات الأرشفة
│   │   ├── archiveRestore.ts  # استعادة الأرشيف
│   │   └── autoArchive.ts     # الأرشفة التلقائية (cron)
│   ├── encryption/
│   │   ├── cryptoEngine.ts    # محرك التشفير (AES-256-GCM)
│   │   ├── keyManager.ts      # إدارة المفاتيح
│   │   ├── fieldEncryption.ts # تشفير الحقول
│   │   ├── fileEncryption.ts  # تشفير الملفات
│   │   ├── prismaMiddleware.ts# تكامل Prisma
│   │   └── types.ts           # أنواع TypeScript
│   └── security.ts            # أدوات الأمان (مُصلحة)
├── app/api/
│   ├── archive/
│   │   ├── route.ts           # API: أرشفة + قائمة + إحصائيات
│   │   ├── restore/route.ts   # API: استعادة
│   │   └── search/route.ts    # API: بحث
│   └── cron/
│       └── auto-archive/route.ts # Cron: أرشفة تلقائية
└── __tests__/
    ├── encryption.test.ts     # اختبارات التشفير
    └── archive.test.ts        # اختبارات الأرشفة
```

## متطلبات البيئة

```env
# قاعدة البيانات
DATABASE_URL="postgresql://user:pass@localhost:5432/bhd_om"

# التشفير
ENCRYPTION_MASTER_KEY="your-32-char-minimum-master-key-here"
HASH_PEPPER="your-random-pepper-for-search-hashes"

# Cron
CRON_SECRET="your-cron-secret-key"

# CSRF
CSRF_SECRET="your-csrf-secret"
```

## نظام الأرشفة (Archive System)

### الموديلات

| الموديل | الوصف |
|---------|-------|
| `ArchivePolicy` | سياسات الأرشفة التلقائية |
| `ArchiveRecord` | سجل عمليات الأرشفة |
| `ArchiveRestoreLog` | سجل عمليات الاستعادة |

### الصلاحيات

| الدور | أرشفة | استعادة |
|-------|-------|---------|
| ADMIN | نعم | نعم |
| ORG_MANAGER | نعم | نعم |
| COMPANY | لا | لا |
| CLIENT | لا | لا |
| OWNER | لا | لا |

### API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/archive` | قائمة الأرشيف |
| GET | `/api/archive?stats=true` | إحصائيات |
| GET | `/api/archive?id={id}` | تفاصيل |
| POST | `/api/archive` | أرشفة كيان |
| DELETE | `/api/archive?id={id}` | حذف نهائي (ADMIN) |
| GET | `/api/archive/restore` | سجل الاستعادات |
| POST | `/api/archive/restore` | استعادة كيان |
| POST | `/api/archive/restore` (batch) | استعادة متعددة |
| GET | `/api/archive/search` | بحث متقدم |
| GET | `/api/cron/auto-archive` | تشغيل أرشفة تلقائية |

### سياسات افتراضية

1. **أرشفة العقارات غير النشطة** - بعد 365 يوم
2. **أرشفة الحسابات غير النشطة** - بعد 180 يوم
3. **أرشفة المستندات القديمة** - بعد 90 يوم
4. **أرشفة العقود المنتهية** - عند انتهاء الصلاحية
5. **أرشفة الحجوزات المنتهية** - عند الانتهاء

## نظام التشفير (Encryption System)

### الخوارزميات

- **AES-256-GCM** - تشفير البيانات مع المصادقة
- **PBKDF2** - اشتقاق المفاتيح من كلمات المرور
- **HKDF** - اشتقاق المفاتيح من مفاتيح السيد
- **SHA-256** - الهاش والتحقق

### الحقول المشفرة

| الكيان | الحقول المشفرة |
|--------|---------------|
| User | email, phone, nationalId |
| Account | bankName, iban |
| Contract | terms |
| Property | ownerPhone, ownerEmail |

### إدارة المفاتيح

- تخزين المفاتيح مشفرة في قاعدة البيانات
- دعم تدوير المفاتيح (Key Rotation)
- انتهاء صلاحية تلقائي
- ذاكرة تخزين مؤقتة (Cache) مع تنظيف آمن

## التثبيت والاستخدام

### 1. تثبيت Dependencies

```bash
npm install @prisma/client
npm install -D prisma jest @types/jest
```

### 2. تطبيق Migration

```bash
npx prisma migrate dev --name add_archive_encryption
```

### 3. إنشاء سياسات الأرشفة الافتراضية

```typescript
import { createDefaultPolicies } from "./lib/archive/archivePolicy";

await createDefaultPolicies(prisma, adminUserId);
```

### 4. إعداد التشفير

```typescript
import { setupEncryption } from "./lib/encryption/prismaMiddleware";

await setupEncryption(prisma, process.env.ENCRYPTION_MASTER_KEY);
```

### 5. تشغيل الاختبارات

```bash
npm test
```

### 6. إعداد Cron Job (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/auto-archive?secret=YOUR_CRON_SECRET",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## أمثلة الاستخدام

### أرشفة عقار

```typescript
import { archiveEntity } from "./lib/archive/archiveEngine";

const result = await archiveEntity(
  prisma,
  "PROPERTY",
  "property-id",
  userId,
  userRole,
  { reason: "العقار غير نشط منذ سنة" }
);
```

### استعادة عقار

```typescript
import { restoreArchivedEntity } from "./lib/archive/archiveRestore";

const result = await restoreArchivedEntity(
  prisma,
  "archive-record-id",
  userId,
  userRole,
  { reason: "طلب المالك" }
);
```

### تشفير حقل

```typescript
import { encryptField } from "./lib/encryption/fieldEncryption";

const encrypted = await encryptField("0501234567", "user");
```

### تشفير ملف

```typescript
import { encryptFile } from "./lib/encryption/fileEncryption";

const result = await encryptFile("/path/to/file.pdf", "/output/dir");
```

## الإصلاحات

### lib/security.ts

| المشكلة | الإصلاح |
|---------|---------|
| `createSessionFingerprint` تستخدم `document/navigator/screen` | دعم SSR + Client-side مع fallback |
| `auditSecurityEvent` تستخدم `localStorage` | دعم Prisma + localStorage cache |
| `encryptSensitiveData` تستخدم `crypto.createCipher` | استخدام AES-256-GCM |
| `decryptSensitiveData` تستخدم `crypto.createDecipher` | استخدام AES-256-GCM مع auth tag |

## الترخيص

ملكية خاصة - مشروع bhd-om العقاري
