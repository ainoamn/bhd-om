# BHD Real Estate Cloud API (المرحلة 2A)

خادم API متعدد الشركات — PostgreSQL + JWT + عزل `company_id` + RLS.

## المتطلبات

- Node.js 22+
- Docker (PostgreSQL + Redis)

## التشغيل السريع

```powershell
# 1) قواعد البيانات
cd "C:\dev\عقود الايجار"
docker compose -f deploy\docker-compose.dev.yml up -d

# 2) API
cd apps\api
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- **API:** http://localhost:3790/api/v1/health  
- **الواجهة:** كما اليوم — Desktop أو `تشغيل-الخادم.cmd` (الـ API لا يخدم HTML؛ ترقية شفافة للمستخدم)  
- **حساب تجريبي:** `admin@bhd.local` / `Admin1234!`

## نقاط النهاية الرئيسية

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/api/v1/health` | صحة الخدمة |
| POST | `/api/v1/auth/login` | تسجيل دخول |
| POST | `/api/v1/auth/select-company` | اختيار شركة (Bearer token) |
| POST | `/api/v1/auth/refresh` | تجديد الجلسة |
| GET | `/api/v1/auth/me` | المستخدم الحالي |
| GET | `/api/v1/buildings?page=1&limit=100` | المباني |
| POST | `/api/v1/buildings` | إنشاء مبنى |
| GET | `/api/v1/units?buildingId=&page=1` | الوحدات |
| GET | `/api/v1/units/summary` | ملخص لوحة التحكم |
| GET | `/api/v1/company-data?keys=` | بيانات JSON (محاسبة، عقود، …) |
| POST | `/api/v1/company-data/bulk` | حفظ دفعي |
| GET | `/api/v1/contracts?unitId=&page=1` | العقود |
| GET | `/api/v1/contracts/summary` | ملخص العقود |
| POST | `/api/v1/files/upload` | رفع مرفق |
| GET | `/api/v1/files/:id/content` | قراءة مرفق |
| GET | `/api/v1/saas/plans` | باقات SaaS |
| POST | `/api/v1/saas/register` | تسجيل شركة جديدة (API) |
| GET | `/api/v1/companies/current` | الشركة الحالية + الاستخدام |
| GET/POST/PATCH | `/api/v1/companies/members` | أعضاء الشركة |

## مثال تسجيل دخول

```powershell
curl -s -X POST http://localhost:3790/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@bhd.local","password":"Admin1234!"}'
```

## SaaS — تسجيل شركة (API فقط)

```powershell
curl -s -X POST http://localhost:3790/api/v1/saas/register `
  -H "Content-Type: application/json" `
  -d '{"companyNameAr":"شركة تجريبية","adminEmail":"owner@example.com","adminPassword":"SecurePass1!"}'
```

عند تفعيل `SAAS_REGISTRATION_SECRET` في `.env`، أضف الرأس `X-Registration-Key`.

## الهجرة من SQLite المحلي

```powershell
cd apps\api
npm run migrate:kv -- --db "C:\dev\عقود الايجار\data\rental.db" --company-slug bhd-demo
```

## هجرة كاملة (بيانات + ملفات)

```powershell
cd apps\api
npm run db:deploy
npm run migrate:kv -- --db "C:\path\rental.db" --company-slug bhd-demo
npm run migrate:files -- --db "C:\path\rental.db" --data-dir "C:\path\BHD-Real-Estate"
```

## SaaS (2E)

- باقات: trial / starter / business / enterprise — حدود مستخدمين ووحدات
- `requireActiveCompany` — يمنع الشركات المعلّقة أو انتهاء التجربة
- تخزين الملفات: محلي (`FILE_STORAGE_DIR`) أو S3-compatible (`S3_BUCKET` + مفاتيح)

انظر: `docs/CLOUD_ARCHITECTURE_PLAN.md`
