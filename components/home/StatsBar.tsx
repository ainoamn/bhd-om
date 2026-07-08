'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { MARKETING_STATS } from '@/lib/siteStatsConstants';

interface StatItem {
  value: number;
  suffix: string;
  labelAr: string;
  labelEn: string;
  icon: string;
}

const fallbackStats: StatItem[] = [
  { value: MARKETING_STATS.properties, suffix: '+', labelAr: 'عقار متاح', labelEn: 'Properties', icon: '🏠' },
  { value: MARKETING_STATS.users, suffix: '+', labelAr: 'عميل سعيد', labelEn: 'Happy Clients', icon: '😊' },
  { value: MARKETING_STATS.bookings, suffix: '+', labelAr: 'حجز مكتمل', labelEn: 'Bookings', icon: '📋' },
  { value: MARKETING_STATS.contracts, suffix: '+', labelAr: 'عقد موقع', labelEn: 'Contracts', icon: '📝' },
];

/**
 * نوع بيانات الإحصائيات القادمة من API
 */
interface StatsApiResponse {
  properties: number;
  users: number;
  bookings: number;
  contracts: number;
}

/**
* ربط بيانات API بالتسميات والأيقونات
* يُنشئ مصفوفة StatItem من البيانات الحقيقية
*/
function mapApiToStats(data: StatsApiResponse): StatItem[] {
  return [
    { value: data.properties || MARKETING_STATS.properties, suffix: '+', labelAr: 'عقار متاح', labelEn: 'Properties', icon: '🏠' },
    { value: data.users || MARKETING_STATS.users, suffix: '+', labelAr: 'عميل سعيد', labelEn: 'Happy Clients', icon: '👥' },
    { value: data.bookings || MARKETING_STATS.bookings, suffix: '+', labelAr: 'حجز مكتمل', labelEn: 'Bookings', icon: '📋' },
    { value: data.contracts || MARKETING_STATS.contracts, suffix: '+', labelAr: 'عقد موقع', labelEn: 'Contracts', icon: '📝' },
  ];
}

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/**
 * مكون شريط الإحصائيات — الآن متصل بقاعدة البيانات عبر API
 * يجلب الأرقام الحقيقية من Prisma ويعرضها مع عداد متحرك
 */
export default function StatsBar() {
  const locale = useLocale();
  const [stats, setStats] = useState<StatItem[]>(fallbackStats); // البيانات الافتراضية أولاً
  const [isLoading, setIsLoading] = useState(true); // حالة التحميل

  /**
   * جلب الإحصائيات الحقيقية من API عند تحميل المكون
   * يستخدم التخزين المؤقت على مستوى Next.js (unstable_cache)
   */
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats', {
          // استخدام cache: 'no-store' لضمان الحصول على بيانات محدثة
          // بينما يتولى unstable_cache في API Route التخزين المؤقت
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`فشل في جلب الإحصائيات: ${response.status}`);
        }

        const data: StatsApiResponse = await response.json();

        // تحديث الإحصائيات بالبيانات الحقيقية من Prisma
        setStats(mapApiToStats(data));
      } catch (error) {
        console.error('[StatsBar] خطأ في جلب الإحصائيات:', error);
        // في حالة الخطأ، نبقي البيانات الافتراضية (fallbackStats)
      } finally {
        setIsLoading(false); // إنهاء حالة التحميل
      }
    }

    fetchStats();
  }, []); // يُنفذ مرة واحدة عند التحميل

  return (
    <section className="relative py-16 bg-gradient-to-r from-[#1A1A2E] via-[#1A1A2E] to-[#0d3b2e]">
      {/* نمط إسلامي زخرفي */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-[#C8102E]/20 group-hover:border-[#C8102E]/50 transition-all duration-300">
                <span className="text-3xl">{stat.icon}</span>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {/* العداد المتحرك — يعرض القيمة الحقيقية من Prisma */}
                <AnimatedCounter
                  target={stat.value}
                  suffix={stat.suffix}
                />
              </div>
              <div className="text-white/70 text-sm md:text-base font-medium">
                {locale === 'ar' ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* خط زخرفي أخضر وأحمر */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1">
        <div className="flex-1 bg-[#C8102E]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#00843D]" />
      </div>
    </section>
  );
}
