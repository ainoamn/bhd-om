# عزل بيانات الحساب بعد التبديل (خصوصية — نموذج جوجل)

> **الحالة:** إلزامي — issuer: https://id.bhd-om.com  
> **النموذج:** كل تبويب مربوط بحساب عبر `?au=<sub>` (مثل Google `authuser`).

---

## القاعدة

1. **تبويب:** `sessionStorage` (`bhd_account_tokens`, `bhd_active_au`) + `?au=` في الرابط.
2. **تبديل صريح:** غطاء فارغ بلا نص → `switch` + form `rebind`.
3. **انحراف / F5:** `POST /api/auth/bhd/rebind` JSON صامت — بلا وميض.
4. **خلفية:** `BhdSilentSso` كل ~20ث + `visibilitychange`.

مرجع: `lib/identity/client.ts` · `BhdPrivacyGate` · `BhdSilentSso` · `SessionAwareLayout`.

تفاصيل: [`BHD-CURSOR-PRODUCT-WIRE.md`](BHD-CURSOR-PRODUCT-WIRE.md) §3.
