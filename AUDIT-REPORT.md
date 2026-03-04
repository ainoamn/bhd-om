# تقرير فحص النظام — BHD-OM

**تاريخ الفحص:** 2025-03-03

---

## 1. ملخص تنفيذي

- **TypeScript:** المشروع يمر بـ `tsc --noEmit` بدون أخطاء.
- **ESLint:** الإعداد صحيح؛ سكربت `lint` في package.json يحتاج مساراً (انظر التوصيات).
- **مشاكل حرجة:** أمان (سري الـ impersonate، وعدم تحقق صلاحيات في بعض الـ API)، واعتماديات (dotenv).
- **تحسينات مقترحة:** تقليل استخدام `any`، إضافة تحقق صلاحيات لمسارات الـ API المفتوحة، توحيد الأنواع مع الـ schema.

---

## 2. الأمان (حرج)

### 2.1 سري افتراضي لـ Impersonate
- **الملف:** `lib/impersonate.ts`
- **المشكلة:** استخدام `process.env.NEXTAUTH_SECRET || 'fallback-secret'` يسمح بتوقيع رموز انتحال الشخصية في الإنتاج إذا لم يُعرّف `NEXTAUTH_SECRET`.
- **التوصية:** في الإنتاج عدم استخدام أي قيمة افتراضية؛ إما رمي خطأ أو الاعتماد فقط على المتغير.

### 2.2 مسارات API بدون تحقق صلاحيات/هوية

| المسار | الطريقة | المشكلة |
|--------|---------|---------|
| `/api/accounting/accounts` | GET | أي شخص يمكنه قراءة دليل الحسابات |
| `/api/accounting/periods` | GET, POST | قراءة/قفل الفترات المالية بدون صلاحية |
| `/api/accounting/audit` | GET | قراءة سجل التدقيق بدون صلاحية AUDIT_VIEW |
| `/api/upload` | POST | رفع ملفات بدون تحقق هوية |
| `/api/upload/company` | POST | رفع صور الشركة بدون تحقق |
| `/api/upload/booking-documents` | POST | رفع مستندات حجز بدون تحقق |
| `/api/upload/accounting` | POST | رفع مستندات محاسبة بدون تحقق |
| `/api/media` | GET | قائمة ملفات الرفع بدون تحقق |

**التوصية:** إضافة `getServerSession` أو `requirePermission` (حسب السياق) لجميع هذه المسارات، وربط الرفع بالمستخدم/الجلسة.

### 2.3 مسار مسح الباركود
- **الملف:** `app/api/scan/[userId]/route.ts`
- **الوضع:** وثّق التعليق بأنه "لا يتطلب تسجيل دخول" — تأكد أن نشر بيانات المستخدم (الاسم، البريد، الهاتف، إلخ) لغير المسجلين مقصود ومقبول من ناحية الخصوصية والسياسة.

---

## 3. الاعتماديات والتكوين

### 3.1 dotenv في prisma.config
- **الملف:** `prisma.config.ts` يستخدم `import 'dotenv/config'`.
- **المشكلة:** الحزمة `dotenv` غير مذكورة في `package.json`؛ قد يفشل تحميل `DATABASE_URL` عند تشغيل أوامر Prisma (مثل `prisma migrate`, `prisma db push`) من الطرفية.
- **التوصية:** إضافة `dotenv` إلى `devDependencies` أو الاعتماد على تعريف `DATABASE_URL` في بيئة التشغيل دون استيراد dotenv.

### 3.2 سكربت lint
- **الملف:** `package.json`
- **المشكلة:** `"lint": "eslint"` لا يمرر مساراً؛ التشغيل الصحيح عادةً `eslint .` أو مسار محدد.
- **التوصية:** تغيير إلى `"lint": "eslint ."` (أو المسار المطلوب).

---

## 4. TypeScript والأنواع

### 4.1 استخدام `any` و `as any`
تم العثور على عشرات الاستخدامات في:
- `app/api/accounting/**` — معاملات دوال، عناصر مصفوفات.
- `components/admin/` — (AnalyticsCharts, AdvancedReports, SecurityMonitor, SessionMiddleware, MockSessionProvider, …).
- `app/[locale]/**` — تحويل أنواع للـ locale أو الـ props.
- `lib/accounting/**` — (core, dbService, api/client, taxEngine, ifrsCompliance).
- `lib/logger.ts`, `lib/security.ts`, `lib/analytics/smartAnalytics.ts`, `lib/storage/cloudBackup.ts`.

