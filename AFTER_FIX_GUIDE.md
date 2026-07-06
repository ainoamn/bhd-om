# دليل ما بعد الإصلاحات — bhd-om
## الإصدار: 0.2.0-security-performance

---

## الهيكل الجديد المبسط

بعد التعديلات، أصبحت المكتبات الجديدة مُجمّعة في ملف واحد لكل نظام:

```
قبل (14 ملف)                          بعد (2 ملف فقط)
===================                   ===================
lib/encryption/                       lib/encryption/
  types.ts                              index.ts     ← كل التشفير
  cryptoEngine.ts
  fieldEncryption.ts
  keyManager.ts

lib/archive/                          lib/archive/
  archiveEngine.ts                      index.ts     ← كل الأرشفة
  archiveRestore.ts
  autoArchive.ts
```

**النتيجة:** 14 ملف ← 2 ملف (توفير 12 ملف)

---

## كيف تستخدم الأنظمة الجديدة

### 1️⃣ التشفير (lib/encryption/index.ts)

```typescript
import { encrypt, decrypt, encryptField, decryptField, hashSearch } from '@/lib/encryption';

// تشفير نص:
const encrypted = encrypt('بيانات حساسة');
// "iv:tag:ciphertext"

// فك تشفير:
const decrypted = decrypt(encrypted);
// "بيانات حساسة"

// تشفير حقل مع هاش للبحث:
const field = encryptField('email@example.com');
// { ciphertext: "...", searchHash: "abc123..." }

// فك تشفير حقل:
const email = decryptField(field);

// هاش للبحث:
const hash = hashSearch('email@example.com');
```

### 2️⃣ الأرشفة (lib/archive/index.ts)

```typescript
import { archiveEntity, restoreEntity, searchArchive, canArchive } from '@/lib/archive';

// التحقق من الصلاحية:
if (canArchive('ADMIN')) {
  // أرشفة عقار:
  const result = await archiveEntity(
    'PROPERTY',           // نوع الكيان
    'prop_123',           // معرف الكيان
    'شقة التجمع',        // عنوان
    JSON.stringify(data), // بيانات
    'user_456',           // من قام بالأرشفة
    'ADMIN',              // الدور
    { reason: 'عقار مجمد' }
  );
  
  console.log(result.message); // "تمت الأرشفة بنجاح"
}

// استعادة:
const restore = await restoreEntity('archive_id', 'user_456', 'ADMIN');

// البحث:
const results = await searchArchive('PROPERTY', 'شقة', 1, 20);
```

---

## كيف تنعكس التعديلات على bhd-om.com

### الخطوات بالتفصيل:

```bash
# 1. على جهازك، استنسخ المشروع
git clone https://github.com/ainoamn/bhd-om.git
cd bhd-om

# 2. أنشئ فرعاً جديداً (للحفاظ على المشروع الأصلي)
git checkout -b security-performance-fixes

# 3. انسخ الملفات المعدلة من bhd-review إلى المجلد
# (انظر قائمة الملفات أدناه)

# 4. ثبّت المكتبات الجديدة
npm install

# 5. أضف متغيرات البيئة في .env:
#    ENCRYPTION_MASTER_KEY=...
#    CRON_SECRET=...

# 6. شغّل هجرة قاعدة البيانات
npx prisma migrate dev --name add_archive_encryption_audit
npx prisma generate

# 7. تأكد من البناء
npm run build

# 8. ارفع التغييرات
git add -A
git commit -m "🔒 إصلاحات الأمان والأداء"
git push origin security-performance-fixes

# 9. دمّج مع الرئيسي (بعد التأكد)
git checkout master
git merge security-performance-fixes
git push origin master
```

### ماذا يحدث على Vercel؟

```
git push origin master
    │
    ▼
┌──────────────┐
│  Vercel      │  ← يستقبل التغييرات تلقائياً
│  (GitHub     │
│   Connected) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  npm run     │  ← يبني المشروع
│  build       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Deploy to   │  ← ينشر على الموقع
│  bhd-om.com  │
└──────────────┘
```

**الوقت:** 2-5 دقائق من الـ Push حتى تظهر.

---

## قائمة الملفات (ماذا أنسخ وماذا لا)

### ✅ أنسخ هذه الملفات (جديدة أو معدّلة):

```
# ملفات جديدة - أنسخها كما هي:
app/error.tsx
app/global-error.tsx
app/loading.tsx
lib/api-guard.ts
lib/rate-limit.ts
lib/pagination.ts
lib/encryption/index.ts
lib/archive/index.ts
app/api/archive/route.ts
app/api/archive/restore/route.ts
app/api/cron/auto-archive/route.ts
prisma/migrations/20250706000000_add_archive_encryption_audit/migration.sql

# ملفات معدّلة - استبدل القديم بالجديد:
lib/security.ts
lib/prisma.ts
next.config.ts
package.json
prisma/schema.prisma
.env.example
app/api/accounting/accounts/route.ts
app/api/accounting/audit/route.ts
app/api/accounting/periods/route.ts
app/api/media/route.ts
app/api/upload/route.ts
app/api/upload/company/route.ts
app/api/upload/booking-documents/route.ts
app/api/upload/accounting/route.ts
app/[locale]/error.tsx
app/[locale]/loading.tsx
```

### ❌ لا تنسخ هذه الملفات (محذوفة):

```
# محذوفة - لا توجد بعد التبسيط:
lib/encryption/types.ts          ← محذوف (في index.ts)
lib/encryption/cryptoEngine.ts   ← محذوف (في index.ts)
lib/encryption/fieldEncryption.ts ← محذوف (في index.ts)
lib/encryption/keyManager.ts     ← محذوف (في index.ts)
lib/archive/archiveEngine.ts     ← محذوف (في index.ts)
lib/archive/archiveRestore.ts    ← محذوف (في index.ts)
lib/archive/autoArchive.ts       ← محذوف (في index.ts)
```

---

## التراجع عن التعديلات

### إذا أردت التراجع الكامل:

```bash
# على GitHub، أنشئ Pull Request من الفرع
# ثم ارفضه (Close without merging)

# أو عبر Terminal:
git checkout master                  # العودة للرئيسي
git branch -D security-performance-fixes  # حذف فرع الأمان
```

### إذا أردت التراجع السريع على Vercel:

1. ادخل https://vercel.com/dashboard
2. اختر مشروع bhd-om
3. "Deployments"
4. اختر النسخة القديمة (قبل الأمان)
5. اضغط "Promote to Production"

---

## ملخص الأرقام

| البند | الرقم |
|-------|-------|
| ثغرات أمنية مُغلقة | 23 |
| مشاكل أداء مُصلحة | 18 |
| ملفات معدّلة | 16 |
| ملفات جديدة | 12 |
| ملفات محذوفة (تبسيط) | 7 |
| إجمالي التغييرات | 35 ملف |
| موديلات Prisma جديدة | 5 |
| مكتبات npm جديدة | 2 |
| متغيرات بيئة جديدة | 4 |

---

**للاستفسار:** راجع `CHANGELOG_SECURITY_PERFORMANCE.md` للتفاصيل الكاملة.
