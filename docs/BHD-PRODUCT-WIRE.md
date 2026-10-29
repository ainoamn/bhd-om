# ربط bhd-om بهوية BHD الحية

> تاريخ التحديث: 29 أكتوبر 2026  
> المصدر: https://id.bhd-om.com — الأيقونات: /admin#apps — الربط: /admin#connect

## الحالة: مربوط (2026-10-29)

- `bhd-identity.js` في `app/layout.tsx`
- CSP: `script-src` / `connect-src` / `img-src` لـ `id.bhd-om.com`
- `POST/GET /api/auth/bhd/rebind`
- كتالوج حي في `BhdAppSwitcher` (`useBhdCatalog`)
- `BhdSilentSso` + `BhdPrivacyGateSession` في `SessionAwareLayout`
- `lib/identity/client.ts` — silent JSON rebind، `?au=`، `paintPrivacyVeil`
- `lib/identity/window-session.ts` — `ACCOUNT_TOKENS_KEY` / `ACTIVE_AU_KEY`
- `app/api/auth/bhd/rebind/route.ts` — JSON + redirect مع `au=` (issuer: https://id.bhd-om.com)
- `maxAge` كوكي الجلسة من `/api/bhd/runtime`

## مراجع

انظر نسخ الوثائق في هذا المجلد:
- `BHD-CURSOR-PRODUCT-WIRE.md` — أمر الربط الكامل
- `BHD-ACCOUNT-ISOLATION.md` — عزل التبديل (rebind بالـ Bearer)
- `BHD-IDENTITY-RUNTIME.md` — runtime + سكربت
- `BHD-PRODUCTS-WIRE-STATUS.md` — حالة كل المنتجات

## تحقق

1. كتالوج الأيقونات من `/api/bhd/catalog` في الرأس والفوتر.
2. تبديل حساب → `POST /api/auth/bhd/rebind` → بيانات الحساب الجديد فقط.
3. مدة الجلسة من `/api/bhd/runtime`.

## تحديث §95 (29 أكتوبر 2026)

إصلاح جذر العزل على الهوية: `POST /api/auth/switch` يكتب `bhd_id` دائماً. هذا المنتج يعتمد `rebind` محلياً بعد التبديل. التفاصيل: `BHD-ACCOUNT-ISOLATION.md`.
