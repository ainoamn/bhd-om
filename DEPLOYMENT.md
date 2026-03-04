# نشر الموقع على Vercel (https://www.bhd-om.com)

## سبب أن الموقع «لا يفتح» أو تسجيل الدخول يفشل

المشروع كان يعتمد على **SQLite** (ملف `dev.db`) محلياً. على Vercel:
- ملف قاعدة البيانات **لا يُرفع** مع المشروع (وملفات النظام للقراءة فقط).
- لذلك تسجيل الدخول وكل ما يعتمد على قاعدة البيانات **يفشل في الإنتاج**.

تم تعديل المشروع لاستخدام **PostgreSQL** قاعدة بيانات حقيقية قابلة للتوسع (أكثر من 10 ملايين عقار وأكثر من مليون مستخدم). التفاصيل في [docs/SCALING-DATABASE.md](docs/SCALING-DATABASE.md).

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

بعد أول نشر ناجح:

**الخيار أ – من جهازك (موصى به):**

```bash
# في مجلد المشروع، بعد تعيين DATABASE_URL في .env لرابط الإنتاج
npx prisma db push
npx prisma db seed
```

**الخيار ب – من واجهة Vercel:**

- إضافة أمر مخصص في **Build Command** يشغّل البذرة بعد البناء (إن رغبت)، أو
- تشغيل البذرة يدوياً مرة واحدة من جهازك مع `DATABASE_URL` للإنتاج كما في الخيار أ.

بعدها جرّب تسجيل الدخول بحساب المدير (مثلاً البريد وكلمة المرور من الـ seed).

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
