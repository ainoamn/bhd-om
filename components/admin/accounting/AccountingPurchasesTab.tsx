'use client';

import Icon from '@/components/icons/Icon';
import type { DocumentType } from '@/lib/data/accounting';
import { PURCHASES_MODULES, purchasesModuleDocType } from '@/lib/accounting/ui/salesPurchasesModules';

export default function AccountingPurchasesTab(props: {
  ar: boolean;
  onOpenDocument: (docType: DocumentType) => void;
}) {
  const { ar, onOpenDocument } = props;

  return (
    <div className="space-y-6" data-testid="accounting-tab-purchases">
      <div className="rounded-2xl border border-blue-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="archive" className="h-5 w-5 text-blue-600" />
            {ar ? 'المشتريات' : 'Purchases'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{ar ? 'فواتير مشتريات، سندات موردين، مصروفات، إشعارات مدينة، أوامر شراء' : 'Purchase invoices, supplier receipts, expenses, debit notes, purchase orders'}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PURCHASES_MODULES.map((m) => {
              const purchDocType = purchasesModuleDocType(m.id);
              const canOpen = purchDocType !== null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={canOpen ? () => onOpenDocument(purchDocType!) : undefined}
                  className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-right group ${canOpen ? 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all' : 'border-gray-100 bg-gray-50/50 cursor-default'}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200">
                    <Icon name={m.icon} className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-gray-900">{ar ? m.labelAr : m.labelEn}</span>
                  {canOpen ? <span className="text-xs text-blue-600">✓ {ar ? 'متاح' : 'Available'}</span> : <span className="text-xs text-amber-600">{ar ? 'قريباً' : 'Coming soon'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
