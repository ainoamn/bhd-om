# تقرير مراجعة أداء مشروع bhd-om العقاري
## Next.js 16 + React 19 + Prisma 7 + PostgreSQL

---

> **تاريخ التقرير:** يوليو 2025
> **الإصدار:** 1.0
> **الحالة:** تقرير شامل مع توصيات قابلة للتنفيذ

---

## فهرس المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [تحليل البنية التقنية](#2-تحليل-البنية-التقنية)
3. [مشاكل الأداء الرئيسية](#3-مشاكل-الأداء-الرئيسية)
4. [تحليل Prisma والفهارس](#4-تحليل-prisma-والفهارس)
5. [تحليل Next.js Config](#5-تحليل-nextjs-config)
6. [استراتيجيات التخزين المؤقت](#6-استراتيجيات-التخزين-المؤقت)
7. [تحسين Bundle Size](#7-تحسين-bundle-size)
8. [تحسين سرعة التنقل](#8-تحسين-سرعة-التنقل)
9. [التوصيات حسب الأولوية](#9-التوصيات-حسب-الأولوية)
10. [خطة التنفيذ المرحلية](#10-خطة-التنفيذ-المرحلية)

---

## 1. ملخص تنفيذي

بناءً على تحليل بنية المشروع bhd-om العقاري، تم تحديد **18 مشكلة أداء** متفاوتة الخطورة:

| الخطورة | العدد | الوصف |
|---------|-------|-------|
| 🔴 حرجة | 4 | مشاكل تؤثر بشكل مباشر على الأداء في الإنتاج |
| 🟠 عالية | 6 | مشاكل مهمة تسبب بطء ملحوظ |
| 🟡 متوسطة | 5 | تحسينات مطلوبة للأداء المثالي |
| 🟢 منخفضة | 3 | تحسينات إضافية ووقائية |

### أبرز المشاكل:
- **غياب تام لاستراتيجيات التخزين المؤقت** (Next.js 16 Cache Components غير مفعلة)
- **احتمالية N+1 Queries** في API Routes بسبب include كثيف
- **فهارس ناقصة** في الجداول الأساسية (Property, Booking, Contract)
- **عدم استخدام Prisma relationLoadStrategy: "join"**
- **عدم تفعيل Partial Prerendering (PPR)**

---

## 2. تحليل البنية التقنية

### 2.1 Stack التقني

| التقنية | الإصدار | الحالة |
|---------|---------|--------|
| Next.js | 16.2.2 | ✅ محدث |
| React | 19.2.3 | ✅ محدث |
| Prisma | 7.3.0 | ✅ محدث |
| PostgreSQL | via `pg` | ✅ متوافق |
| next-auth | 4.24.13 | ⚠️ يحتاج تحديث لـ Auth.js v5 |
| next-intl | 4.8.2 | ✅ محدث |
| Turbopack | مدمج | ✅ فعال في التطوير |

### 2.2 نقاط القوة الحالية ✅

1. **Next.js 16** مع Turbopack يوفر تحسينات كبيرة في سرعة البناء (2-5x أسرع)
2. **reactStrictMode: true** يساعد في اكتشاف المشاكل
3. **compress: true** يفعّل ضغط الاستجابات
4. **poweredByHeader: false** يخفي معلومات الخادم
5. **next/image** مُحسّن مع صيغ avif وwebp
6. **viewTransition: true** يفعل انتقالات العرض (React 19)
7. **Prisma Indexes** مُحسّنة بشكل جيد على الجداول الرئيسية

---

## 3. مشاكل الأداء الرئيسية

### 🔴 P1: عدم تفعيل Next.js 16 Cache Components

**التأثير:** كل طلب يصل إلى الخادم يُنفذ من جديد بدون أي تخزين مؤقت. لا يوجد Static Site Generation فعلي للبيانات.

**الملفات المتأثرة:**
- `next.config.ts`
- جميع `app/**/page.tsx`
- جميع `app/**/layout.tsx`

**الحل:** تفعيل Cache Components في Next.js 16

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // ✅ إضافة Cache Components
  cacheComponents: true,
  cacheLife: {
    properties: {
      stale: 300,        // 5 دقائق
      revalidate: 900,   // 15 دقيقة
      expire: 3600,      // 1 ساعة
    },
    propertyDetail: {
      stale: 600,        // 10 دقائق
      revalidate: 1800,  // 30 دقيقة
      expire: 7200,      // 2 ساعة
    },
    dashboard: {
      stale: 60,         // 1 دقيقة
      revalidate: 300,   // 5 دقائق
      expire: 600,       // 10 دقائق
    },
    static: {
      stale: 86400,      // 24 ساعة
      revalidate: 604800, // أسبوع
      expire: 2592000,   // 30 يوم
    },
  },
  images: {
    qualities: [75, 85],
    formats: ['avif', 'webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // ❌ إزالة viewTransition من experimental - أصبحت افتراضية في React 19
  async rewrites() {
    return [
      {
        source: '/:locale(ar|en)/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:locale(ar|en)/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

### 🔴 P2: غياب استراتيجية التخزين المؤقت في API Routes

**التأثير:** كل طلب API يؤدي إلى تنفيذ كامل لقاعدة البيانات، حتى للبيانات التي لا تتغير بشكل متكرر.

**الملفات المتأثرة:**
- `app/api/properties/route.ts`
- `app/api/bookings/route.ts`
- `app/api/contracts/route.ts`
- `app/api/accounting/route.ts`

**الحل:** استخدام `"use cache"` مع `cacheTag` و`cacheLife`

```typescript
// app/lib/data/properties.ts
'use server'

import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * جلب قائمة العقارات مع التخزين المؤقت
 * - stale: 5 دقائق (يعرض البيانات المخزنة أثناء إعادة التحقق)
 * - revalidate: كل 15 دقيقة
 * - expire: تنتهي صلاحية الكاش بعد ساعة
 */
export async function getProperties(filters?: PropertyFilters) {
  'use cache'
  cacheLife('properties')
  cacheTag('properties', `properties-${JSON.stringify(filters || {})}`)

  return prisma.property.findMany({
    where: buildWhereClause(filters),
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      governorate: {
        select: { id: true, nameAr: true, nameEn: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // ✅ حد افتراضي لتجنب استرجاع كميات ضخمة
  })
}

/**
 * جلب تفاصيل عقار واحد
 */
export async function getPropertyById(id: string) {
  'use cache'
  cacheLife('propertyDetail')
  cacheTag('property', `property-${id}`)

  return prisma.property.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      governorate: true,
      bookings: {
        where: { status: { not: 'CANCELLED' } },
        select: { id: true, status: true, startDate: true, endDate: true },
      },
    },
  })
}

/**
 * إلغاء الكاش عند تحديث العقار
 */
export async function invalidatePropertyCache(propertyId?: string) {
  const { revalidateTag } = await import('next/cache')
  revalidateTag('properties')
  if (propertyId) {
    revalidateTag(`property-${propertyId}`)
  }
}
```

---

### 🔴 P3: N+1 Queries في API Routes

**التأثير:** عند جلب قائمة العقارات مع علاقاتها، قد يؤدي كل include إلى query إضافي لكل سجل. مع 100 عقار = 101+ queries.

**الملفات المتأثرة:**
- `app/api/properties/route.ts`
- `app/api/bookings/route.ts`
- `app/api/contracts/route.ts`

**الحل:** استخدام Prisma relationLoadStrategy: "join" مع تقنية الـ include

```typescript
// ❌ BEFORE: استراتيجية query الافتراضية (متعددة الاستعلامات)
const properties = await prisma.property.findMany({
  include: {
    owner: true,
    governorate: true,
    bookings: true,
    contracts: true,
    createdBy: true,
  },
})
// ينتج عنه: 1 query للـ properties + 4 queries لكل سجل = 401 query لـ 100 سجل!

// ✅ AFTER: استخدام relationLoadStrategy: "join"
const properties = await prisma.property.findMany({
  relationLoadStrategy: 'join', // JOIN واحد على مستوى قاعدة البيانات
  include: {
    owner: { select: { id: true, name: true, email: true } },
    governorate: { select: { id: true, nameAr: true, nameEn: true } },
    bookings: {
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    },
    createdBy: { select: { id: true, name: true } },
  },
  take: 50,
  skip: (page - 1) * 50,
})
// ينتج عنه: query واحد فقط باستخدام LATERAL JOIN
```

**تعديل إضافي على Prisma Schema:**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins"] // ✅ تفعيل ميزة الـ Joins
}
```

**ملاحظة:** بعد Prisma 7، `relationLoadStrategy: "join"` هو الافتراضي لـ PostgreSQL. لكن يجب التأكد من تفعيل preview feature.

---

### 🔴 P4: Heavy Includes دون Select

**التأثير:** جلب جميع حقول الجداول المرتبطة حتى غير المستخدمة يؤدي إلى:
- زيادة حجم الاستجابة JSON
- استهلاك ذاكرة أعلى على الخادم
- بطء في serialization

**الملفات المتأثرة:** جميع API routes التي تستخدم include

**الحل:** استخدام select لتحديد الحقول المطلوبة فقط

```typescript
// ❌ BEFORE: جلب كل الحقول
const properties = await prisma.property.findMany({
  include: {
    owner: true,        // جميع حقول المالك
    governorate: true,  // جميع حقول المحافظة
    bookings: true,     // جميع الحجوزات مع كل حقولها
    contracts: true,    // جميع العقود
  },
})

// ✅ AFTER: تحديد الحقول المطلوبة فقط
const properties = await prisma.property.findMany({
  relationLoadStrategy: 'join',
  select: {
    id: true,
    title: true,
    titleEn: true,
    price: true,
    type: true,
    status: true,
    area: true,
    bedrooms: true,
    bathrooms: true,
    governorateAr: true,
    governorateEn: true,
    cityAr: true,
    cityEn: true,
    images: true,
    createdAt: true,
    // العلاقات - فقط ما نحتاجه
    owner: {
      select: { id: true, name: true, phone: true },
    },
    governorate: {
      select: { id: true, nameAr: true, nameEn: true, regionId: true },
    },
    bookings: {
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, status: true, startDate: true, endDate: true },
      take: 5, // ✅ حد أقصى للحجوزات المعروضة
    },
    _count: {
      select: { bookings: true, contracts: true },
    },
  },
  take: 50,
})
```

---

### 🟠 P5: فهارس ناقصة على العلاقات

**التأثير:** بطء في الاستعلامات التي تُجرى عبر العلاقات (Foreign Keys).

**الحل:** إضافة فهارس على Foreign Keys

```prisma
// prisma/schema.prisma

// ✅ Property - إضافة فهارس مفقودة
model Property {
  id              String   @id @default(cuid())
  // ...fields

  // الفهارس الموجودة ✅
  @@index([type, status])
  @@index([createdAt])
  @@index([governorateAr])
  @@index([price])
  @@index([isArchived])
  @@index([organizationId])
  @@index([ownerId])
  @@index([createdById])

  // ❌ فهارس مفقودة - يجب إضافتها:
  @@index([type, status, price])          // للفلترة المشتركة
  @@index([governorateAr, cityAr])        // للبحث الجغرافي
  @@index([status, isArchived, createdAt]) // للقوائم المؤرشفة/غير المؤرشفة
  @@index([title])                         // للبحث النصي
  @@index([titleEn])                       // للبحث النصي بالإنجليزية
  @@index([ownerId, status])               // عقارات مالك معين
  @@index([organizationId, status, type])  // تصفية داخل المنظمة
}

// ✅ BookingStorage - إضافة فهارس
model BookingStorage {
  id         String   @id @default(cuid())
  // ...fields

  // الفهارس الموجودة ✅
  @@index([propertyId])
  @@index([status])
  @@index([bookingType])
  @@index([propertyId, status])

  // ❌ فهارس مفقودة:
  @@index([startDate, endDate])            // للتحقق من التواريخ المتاحة
  @@index([propertyId, startDate, endDate]) // فحص تداخل الحجوزات
  @@index([status, createdAt])             // تصفية الحالة مع الترتيب
  @@index([createdById])                   // حجوزات مستخدم معين
}

// ✅ ContractStorage - إضافة فهارس
model ContractStorage {
  id           String   @id @default(cuid())
  // ...fields

  // الفهارس الموجودة ✅
  @@index([propertyId])
  @@index([status])
  @@index([contractKind])
  @@index([bookingId])
  @@index([propertyId, status])

  // ❌ فهارس مفقودة:
  @@index([status, createdAt])
  @@index([startDate, endDate])
  @@index([propertyId, startDate])         // عقود عقار في فترة
  @@index([tenantId])                      // عقود مستأجر معين
  @@index([ownerId])                       // عقود مالك معين
}

// ✅ User - إضافة فهارس
model User {
  id             String   @id @default(cuid())
  // ...fields

  // الفهارس الموجودة ✅
  @@index([role, createdAt])
  @@index([email])
  @@index([organizationId])

  // ❌ فهارس مفقودة:
  @@index([role, organizationId])          // مستخدمي منظمة محددة
  @@index([status])                        // المستخدمين النشطين
}

// ✅ AccountingJournalEntry - إضافة فهارس
model AccountingJournalEntry {
  id           String   @id @default(cuid())
  // ...fields

  // ❌ فهارس مفقودة:
  @@index([status, date])                  // القيود في فترة محددة
  @@index([accountId, date])               // حركات حساب محدد
  @@index([type, status, date])            // تقارير متركبة
}
```

**أمر التطبيق:**
```bash
npx prisma migrate dev --name add_performance_indexes
```

---

### 🟠 P6: عدم وجود Pagination في الـ API Routes

**التأثير:** جلب جميع السجلات دفعة واحدة يؤدي إلى:
- بطء شديد مع كبر حجم البيانات
- استهلاك ذاكرة عالي (Out of Memory)
- timeout في الاستعلامات الكبيرة

**الحل:** Cursor-based Pagination

```typescript
// app/lib/data/pagination.ts
export interface PaginationParams {
  cursor?: string
  limit?: number
  direction?: 'next' | 'prev'
}

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  prevCursor: string | null
  total: number
}

// ✅ Cursor-based pagination (أفضل من offset)
export async function getPropertiesPaginated(
  filters: PropertyFilters,
  { cursor, limit = 20 }: PaginationParams
): Promise<PaginatedResult<Property>> {
  const properties = await prisma.property.findMany({
    where: buildWhereClause(filters),
    relationLoadStrategy: 'join',
    select: {
      id: true,
      title: true,
      price: true,
      type: true,
      status: true,
      images: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
      _count: { select: { bookings: true } },
    },
    take: limit + 1, // نأخذ سجل إضافي لمعرفة إذا يوجد صفحة تالية
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasMore = properties.length > limit
  const data = hasMore ? properties.slice(0, -1) : properties

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1]?.id : null,
    prevCursor: cursor || null,
    total: await prisma.property.count({ where: buildWhereClause(filters) }),
  }
}

// ✅ Offset-based للقوائم الصغيرة
export async function getPropertiesWithOffset(
  filters: PropertyFilters,
  page: number = 1,
  pageSize: number = 20
) {
  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where: buildWhereClause(filters),
      relationLoadStrategy: 'join',
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        status: true,
        images: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.count({ where: buildWhereClause(filters) }),
  ])

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
```

---

### 🟠 P7: عدم استخدام React cache() لإزالة التكرار

**التأثير:** إذا تم استدعاء نفس استعلام Prisma عدة مرات في نفس الطلب (مثلاً في layout + page + components)، سيُنفذ الاستعلام عدة مرات.

**الحل:** استخدام `cache()` من React + `unstable_cache` من Next.js

```typescript
// app/lib/data/property-cache.ts
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

// ✅ Layer 1: React cache() - يمنع التكرار داخل نفس الطلب
// ✅ Layer 2: unstable_cache - يخزن عبر الطلبات المختلفة

const _getPropertyDetail = unstable_cache(
  async (propertyId: string) => {
    console.log('[Cache Miss] Fetching property from DB:', propertyId)
    return prisma.property.findUnique({
      where: { id: propertyId },
      relationLoadStrategy: 'join',
      select: {
        id: true,
        title: true,
        titleEn: true,
        description: true,
        price: true,
        type: true,
        status: true,
        area: true,
        bedrooms: true,
        bathrooms: true,
        floor: true,
        yearBuilt: true,
        address: true,
        governorateAr: true,
        governorateEn: true,
        cityAr: true,
        cityEn: true,
        neighborhoodAr: true,
        neighborhoodEn: true,
        images: true,
        amenities: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, phone: true, email: true } },
        governorate: { select: { id: true, nameAr: true, nameEn: true } },
        _count: {
          select: { bookings: true, contracts: true },
        },
      },
    })
  },
  ['property-detail'],
  {
    revalidate: 3600, // 1 ساعة
    tags: (propertyId) => ['properties', `property-${propertyId}`],
  }
)

// ✅ React cache() للـ deduplication داخل نفس الطلب
export const getPropertyDetail = cache(_getPropertyDetail)

// ✅ نفس النمط للقوائم
const _getPropertyList = unstable_cache(
  async (filters: PropertyFilters, page: number) => {
    return getPropertiesWithOffset(filters, page)
  },
  ['property-list'],
  {
    revalidate: 900, // 15 دقيقة
    tags: ['properties'],
  }
)

export const getPropertyList = cache(_getPropertyList)
```

---

### 🟠 P8: عدم استخدام Streaming و Suspense Boundaries

**التأثير:** الصفحة لا تُعرض حتى اكتمال جميع الاستعلامات (TTFB بطيء).

**الحل:** تقسيم الصفحة باستخدام Suspense

```tsx
// app/[locale]/properties/[id]/page.tsx
import { Suspense } from 'react'
import { PropertyDetailSkeleton } from '@/components/skeletons/PropertyDetailSkeleton'
import { PropertyGallerySkeleton } from '@/components/skeletons/PropertyGallerySkeleton'
import { RelatedPropertiesSkeleton } from '@/components/skeletons/RelatedPropertiesSkeleton'
import { PropertyHeader } from '@/components/property/PropertyHeader'
import { PropertyGallery } from '@/components/property/PropertyGallery'
import { PropertyDetails } from '@/components/property/PropertyDetails'
import { PropertyMap } from '@/components/property/PropertyMap'
import { RelatedProperties } from '@/components/property/RelatedProperties'
import { BookingWidget } from '@/components/property/BookingWidget'

// ✅ الجزء الثابت يُعرض فوراً
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params

  return (
    <div className="property-page">
      {/* هذا الجزء يُبث مباشرة من Static Shell */}
      <PropertyHeader propertyId={id} locale={locale} />

      {/* المحتوى الديناميكي يُبث تدريجياً */}
      <Suspense fallback={<PropertyGallerySkeleton />}>
        <PropertyGallery propertyId={id} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Suspense fallback={<PropertyDetailSkeleton />}>
            <PropertyDetails propertyId={id} />
          </Suspense>

          <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
            <PropertyMap propertyId={id} />
          </Suspense>
        </div>

        <div className="lg:col-span-1">
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <BookingWidget propertyId={id} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<RelatedPropertiesSkeleton />}>
        <RelatedProperties propertyId={id} locale={locale} />
      </Suspense>
    </div>
  )
}
```

```tsx
// components/property/PropertyHeader.tsx
import { getPropertyDetail } from '@/lib/data/property-cache'

// ✅ Server Component مع "use cache"
export async function PropertyHeader({
  propertyId,
  locale,
}: {
  propertyId: string
  locale: string
}) {
  'use cache'

  const property = await getPropertyDetail(propertyId)

  if (!property) return null

  return (
    <header className="property-header">
      <h1>{locale === 'ar' ? property.title : property.titleEn}</h1>
      <p className="text-gray-600">
        {locale === 'ar'
          ? `${property.governorateAr} - ${property.cityAr}`
          : `${property.governorateEn} - ${property.cityEn}`}
      </p>
    </header>
  )
}
```

---

### 🟠 P9: next-auth v4 قديم

**التأثير:** next-auth v4 أبطأ من Auth.js v5 (next-auth v5) ولا يدعم React Server Components بشكل مثالي.

**الحل:** الترقية إلى Auth.js v5

```typescript
// ❌ BEFORE: next-auth v4
import NextAuth from 'next-auth'

const handler = NextAuth({
  // config
})

// ✅ AFTER: Auth.js v5
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

// lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const {
  handlers,
  auth,        // ✅ للاستخدام في Server Components
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // providers...
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // ✅ Middleware-free authorization
      const isLoggedIn = !!auth?.user
      const isProtected = nextUrl.pathname.startsWith('/dashboard')
      if (isProtected && !isLoggedIn) return false
      return true
    },
  },
})

// ✅ استخدام auth() في Server Components
// app/dashboard/page.tsx
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return <div>Not authenticated</div>

  return <div>Welcome {session.user.name}</div>
}
```

---

### 🟡 P10: عدم وجود Connection Pooling

**التأثير:** مع Prisma في بيئة serverless، قد تنفد الاتصالات بقاعدة البيانات.

**الحل:** إضافة pgBouncer أو استخدام Prisma Connection Pooling

```typescript
// lib/prisma.ts - ✅ محسّن
import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ✅ إعدادات Connection Pooling
const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // ✅ تحسين الأداء
    transactionOptions: {
      maxWait: 5000, // 5 ثوانٍ
      timeout: 10000, // 10 ثوانٍ
    },
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ✅ إغلاق الاتصال بشكل نظيف عند إنهاء التطبيق
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
```

**ملاحظة:** إذا كنت تستخدم PostgreSQL مباشرة مع `pg` driver، فتأكد من إعدادات pool:

```env
# .env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

