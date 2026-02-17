'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import InvoiceTemplateEditor from '@/components/admin/InvoiceTemplateEditor';
import type { TemplateType } from '@/lib/data/documentTemplates';

export default function DocumentTemplatesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('admin.nav');
  const ar = locale === 'ar';

  const section = searchParams?.get('section') || 'accounting';
  const type = searchParams?.get('type') || '';

  const accountingTypes = [
    { key: '', labelKey: 'docTemplatesAll' },
    { key: 'invoice', labelKey: 'docTemplatesInvoice' },
    { key: 'quote', labelKey: 'docTemplatesQuote' },
    { key: 'creditNote', labelKey: 'docTemplatesCreditNote' },
    { key: 'purchaseOrder', labelKey: 'docTemplatesPurchaseOrder' },
    { key: 'deliveryNote', labelKey: 'docTemplatesDeliveryNote' },
  ];

  const managementTypes = [
    { key: 'messages', labelKey: 'docTemplatesMessages' },
    { key: 'alerts', labelKey: 'docTemplatesAlerts' },
    { key: 'notifications', labelKey: 'docTemplatesNotifications' },
  ];

  const isAccounting = section === 'accounting';
  const types = isAccounting ? accountingTypes : managementTypes;
  const currentType = type || (isAccounting ? '' : managementTypes[0]?.key);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('documentTemplates')}</h1>
        <p className="admin-page-subtitle">
          {ar ? 'إدارة نماذج وثائق المحاسبة والإدارة' : 'Manage accounting and management document templates'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">{ar ? 'الأقسام' : 'Sections'}</h2>
            </div>
            <div className="admin-card-body space-y-1">
              <a
                href={`/${locale}/admin/document-templates?section=accounting`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isAccounting ? 'bg-amber-50 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Icon name="documentText" className="w-5 h-5" />
                <span>{t('docTemplatesAccounting')}</span>
              </a>
              <a
                href={`/${locale}/admin/document-templates?section=management`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  !isAccounting ? 'bg-amber-50 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Icon name="documentText" className="w-5 h-5" />
                <span>{t('docTemplatesManagement')}</span>
              </a>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                {isAccounting ? t('docTemplatesAccounting') : t('docTemplatesManagement')}
              </h2>
            </div>
            <div className="admin-card-body space-y-1">
              {types.map((tItem) => (
                <a
                  key={tItem.key}
                  href={`/${locale}/admin/document-templates?section=${section}${tItem.key ? `&type=${tItem.key}` : ''}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentType === tItem.key ? 'bg-amber-50 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon name="documentText" className="w-5 h-5" />
                  <span>{t(tItem.labelKey)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isAccounting && ['invoice', 'quote', 'creditNote', 'purchaseOrder', 'deliveryNote'].includes(currentType) ? (
            <InvoiceTemplateEditor templateType={currentType as TemplateType} locale={locale} />
          ) : (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">
                  {currentType ? t(types.find((x) => x.key === currentType)?.labelKey || 'docTemplatesAll') : t('docTemplatesAll')}
                </h2>
              </div>
              <div className="admin-card-body">
                {currentType ? (
                  <div className="text-center py-12 text-gray-500">
                    <Icon name="documentText" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">
                      {ar ? 'قسم نماذج الوثائق' : 'Document Templates Section'}
                    </p>
                    <p className="text-sm mt-1">
                      {ar
                        ? 'سيتم إضافة محرر النماذج هنا قريباً'
                        : 'Template editor will be added here soon'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Icon name="documentText" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">
                      {ar ? 'اختر نوع الوثيقة من القائمة' : 'Select a document type from the list'}
                    </p>
                    <p className="text-sm mt-1">
                      {ar
                        ? 'فاتورة، عرض سعر، إشعار دائن، أمر شراء، إشعار تسليم'
                        : 'Invoice, Quote, Credit note, Purchase order, Delivery note'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
