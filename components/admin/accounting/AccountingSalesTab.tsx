'use client';

import Icon from '@/components/icons/Icon';
import type { DocumentType } from '@/lib/data/accounting';
import { SALES_MODULES, salesModuleDocType, salesModulePreset } from '@/lib/accounting/ui/salesPurchasesModules';

export default function AccountingSalesTab(props: {
  ar: boolean;
  onOpenDocument: (docType: DocumentType, preset?: { descriptionAr?: string; descriptionEn?: string }) => void;
}) {
  const { ar, onOpenDocument } = props;

  return (
    <div className="space-y-6" data-testid="accounting-tab-sales">
      <div className="rounded-2xl border border-emerald-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="archive" className="h-5 w-5 text-emerald-600" />
            {ar ? 'المبيعات' : 'Sales'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{ar ? 'عروض أسعار، فواتير بيع، سندات عملاء، إشعارات دائنة' : 'Quotes, sales invoices, customer receipts, credit notes'}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SALES_MODULES.map((m) => {
              const docType = salesModuleDocType(m.id);
              const canOpen = docType !== null;
              const preset = salesModulePreset(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={canOpen ? () => onOpenDocument(docType!, preset) : undefined}
                  className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-right group ${canOpen ? 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 cursor-pointer transition-all' : 'border-gray-100 bg-gray-50/50 cursor-default'}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200">
                    <Icon name={m.icon} className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-gray-900">{ar ? m.labelAr : m.labelEn}</span>
                  {canOpen ? <span className="text-xs text-emerald-600">✓ {ar ? 'متاح' : 'Available'}</span> : <span className="text-xs text-amber-600">{ar ? 'قريباً' : 'Coming soon'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