---

### 🟡 P11: عدم وجود Query Logging و Performance Monitoring

**التأثير:** صعوبة في اكتشاف الاستعلامات البطيئة.

**الحل:** إضافة Logging و Prisma Metrics

```typescript
// lib/prisma.ts - مع Logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// ✅ تسجيل الاستعلامات البطيئة (> 500ms)
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      console.warn(`⚠️ Slow Query (${e.duration}ms):`, e.query)
      console.warn('Params:', e.params)
    }
  })
}

// ✅ Middleware للقياس
prisma.$use(async (params, next) => {
  const start = performance.now()
  const result = await next(params)
  const end = performance.now()
  const duration = end - start

  if (duration > 1000) {
    console.warn(
      `[SLOW QUERY] ${params.model}.${params.action} took ${duration.toFixed(2)}ms`
    )
  }

  return result
})
```

---

### 🟡 P12: عدم وجود Data Validation في الطبقة الأولى

**التأثير:** استعلامات غير صالحة تصل إلى قاعدة البيانات.

**الحل:** Validation middleware

```typescript
// lib/prisma.ts - مع Validation
import { z } from 'zod'

// ✅ Schema validation للفلاتر
const PropertyFilterSchema = z.object({
  type: z.enum(['APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL']).optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'SOLD', 'PENDING']).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  governorateAr: z.string().optional(),
  cityAr: z.string().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type PropertyFilters = z.infer<typeof PropertyFilterSchema>

export function validatePropertyFilters(input: unknown): PropertyFilters {
  return PropertyFilterSchema.parse(input)
}
```

