'use client';

export default function AccountingPeriodsTab(props: {
  ar: boolean;
  periods: Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>;
  onLockPeriod: (periodId: string) => void;
}) {
  const { ar, periods, onLockPeriod } = props;

  return (
    <div className="admin-card overflow-hidden" data-testid="accounting-tab-periods">
      <div className="px-6 py-4 border-b border-gray-100">
        <h4 className="font-bold text-gray-900">{ar ? 'الفترات المالية' : 'Fiscal Periods'}</h4>
        <p className="text-sm text-gray-500 mt-1">{ar ? 'لا ترحيل لفترة مغلقة' : 'No posting to closed period'}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{ar ? 'الفترة' : 'Period'}</th>
              <th>{ar ? 'من' : 'From'}</th>
              <th>{ar ? 'إلى' : 'To'}</th>
              <th>{ar ? 'الحالة' : 'Status'}</th>
              <th>{ar ? 'إجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td className="font-mono">{p.code}</td>
                <td>{new Date(p.startDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                <td>{new Date(p.endDate).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                <td>
                  {p.isLocked ? (
                    <span className="admin-badge">{ar ? 'مغلق' : 'Locked'}</span>
                  ) : (
                    <span className="admin-badge-success">{ar ? 'مفتوح' : 'Open'}</span>
                  )}
                </td>
                <td>
                  {!p.isLocked && (
                    <button type="button" onClick={() => onLockPeriod(p.id)} className="text-sm text-amber-600 hover:underline">
                      {ar ? 'إغلاق الفترة' : 'Lock period'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
