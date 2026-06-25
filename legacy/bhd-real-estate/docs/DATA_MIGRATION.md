# هجرة البيانات إلى السحابة

## أين قاعدة البيانات؟

```powershell
npm run pick:db          # من apps\api — يختار أكبر rental.db
node tools\inspect-rental-db.js --db "مسار\rental.db"
```

| المسار على جهازكم | الحالة |
|-------------------|--------|
| `bhd-app-config.json` → `dataDir` | مجلد Desktop الفعلي |
| Dropbox\...\BHD\rental.db | **2.4 MB — 3 وحدات** (تمت هجرته) |
| `data\rental.db` في المشروع | فارغ — للتطوير فقط |

> إذا كان عندكم ~10,000 وحدة في بيئة أخرى، انسخوا `rental.db` + مجلد `buildings/` إلى جهاز متصل بالسحابة ثم أعيدوا الهجرة.

## أوامر الهجرة

```powershell
# معاينة
هجرة-السحابة.cmd --dry-run

# بيانات فقط (KV + مباني + وحدات)
هجرة-السحابة.cmd --db "C:\path\rental.db"

# بيانات + مرفقات
هجرة-السحابة.cmd --db "C:\path\rental.db" --data-dir "C:\path\BHD-folder"
```

`--data-dir` = المجلد الذي فيه `rental.db` و `buildings/`.

## بعد الهجرة

```powershell
cd apps\api
npm run verify:stack
npm run backup:pg
curl.exe -s -H "Authorization: Bearer TOKEN" http://127.0.0.1:3790/api/v1/units/summary
```

## إعادة الهجرة (تحديث كامل)

PostgreSQL يستخدم `upsert` — إعادة تشغيل `هجرة-السحابة.cmd` **تحدّث** السجلات دون حذف الشركة.

للبدء من صفر: احذف بيانات الشركة من PG أو أنشئ شركة جديدة عبر `/api/v1/saas/register`.

## Desktop + سحابة

في `bhd-app-config.json`:

```json
"cloudApiUrl": "http://127.0.0.1:3790"
```

أو متغير البيئة `BHD_CLOUD_API_URL` قبل تشغيل Desktop.

---

انظر: `docs/LAUNCH_PATH_A.md`