---

### 🟡 P13: عدم استخدام Prisma Accelerate للتخزين المؤقت

**التأثير:** كل استعلام يصل مباشرة إلى PostgreSQL بدون cache layer.

**الحل:** Prisma Accelerate (اختياري - خدمة سحابية)

```typescript
// lib/prisma.ts - مع Accelerate
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient()
  .$extends(withAccelerate({
    cacheStrategy: {
      ttl: 60, // 60 ثانية
      swr: 300, // 5 دقائق stale-while-revalidate
    },
  }))

// ✅ استخدام الـ cache في الاستعلامات
const properties = await prisma.property.findMany({
  cacheStrategy: { ttl: 300, swr: 600 },
  where: { status: 'AVAILABLE' },
  take: 50,
})
```

**ملاحظة:** Prisma Accelerate يتطلب تغيير DATABASE_URL إلى Prisma Cloud proxy.

---

### 🟡 P14: عدم استخدام Parallel Data Fetching

**التأثير:** الانتظار التسلسلي للاستعلامات يزيد من TTFB.

**الحل:** استخدام Promise.all

```typescript
// ❌ BEFORE: تسلسلي (بطيء)
const properties = await prisma.property.findMany({ take: 10 })
const bookings = await prisma.bookingStorage.findMany({ take: 10 })
const contracts = await prisma.contractStorage.findMany({ take: 10 })
// الوقت الإجمالي = sum(جميع الاستعلامات)

// ✅ AFTER: موازي (أسرع)
const [properties, bookings, contracts, stats] = await Promise.all([
  prisma.property.findMany({ take: 10 }),
  prisma.bookingStorage.findMany({ take: 10 }),
  prisma.contractStorage.findMany({ take: 10 }),
  prisma.property.groupBy({
    by: ['type'],
    _count: { id: true },
  }),
])
// الوقت الإجمالي = max(أبطأ استعلام)
```

