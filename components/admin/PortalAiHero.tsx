'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/icons/Icon';
import AiInsightPanel from '@/components/admin/AiInsightPanel';
import type { DashboardInsight } from '@/lib/admin/dashboardInsights';

type Props = {
  locale: string;
  role: 'CLIENT' | 'OWNER';
  userName?: string | null;
};

export default function PortalAiHero({ locale, role, userName }: Props) {
  const ar = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [brief, setBrief] = useState('');
  const [insights, setInsights] = useState<DashboardInsight[]>([]);

  const load = async (silent?: boolean) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/me/portal-insights', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setBrief(ar ? data.briefAr : data.briefEn);
      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setBrief(
        ar
          ? 'مرحباً — راجع مهامك وإشعاراتك من الأقسام أدناه.'
          : 'Welcome — review your tasks and notifications in the sections below.'
      );
      setInsights([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locale drives brief language
  }, [locale]);

  const greeting = ar ? 'مرحباً' : 'Welcome';
  const roleLabel =
    role === 'OWNER'
      ? ar
        ? 'لوحة المالك'
        : 'Owner panel'
      : ar
        ? 'لوحتي'
        : 'My panel';

  return (
    <div className="admin-dash-portal-wrap mb-8 space-y-6">
      <header className="admin-dash-hero">
        <div className="admin-dash-hero-glow" aria-hidden />
        <div className="admin-dash-hero-content">
          <p className="admin-dash-hero-eyebrow">{roleLabel}</p>
          <h1 className="admin-dash-hero-title">
            {greeting}
            {userName ? `، ${userName}` : ''}
          </h1>
          <p className="admin-dash-hero-sub">
            {ar
              ? 'لوحة ذكية تلخص مهامك وتوجّهك للخطوة التالية.'
              : 'A smart panel that summarizes your tasks and guides your next step.'}
          </p>
        </div>
        <div className="admin-dash-hero-icon" aria-hidden>
          <Icon name="sparkles" className="w-8 h-8" />
        </div>
      </header>
      <AiInsightPanel
        locale={locale}
        brief={brief}
        insights={insights}
        loading={loading}
        onRefresh={() => void load(true)}
        refreshing={refreshing}
      />
    </div>
  );
}
