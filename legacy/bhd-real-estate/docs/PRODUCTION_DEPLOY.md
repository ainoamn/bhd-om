# نشر الإنتاج — BHD Real Estate

> واجهة واحدة للمستخدم — PostgreSQL + API خلف `CLOUD_API_URL` — HTTPS عبر Caddy.

## المتطلبات

- VPS (Ubuntu 22+ أو Windows Server مع Docker Desktop)
- نطاق DNS يشير إلى السيرفر (`A` record)
- Docker + Docker Compose

## 1) إعداد محلي (مرة واحدة)

```powershell
إعداد-مسار-A.cmd
```

أو يدوياً:

```powershell
docker compose -f deploy\docker-compose.stack.yml up -d --build
cd apps\api
npm run db:deploy
npm run db:seed
node tools\ensure-server-cloud-env.js
تشغيل-الخادم.cmd
```

## 2) إعداد أسرار الإنتاج

```powershell
node tools\generate-jwt-secrets.js
copy deploy\.env.prod.example deploy\.env.prod
# الصق الأسرار وعدّل DOMAIN و ACME_EMAIL
```

## 2) التشغيل

```powershell
تشغيل-الإنتاج.cmd
```

أو يدوياً:

```powershell
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 3) البذرة الأولى (مرة واحدة)

```powershell
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npm run db:seed
```

## 4) هجرة بياناتكم

من جهاز يصل إلى PostgreSQL (أو عبر `DATABASE_URL` في `apps\api\.env`):

```powershell
هجرة-السحابة.cmd --db "C:\path\rental.db" --data-dir "C:\path\attachments"
```

## 5) التحقق

```powershell
cd apps\api
npm run verify:stack -- --api https://YOUR_DOMAIN
npm run load:test -- --api https://YOUR_DOMAIN --users 15
```

> `verify:stack` يتصل بـ `/api/v1` عبر البروكسي على نفس النطاق إذا كان `CLOUD_API_URL` مضبوطاً على `web`.

## 6) نسخ احتياطي

| الطريقة | الأمر |
|---------|--------|
| يدوي | `نسخ-احتياطي-السحابة.cmd` |
| مجدول Windows | `deploy\backup-scheduled.ps1` عبر Task Scheduler (02:00 يومياً) |
| استعادة | `npm run restore:pg -- --file backups\bhd-cloud-....sql` |

## البنية

```
المستخدم → HTTPS (Caddy :443)
              → web:3789 (HTML + proxy /api/v1)
                    → api:3790 (PostgreSQL)
```

- **لا تفتح منفذ 3790** للعامة — API داخل شبكة Docker فقط.
- SQLite في `web` للتوافق المحلي؛ البيانات الرئيسية في PostgreSQL.

## S3 للمرفقات (اختياري)

في `deploy/.env.prod`:

```
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ENDPOINT=https://...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| شهادة HTTPS لا تُصدر | تحقق DNS + منفذ 80/443 + `ACME_EMAIL` |
| الواجهة بيضاء | `docker compose logs web` |
| لا مزامنة سحابة | `CLOUD_API_URL=http://api:3790` داخل حاوية web |
| 502 على `/api/v1` | `docker compose logs api` — انتظر `migrate deploy` |

---

انظر أيضاً: `docs/LAUNCH_PATH_A.md`