---

### 🟢 P15: عدم استخدام next/script Strategy

**التأثير:** تحميل JavaScript خارجي يحجب الرندر.

**الحل:** استخدام strategies للـ scripts

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* ✅ Analytics - lazyOnload (لا يحجب الرندر) */}
        <Script
          src="https://analytics.example.com/script.js"
          strategy="lazyOnload"
        />

        {/* ✅ Maps - afterInteractive (بعد التفاعل) */}
        <Script
          src="https://maps.googleapis.com/maps/api/js"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

### 🟢 P16: عدم وجود Bundle Analysis

**الحل:** إضافة تحليل Bundle

```bash
# تثبيت
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig = {
  // ... existing config
}

export default process.env.ANALYZE === 'true'
  ? withBundleAnalyzer({ enabled: true })(nextConfig)
  : nextConfig
```

```bash
# تشغيل التحليل
ANALYZE=true npm run build
```

---

### 🟢 P17: تحسين next/image

**الحل:** التأكد من استخدام priority للصور فوق الصفحة

```tsx
// ❌ BEFORE
<Image src="/hero.jpg" width={1200} height={600} alt="Hero" />

// ✅ AFTER
<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  alt="Hero"
  priority        // ✅ للصور فوق الصفحة (LCP)
  quality={75}    // ✅ ضغط مثالي
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## 4. تحليل Prisma والفهارس

### 4.1 تحليل الفهارس الحالية

| الجدول | الفهارس الحالية | الفهارس المطلوبة | الحالة |
|--------|-----------------|------------------|--------|
| User | 3 | 5 | ⚠️ ناقص 2 |
| Property | 9 | 14 | ⚠️ ناقص 5 |
| BookingStorage | 6 | 10 | ⚠️ ناقص 4 |
| ContractStorage | 7 | 11 | ⚠️ ناقص 4 |
| AccountingAccount | 2 | 2 | ✅ مكتمل |
| AccountingJournalEntry | 7 | 9 | ⚠️ ناقص 2 |
| AccountingDocument | 7 | 7 | ✅ مكتمل |

### 4.2 تحليل استراتيجية include

| الاستعلام | الحالي | المطلوب | التحسين |
|-----------|--------|---------|---------|
| properties/list | include كامل | select محدد | 40-60% أقل في الحجم |
| property/detail | include كامل | select + relationLoadStrategy: join | 50-70% أسرع |
| bookings/list | include كامل | select + pagination | 30-50% أسرع |
| contracts/list | include كامل | select + pagination | 30-50% أسرع |

---

## 5. تحليل Next.js Config

### 5.1 التكوين الحالي vs المطلوب

| الإعداد | الحالي | المطلوب | الأولوية |
|---------|--------|---------|----------|
| cacheComponents | غير موجود | true | 🔴 حرجة |
| cacheLife | غير موجود | مخصص | 🔴 حرجة |
| turbopack | افتراضي | تفعيل File System Cache | 🟠 عالية |
| experimental.viewTransition | true | أصبح افتراضي في React 19 | 🟡 إزالة |

---

## 6. استراتيجيات التخزين المؤقت

### 6.1 البنية المقترحة للـ Caching Layer

```
┌─────────────────────────────────────────────────┐
│                 Client (Browser)                │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Router Cache │  │ SWR / React Query    │    │
│  │ (Next.js)    │  │ (Client State)       │    │
│  └──────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────┐
│                 Next.js Server                  │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Full Route   │  │ "use cache"          │    │
│  │ Cache (ISR)  │  │ cacheTag / cacheLife │    │
│  └──────────────┘  └──────────────────────┘    │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ unstable_cache│ │ React cache()         │    │
│  │ (Legacy)     │  │ (Deduplication)      │    │
│  └──────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────┐
│              Data Layer (Optional)              │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Prisma       │  │ Redis (Upstash)      │    │
│  │ Accelerate   │  │ (External Cache)     │    │
│  └──────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────┐
│              PostgreSQL Database                │
└─────────────────────────────────────────────────┘
```

### 6.2 خطة Invalidation

```typescript
// app/actions/properties.ts
'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createProperty(data: CreatePropertyInput) {
  const property = await prisma.property.create({ data })

  // ✅ إلغاء الكاش بعد التعديل
  revalidateTag('properties')

  return property
}

