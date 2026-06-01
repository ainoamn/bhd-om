interface AdminToolbarProps {
  children: React.ReactNode;
  className?: string;
  /** يثبت شريط الأدوات أعلى منطقة المحتوى عند التمرير */
  sticky?: boolean;
}

/** شريط أدوات موحّد للصفحات الكثيفة (جداول، فلاتر، إجراءات) */
export default function AdminToolbar({ children, className = '', sticky }: AdminToolbarProps) {
  return (
    <div className={`admin-toolbar${sticky ? ' admin-toolbar--sticky' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
