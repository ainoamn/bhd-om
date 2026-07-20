# نظام الدفع متعدد البوابات (Kimi 03)

## المصدر
`C:\Users\ahami\Downloads\Kimi_Agent_موقع العقارات.03`

## البوابات
| بوابة | ملف | متغيرات البيئة |
|-------|-----|----------------|
| ثواني | `lib/payment/thawani.ts` | `THAWANI_SECRET_KEY`, `THAWANI_PUBLISHABLE_KEY`, `THAWANI_SANDBOX` |
| Stripe | `lib/payment/stripe.ts` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` |
| PayPal | `lib/payment/paypal.ts` | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX` |
| Telr | `lib/payment/telr.ts` | `TELR_STORE_ID`, `TELR_AUTH_KEY`, `TELR_SANDBOX` |

## API
- `POST/GET /api/payment` — موحد
- `GET /api/payment/providers` — قائمة البوابات وحالتها
- `POST/GET /api/payment/thawani` — توافقية خلفية

## واجهة
- `components/portal/PaymentSelector.tsx`
- بوابة المستأجر: زر «اختر طريقة الدفع»

## ملاحظة
مسار حجز العقار العام ما زال عبر `lib/server/paymentGateway.ts` (Thawani/mock) — منفصل عن مدير البوابة للبوابة.