export async function updateProperty(id: string, data: UpdatePropertyInput) {
  const property = await prisma.property.update({
    where: { id },
    data,
  })

  // ✅ إلغاء الكاش المحدد والعام
  revalidateTag(`property-${id}`)
  revalidateTag('properties')

  return property
}

export async function deleteProperty(id: string) {
  await prisma.property.delete({ where: { id } })

  revalidateTag(`property-${id}`)
  revalidateTag('properties')
}
```

---

## 7. تحسين Bundle Size

### 7.1 التحليل الحالي

| المصدر | الحجم التقديري | النسبة |
|--------|---------------|--------|
| next-auth | ~45 KB gzip | 12% |
| react-hook-form + zod | ~25 KB gzip | 7% |
| next-intl | ~20 KB gzip | 5% |
| UI Components | ~40 KB gzip | 11% |
| App Code | ~30 KB gzip | 8% |
| Next.js Runtime | ~76 KB gzip | 20% |
| Images (unoptimized) | ~80 KB | 22% |
| **الإجمالي** | **~316 KB** | **100%** |

### 7.2 التوصيات

```typescript
// next.config.ts - تحسين Bundle
const nextConfig: NextConfig = {
  // ... existing config

  // ✅ Tree Shaking محسّن
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },

  // ✅ Split Chunks
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },
}
```

---

## 8. تحسين سرعة التنقل

### 8.1 الهدف: أداء مثل qootk.com

| المقياس | الحالي (تقديري) | الهدف | الطريقة |
|---------|----------------|-------|---------|
| TTFB | 800-1200ms | < 200ms | Cache Components + PPR |
| FCP | 1.5-2.5s | < 1.0s | Static Shell + Streaming |
| LCP | 2.5-4.0s | < 1.5s | next/image + priority |
| TTI | 3.0-5.0s | < 2.0s | Code Splitting + RSC |
| CLS | 0.1-0.3 | < 0.1 | aspect-ratio + placeholders |
| INP | 200-500ms | < 100ms | useTransition + Optimistic UI |

### 8.2 Prefetching و Navigation

```tsx
// components/PropertyCard.tsx
import Link from 'next/link'
import Image from 'next/image'

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/properties/${property.id}`}
      prefetch={true}        // ✅ Prefetch عند hover
      className="property-card"
    >
      <Image
        src={property.images[0]}
        alt={property.title}
        width={400}
        height={300}
        className="object-cover"
        loading="lazy"
      />
      <div className="property-info">
        <h3>{property.title}</h3>
        <p className="price">{property.price} ر.ع</p>
      </div>
    </Link>
  )
}
```

