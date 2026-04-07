interface AdminPageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  /** عنوان ووصف أصغر وهوامش أقل — للصفحات ذات الجداول الكثيفة */
  compact?: boolean;
  /** يُطبَّق على حاوية أزرار الإجراءات (مثلاً لفئات أدوات مضغوطة) */
  actionsClassName?: string;
}

export default function AdminPageHeader({ title, subtitle, actions, compact, actionsClassName }: AdminPageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${compact ? 'gap-2 mb-4' : 'gap-4 mb-8'}`}
    >
      <div className="min-w-0">
        <h1
          className={
            compact
              ? 'text-lg sm:text-xl font-semibold text-gray-900 tracking-tight leading-snug'
              : 'admin-page-title'
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={
              compact
                ? 'text-xs text-gray-500 mt-1 font-medium leading-relaxed max-w-3xl'
                : 'admin-page-subtitle'
            }
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className={`flex-shrink-0 ${actionsClassName ?? ''}`}>{actions}</div>}
    </div>
  );
}
