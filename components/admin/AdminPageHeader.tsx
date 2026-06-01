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
      className={`admin-page-header flex flex-col sm:flex-row sm:items-start sm:justify-between ${compact ? 'gap-2 !mb-4' : 'gap-4'}`}
    >
      <div className="min-w-0">
        <h1
          className={
            compact
              ? 'text-lg sm:text-xl font-semibold tracking-tight leading-snug admin-page-title !text-lg sm:!text-xl !mb-0'
              : 'admin-page-title'
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p className={compact ? 'admin-page-subtitle !text-xs !mt-1 !mb-0 max-w-3xl' : 'admin-page-subtitle'}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className={`admin-toolbar-group admin-toolbar-group--end flex-shrink-0 ${actionsClassName ?? ''}`}>
          {actions}
        </div>
      )}
    </div>
  );
}