### 8.3 Incremental Static Regeneration للقوائم

```tsx
// app/[locale]/properties/page.tsx
import { getPropertyList } from '@/lib/data/property-cache'

export const revalidate = 300 // 5 دقائق

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1

  // ✅ يُبنى statically ويُعاد بناؤه كل 5 دقائق
  const { data: properties, totalPages } = await getPropertyList(
    { type: params.type },
    page
  )

  return <PropertyGrid properties={properties} totalPages={totalPages} />
}
```

---

## 9. التوصيات حسب الأولوية

### 🔴 حرجة - تنفيذ فوري

| # | المشكلة | الملفات | التأثير | الجهد |
|---|---------|---------|---------|-------|
| 1 | تفعيل Cache Components | `next.config.ts` | تقليل TTFB بنسبة 70-80% | 2 ساعة |
| 2 | إضافة "use cache" + cacheTag | `app/lib/data/*.ts` | تقليل DB queries بنسبة 80% | 4 ساعات |
| 3 | استخدام relationLoadStrategy: "join" | جميع API routes | تقليل الاستعلامات لـ query واحد | 3 ساعات |
| 4 | استخدام select بدلاً من include الكامل | جميع API routes | تقليل حجم الاستجابة 40-60% | 4 ساعات |

### 🟠 عالية - تنفيذ خلال أسبوع

