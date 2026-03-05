# نشر الموقع على Vercel (https://www.bhd-om.com)

## ربط الموقع بـ PostgreSQL

الموقع مربوط **بربط حقيقي** بقاعدة البيانات **PostgreSQL** فقط. لا يُستخدم SQLite أو ملفات محلية في الإنتاج:

- **تسجيل الدخول والمستخدمون** → Prisma / PostgreSQL
- **العقارات والحجوزات والإعدادات** → Prisma / PostgreSQL
- **كل البيانات المستقبلية** تُخزَّن في PostgreSQL عبر `DATABASE_URL`

التفاصيل في [docs/SCALING-DATABASE.md](docs/SCALING-DATABASE.md) و [docs/DATA-POLICY.md](docs/DATA-POLICY.md).

## سبب أن الموقع «لا يفتح» أو تسجيل الدخول يفشل

بدون **متغيرات البيئة** الصحيحة على Vercel (خصوصاً `DATABASE_URL` و `NEXTAUTH_SECRET` و `NEXTAUTH_URL`) يفشل تسجيل الدخول وتفشل أي عملية تحتاج قاعدة البيانات. يجب إعدادها كما في القسم التالي.

---

## ما تحتاج إعداده على Vercel

### 1. قاعدة بيانات PostgreSQL (قابلة للتوسع)

استخدم أحد الخيارين مع **Connection Pooling** لتحمل ملايين الطلبات:

- **Neon** (مجاني وقابل للتوسع): [neon.tech](https://neon.tech) → إنشاء مشروع → نسخ **Connection string** واختر **Pooled** (ينتهي عادةً بـ `-pooler`).
- **Vercel Postgres** (مبني على Neon): من لوحة Vercel → Storage → إنشاء Postgres وربطها بالمشروع (يضيف `DATABASE_URL` مجمّعاً تلقائياً).

### 2. متغيرات البيئة في Vercel

من المشروع على Vercel: **Settings → Environment Variables** وأضف:

| المتغير | القيمة | ملاحظات |
|--------|--------|---------|
| `DATABASE_URL` | رابط **Pooled** من Neon/Vercel Postgres | استخدم الرابط المجمّع وليس المباشر (انظر [SCALING-DATABASE.md](docs/SCALING-DATABASE.md)) |
| `NEXTAUTH_URL` | `https://www.bhd-om.com` | عنوان الموقع الفعلي (بدون /ar) |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة | يمكن توليدها بـ: `openssl rand -base64 32` |

احفظ التغييرات وأعد النشر (Redeploy).

### 3. إنشاء الجداول وحساب المدير (مرة واحدة)

البناء على Vercel **لا يشغّل** `prisma db push` (حتى ينجح البناء بدون اتصال بقاعدة البيانات). بعد إضافة `DATABASE_URL` في Vercel وتشغيل أول نشر ناجح، نفّذ من جهازك **مرة واحدة**:

**الخيار أ – من جهازك (موصى به):**

```bash
# في مجلد المشروع، بعد تعيين DATABASE_URL في .env لرابط الإنتاج
npx prisma db push
npx prisma db seed
```

أو استخدم: `npm run db:push` ثم `npx prisma db seed`.

**الخيار ب – من واجهة Vercel:**

- إضافة أمر مخصص في **Build Command** يشغّل البذرة بعد البناء (إن رغبت)، أو
- تشغيل البذرة يدوياً مرة واحدة من جهازك مع `DATABASE_URL` للإنتاج كما في الخيار أ.

بعدها جرّب تسجيل الدخول بحساب المدير (مثلاً البريد وكلمة المرور من الـ seed).

### 4. استكشاف الأخطاء: خطأ تسجيل الدخول (NEXTAUTH_SECRET / Configuration)

إذا ظهرت رسالة **«NEXTAUTH_SECRET غير معرّف»** أو تم توجيهك إلى `/ar/login?error=Configuration`:

1. ادخل إلى مشروعك على **Vercel** → **Settings** → **Environment Variables**.
2. أضف المتغير **`NEXTAUTH_SECRET`** وقيمته سلسلة عشوائية (مثلاً من الأمر: `openssl rand -base64 32`).
3. تأكد من وجود **`NEXTAUTH_URL`** = `https://www.bhd-om.com` و **`DATABASE_URL`** = رابط PostgreSQL المجمّع.
4. احفظ ثم **Redeploy** للنشر الأخير.

بدون `NEXTAUTH_SECRET` لا يعمل تسجيل الدخول في الإنتاج. التفاصيل في [docs/DATA-POLICY.md](docs/DATA-POLICY.md).

**مهم:** بعد إضافة أو تعديل أي متغير بيئة في Vercel يجب تنفيذ **Redeploy** (إعادة النشر) حتى تُحمَّل القيم الجديدة. من **Deployments** → اختر آخر نشر → **⋮** → **Redeploy**.

للتحقق من أن المتغيرات مُحمَّلة على السيرفر: افتح `https://www.bhd-om.com/api/check-env` — إن ظهر «NEXTAUTH_SECRET: غير معرّف» فالمتغير غير مضاف أو النشر الحالي تم قبل إضافته (نفّذ Redeploy).

---

## التطوير المحلي بعد التعديل

أنت الآن تحتاج PostgreSQL محلياً بدلاً من SQLite:

1. **تثبيت وتشغيل PostgreSQL** (أو استخدام Docker):
   ```bash
   docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bhd_om -p 5432:5432 postgres:16
   ```

2. **إعداد ملف `.env`** في جذر المشروع:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/bhd_om"
   NEXTAUTH_SECRET="أي سلسلة عشوائية طويلة"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **إنشاء الجداول وحساب المدير**:
   ```bash
   npx prisma db push
   npx prisma db seed
   npm run dev
   ```

---

## ملخص

- **على الكمبيوتر**: كان كل شيء يعمل لأن SQLite وملف `dev.db` موجودان محلياً.
- **على الموقع (Vercel)**: لا يوجد ملف قاعدة بيانات، لذلك تم الاعتماد على **PostgreSQL** عبر `DATABASE_URL`.
- بعد إضافة **قاعدة بيانات Postgres** ومتغيرات **DATABASE_URL**, **NEXTAUTH_URL**, **NEXTAUTH_SECRET** في Vercel وإنشاء الجداول وحساب المدير، الموقع وتسجيل الدخول يعملان على https://www.bhd-om.com/ar.
