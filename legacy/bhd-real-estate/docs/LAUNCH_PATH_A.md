# مسار A — إطلاق شركتكم على السحابة

> **الهدف:** 15 مستخدماً / 10,000 وحدة / نفس الواجهة تماماً — بدون إظهار «سحابة» أو «PostgreSQL» للمستخدم.

## الأسبوع 1 — البنية والتحقق

| اليوم | المهمة | الأمر |
|-------|--------|-------|
| 1 | إعداد تلقائي | `إعداد-مسار-A.cmd` |
| 1 | تشغيل PostgreSQL | `docker compose -f deploy\docker-compose.stack.yml up -d --build` |
| 1 | إعداد API | `cd apps\api` → `copy .env.example .env` → `npm install` |
| 1 | قاعدة البيانات | `npm run db:deploy` → `npm run db:seed` |
| 2 | تشغيل API | `تشغيل-السحابة.cmd` أو `npm run dev` |
| 2 | فحص الجاهزية | `npm run verify:stack` |
| 2 | اختبار دخان | `npm run smoke:test` |
| 2 | اختبار حمل 15 مستخدماً | `npm run load:test -- --users 15` |
| 2 | عزل الشركات | `npm run test:isolation` |
| 3–5 | ربط الواجهة | في `server\.env`: `CLOUD_API_URL=http://127.0.0.1:3790` ثم `تشغيل-الخادم.cmd` |
| 5 | فحص المسار الكامل | `npm run verify:full` (واجهة + بروكسي سحابة) |

**معايير النجاح:** تسجيل دخول، لوحة تحكم، حفظ مبنى/وحدة يظهر بعد إعادة تحميل من جهاز آخر.

## الأسبوع 2 — هجرة بياناتكم

| المهمة | الأمر |
|--------|-------|
| معاينة الهجرة (بدون كتابة) | `هجرة-السحابة.cmd --dry-run --db "C:\path\rental.db"` |
| هجرة KV (محاسبة، عقود، إعدادات) | `هجرة-السحابة.cmd --db "C:\path\rental.db"` |
| هجرة + مرفقات | `هجرة-السحابة.cmd --db "C:\path\rental.db" --data-dir "C:\path\BHD-Real-Estate"` |
| نسخ احتياطي قبل الهجرة | نسخ `rental.db` + مجلد المرفقات يدوياً |
| نسخ احتياطي بعد الهجرة | `npm run backup:pg` |

**جرب أولاً:** `هجرة-السحابة.cmd --dry-run` أو `npm run pick:db` من `apps\api`.

**تم على جهازكم:** هجرة Dropbox (3 وحدات، 34 مفتاح KV) — انظر `docs/DATA_MIGRATION.md` لقاعدة 10k عند توفرها.

## الأسبوع 3 — اختبار الفريق (15 مستخدماً)

```powershell
تشغيل-للفريق.cmd
```

انظر: **`docs/TEAM_TESTING.md`**

| السيناريو | ماذا تختبرون |
|-----------|--------------|
| متزامن | 3–5 مستخدمين يعدّلون وحدات مختلفة في نفس الوقت |
| نفس الوحدة | مستخدمان يفتحان نفس العقد — آخر حفظ يفوز (كما اليوم) |
| محاسبة | قيد، سند، تقرير، طباعة A4 |
| مرفقات | رفع + معاينة + طباعة |
| انقطاع | إيقاف API مؤقتاً — Desktop يستمر محلياً ثم يزامن عند العودة |

**Desktop + سحابة:** عيّن `BHD_CLOUD_API_URL=http://127.0.0.1:3790` قبل تشغيل التطبيق، أو أضف `cloudApiUrl` في `bhd-app-config.json`.

## الأسبوع 4 — إنتاج

| المهمة | الأمر / المرجع |
|--------|----------------|
| إعداد أسرار | `node tools\generate-jwt-secrets.js` |
| نشر Docker + HTTPS | `تشغيل-الإنتاج.cmd` |
| التفاصيل | `docs/PRODUCTION_DEPLOY.md` |
| نسخ يومي | `نسخ-احتياطي-السحابة.cmd` أو `deploy\backup-scheduled.ps1` |
| استعادة | `npm run restore:pg -- --file backups\....sql` |

---

## ما يُؤجَّل (مسار B — لاحقاً)

- محاسبة normalized في PostgreSQL (الآن: JSON blobs عبر `company-data`)
- فوترة Stripe / بوابة محلية
- subdomain لكل شركة

---

## أوامر سريعة

```powershell
# من جذر المشروع — إعداد كامل
إعداد-مسار-A.cmd

# أو خطوة بخطوة:
docker compose -f deploy\docker-compose.stack.yml up -d --build
cd apps\api
npm run db:deploy && npm run db:seed
cd ..\..
تشغيل-الخادم.cmd

# في apps\api بعد تشغيل الخادم:
npm run verify:full
```

```powershell
# ربط الخادم المحلي بالسحابة
# server\.env
CLOUD_API_URL=http://127.0.0.1:3790
```

---

*آخر تحديث: مسار A — بعد اكتمال المرحلة 2E*
