# سياسة البيانات — PostgreSQL (Neon) مصدر الحقيقة الوحيد

## المبدأ

جميع البيانات المستقمرة تُخزَّن في **PostgreSQL على Neon** عبر Prisma. الموقع على [bhd-om.com](https://www.bhd-om.com) مربوط بقاعدة سحابية حقيقية؛ المتصفح يحتفظ بنسخة عمل مؤقتة فقط (`localStorage`) ويُزامَن مع السحابة.

**مرجع كامل:** [NEON-SOURCE-OF-TRUTH.md](./NEON-SOURCE-OF-TRUTH.md)

---

## ما يُخزَّن في PostgreSQL

- **المستخدمون والحسابات**: `User` — تسجيل الدخول، الأدوار، البيانات الشخصية.
- **دفتر العناوين**: `AddressBookContact`, `AddressBookContactFile` — مصدر الحقيقة (ليس KV).
- **النظام التشغيلي القديم (عقود، مباني، محاسبة، صيانة، مهام…)**: `LegacyAppKvStore` — 44 مفتاح `bhd_*` عبر `/api/admin/legacy-bridge/kv`.
- **المرفقات**: `LegacyStoredFile` (+ Vercel Blob عند التفعيل).
- **العقارات العامة**: `Property` — القائمة، التفاصيل، الحالة، الأسعار.
- **الحجوزات**: `PropertyBooking`, `BookingStorage`, `ContractStorage`.
- **المشاريع والمهام**: `Project`, `Task`, `Document`, `Account`, `Transaction`.
- **المحاسبة**: `AccountingAccount`, `AccountingJournalEntry`, `AccountingDocument`, `AccountingAuditLog`.
- **الصيانة**: `MaintenanceRequest` + `bhd_maintenance_registry` في KV.
- **إعدادات التطبيق**: `AppSetting`.

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
