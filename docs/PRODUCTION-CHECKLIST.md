# قائمة جاهزية الإنتاج — BHD-OM

**التحقق السريع بعد النشر:**

| الرابط | الغرض |
|--------|--------|
| `https://www.bhd-om.com/api/check-env` | NEXTAUTH، DB، Thawani (بدون أسرار) |
| `/admin/data` (ADMIN) | checklist Thawani + legacy migration (`GET /api/admin/production-readiness`) |
| [Vercel Deployments](https://vercel.com/bhdom89-8158s-projects/bhd-om/deployments) | Build ناجح |
| [GitHub Actions](https://github.com/ainoamn/bhd-om/actions) | E2E API guards |

---

## 1. Vercel — Environment Variables

| المتغير | مطلوب |
|---------|--------|
| `DATABASE_URL` | PostgreSQL (Neon / Vercel Postgres) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://www.bhd-om.com` |
| `THAWANI_SECRET_KEY` | من لوحة Thawani |
| `THAWANI_PUBLISHABLE_KEY` | من لوحة Thawani |
| `THAWANI_WEBHOOK_SECRET` | سلسلة عشوائية — نفسها في Thawani webhook |
| `THAWANI_SUCCESS_URL` | اختياري — افتراضي `{NEXTAUTH_URL}/ar/payment/success` |
| `THAWANI_CANCEL_URL` | اختياري — افتراضي `{NEXTAUTH_URL}/ar/payment/cancel` |

بعد أي تغيير: **Redeploy** من Vercel.

---

## 2. قاعدة البيانات

على جهاز متصل بـ DB الإنتاج (أو من CI pipeline مخصص):

```bash
npm run db:migrate:deploy
npm run db:backfill-legacy-booking-settings
```

---

## 3. Thawani Webhook

في لوحة Thawani:

- **URL:** `https://www.bhd-om.com/api/webhooks/thawani`
- **Header:** `x-webhook-secret` = قيمة `THAWANI_WEBHOOK_SECRET`

---

## 4. Legacy booking settings

1. افتح `/admin/data` كـ ADMIN
2. **Backfill** legacy → مستندات/شيكات إلى الجداول
3. عند `fullyMigrated: true` → **Purge** مفاتيح AppSetting (تأكيد `PURGE-LEGACY-BOOKING-SETTINGS`)

---

## 5. اختبار دفع (بعد Thawani)

1. `/api/check-env` → `PAYMENT_PROVIDER: thawani` و `THAWANI_PRODUCTION_READY: نعم`
2. حجز تجريبي → redirect Thawani → success page
3. تحقق من webhook في logs Vercel + إنشاء الحجز في DB

---

## 6. دفتر العناوين (ADMIN)

من `/admin/address-book`:

| العملية | API |
|---------|-----|
| عرض القائمة | `GET /api/address-book` |
| sync من الحجوزات | `POST /api/admin/address-book/sync-from-bookings` |
| sync من المستخدمين | `POST /api/admin/address-book/bulk-ensure-from-users` |
| استيراد CSV | `POST /api/admin/address-book/import-csv` |
| دمج التكرارات | `POST /api/admin/address-book/merge-duplicates` |
| إنشاء/تعديل/أرشفة | `POST /api/address-book` (من لوحة الإدارة — server-first) |

---

## 7. CI محلي

```bash
npm run build
npm run test:e2e:verify
```