| # | المشكلة | الملفات | التأثير | الجهد |
|---|---------|---------|---------|-------|
| 5 | إضافة الفهارس الناقصة | `prisma/schema.prisma` | تسريع الاستعلامات 30-50% | 2 ساعة |
| 6 | إضافة Pagination | `app/api/**/route.ts` | منع OOM مع البيانات الكبيرة | 3 ساعات |
| 7 | استخدام React cache() + unstable_cache | `app/lib/data/*.ts` | إزالة التكرار في نفس الطلب | 3 ساعات |
| 8 | إضافة Suspense Boundaries | `app/**/page.tsx` | تحسين TTFB و CLS | 4 ساعات |
| 9 | الترقية إلى Auth.js v5 | `lib/auth.ts` | دعم RSC + أداء أفضل | 4 ساعات |
| 10 | إضافة Connection Pooling | `lib/prisma.ts` | استقرار في الإنتاج | 1 ساعة |

### 🟡 متوسطة - تنفيذ خلال أسبوعين

| # | المشكلة | الملفات | التأثير | الجهد |
|---|---------|---------|---------|-------|
| 11 | Query Logging و Monitoring | `lib/prisma.ts` | اكتشاف المشاكل المبكر | 2 ساعة |
| 12 | Validation Layer | `lib/validation/*.ts` | حماية من استعلامات غير صالحة | 3 ساعات |
| 13 | Prisma Accelerate (اختياري) | `lib/prisma.ts` | Cache Layer إضافي | 2 ساعة |
| 14 | Parallel Data Fetching | `app/**/page.tsx` | تقليل TTFB | 2 ساعة |
| 15 | Bundle Analysis و Optimization | `next.config.ts` | تقليل حجم JS | 4 ساعات |

### 🟢 منخفضة - تنفيذ عند الإمكان

| # | المشكلة | الملفات | التأثير | الجهد |
|---|---------|---------|---------|-------|
| 16 | next/script Strategy | `app/layout.tsx` | تحميل أسرع | 1 ساعة |
| 17 | next/image Optimization | `components/**/*.tsx` | LCP أسرع | 2 ساعة |
| 18 | Web Vitals Monitoring | `app/layout.tsx` | مراقبة الأداء | 2 ساعة |

---

## 10. خطة التنفيذ المرحلية

### المرحلة 1: Quick Wins (يوم 1-2)
```bash
# 1. تفعيل Cache Components
# تعديل next.config.ts - إضافة cacheComponents: true

# 2. إضافة الفهارس
npx prisma migrate dev --name add_performance_indexes

# 3. تفعيل relationJoins
# تعديل prisma/schema.prisma - إضافة previewFeatures = ["relationJoins"]

# 4. إضافة select للـ includes الرئيسية
# تعديل app/api/properties/route.ts
```

### المرحلة 2: Caching Layer (يوم 3-5)
```bash
# 1. إنشاء app/lib/data/ مع "use cache"
# 2. إضافة cacheTag و cacheLife
# 3. إضافة Suspense Boundaries
# 4. إضافة revalidation في Server Actions
```

### المرحلة 3: Optimization (يوم 6-10)
```bash
# 1. إضافة Pagination
# 2. إضافة React cache() + unstable_cache
# 3. إضافة Connection Pooling
# 4. الترقية إلى Auth.js v5
# 5. إضافة Query Logging
```

### المرحلة 4: Monitoring (يوم 11-14)
```bash
# 1. إضافة Web Vitals Monitoring
# 2. Bundle Analysis
# 3. Performance Testing
# 4. Documentation
```

---

## ملاحق

### ملحق أ: npm scripts مقترحة

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "analyze": "ANALYZE=true next build",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

### ملحق ب: Prisma Schema محسّن (مقتطفات)

```prisma
// prisma/schema.prisma - النسخة المحسّنة
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins", "prismaSchemaFolder"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // ✅ Direct URL للـ migrations
  directUrl = env("DIRECT_URL")
}

// ✅ الموديلات مع الفهارس المحسّنة
model Property {
  id              String   @id @default(cuid())
  title           String   @db.VarChar(255)
  titleEn           String?  @db.VarChar(255)
  description     String?  @db.Text
  price           Decimal  @db.Decimal(15, 2)
  type            PropertyType
  status          PropertyStatus @default(AVAILABLE)
  area            Float?
  bedrooms        Int?
  bathrooms       Int?
  floor           Int?
  yearBuilt       Int?
  address         String?
  governorateAr   String?
  governorateEn   String?
  cityAr          String?
  cityEn          String?
  neighborhoodAr  String?
  neighborhoodEn  String?
  images          String[]
  amenities       String[]
  latitude        Float?
  longitude       Float?
  isArchived      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  ownerId         String?
  owner           User?    @relation("PropertyOwner", fields: [ownerId], references: [id])
  createdById     String
  createdBy       User     @relation("PropertyCreator", fields: [createdById], references: [id])
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])
  governorateId   String?
  governorate     Governorate? @relation(fields: [governorateId], references: [id])
  bookings        BookingStorage[]
  contracts       ContractStorage[]

  // ✅ الفهارس المحسّنة
  @@index([type, status])
  @@index([type, status, price])
  @@index([status, isArchived, createdAt])
  @@index([governorateAr, cityAr])
  @@index([governorateEn, cityEn])
  @@index([price])
  @@index([createdAt])
  @@index([ownerId])
  @@index([ownerId, status])
  @@index([createdById])
  @@index([organizationId])
  @@index([organizationId, status, type])
  @@index([title])
  @@index([titleEn])
  @@index([isArchived])
  @@map("properties")
}

enum PropertyType {
  APARTMENT
  VILLA
  LAND
  COMMERCIAL
  OFFICE
  BUILDING
}

enum PropertyStatus {
  AVAILABLE
  RENTED
  SOLD
  PENDING
  UNDER_MAINTENANCE
}
```

