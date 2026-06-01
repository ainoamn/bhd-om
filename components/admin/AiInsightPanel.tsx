'use client';

import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import type { DashboardInsight } from '@/lib/admin/dashboardInsights';

type Props = {
  locale: string;
  brief: string;
  insights: DashboardInsight[];
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const priorityStyles: Record<DashboardInsight['priority'], string> = {
  critical: 'admin-dash-insight--critical',
  high: 'admin-dash-insight--high',
  medium: 'admin-dash-insight--medium',
  low: 'admin-dash-insight--low',
  positive: 'admin-dash-insight--positive',
};

export default function AiInsightPanel({ locale, brief, insights, loading, onRefresh, refreshing }: Props) {
  const ar = locale === 'ar';

  return (
    <section className="admin-dash-ai-panel admin-card">
      <div className="admin-card-header admin-dash-ai-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="admin-dash-ai-badge" aria-hidden>
            <Icon name="sparkles" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="admin-card-title">{ar ? 'المساعد الذكي' : 'AI Assistant'}</h2>
            <p className="text-xs admin-accent-text font-semibold mt-0.5">
              {ar ? 'تحليل فوري · توصيات قابلة للتنفيذ' : 'Instant analysis · Actionable recommendations'}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="admin-btn-secondary !py-2 !px-3 !text-xs !min-h-0"
          >
            <Icon name="cog" className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
        )}
      </div>
      <div className="admin-card-body space-y-4">
        <div className="admin-dash-ai-brief">
          {loading ? (
            <div className="admin-dash-skeleton admin-dash-skeleton--line" />
          ) : (
            <p className="text-sm leading-relaxed">{brief}</p>
          )}
        </div>
        <ul className="space-y-2">
          {(loading ? Array.from({ length: 3 }) : insights.slice(0, 5)).map((item, idx) => {
            if (loading) {
              return <li key={idx} className="admin-dash-skeleton admin-dash-skeleton--card h-16 rounded-xl" />;
            }
            const insight = item as DashboardInsight;
            const title = ar ? insight.titleAr : insight.titleEn;
            const body = ar ? insight.bodyAr : insight.bodyEn;
            const actionLabel = ar ? insight.actionLabelAr : insight.actionLabelEn;
            return (
              <li key={insight.id} className={`admin-dash-insight ${priorityStyles[insight.priority]}`}>
                <div className="flex items-start gap-3 min-w-0">
                  {insight.metric && (
                    <span className="admin-dash-insight-metric">{insight.metric}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{body}</p>
                  </div>
                  {insight.actionHref && actionLabel && (
                    <Link
                      href={`/${locale}${insight.actionHref}`}
                      prefetch
                      className="admin-dash-insight-action shrink-0"
                    >
                      {actionLabel}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
