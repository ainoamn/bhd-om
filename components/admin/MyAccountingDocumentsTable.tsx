'use client';

import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { fetchAndPrintMeAccountingDocument } from '@/lib/utils/printMeAccountingDocument';

export type AccountingDocRow = {
  id: string;
  serialNumber?: string;
  date?: string;
  totalAmount?: number;
  status?: string;
};

type Props = {
  locale: string;
  docType: 'INVOICE' | 'RECEIPT';
  documents: AccountingDocRow[];
  loaded: boolean;
  emptyMessageAr: string;
  emptyMessageEn: string;
};

export default function MyAccountingDocumentsTable({
  locale,
  docType,
  documents,
  loaded,
  emptyMessageAr,
  emptyMessageEn,
}: Props) {
  const ar = locale === 'ar';

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const handlePrint = async (id: string) => {
    const ok = await fetchAndPrintMeAccountingDocument(id, locale, docType);
    if (!ok && ar) alert('تعذّر فتح المستند للطباعة');
    if (!ok && !ar) alert('Could not open document for printing');
  };

  if (!loaded) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">{ar ? emptyMessageAr : emptyMessageEn}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="admin-table w-full">
        <thead>
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'الرقم' : 'Number'}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'التاريخ' : 'Date'}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'المبلغ' : 'Amount'}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{ar ? 'إجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-gray-900">{d.serialNumber || d.id.slice(0, 8)}</td>
              <td className="px-4 py-3 text-gray-600">{fmtDate(d.date)}</td>
              <td className="px-4 py-3 font-medium">
                {d.totalAmount != null ? d.totalAmount.toLocaleString(ar ? 'ar-OM' : 'en') : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => void handlePrint(d.id)}
                  >
                    <Icon name="printer" className="h-4 w-4" aria-hidden />
                    {ar ? 'طباعة' : 'Print'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
