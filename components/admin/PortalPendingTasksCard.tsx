'use client';

import Link from 'next/link';
import Icon from '@/components/icons/Icon';

export type PortalPendingTask = {
  id: string;
  titleAr: string;
  titleEn: string;
  href: string;
  kind: 'payment' | 'contract' | 'booking' | 'sign' | 'maintenance';
};

type Props = {
  locale: string;
  tasks: PortalPendingTask[];
};

export default function PortalPendingTasksCard({ locale, tasks }: Props) {
  const ar = locale === 'ar';
  if (tasks.length === 0) return null;

  const kindIcon = (kind: PortalPendingTask['kind']) => {
    switch (kind) {
      case 'payment':
        return 'creditCard';
      case 'contract':
        return 'archive';
      case 'sign':
        return 'documentText';
      case 'maintenance':
        return 'wrench';
      default:
        return 'calendar';
    }
  };

  return (
    <div className="admin-card mb-8 border border-amber-200/80 bg-amber-50/30">
      <div className="admin-card-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="admin-card-title flex items-center gap-2">
          <Icon name="inbox" className="h-5 w-5 text-amber-700" aria-hidden />
          {ar ? 'مهام تحتاج إجراءك' : 'Tasks needing your action'}
        </h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {tasks.length}
        </span>
      </div>
      <div className="admin-card-body">
        <ul className="space-y-2" role="list">
          {tasks.slice(0, 6).map((task) => (
            <li key={task.id}>
              <Link
                href={task.href.startsWith('/') ? `/${locale}${task.href}` : task.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3 transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <Icon name={kindIcon(task.kind)} className="h-4 w-4" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{ar ? task.titleAr : task.titleEn}</span>
                </div>
                <Icon name="chevronLeft" className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
