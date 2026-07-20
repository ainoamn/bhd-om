# بوابة المستأجر والمالك (Kimi 2026-07) — دمج في المستودع

## المصدر
`C:\Users\ahami\Downloads\Kimi_Agent_موقع العقارات 02`

## ما دُمج
- صفحات: `/[locale]/portal/tenant`, `/tenant/v2`, `/owner`, `/owner/v2`, صفحات نجاح/إلغاء الدفع
- APIs: `/api/portal/*`, `/api/payment/thawani`
- مكوّنات: `components/portal/*`
- Prisma: `TenantScore`, `TenantAlert`, `TenantTask`, `DueAmount`, `SmartSignature`, `AutoUserAccount`
- تقارير: `docs/reviews/kimi-agent-2026-07-portal/`

## ما لم يُستبدل
- `lib/encryption` و `lib/archive` الحاليان (أحدث من حزمة Kimi)
- بوابة الدفع الحالية `lib/server/paymentGateway.ts` ما زالت للمسار العام؛ `lib/payment/thawani.ts` للبوابة

## بعد الدمج — مطلوب على السيرفر
```bash
npx prisma migrate dev --name portal_tenant_owner_v2
# أو على الإنتاج:
npx prisma db push
```

متغيرات Thawani (إن وُجدت):
```
THAWANI_SECRET_KEY=
THAWANI_PUBLISHABLE_KEY=
THAWANI_SANDBOX=true
```

## روابط
- المستأجر: `/ar/portal/tenant/v2`
- المالك: `/ar/portal/owner/v2`
