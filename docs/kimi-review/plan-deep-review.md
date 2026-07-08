# خطة المراجعة العميقة الشاملة - bhd-om
## تاريخ: 2026-07-06

---

## 1. ما تم فحصه حتى الآن

### الصفحات الموجودة (16 صفحة):
| الصفحة | المسار | الحالة |
|--------|--------|--------|
| الرئيسية | /ar, /en | ✅ تعمل - محتاجة تحسين |
| العقارات | /ar/properties | ✅ تعمل |
| المشاريع | /ar/projects | ✅ تعمل |
| الخدمات | /ar/services | ✅ تعمل |
| الباقات | /ar/subscriptions | ✅ تعمل |
| التواصل | /ar/contact | ✅ تعمل |
| عنا | /ar/about | ✅ تعمل |
| تسجيل الدخول | /ar/login | ✅ تعمل |
| التسجيل | /ar/register | ✅ تعمل |
| لوحة التحكم | /ar/admin | ✅ تعمل |
| الدفع | /ar/payment | ✅ تعمل |
| نسيت كلمة المرور | /ar/forgot-password | ✅ تعمل |
| انتحال الهوية | /ar/impersonate | ✅ تعمل |
| التوقيع | /ar/sign/[token] | ✅ تعمل |
| المسح | /ar/scan | ✅ تعمل |
| النظام القديم | /api/admin/legacy-real-estate | ✅ تعمل - بطيء 30s |

### المشاكل التي اكتشفتها:

#### أ. مشكلة البطء في الصفحة القديمة (Legacy):
- ملف HTML: 72,626 سطر (~3.5 MB)
- `force-dynamic` - لا cache
- `Cache-Control: no-store`
- `loadCanonicalContractStatusesFromNeon` تأخذ 7-15 ثانية
- الإجمالي: 15-30 ثانية

#### ب. مشكلة العدادات في StatsBar:
- تظهر 0 بدلاً من الأرقام الحقيقية
- تحتاج ربط مع قاعدة البيانات

#### ج. الصفحة الرئيسية:
- المكونات تعمل لكنها تحتاج:
  - بيانات حقيقية من قاعدة البيانات
  - تحسين الأداء
  - تصميم أكثر احترافية

---

## 2. خطة العمل الحقيقية

### المرحلة 1: حل البطء (أولوية قصوى)

#### 1.1. إضافة Cache للصفحة القديمة
- [ ] تخزين HTML في الذاكرة
- [ ] Cache Bridge Payload
- [ ] Cache Contract Lifecycle
- [ ] Edge Caching headers

#### 1.2. تحسين Prisma
- [ ] `relationLoadStrategy: 'join'` ✅ (موجود على GitHub)
- [ ] إضافة indexes ناقصة
- [ ] استخدام `unstable_cache()`

#### 1.3. تحسين Next.js
- [ ] `cacheComponents: true` ✅ (موجود على GitHub)
- [ ] `ppr: true` ✅ (موجود على GitHub)
- [ ] `cacheLife` ✅ (موجود على GitHub)

### المرحلة 2: إصلاح StatsBar
- [ ] ربط العدادات مع قاعدة البيانات
- [ ] استخدام `unstable_cache()`

### المرحلة 3: تحسين الصفحة الرئيسية
- [ ] ربط HeroOman ببيانات حقيقية
- [ ] ربط PropertiesPreview بـ Prisma
- [ ] تحسين OmanGallery
- [ ] تحسين WhyChooseUs

### المرحلة 4: مراجعة كل الصفحات
- [ ] فحص كل صفحة واحدة واحدة
- [ ] التأكد من الروابط
- [ ] التأكد من الأداء

---

## 3. الملفات التي سأعدّلها

| الملف | الإجراء | السبب |
|-------|---------|-------|
| `lib/prisma.ts` | ✅ تم | relationLoadStrategy |
| `next.config.ts` | ✅ تم | cache, ppr, cacheLife |
| `lib/archive/index.ts` | ✅ تم | نظام الأرشفة |
| `lib/encryption/index.ts` | ✅ تم | نظام التشفير |
| `lib/api-guard.ts` | ✅ تم | حماية API |
| `components/home/HeroOman.tsx` | 🔄 تحسين | ربط بيانات حقيقية |
| `components/home/StatsBar.tsx` | 🔄 تحسين | ربط بـ DB |
| `components/home/PropertiesPreview.tsx` | 🔄 تحسين | caching |
| `app/api/admin/legacy-real-estate/[[...path]]/route.ts` | 🔴 جديد | Cache HTML |
| `lib/server/legacyBridge.ts` | 🔄 تحسين | Cache payload |
| `lib/server/contractLifecycle.ts` | 🔄 تحسين | Cache lifecycle |

---

## 4. كيفية التنفيذ

سأستخدم 5 فرق متخصصة بالتوازي:
1. فريق حل البطء (3 أعضاء)
2. فريق تحسين الصفحة الرئيسية (2 عضو)
3. فريق مراجعة الصفحات (2 عضو)
4. فريق اختبار (1 عضو)
5. فريق توثيق (1 عضو)
