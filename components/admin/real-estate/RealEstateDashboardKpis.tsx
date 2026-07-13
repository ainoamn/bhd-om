'use client';

import { formatOmr, type RealEstateDashboardStats } from '@/lib/real-estate/dashboardStats';

type Props = {
  locale: 'ar' | 'en';
  stats: RealEstateDashboardStats | null;
  loading: boolean;
};

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-dash-kpi admin-card">
      <div className="admin-dash-kpi-value">{value}</div>
      <div className="admin-dash-kpi-label">{label}</div>
    </div>
  );
}

export default function RealEstateDashboardKpis({ locale, stats, loading }: Props) {
  const ar = locale === 'ar';
  if (loading) {
    return (
      <div className="admin-dash-kpi-grid mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-dash-kpi admin-card opacity-50 animate-pulse">
            <div className="admin-dash-kpi-value">—</div>
            <div className="admin-dash-kpi-label">{ar ? 'جاري التحميل…' : 'Loading…'}</div>
          </div>
        ))}
      </div>
    );
  }
  if (!stats) {
    return (
      <p className="text-sm opacity-70 mb-6">
        {ar ? 'تعذر تحميل ملخص لوحة العقارات.' : 'Could not load real estate dashboard summary.'}
      </p>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 opacity-80">
          {ar ? 'محفظة العقارات' : 'Property portfolio'}
        </h3>
        <div className="admin-dash-kpi-grid">
          <KpiCard label={ar ? 'المباني' : 'Buildings'} value={stats.buildings} />
          <KpiCard label={ar ? 'الملاك' : 'Owners'} value={stats.owners} />
          <KpiCard label={ar ? 'إجمالي الوحدات' : 'Total units'} value={stats.totalUnits} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 opacity-80">{ar ? 'حالة الوحدات' : 'Unit status'}</h3>
        <div className="admin-dash-kpi-grid">
          <KpiCard label={ar ? 'مؤجرة' : 'Rented'} value={stats.rentedUnits} />
          <KpiCard label={ar ? 'شاغرة' : 'Vacant'} value={stats.vacantUnits} />
          <KpiCard label={ar ? 'محجوزة' : 'Reserved'} value={stats.reservedUnits} />
          <KpiCard label={ar ? 'طلبات إخلاء' : 'Eviction queue'} value={stats.evictionQueue} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 opacity-80">{ar ? 'الإيجارات والانتهاء' : 'Rent & expiry'}</h3>
        <div className="admin-dash-kpi-grid">
          <KpiCard
            label={ar ? 'إيجار شهري' : 'Monthly rent'}
            value={formatOmr(stats.monthlyRentOmr, locale)}
          />
          <KpiCard
            label={ar ? 'تقدير سنوي' : 'Yearly estimate'}
            value={formatOmr(stats.yearlyRentOmr, locale)}
          />
          <KpiCard label={ar ? 'ينتهي خلال 30 يوم' : 'Expiring 30d'} value={stats.expiring30} />
          <KpiCard label={ar ? 'ينتهي خلال 60 يوم' : 'Expiring 60d'} value={stats.expiring60} />
          <KpiCard label={ar ? 'ينتهي خلال 90 يوم' : 'Expiring 90d'} value={stats.expiring90} />
        </div>
      </div>
    </div>
  );
}
