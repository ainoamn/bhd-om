# Neon PostgreSQL — مصدر الحقيقة الوحيد

**المشروع:** [bhd-om](https://github.com/ainoamn/bhd-om) على [bhd-om.com](https://www.bhd-om.com)  
**قاعدة البيانات:** [Neon](https://console.neon.tech) — تحقق أن `DATABASE_URL` في Vercel يشير لنفس المشروع (مثلاً [calm-star-78416849](https://console.neon.tech/app/projects/calm-star-78416849))  
**السياسة:** أي بيانات تشغيلية **لا تُخزَّن في المتصفح كمصدر نهائي** — PostgreSQL على Neon هو المرجع.

---

## 1. أين تُحفظ كل شيء اليوم؟

| المجال | جدول / آلية Neon | ملاحظة |
|--------|------------------|--------|
| **المستخدمون والجلسات** | `User` + NextAuth | تسجيل الدخول الرسمي |
| **دفتر العناوين** | `AddressBookContact`, `AddressBookContactFile` | مصدر الحقيقة — ليس KV |
| **العقود التشغيلية (وحدات)** | `LegacyAppKvStore` → `bhd_saved_contracts_by_unit` + 13 مفتاح عقود | **سحابة أولاً** من يونيو 2026 |
| **المباني والوحدات** | `LegacyAppKvStore` → `bhd_building_profiles`, `bhd_managed_units`, … | |
| **الحجوزات** | `LegacyAppKvStore` + `BookingStorage` | |
| **المحاسبة التشغيلية** | `LegacyAppKvStore` → `bhd_accounting_registry` + جداول `Accounting*` | |
| **الصيانة** | `LegacyAppKvStore` → `bhd_maintenance_registry` + `MaintenanceRequest` | |
| **المهام** | `LegacyAppKvStore` → `bhd_tasks_registry` + `Task` | |
| **المرفقات** | `LegacyStoredFile` + Vercel Blob | استخراج من KV عبر `extract-blobs` |
| **إعدادات المنشأة** | `LegacyAppKvStore` + `AppSetting` | |

**المتصفح (`localStorage`):** نسخة عمل مؤقتة فقط — تُستبدَل من Neon عند فتح الصفحة.

---

## 2. آلية المزامنة (الموقع المدمج)

```
فتح الصفحة
    → ensureBhdSiteKvHydratedFromNeon()  [سحب من Neon]
    → عرض الشاشات من البيانات المحدَّثة
    → عند الحفظ: syncBhdKvToServer()     [رفع إلى Neon]
```

- **مسار API:** `GET/POST /api/admin/legacy-bridge/kv`
- **مفاتيح سحابية إلزامية:** كل `bhd_*` ما عدا `bhd_auth_session`, `bhd_theme_mode`, `bhd_users_registry` (جلسة/مظهر) و`bhd_address_book` (جدول Contacts).
- **التحقق:** `GET /api/admin/legacy-bridge/data-health`
- **حالات العقود الرسمية (كل المتصفحات):** `GET /api/admin/legacy-bridge/contract-statuses?reconcile=1`
- **تُحقَن أيضاً في HTML** عند فتح النظام القديم (`contractLifecycle` داخل جسر الموقع)

---

## 3. خطة التطبيع (جداول علاقات — للتوسع 10M+)

المرحلة الحالية: **JSON في `LegacyAppKvStore`** (سريع، يعمل الآن).  
المرحلة القادمة: **جداول Prisma مُطبَّعة** (انظر `legacy/bhd-real-estate/docs/CLOUD_ARCHITECTURE_PLAN.md`):

| الأولوية | جداول مستهدفة |
|----------|----------------|
| 1 | `TenancyContract`, `ContractUnit`, `ContractVersion` |
| 2 | `OperationalBuilding`, `OperationalUnit` |
| 3 | ربط `AccountingJournalEntry` مباشرة بالعقود |
| 4 | `company_id` + RLS متعدد الشركات |

**قاعدة التطوير:** أي ميزة جديدة تُبنى على **API + Prisma** وليس `localStorage` فقط.

---

## 4. إعداد Neon + Vercel

| المتغير | الوصف |
|---------|--------|
| `DATABASE_URL` | رابط **Pooled** من [Neon Console](https://console.neon.tech/app/org-broad-surf-16375800/projects) |
| `DATABASE_URL_UNPOOLED` | للهجرات فقط (اختياري) |
| `NEXTAUTH_URL` | `https://www.bhd-om.com` |
| `NEXTAUTH_SECRET` | مطلوب |
| `BLOB_READ_WRITE_TOKEN` | مرفقات كبيرة (اختياري) |

بعد النشر: `npm run db:migrate:deploy`  
التحقق: `GET https://www.bhd-om.com/api/check-env`  
صحة البيانات: `GET https://www.bhd-om.com/api/admin/legacy-bridge/data-health`

---

## 5. تكلفة تقديرية (Neon)

| المرحلة | الخطة | شهري تقريبي |
|---------|-------|-------------|
| تطوير / اختبار | Free | $0 |
| إنتاج حالي (&lt; 5 GB) | Launch | ~$19 |
| نمو (ملايين السجلات) | Scale | $100+ |

---

## 6. مراجع

- [DATA-POLICY.md](./DATA-POLICY.md)
- [SCALING-DATABASE.md](./SCALING-DATABASE.md)
- [LEGACY-MONOLITH-INTEGRATION.md](./LEGACY-MONOLITH-INTEGRATION.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md)
