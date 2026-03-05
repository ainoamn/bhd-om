# سياسة البيانات — PostgreSQL مصدر الحقيقة الوحيد

## المبدأ

جميع البيانات المستقبلية والمستمرة تُخزَّن في **PostgreSQL** عبر Prisma. الموقع مربوط بربط حقيقي بقاعدة البيانات؛ لا يُستخدم SQLite أو ملفات محلية في الإنتاج.

---

## ما يُخزَّن في PostgreSQL

- **المستخدمون والحسابات**: `User` — تسجيل الدخول، الأدوار، البيانات الشخصية.
- **العقارات**: `Property` — القائمة، التفاصيل، الحالة، الأسعار.
- **الحجوزات**: `PropertyBooking`، `BookingStorage` — حجوزات الواجهة العامة ولوحة الإدارة.
- **المشاريع والمهام**: `Project`، `Task`، `Document`، `Account`، `Transaction`.
- **المحاسبة**: `AccountingAccount`، `AccountingJournalEntry`، `AccountingDocument`، `AccountingAuditLog`.
- **إعدادات التطبيق**: `AppSetting` — إعدادات لوحات التحكم والصلاحيات.
- **نماذج التواصل**: `ContactSubmission`.

---

## متغيرات البيئة المطلوبة في الإنتاج (Vercel)

| المتغير | مطلوب | الوصف |
|--------|--------|--------|
| `DATABASE_URL` | نعم | رابط PostgreSQL **المجمّع (Pooled)** من Neon أو Vercel Postgres. |
| `NEXTAUTH_URL` | نعم | عنوان الموقع، مثلاً `https://www.bhd-om.com`. |
| `NEXTAUTH_SECRET` | نعم | سلسلة عشوائية لتوقيع الجلسات. توليد: `openssl rand -base64 32`. |

بدون `NEXTAUTH_SECRET` يظهر خطأ تسجيل الدخول (Configuration). بدون `DATABASE_URL` لا يعمل تسجيل الدخول ولا تخزين البيانات.

---

## التطوير المحلي

- استخدم PostgreSQL محلياً (أو Docker) وعرّف `DATABASE_URL` في `.env`.
- يمكن استخدام مفتاح تطوير لـ `NEXTAUTH_SECRET` إن لم يُعرّف (للتطوير فقط).

---

## مراجع

- [DEPLOYMENT.md](../DEPLOYMENT.md) — خطوات النشر على Vercel وإعداد المتغيرات.
- [SCALING-DATABASE.md](SCALING-DATABASE.md) — توسع PostgreSQL والاتصال المجمّع.