**التوصية:** استبدال `any` بـ interfaces/types محددة (من Prisma أو من `lib/accounting/domain/types.ts`) وتقليل `as any` إلى أضيق نطاق ممكن مع تعريفات نوعية مناسبة.

### 4.2 توافق propertyId مع الـ schema
- **Prisma:** `AccountingDocument.propertyId` معرّف كـ `Int?`.
- **النماذج:** `Property.id` من نوع `String` (cuid).
- **النتيجة:** لا يوجد ربط (relation) بين المستند والعقار؛ إذا كان المقصود الربط بالعقار فيجب تغيير `propertyId` إلى `String?` وإضافة العلاقة في الـ schema.

---

## 5. قواعد المشروع (Cursor rules)

- **الحقول الإجبارية:** يوجد `lib/utils/requiredFields.ts` ويُستخدم في بعض النماذج (مثل PropertyForm, ContactFormModal, PropertyExtraDataForm, address-book). يُفضّل تطبيقه بشكل موحد على كل النماذج التي تحتوي حقولاً إجبارية.
- **حفظ المسودات:** يوجد `lib/hooks/useDrafts.ts` و`useDraftState.ts`؛ التأكد من استخدامهما في كل الصفحات التي يُدخل فيها بيانات مؤقتة قبل "حفظ" نهائي.

---

## 6. أخرى

### 6.1 console في الكود
- استخدام `console.error` / `console.log` في عدة مسارات API ومكونات (مثل مسارات الـ upload، المحاسبة، والـ admin).
- **next.config.ts** يزيل الـ console في الإنتاج (`removeConsole: process.env.NODE_ENV === 'production'`) — مناسب، مع بقاء التوصية باستخدام `lib/logger.ts` حيث أمكن للتوحيد والتتبع.

### 6.2 eslint-disable
- **الملف:** `components/admin/MultiUnitDataModal.tsx` — تعطيل `react-hooks/exhaustive-deps` في سطرين. يُفضّل مراجعة تبعيات الـ effect وإصلاحها بدلاً من التعطيل الدائم إن أمكن.

### 6.3 مسار seed
- يوجد إشارة لـ `prisma\seed.ts` و`prisma/seed.ts` (نفس الملف باختلاف الفاصل في المسار). التأكد من أن أوامر Prisma تستخدم مساراً واحداً متسقاً (مثلاً `prisma/seed.ts`).

---

## 7. إجراءات مُنفّذة تلقائياً

- **lib/impersonate.ts:** في الإنتاج يتم رمي خطأ إذا لم يُعرّف `NEXTAUTH_SECRET`؛ لا استخدام لسري افتراضي.
- **package.json:** إضافة `dotenv` إلى devDependencies، وتصحيح سكربت lint إلى `"lint": "eslint ."`.
- **api/accounting/accounts/route.ts:** GET يتطلب صلاحية `ACCOUNT_VIEW` عبر `requirePermission`.
- **api/accounting/periods/route.ts:** GET يتطلب `REPORT_VIEW`، POST يتطلب `PERIOD_LOCK`.
- **api/accounting/audit/route.ts:** GET يتطلب صلاحية `AUDIT_VIEW`.

---

## 8. أولويات مقترحة للمرحلة القادمة

1. **أمان:** إزالة أي سري افتراضي، وإضافة تحقق هوية/صلاحيات لجميع مسارات الـ API الحساسة (محاسبة، رفع ملفات، تدقيق).
2. **أنواع:** تقليل `any` في طبقة المحاسبة والـ API وإكمال الـ interfaces في `lib/accounting/domain/types.ts`.
3. **توحيد:** تطبيق required-fields و draft auto-save على كل النماذج ذات الصلة.
4. **الـ schema:** اتخاذ قرار بخصوص ربط `AccountingDocument.propertyId` بـ `Property` (نوع وعلاقة) وتطبيقه في الـ schema والكود.
