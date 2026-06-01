'use client';

export default function AccountingAuditTab(props: {
  ar: boolean;
  auditLogs: Array<{
    id: string;
    timestamp: string;
    action: string;
    entityType: string;
    entityId: string;
    reason?: string;
  }>;
}) {
  const { ar, auditLogs } = props;

  return (
    <div className="admin-card overflow-hidden" data-testid="accounting-tab-audit">
      <div className="px-6 py-4 border-b border-gray-100">
        <h4 className="font-bold text-gray-900">{ar ? 'سجل التدقيق' : 'Audit Log'}</h4>
        <p className="text-sm text-gray-500 mt-1">{ar ? 'لا تعديل بدون أثر تدقيقي' : 'No modification without audit trail'}</p>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{ar ? 'الوقت' : 'Time'}</th>
              <th>{ar ? 'الإجراء' : 'Action'}</th>
              <th>{ar ? 'الكيان' : 'Entity'}</th>
              <th>{ar ? 'المعرف' : 'ID'}</th>
              <th>{ar ? 'السبب' : 'Reason'}</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="text-xs">{new Date(log.timestamp).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</td>
                <td>
                  <span className="admin-badge">{log.action}</span>
                </td>
                <td>{log.entityType}</td>
                <td className="font-mono text-xs">{log.entityId.slice(0, 12)}...</td>
                <td className="text-xs">{log.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
