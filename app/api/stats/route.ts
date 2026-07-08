/**
 * API Route لجلب الإحصائيات من قاعدة البيانات عبر Prisma
 * يستخدم unstable_cache للتخزين المؤقت مع إعادة التحقق كل 60 ثانية
 */

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** نوع بيانات الإحصائيات المرجعة */
export interface StatsData {
  properties: number;
  users: number;
  bookings: number;
  contracts: number;
}

/** مفتاح التخزين المؤقت للإحصائيات */
const CACHE_KEY = 'bhd-stats';

/** مدة صلاحية التخزين المؤقت بالثواني (60 ثانية) */
const CACHE_TTL = 60;

/**
 * جلب الإحصائيات من قاعدة البيانات باستخدام Prisma
 * تُحتسب الأرقام من الجداول الفعلية: Property, User, BookingStorage, ContractStorage
 */
const getStatsFromDb = unstable_cache(
  async (): Promise<StatsData> => {
    // جلب كل الأعداد بالتوازي لتحسين الأداء
    const [properties, users, bookings, contracts] = await Promise.all([
      prisma.property.count(),      // عدد العقارات المتاحة
      prisma.user.count(),          // عدد المستخدمين المسجلين
      prisma.bookingStorage.count(), // عدد الحجوزات المخزنة
      prisma.contractStorage.count(), // عدد العقود المخزنة
    ]);

    return {
      properties,
      users,
      bookings,
      contracts,
    };
  },
  [CACHE_KEY],
  {
    revalidate: CACHE_TTL, // إعادة التحقق كل 60 ثانية
    tags: ['stats'],        // وسوم للتحكم في التخزين المؤقت
  }
);

/**
 * GET /api/stats
 * يعيد الإحصائيات الحقيقية من قاعدة البيانات مع التخزين المؤقت
 */
export async function GET(): Promise<NextResponse<StatsData>> {
  try {
    const stats = await getStatsFromDb();

    // إضافة headers للتحكم في التخزين المؤقت على مستوى HTTP
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=300`,
      },
    });
  } catch (error) {
    console.error('[API /stats] خطأ في جلب الإحصائيات:', error);

    // في حالة الخطأ، نعيد أصفاراً مع حالة 500
    // هذا يضمن عدم تعطل الواجهة الأمامية
    return NextResponse.json(
      { properties: 0, users: 0, bookings: 0, contracts: 0 },
      { status: 500 }
    );
  }
}

/** تحديد runtime Node.js لأن Prisma يتطلب بيئة Node.js كاملة */
export const runtime = 'nodejs';

/** تحديد منطقة التنفيذ (اختياري) */
export const preferredRegion = 'home';
