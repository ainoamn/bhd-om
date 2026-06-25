# BHD Real Estate — نظام إدارة العقارات

واجهة واحدة (SPA) + تخزين محلي (Desktop / Server) + ترقية شفافة إلى PostgreSQL السحابي.

## 📋 توصيات تحسين المشروع
للحصول على توصيات مفصلة حول تحسين المشروع، راجع: [توصيات-التحسين.md](docs/توصيات-التحسين.md)

## التشغيل السريع

| الهدف | الأمر |
|--------|--------|
| **إعداد كامل (مرة واحدة)** | `إعداد-مسار-A.cmd` |
| **السحابة (API)** | `تشغيل-السحابة.cmd` |
| **الواجهة (متصفح)** | `تشغيل-الخادم.cmd` |
| **Desktop** | `desktop\تشغيل-التطبيق.cmd` |
| **تشغيل للفريق (LAN)** | `تشغيل-للفريق.cmd` |
| **اختبار الفريق** | `docs/TEAM_TESTING.md` |

## المتطلبات

- Node.js 22+
- Docker Desktop (للسحابة المحلية أو الإنتاج)
- للـ Desktop: مجلد بيانات (OneDrive مُفضّل)

## السحابة + الواجهة

1. شغّل **Docker Desktop**
2. `إعداد-مسار-A.cmd`
3. `تشغيل-الخادم.cmd` → http://localhost:3789
4. من `apps\api`: `npm run verify:full`

في `server\.env`:

```
CLOUD_API_URL=http://127.0.0.1:3790
```

## الهجرة إلى السحابة

```powershell
node tools\find-rental-db.js
هجرة-السحابة.cmd --dry-run --db "C:\path\rental.db"
هجرة-السحابة.cmd --db "C:\path\rental.db" --data-dir "C:\path\attachments"
```

## الإنتاج (VPS + HTTPS)

```powershell
node tools\generate-jwt-secrets.js
copy deploy\.env.prod.example deploy\.env.prod
تشغيل-الإنتاج.cmd
```

انظر: [`docs/LAUNCH_PATH_A.md`](docs/LAUNCH_PATH_A.md) · [`docs/PRODUCTION_DEPLOY.md`](docs/PRODUCTION_DEPLOY.md)

## هيكل المشروع

```
bhd-real-estate.html   ← الواجهة + المنطق
desktop/               ← Electron + SQLite
server/                ← خادم محلي + بروكسي سحابة
apps/api/              ← Cloud API (PostgreSQL)
tools/                 ← هجرة، اختبار، نسخ احتياطي
deploy/                ← Docker Compose
scripts/               ← سكربتات تشغيل (.cmd)
patches/               ← ملفات التصحيح المؤقتة (.py)
config/                ← ملفات تكوين إضافية
```

**حساب تجريبي (بعد seed):** `admin@bhd.local` / `Admin1234!`
