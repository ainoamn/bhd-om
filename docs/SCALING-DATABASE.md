# قاعدة البيانات القابلة للتوسع — 10M+ عقار، 1M+ مستخدم

## الهدف

ربط الموقع بقاعدة بيانات حقيقية قابلة للتمدد الأفقي والعمودي، تستوعب:
- **أكثر من 10 ملايين عقار**
- **أكثر من مليون مستخدم**
- **الاستمرار في التوسع** مع الزيادة في البيانات والطلبات

---

## اختيار التقنية: PostgreSQL

- **PostgreSQL** مناسبة للإنتاج على نطاق كبير وتدعم:
  - التوسع العمودي (رفع موارد السيرفر)
  - التوسع الأفقي عبر القراءة الموزعة (Read Replicas) والتقسيم (Partitioning)
  - الفهارس المتقدمة (B-tree, GiST للجغرافيا لاحقاً)
  - الاتصال المترابط (Connection Pooling) لآلاف الطلبات المتزامنة

---

## مزودو الخدمة الموصى بهم (قابلون للتوسع)

| المزود | التوسع | ملاحظات |
|--------|--------|---------|
| **Neon** | Serverless، توسع تلقائي، Branching | مناسب لـ Vercel، Connection Pooling مدمج، خطط مجانية ومدفوعة |
| **Supabase** | Postgres مُدار، Replicas | نفس البنية، توسع مع الخطط الأعلى |
| **Vercel Postgres** | مبني على Neon | تكامل مباشر مع Vercel |
| **Citus** (من Microsoft) | توسع أفقي (Sharding) | عند الحاجة لتوزيع البيانات على عقد متعددة |
| **AWS RDS / Aurora** | توسع عمودي وأفقي | للمنظمات الكبيرة والبنية على AWS |

للبدء الفوري: **Neon** أو **Vercel Postgres** كافيان لاستيعاب ملايين العقارات والمستخدمين مع Connection Pooling.

---

## ما تم تطبيقه في المشروع

### 1. فهارس (Indexes) للأداء

تمت إضافة فهارس على الجداول الأكثر استعلاماً لضمان استجابة سريعة حتى مع ملايين الصفوف:

- **User**: `role`, `createdAt`, `email` (بالإضافة إلى unique على `email`, `serialNumber`)
- **Property**: `type`, `status`, `createdAt`, `type+status`, `governorateAr`, `price`
- **PropertyBooking**: `propertyId`, `status`, `createdAt`, `propertyId+status`, `email`, `type`
- **BookingStorage**: `createdAt`
- **AccountingDocument**, **AccountingJournalEntry**, **AccountingAuditLog**, **ContactSubmission**, **Project**: فهارس مناسبة للتاريخ والحالة ونوع الكيان

هذه الفهارس تدعم:
- قوائم العقارات مع فلترة (نوع، حالة، محافظة، سعر)
- قوائم المستخدمين والبحث بالبريد والدور
- الحجوزات حسب العقار والحالة والتاريخ
- التقارير والتدقيق حسب التاريخ والكيان

### 2. محول PostgreSQL واتصال مجمّع (مطبّق في المشروع)

التطبيق يستخدم **محول Prisma لـ PostgreSQL** (`@prisma/adapter-pg`) مع السائق `pg`، مما يوفر تجميع اتصالات تلقائي ويدعم ملايين الطلبات. الإعداد في `lib/prisma.ts`.

### 3. Connection Pooling في الإنتاج (رابط Pooled)

على Vercel وبيئة Serverless يُفضّل استخدام **رابط اتصال مجمّع (Pooled)** من مزود الخدمة (Neon/Supabase) لتحمّل آلاف الاتصالات المتزامنة:

- **Neon**: استخدم الرابط الذي ينتهي بـ `-pooler.xxx` أو الخيار "Pooled connection" من لوحة التحكم.
- **Supabase**: استخدم `Supabase Pooler` (منفذ 6543) وليس الاتصال المباشر (5432).

مثال:
```env
# صحيح — Pooled (للاستخدام على Vercel والإنتاج)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# تجنب في Serverless — اتصال مباشر (يستنزف الاتصالات)
# DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 4. متغيرات البيئة

في **Vercel** (وكل بيئة إنتاج):

| المتغير | الوصف |
|---------|--------|
| `DATABASE_URL` | رابط PostgreSQL **المجمّع (Pooled)** من Neon أو Supabase أو Vercel Postgres |
| `NEXTAUTH_URL` | عنوان الموقع (مثل `https://www.bhd-om.com`) |
| `NEXTAUTH_SECRET` | مفتاح سري عشوائي قوي |

---

## التوسع لاحقاً (عند النمو الحقيقي)

- **قراءة موزعة**: إضافة Read Replicas واستخدامها للقوائم والبحث مع الإبقاء على الكتابة على Primary.
- **تقسيم الجداول (Partitioning)**: تقسيم جداول مثل `Property` أو `PropertyBooking` حسب السنة أو المنطقة عند تجاوز عشرات الملايين من الصفوف.
- **تخزين مؤقت (Caching)**: Redis أو Vercel KV للصفحات والقوائم الأكثر زيارة.
- **بحث full-text**: استخدام `tsvector` في PostgreSQL أو Elasticsearch عند الحاجة لبحث نصي معقد على ملايين العقارات.

---

## البناء محلياً (بدون تشغيل Postgres على الجهاز)

إذا لم يكن لديك PostgreSQL يعمل على `127.0.0.1:5432`:

- ضع في `.env` رابط قاعدة **Neon** (أو أي Postgres سحابي) في `DATABASE_URL` ثم نفّذ `npm run build`، أو
- نفّذ فقط: `npx prisma generate && npx next build` (لن يُحدَّث schema قاعدة البيانات لكن البناء سيكتمل).

على **Vercel** لا حاجة لتعديل شيء: `DATABASE_URL` يُؤخذ من متغيرات البيئة ويتم `prisma db push` أثناء البناء.

---

## الخلاصة

- الموقع **مرتبط بقاعدة بيانات حقيقية** (PostgreSQL) وليس بملف محلي.
- الـ **Schema** و**الفهارس** جاهزة لاستيعاب **ملايين العقارات والمستخدمين** مع استعلامات سريعة.
- استخدام **محول pg** و**Connection Pooling** (في التطبيق ومزود الخدمة) و**مزود مُدار** (Neon / Supabase / Vercel Postgres) يضمن **قابلية التمدد الأفقي والعمودي** والاستمرار في التوسع مع الزيادة في البيانات والطلبات.
