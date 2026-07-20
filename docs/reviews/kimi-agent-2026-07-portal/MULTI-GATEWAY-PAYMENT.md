# نظام الدفع — 11 بوابة (Kimi 03+04)

## المصدر
`Kimi_Agent_موقع العقارات.03` + `.04`

## البوابات
| مفتاح | الاسم | متغيرات التفعيل |
|-------|--------|------------------|
| thawani | ثواني | `THAWANI_SECRET_KEY` |
| cmi | بوابة وطنية / OmanNet | `CMI_MERCHANT_ID` (+ `CMI_API_KEY`, `CMI_STORE_KEY`) |
| network-intl | Network International | `NI_API_KEY` (+ `NI_OUTLET_REF`) |
| telr | Telr | `TELR_STORE_ID` |
| hyperpay | HyperPay | `HYPERPAY_ACCESS_TOKEN` (+ `HYPERPAY_ENTITY_ID`) |
| payfort | Amazon Payment Services | `PAYFORT_MERCHANT_IDENTIFIER` |
| myfatoorah | MyFatoorah | `MF_API_KEY` |
| paytabs | PayTabs | `PAYTABS_SERVER_KEY` (+ `PAYTABS_PROFILE_ID`) |
| tap | Tap | `TAP_SECRET_KEY` |
| stripe | Stripe | `STRIPE_SECRET_KEY` |
| paypal | PayPal | `PAYPAL_CLIENT_ID` |

## الواجهة
`/ar/portal/tenant/v2` → «اختر طريقة الدفع» مع فلاتر: الكل / عمان / الخليج

## ملاحظة رفع المستندات
مسارات رفع المستندات الحالية في المشروع (`/api/upload/booking-documents`, legacy-bridge files) لم تُستبدل من حزمة 04 — لا تغييرات جديدة على رفع المستندات في هذه الدفعة.
