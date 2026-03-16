# موقع بن حمود للتطوير - BIN HAMOOD DEVELOPMENT SPC

موقع إلكتروني متطور ومتعدد اللغات لشركة بن حمود للتطوير - شركة متخصصة في التطوير العقاري والاستثمار في سلطنة عمان.

## 🔗 المستودع والمصدر

- **GitHub:** [https://github.com/ainoamn/bhd-om](https://github.com/ainoamn/bhd-om)
- **استنساخ:** `git clone https://github.com/ainoamn/bhd-om.git`

> **العمل على أكثر من جهاز؟** راجع [docs/WORKFLOW.md](docs/WORKFLOW.md) لسير العمل والمزامنة بين الأجهزة.  
> **لعدم فقدان التصميم والترابط عند التحديث؟** راجع [docs/SITE-SCENARIOS-AND-LINKS.md](docs/SITE-SCENARIOS-AND-LINKS.md) — سيناريوهات الموقع، خريطة الصفحات، ومعايير التصميم.

## 📋 نظرة عامة

هذا الموقع مبني باستخدام أحدث التقنيات لضمان سرعة فائقة وتجربة مستخدم ممتازة. الموقع يدعم اللغة العربية والإنجليزية بالكامل مع تصميم متجاوب يعمل على جميع الأجهزة.

## 🎯 المواصفات الفنية

### التقنيات الأساسية

- **Next.js 16.1.6** (Turbopack) - إطار عمل React مع App Router
- **React 19.2.3** - مكتبة واجهة المستخدم
- **TypeScript 5** - للبرمجة الآمنة والنوعية
- **Tailwind CSS 4** - نظام تصميم Utility-First
- **next-intl 4.8.2** - نظام الترجمة والدولية (i18n)
- **Prisma 7.3.0** - ORM لقاعدة البيانات
- **SQLite** - قاعدة البيانات (قابلة للترقية إلى PostgreSQL)

### الخطوط

- **Cairo** - للغة العربية (أوزان: 300-900)
- **Inter** - للغة الإنجليزية
- **Display: swap** - لتحسين أداء تحميل الخطوط

## 🏗️ البنية المعمارية

### هيكل المشروع

```
bhd-om/
├── app/
│   ├── [locale]/                    # صفحات متعددة اللغات
│   │   ├── layout.tsx              # التخطيط الرئيسي مع Header/Footer
│   │   ├── page.tsx                 # الصفحة الرئيسية
│   │   ├── globals.css              # الأنماط العامة ونظام الألوان
│   │   ├── loading.tsx              # صفحة التحميل
│   │   ├── error.tsx                # صفحة الأخطاء
│   │   ├── not-found.tsx            # صفحة 404
│   │   │
│   │   ├── properties/              # صفحة العقارات
│   │   │   ├── page.tsx            # قائمة العقارات
│   │   │   └── [id]/
│   │   │       └── page.tsx        # تفاصيل العقار
│   │   │
│   │   ├── projects/                # صفحة المشاريع
│   │   │   ├── layout.tsx          # تخطيط خاص (إخفاء Header)
│   │   │   ├── page.tsx            # قائمة المشاريع
│   │   │   └── [id]/
│   │   │       └── page.tsx        # تفاصيل المشروع
│   │   │
│   │   ├── services/                # صفحة الخدمات
│   │   ├── contact/                 # صفحة التواصل
│   │   ├── about/                    # صفحة عن الشركة
│   │   └── admin/                   # لوحة التحكم الإدارية
│   │       ├── layout.tsx           # تخطيط اللوحة مع القائمة الجانبية
│   │       ├── address-book/        # دفتر العناوين
│   │       ├── bank-details/        # التفاصيل البنكية
│   │       ├── accounting/          # نظام المحاسبة
│   │       ├── properties/          # إدارة العقارات
│   │       ├── bookings/            # إدارة الحجوزات
│   │       └── ...
│   │
│   └── page.tsx                      # إعادة توجيه للصفحة الرئيسية
│
├── components/
│   ├── shared/                      # مكونات مشتركة
│   │   ├── PageHero.tsx            # Hero section مع Navigation مدمج
│   │   └── ImageWithWatermark.tsx   # مكون الصور مع العلامة المائية
│   │
│   ├── home/                         # مكونات الصفحة الرئيسية
│   │   ├── Hero.tsx                 # Hero الرئيسي
│   │   ├── ProjectsPreview.tsx      # معاينة المشاريع
│   │   ├── AboutPreview.tsx         # معاينة عن الشركة
│   │   ├── Services.tsx             # الخدمات
│   │   ├── Testimonials.tsx         # الشهادات
│   │   └── ContactSection.tsx       # قسم التواصل
│   │
│   ├── properties/                  # مكونات العقارات
│   │   ├── PropertiesList.tsx       # قائمة العقارات
│   │   ├── PropertyDetails.tsx      # تفاصيل العقار
│   │   └── PropertyImageSlider.tsx  # سلايدر صور العقار مع علامة النوع
│   │
│   ├── projects/                     # مكونات المشاريع
│   │   ├── ProjectsList.tsx         # قائمة المشاريع
│   │   ├── ProjectDetails.tsx       # تفاصيل المشروع
│   │   ├── ImageSlider.tsx          # سلايدر الصور
│   │   └── BuildingMaps.tsx         # خرائط المبنى (Accordion)
│   │
│   ├── services/                     # مكونات الخدمات
│   │   └── ServicesPage.tsx
│   │
│   ├── contact/                      # مكونات التواصل
│   │   ├── ContactPage.tsx
│   │   ├── ContactForm.tsx
│   │   └── CallbackForm.tsx
│   │
│   ├── about/                        # مكونات عن الشركة
│   │   └── AboutPage.tsx
│   │
│   ├── admin/                        # مكونات لوحة التحكم
│   │   ├── AccountingSection.tsx     # نظام المحاسبة (دليل حسابات، قيود، فواتير، تقارير)
│   │   ├── InvoicePrint.tsx          # طباعة الفواتير والإيصالات
│   │   ├── AdminPageHeader.tsx
│   │   └── ...
│   │
│   ├── Header.tsx                    # Header (مخفي في معظم الصفحات)
│   ├── Footer.tsx                    # Footer
│   └── LanguageSwitcher.tsx         # مبدل اللغة
│
├── i18n/                             # إعدادات الترجمة
│   ├── routing.ts                    # إعدادات التوجيه
│   └── request.ts                    # طلب الرسائل
│
├── messages/                          # ملفات الترجمة
│   ├── ar.json                       # الترجمات العربية
│   └── en.json                       # الترجمات الإنجليزية
│
├── lib/                               # مكتبات مساعدة
│   ├── prisma.ts                     # Prisma Client
│   ├── documentUploadLink.ts         # رابط الرفع (إرسال واتساب/بريد)
│   └── data/                         # بيانات localStorage (لوحة التحكم)
│       ├── accounting.ts             # نظام المحاسبة (دليل حسابات، قيود، فواتير، تقارير)
│       ├── addressBook.ts            # دفتر العناوين
│       ├── bankAccounts.ts           # الحسابات البنكية
│       ├── bookingDocuments.ts       # مستندات توثيق العقد
│       ├── propertyLandlords.ts      # ربط المالك بالعقار
│       └── ...                       # بيانات أخرى
│
├── prisma/                            # قاعدة البيانات
│   └── schema.prisma                 # مخطط قاعدة البيانات
│
├── public/                            # الملفات الثابتة
│   ├── logo-bhd.png                  # شعار الشركة
│   └── omr-symbol.png                # شعار الريال العماني
│
├── next.config.ts                     # إعدادات Next.js
├── tsconfig.json                      # إعدادات TypeScript
└── package.json                       # التبعيات
```

## 🎨 نظام التصميم

> **عنصر أساسي**: التباعد والخط والنقل السريع هي معايير ثابتة تُطبق على كل الموقع.

### التباعد والخط (Typography & Spacing)

| المعيار | القيمة | المتغير CSS |
|--------|--------|-------------|
| مسافة بين السطور | 1.5 minimum | `--line-height-min` |
| بين العنوان والفقرة | 2rem | `--space-title-paragraph` |
| بين العناوين والصور والإطارات | 2rem | `--space-heading-media` |

### نظام الألوان (Mantsion Theme)

الألوان مستوحاة من ثيم Mantsion Real Estate مع طابع عماني:

```css
/* الألوان الأساسية */
--primary: #8B6F47        /* ذهبي بني فاتح */
--primary-dark: #6B5535   /* ذهبي بني غامق */
--primary-light: #A6895F  /* ذهبي بني فاتح جداً */

/* الألوان الثانوية */
--secondary: #D4A574      /* بيج/كريمي */
--secondary-dark: #B8905A
--secondary-light: #E8C19A

/* ألوان التمييز */
--accent: #C9A961         /* ذهبي فاتح */
--accent-dark: #A6894F
--accent-light: #E0C17A
```

### الخطوط

- **العربية**: Cairo (أوزان: 300-900)
- **الإنجليزية**: Inter
- **Display**: swap (لتحسين الأداء)

### مبادئ التصميم (عناصر أساسية في بناء الموقع)

1. **السرعة القصوى - كالبرق والضوء**:
   - Prefetching لجميع الروابط (تنقل فوري)
   - View Transitions API للانتقال بين الصفحات دون شعور المستخدم بالتأخير
   - Image optimization مع Next/Image
   - Lazy loading للصور
   - Compression مفعل
   - **هدف**: عند الضغط على رابط، التنقل يكون فورياً كوميض البرق

2. **التجربة المستخدم**:
   - انتقالات سلسة بين الصفحات (View Transitions)
   - تصميم متجاوب بالكامل
   - دعم RTL للعربية
   - **مسافة بين السطور**: لا تقل عن 1.5 (line-height)
   - **بين العنوان والفقرة**: 2rem
   - **بين العناوين والصور والإطارات**: 2rem

3. **العلامة المائية**:
   - شعار الشركة في منتصف الصور (شفاف 30%)
   - شعار في الزاوية اليمنى العلوية (واضح 90%)
   - تطبق على جميع صور المشاريع والعقارات

## 🚀 الأداء والتحسينات

### تحسينات Next.js Config

```typescript
{
  compress: true,                    // ضغط الملفات
  poweredByHeader: false,           // إخفاء رأس Next.js
  reactStrictMode: true,            // وضع React الصارم
  
  images: {
    formats: ['image/avif', 'image/webp'],  // تنسيقات حديثة
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60,            // تخزين مؤقت للصور
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',  // إزالة console.log
  },
  
  experimental: {
    optimizePackageImports: ['@prisma/client', 'next-intl'],
    optimizeCss: true,              // تحسين CSS
  }
}
```

### تحسينات الروابط

- **Prefetching**: جميع الروابط تستخدم `prefetch={true}`
- **Resource Hints**: DNS prefetch و preconnect للصور والخطوط
- **Transition**: انتقال فوري بين الصفحات

### تحسينات الصور

- استخدام `next/image` مع:
  - `quality={85}` للصور المهمة
  - `loading="lazy"` للصور الثانوية
  - `priority` للصور الرئيسية
  - `sizes` attribute محسّن

## 📱 المكونات الرئيسية

### PageHero Component

مكون Hero مشترك لجميع الصفحات مع:
- Navigation مدمج (Logo, Links, Language Switcher, Login)
- خلفية صورة ديناميكية
- محتوى قابل للتخصيص (title, subtitle, description)
- وضع compact للصفحات الفرعية

**الاستخدام**:
```tsx
<PageHero
  title="عنوان الصفحة"
  subtitle="عنوان فرعي"
  backgroundImage="url"
  description="وصف"
  compact={true}  // للصفحات الفرعية
/>
```

### ImageSlider Component

سلايدر صور متقدم مع:
- Navigation arrows
- Thumbnails
- Image counter
- Watermarks (مركز و corner)

### PropertyImageSlider Component

سلايدر مخصص للعقارات مع:
- علامة واضحة للنوع (للبيع/للإيجار)
- تصميم مميز

### BuildingMaps Component

Accordion لخرائط المبنى مع:
- فتح/إغلاق
- سلايدر للخرائط المتعددة
- Watermarks

## 🌐 نظام التوجيه والترجمة

### التوجيه

- **App Router**: Next.js 16 App Router
- **Locale-based routing**: `/ar/` و `/en/`
- **Dynamic routes**: `[locale]`, `[id]`

### الترجمة (next-intl)

- **الملفات**: `messages/ar.json` و `messages/en.json`
- **الاستخدام**: `useTranslations('namespace')`
- **اللغة الحالية**: `useLocale()`

**مثال**:
```tsx
const t = useTranslations('nav');
const locale = useLocale();

<h1>{t('home')}</h1>  // "الرئيسية" أو "Home"
```

## 📊 قاعدة البيانات (Prisma)

### النماذج الرئيسية

- **User**: المستخدمون (Admin/Client)
- **Project**: المشاريع العقارية
- **Task**: المهام
- **Document**: المستندات
- **Account**: الحسابات المالية
- **Transaction**: المعاملات المالية
- **SiteContent**: محتوى الموقع الديناميكي

### الحقول المهمة للمشاريع

```prisma
model Project {
  id              String
  titleAr         String      // العنوان بالعربية
  titleEn         String      // العنوان بالإنجليزية
  descriptionAr   String
  descriptionEn   String
  status          ProjectStatus  // COMPLETED, UNDER_CONSTRUCTION, etc.
  locationAr      String
  locationEn      String
  governorateAr   String?     // المحافظة
  stateAr         String?     // الولاية
  villageAr       String?     // القرية
  area            Float?
  units           Int?
  price           Float?
  startDate       DateTime?
  completionDate  DateTime?
  images          String      // JSON array
  // ... مواصفات إضافية
}
```

## ✨ الميزات المكتملة

### ✅ الصفحات الأساسية

1. **الصفحة الرئيسية** (`/`)
   - Hero section مع navigation مدمج
   - معاينة المشاريع
   - معاينة عن الشركة
   - الخدمات
   - الشهادات
   - قسم التواصل

2. **صفحة العقارات** (`/properties`)
   - قائمة العقارات مع تصفية (الكل، للبيع، للإيجار)
   - بطاقات عقارات مع تفاصيل كاملة
   - صفحة تفاصيل العقار مع:
     - سلايدر صور مع علامة النوع
     - مواصفات كاملة
     - خريطة الموقع
     - قائمة منسدلة للتواصل (احجز، واتساب، اتصل، نموذج)
     - عقارات مشابهة

3. **صفحة المشاريع** (`/projects`)
   - قائمة المشاريع مع تصفية (الكل، منفذة، قيد البناء، قيد التطوير)
   - بطاقات مشاريع مع تفاصيل
   - صفحة تفاصيل المشروع مع:
     - سلايدر صور
     - فيديو (إن وجد)
     - خرائط المبنى (Accordion)
     - مواصفات تفصيلية
     - خريطة الموقع

4. **صفحة الخدمات** (`/services`)
   - عرض الخدمات المقدمة

5. **صفحة التواصل** (`/contact`)
   - نموذج التواصل
   - نموذج طلب اتصال
   - معلومات الاتصال

6. **صفحة عن الشركة** (`/about`)
   - معلومات الشركة
   - الرؤية والرسالة
   - القيم

### ✅ الميزات التقنية

- ✅ دعم كامل للغتين (عربي/إنجليزي)
- ✅ RTL للعربية
- ✅ تصميم متجاوب بالكامل
- ✅ Navigation مدمج في Hero
- ✅ Watermarks على جميع الصور
- ✅ Image optimization
- ✅ Prefetching للروابط
- ✅ Loading states
- ✅ Error handling
- ✅ SEO optimization

## 🔧 كيفية التشغيل

### المتطلبات

- Node.js 18+
- npm أو yarn

### التثبيت

```bash
# تثبيت الحزم
npm install

# إعداد قاعدة البيانات
npx prisma generate
npx prisma migrate dev

# تشغيل في وضع التطوير
npm run dev

# إذا واجهت "Port in use" أو "Unable to acquire lock"، استخدم:
npm run dev:clean

# البناء للإنتاج
npm run build
npm start
```

### التحقق من التشغيل

بعد تشغيل `npm run dev`، تأكد من:

1. **الصفحة الرئيسية**: http://localhost:3000/ar أو http://localhost:3000/en
2. **لوحة التحكم**: http://localhost:3000/ar/admin (تسجيل الدخول مطلوب)
3. **نظام المحاسبة**: http://localhost:3000/ar/admin/accounting
4. **دفتر العناوين**: http://localhost:3000/ar/admin/address-book
5. **التفاصيل البنكية**: http://localhost:3000/ar/admin/bank-details
6. **النسخ الاحتياطي**: http://localhost:3000/ar/admin/backup

> **ملاحظة**: إذا كان المنفذ 3000 مستخدماً، سيستخدم Next.js المنفذ 3001 تلقائياً.

### استكشاف الأخطاء (Troubleshooting)

| المشكلة | الحل |
|---------|------|
| **Port 3000 is in use** | عملية قديمة ما زالت تعمل. نفّذ `npm run dev:clean` أو أوقف العملية يدوياً |
| **Unable to acquire lock** | ملف قفل من تشغيل سابق. نفّذ `npm run dev:clean` |
| **صفحات فارغة أو أخطاء** | تأكد من وجود ملف `.env` وتشغيل `npx prisma generate` |

### متغيرات البيئة

إنشاء ملف `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📐 البنية المعمارية التفصيلية

### App Router Structure

```
app/
└── [locale]/              # Dynamic locale segment
    ├── layout.tsx         # Root layout (Header, Footer)
    ├── page.tsx           # Home page
    ├── properties/        # Properties section
    │   ├── page.tsx       # List page
    │   └── [id]/          # Dynamic property ID
    │       └── page.tsx   # Detail page
    └── projects/          # Projects section
        ├── layout.tsx     # Section layout
        ├── page.tsx       # List page
        └── [id]/          # Dynamic project ID
            └── page.tsx   # Detail page
```

### Component Architecture

**مبدأ**: Server Components أولاً، Client Components عند الحاجة

- **Server Components**: الصفحات الرئيسية، Layouts
- **Client Components**: التفاعلية (useState, onClick, etc.)

**علامة 'use client'**: تُستخدم فقط عند الحاجة للتفاعلية

### State Management

- **Local State**: useState للـ UI state
- **URL State**: للتصفية والبحث
- **Server State**: البيانات من قاعدة البيانات

## 🎯 أفضل الممارسات المستخدمة

### 1. الأداء

- ✅ Static Generation حيثما أمكن
- ✅ Image optimization مع Next/Image
- ✅ Code splitting تلقائي
- ✅ Lazy loading للصور
- ✅ Prefetching للروابط
- ✅ Compression مفعل

### 2. SEO

- ✅ Metadata في كل صفحة
- ✅ Semantic HTML
- ✅ Alt texts للصور
- ✅ Structured data (جاهز للإضافة)

### 3. Accessibility

- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support

### 4. الأمان

- ✅ TypeScript للتحقق من الأنواع
- ✅ Input validation
- ✅ XSS protection
- ✅ CSRF protection (جاهز)

## 📐 التوثيق والتصميم (لا نفقد التنسيق والترابط)

عند إضافة صفحات أو تحديث الموقع، يُنصح بالرجوع إلى:

- **[docs/SITE-SCENARIOS-AND-LINKS.md](docs/SITE-SCENARIOS-AND-LINKS.md)** — سيناريوهات عمل الموقع (حجز → محاسبة → تأكيد استلام، اشتراك، إلخ)، خريطة الصفحات والروابط، ومعايير التصميم والتنسيق حتى يبقى الموقع متناسقاً.
- **قواعد Cursor** في `.cursor/rules/` — المعايير التقنية، الحقول الإجبارية، حفظ المسودات.

إضافة صفحة جديدة في لوحة التحكم تتم عبر **`lib/config/adminNav.ts`** و**`lib/config/dashboardRoles.ts`** (لا إنشاء قوائم جانبية مكررة). التفاصيل في الملف أعلاه.

## 🔄 سير العمل (Workflow)

### إضافة صفحة جديدة

1. إنشاء ملف في `app/[locale]/new-page/page.tsx` (أو تحت `admin/` مع تسجيلها في `adminNav.ts`).
2. إضافة مكون في `components/new-page/`
3. إضافة الترجمات في `messages/ar.json` و `messages/en.json`
4. إضافة رابط في `PageHero.tsx` navigation (للصفحات العامة) أو في **`lib/config/adminNav.ts`** (لصفحات اللوحة الإدارية)

### إضافة مكون جديد

1. إنشاء ملف في `components/` المناسب
2. استخدام 'use client' فقط عند الحاجة
3. استخدام TypeScript interfaces
4. إضافة الترجمات عند الحاجة

### إضافة ترجمة جديدة

1. إضافة المفتاح في `messages/ar.json`
2. إضافة المفتاح في `messages/en.json`
3. استخدام `useTranslations('namespace')`

## 📝 ملاحظات مهمة

### نظام الألوان

- **اللون الذهبي**: `#8B6F47` (primary)
- **CSS Filter**: `.logo-golden-filter` لتحويل الشعار للذهبي
- **الخطوط**: Cairo للعربية، Inter للإنجليزية

### العلامة المائية

- **المركز**: شفاف 30%، حجم كبير
- **الزاوية**: واضح 90%، حجم صغير
- **التطبيق**: جميع صور المشاريع والعقارات

### الأداء والتنقل

- **السرعة**: هدف "كسرعة البرق والضوء"
- **Prefetching**: مفعل لجميع الروابط - تنقل فوري
- **View Transitions**: انتقالات سلسة بين الصفحات دون شعور المستخدم بالتأخير
- **Image optimization**: AVIF و WebP
- **Compression**: مفعل

### الحقول الإجبارية (Required Fields) - معيار ثابت

**يجب تطبيق هذا المعيار في كل مكان في الموقع:**

- **الحقل الفارغ (إجباري)**: إطار أحمر أو لون أحمر للتمييز (`border-color: red` أو `ring-red-500` أو `border-red-500`)
- **بعد تعبئة الحقل**: يتحول إلى اللون الأخضر (`border-green-500` أو `ring-green-500`) للإشارة إلى أن الحقل مكتمل
- **التطبيق**: جميع النماذج (forms، inputs، selects، textareas، checkboxes) في كل صفحات الموقع واللوحة الإدارية

**مثال للاستخدام**:
```css
/* حقل إجباري فارغ */
.input-required:invalid, .input-required:placeholder-shown { border-color: red; }

/* حقل إجباري مكتمل */
.input-required:valid:not(:placeholder-shown) { border-color: green; }
```

### التصميم والتباعد (عنصر أساسي)

- **Hero Section**: في جميع الصفحات مع navigation مدمج
- **Compact Mode**: للصفحات الفرعية (30vh بدلاً من 70vh)
- **Responsive**: Mobile-first approach
- **مسافة بين السطور**: 1.5 minimum لجميع النصوص (--line-height-min)
- **بين العنوان والفقرة**: 2rem (--space-title-paragraph)
- **بين العناوين والصور والإطارات**: 2rem (--space-heading-media)

## 🏦 لوحة التحكم الإدارية ونظام المحاسبة

### لوحة التحكم (`/admin`)

- ✅ **دفتر العناوين** (`/admin/address-book`) - إدارة جهات الاتصال (عملاء، موردين، شركاء)
- ✅ **التفاصيل البنكية** (`/admin/bank-details`) - إدارة الحسابات البنكية ومعلومات التحويل
- ✅ **المحاسبة** (`/admin/accounting`) - نظام محاسبي متكامل (انظر أدناه)
- ✅ **إدارة الموقع** (`/admin/site`) - إعدادات الموقع
- ✅ **إدارة العقارات** (`/admin/properties`) - إضافة وتعديل العقارات
- ✅ **إدارة الحجوزات** (`/admin/bookings`) - متابعة الحجوزات
- ✅ **المشاريع** (`/admin/projects`) - إدارة المشاريع
- ✅ **الخدمات** (`/admin/services`) - إدارة الخدمات
- ✅ **التواصل والطلبات** (`/admin/contact`, `/admin/submissions`)
- ✅ **المستخدمين** (`/admin/users`)
- ✅ **سجل الأرقام التسلسلية** (`/admin/serial-history`)
- ✅ **النسخ الاحتياطي** (`/admin/backup`) - تصدير واستيراد جميع البيانات

### النسخ الاحتياطي والاستعادة (`/admin/backup`)

**مهم جداً**: البيانات تُخزّن في `localStorage` بالمتصفح وتُمسح عند مسح بيانات المتصفح أو استخدام التصفح الخاص.

| الإجراء | الوصف |
|---------|-------|
| **تصدير** | تنزيل ملف JSON يحتوي على كل البيانات (محاسبة، حجوزات، عقود، دفتر عناوين، حسابات بنكية) |
| **استيراد** | استعادة البيانات من ملف النسخة الاحتياطية |

**نصيحة**: صدّر نسخة احتياطية أسبوعياً أو بعد أي عملية مهمة. احفظ الملف في مكان آمن (سحابة، قرص خارجي).

### نظام المحاسبة (`/admin/accounting`)

نظام محاسبي احترافي وفق المعايير العالمية (مشابه لـ Wafeq، دفترة، قيود، Book Keeper):

#### الميزات الرئيسية

| الميزة | الوصف |
|--------|-------|
| **دليل الحسابات** | 23 حساباً افتراضياً (أصول، التزامات، حقوق ملكية، إيرادات، مصروفات) + إضافة حسابات جديدة |
| **قيود اليومية** | قيد مزدوج (Double-Entry) مع التحقق من التوازن، اقتراح ذكي للحسابات (AI) |
| **الفواتير والإيصالات** | فاتورة، إيصال، عرض سعر، عربون، دفعة - مع بنود مفصلة وضريبة القيمة المضافة |
| **التقارير المالية** | ميزان المراجعة، قائمة الدخل (P&L)، الميزانية العمومية، التدفق النقدي، كشف الحساب البنكي |
| **لوحة التحكم** | مؤشرات (الأصول، الالتزامات، حقوق الملكية، الإيرادات، المصروفات، صافي الدخل) + رسم بياني |
| **الذكاء الاصطناعي** | اقتراح الحساب من الوصف، كشف الشذوذ (رصيد سالب غير متوقع) |
| **الإعدادات** | العملة (ر.ع، ر.س، د.إ، $)، ضريبة القيمة المضافة (0%, 5%, 15%) |
| **الطباعة** | طباعة احترافية للفواتير والإيصالات والتقارير |

#### الربط مع الأنظمة الأخرى

- **دفتر العناوين**: ربط الفواتير والإيصالات بالعملاء
- **التفاصيل البنكية**: ربط المعاملات بالحسابات البنكية
- **العقارات والمشاريع**: ربط القيود والمستندات بالعقار أو المشروع

#### التخزين

البيانات المحاسبية تُخزن في `localStorage`:
- `bhd_chart_of_accounts` - دليل الحسابات
- `bhd_journal_entries` - قيود اليومية
- `bhd_accounting_documents` - الفواتير والإيصالات
- `bhd_fiscal_settings` - إعدادات السنة المالية
- `bhd_booking_documents` - مستندات توثيق العقد (رفع، اعتماد، رفض)
- `bhd_property_landlords` - ربط المالك بالعقار (مرة واحدة)

## 🚧 الميزات المخططة

### لوحة التحكم الإدارية

- [x] Dashboard للإدارة
- [x] إدارة العقارات (CRUD)
- [x] إدارة المشاريع
- [x] نظام المحاسبة المتكامل
- [ ] إدارة المحتوى الديناميكي
- [x] إدارة المستخدمين
- [x] إدارة العقود (إنشاء، اعتماد من الإدارة/المستأجر/المالك)
- [ ] إدارة الصيانة (قريباً)

### نظام العملاء

- [ ] تسجيل الدخول للعملاء
- [ ] متابعة المشاريع
- [ ] عرض الحسابات والكشوفات
- [ ] تحميل المستندات
- [ ] متابعة المهام

### نظام متكامل

- [x] إدارة الحسابات المالية (نظام محاسبي كامل)
- [x] إدارة المستندات (فواتير، إيصالات، عروض أسعار)
- [ ] إدارة المهام
- [x] التقارير والإحصائيات (ميزان مراجعة، قائمة دخل، ميزانية عمومية، تدفق نقدي)
- [ ] نظام الإشعارات

## 📞 معلومات الاتصال

- **البريد الإلكتروني**: info@bhd-om.com
- **الهاتف**: +96891115341
- **الموقع**: https://bhd-om.com

## 📄 الترخيص

© 2026 بن حمود للتطوير ش ش و. جميع الحقوق محفوظة.

---

**آخر تحديث**: فبراير 2026

**الإصدار**: 0.2.2

**الحالة**: قيد التطوير النشط

---

### سجل التحديثات (Changelog)

#### v0.2.2 - فبراير 2026
- ✅ **مستندات توثيق العقد**: نظام كامل لطلب ورفع المستندات (بطاقة هوية، جواز، إثبات عمل، إلخ)
- ✅ **صفحات المستأجر**: contract-terms و upload-documents لرفع المستندات عبر رابط مخصص
- ✅ **اعتماد ورفض المستندات**: رفض كامل أو صورة محددة، استبدال الصورة مع الحفاظ على سجل السبب
- ✅ **تكبير الصور**: الضغط على الصورة يفتح عرضاً موسعاً (lightbox)
- ✅ **إشعار تلقائي بعد تأكيد المحاسب**: إرسال رابط الرفع بالواتساب والبريد للمستأجر
- ✅ **أزرار واتساب وبريد في المستندات**: إعادة إرسال الرابط للمستأجر مع أيقونة نسخ
- ✅ **فتح تلقائي لصفحة اعتماد العقد**: عند اعتماد جميع المستندات
- ✅ **ربط المالك بالعقار**: إكمال بيانات المالك والمبنى (مرة واحدة) قبل إنشاء العقد
- ✅ **عقد من المالك المرتبط**: بيانات المالك تُستمد تلقائياً من دفتر العناوين عند إنشاء العقد

#### v0.2.1 - فبراير 2026
- ✅ **المزامنة التلقائية للحجوزات مع المحاسبة**: إنشاء إيصال محاسبي تلقائياً عند تأكيد دفع حجز (من صفحة الحجوزات أو العقار)
- ✅ **كشف الحساب البنكي**: تقرير جديد في المحاسبة لعرض حركات كل حساب بنكي (إيداعات وسحوبات)
- ✅ **لوحة التحكم التفاعلية**: البطاقات (الأصول، الالتزامات، الإيرادات، المصروفات، القيود، المستندات، الحسابات) قابلة للنقر وتنتقل للصفحة المناسبة
- ✅ **ترحيل تلقائي للمستندات**: المستندات المعتمدة التي لم تُرحّل تُرحّل تلقائياً عند فتح المحاسبة
- ✅ **المحاسبة في القائمة الجانبية**: نقل المحاسبة كعنصر مستقل أعلى العقارات (بدون قائمة منسدلة مفتوحة دائماً)
- ✅ **أداة النسخ الاحتياطي**: تصدير واستيراد جميع البيانات (محاسبة، حجوزات، عقود، دفتر عناوين، حسابات بنكية)

#### v0.2.0 - فبراير 2026
- ✅ نظام محاسبي متكامل (دليل حسابات، قيود يومية، فواتير، إيصالات، تقارير)
- ✅ ميزان المراجعة، قائمة الدخل، الميزانية العمومية، التدفق النقدي
- ✅ اقتراح ذكي للحسابات (AI) وكشف الشذوذ
- ✅ طباعة احترافية للفواتير والإيصالات
- ✅ إدارة الحسابات (إضافة حسابات جديدة)
- ✅ إعدادات المحاسبة (العملة، ضريبة القيمة المضافة)