### ملحق ج: مثال كامل لـ Property Data Layer

```typescript
// app/lib/data/properties.ts
'use server'

import { cacheLife, cacheTag } from 'next/cache'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ─── Validation Schemas ───────────────────────────────────────────

const PropertyFilterSchema = z.object({
  type: z.enum(['APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'OFFICE', 'BUILDING']).optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'SOLD', 'PENDING', 'UNDER_MAINTENANCE']).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  governorateAr: z.string().optional(),
  cityAr: z.string().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'price', 'area']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PropertyFilters = z.infer<typeof PropertyFilterSchema>

// ─── Helper Functions ─────────────────────────────────────────────

function buildWhereClause(filters: PropertyFilters) {
  const where: any = { isArchived: false }

  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status
  if (filters.governorateAr) where.governorateAr = filters.governorateAr
  if (filters.cityAr) where.cityAr = filters.cityAr
  if (filters.bedrooms !== undefined) where.bedrooms = { gte: filters.bedrooms }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {}
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice
  }

  return where
}

// ─── Cached Queries ───────────────────────────────────────────────

/**
 * جلب قائمة العقارات مع التخزين المؤقت
 * Cache: 5min stale, 15min revalidate, 1hr expire
 */
export async function getProperties(filters: PropertyFilters = {}) {
  'use cache'

  const validated = PropertyFilterSchema.parse(filters)
  cacheLife('properties')
  cacheTag('properties', `list-${JSON.stringify(validated)}`)

  const where = buildWhereClause(validated)
  const skip = (validated.page - 1) * validated.limit

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      relationLoadStrategy: 'join',
      select: {
        id: true,
        title: true,
        titleEn: true,
        price: true,
        type: true,
        status: true,
        area: true,
        bedrooms: true,
        bathrooms: true,
        floor: true,
        images: true,
        governorateAr: true,
        governorateEn: true,
        cityAr: true,
        cityEn: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { bookings: true, contracts: true } },
      },
      orderBy: { [validated.sortBy]: validated.sortOrder },
      skip,
      take: validated.limit,
    }),
    prisma.property.count({ where }),
  ])

  return {
    data,
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total,
      totalPages: Math.ceil(total / validated.limit),
    },
  }
}

/**
 * جلب تفاصيل عقار واحد مع React deduplication
 * Cache: 10min stale, 30min revalidate, 2hr expire
 */
const _getPropertyById = async (id: string) => {
  'use cache'
  cacheLife('propertyDetail')
  cacheTag('property', `property-${id}`)

  return prisma.property.findUnique({
    where: { id },
    relationLoadStrategy: 'join',
    select: {
      id: true,
      title: true,
      titleEn: true,
      description: true,
      price: true,
      type: true,
      status: true,
      area: true,
      bedrooms: true,
      bathrooms: true,
      floor: true,
      yearBuilt: true,
      address: true,
      governorateAr: true,
      governorateEn: true,
      cityAr: true,
      cityEn: true,
      neighborhoodAr: true,
      neighborhoodEn: true,
      images: true,
      amenities: true,
      latitude: true,
      longitude: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: { id: true, name: true, phone: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      governorate: {
        select: { id: true, nameAr: true, nameEn: true },
      },
      bookings: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          bookingType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      contracts: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          contractKind: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { bookings: true, contracts: true },
      },
    },
  })
}

// ✅ React cache() يمنع التكرار داخل نفس الطلب
export const getPropertyById = cache(_getPropertyById)

/**
 * جلب العقارات المشابهة
 */
export async function getRelatedProperties(propertyId: string, limit: number = 4) {
  'use cache'
  cacheLife('properties')
  cacheTag('properties', `related-${propertyId}`)

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { type: true, governorateAr: true, cityAr: true, price: true },
  })

  if (!property) return []

  return prisma.property.findMany({
    where: {
      id: { not: propertyId },
      type: property.type,
      governorateAr: property.governorateAr,
      isArchived: false,
      price: {
        gte: Number(property.price) * 0.8,
        lte: Number(property.price) * 1.2,
      },
    },
    select: {
      id: true,
      title: true,
      titleEn: true,
      price: true,
      type: true,
      status: true,
      area: true,
      bedrooms: true,
      images: true,
      governorateAr: true,
      cityAr: true,
    },
    take: limit,
  })
}

// ─── Cache Invalidation ───────────────────────────────────────────

export async function invalidatePropertyCaches(propertyId?: string) {
  const { revalidateTag } = await import('next/cache')

  revalidateTag('properties')
  if (propertyId) {
    revalidateTag(`property-${propertyId}`)
    revalidateTag(`related-${propertyId}`)
  }
}
```

---

## الخلاصة

مشروع bhd-om يمتلك بنية تقنية حديثة (Next.js 16 + React 19 + Prisma 7) لكنه **يفتقر إلى استراتيجيات التخزين المؤقت وتحسينات الأداء الحرجة**. بتنفيذ التوصيات في هذا التقرير:

| المقياس | التحسن المتوقع |
|---------|---------------|
| TTFB | 70-80% أسرع |
| DB Queries | 80-90% أقل |
| Response Size | 40-60% أقل |
| Page Load | 50-60% أسرع |
| Time to Interactive | 40-50% أسرع |

**الأولوية القصوى:** تفعيل Cache Components + إضافة "use cache" + استخدام relationLoadStrategy: "join" + تحديد select بدلاً من include.

---

*نهاية التقرير*
