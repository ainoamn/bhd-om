type Props = {
  children: React.ReactNode;
  className?: string;
};

/** غلاف موحّد لصفحات اللوحة الفرعية — يفعّل تنسيق admin-subpages */
export default function AdminSubpageShell({ children, className = '' }: Props) {
  return <div className={`admin-page-content${className ? ` ${className}` : ''}`}>{children}</div>;
}
