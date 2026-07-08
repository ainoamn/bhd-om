/**
 * مكون Skeleton Loading للإحصائيات
 * يُعرض كـ fallback أثناء تحميل البيانات من Prisma
 * يحاكي نفس تصميم StatsBar تماماً مع تأثير التحميل المتحرك
 */

export default function StatsBarSkeleton() {
  return (
    <section className="relative py-16 bg-gradient-to-r from-[#1A1A2E] via-[#1A1A2E] to-[#0d3b2e]">
      {/* نمط إسلامي زخرفي — نفس StatsBar الأصلي */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* 4 عناصر skeleton — نفس عدد الإحصائيات */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="text-center">
              {/* أيقونة skeleton */}
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 animate-pulse">
                <div className="w-8 h-8 bg-white/20 rounded" />
              </div>
              {/* رقم skeleton */}
              <div className="text-4xl md:text-5xl font-bold mb-2">
                <div className="h-12 w-24 mx-auto bg-white/20 rounded animate-pulse" />
              </div>
              {/* تسمية skeleton */}
              <div className="h-5 w-32 mx-auto bg-white/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* خط زخرفي أخضر وأحمر — نفس StatsBar الأصلي */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1">
        <div className="flex-1 bg-[#C8102E]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#00843D]" />
      </div>
    </section>
  );
}
