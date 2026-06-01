'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import DateInput from '@/components/shared/DateInput';
import { getContactDisplayFull, searchContacts, type Contact } from '@/lib/data/addressBook';
import { getBankAccountDisplay, type BankAccount } from '@/lib/data/bankAccounts';
import {
  createDocument,
  getNextDocumentSerial,
  type ChartAccount,
  type DocumentStatus,
  type DocumentType,
} from '@/lib/data/accounting';
import { createDocument as apiCreateDocument } from '@/lib/accounting/api/client';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import type { AccountingDocFormState } from '@/lib/accounting/types/formTypes';
import { useAccountingFormDraft } from '@/lib/accounting/hooks/useAccountingFormDraft';
import { ACCOUNTING_DRAFT_KEYS } from '@/lib/accounting/ui/draftKeys';
import type { Property } from '@/lib/data/properties';
import styles from '@/components/admin/accounting.module.css';

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

export default function AccountingAddDocumentModal(props: {
  ar: boolean;
  locale: string;
  open: boolean;
  onClose: () => void;
  docForm: AccountingDocFormState;
  setDocForm: React.Dispatch<React.SetStateAction<AccountingDocFormState>>;
  contacts: Contact[];
  accounts: ChartAccount[];
  bankAccounts: BankAccount[];
  mergedProperties: Property[];
  projectsList: ProjectListItem[];
  getPropertyDisplay: (p: Property) => string;
  getProjectDisplay: (p: ProjectListItem) => string;
  useDb: boolean;
  onCreated: () => void | Promise<void>;
}) {
  const {
    ar,
    locale,
    open,
    onClose,
    docForm,
    setDocForm,
    contacts,
    accounts,
    bankAccounts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    useDb,
    onCreated,
  } = props;

  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  const filteredContacts = useMemo(() => searchContacts(contactSearchQuery), [contactSearchQuery]);
  const selectedContact = docForm.contactId ? contacts.find((c) => c.id === docForm.contactId) : null;
  const { clearFormDraft } = useAccountingFormDraft(ACCOUNTING_DRAFT_KEYS.document, open, docForm, setDocForm);

  useEffect(() => {
    if (open) {
      setContactSearchQuery('');
      setContactDropdownOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setDocForm((prev) => ({ ...prev, serialNumber: getNextDocumentSerial(prev.type) }));
    }
  }, [open, docForm.type, setDocForm]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} data-testid="accounting-modal-document">
      <div className={`${styles.modalContent} ${styles.modalContentExtraWide} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>
          {docForm.type === 'PURCHASE_INV' ? (ar ? 'فاتورة مشتريات' : 'Purchase Invoice') : docForm.type === 'PURCHASE_ORDER' ? (ar ? 'أمر شراء' : 'Purchase Order') : (ar ? 'إضافة مستند محاسبي' : 'Add accounting document')}
        </h3>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {ar ? 'البيانات المدخلة لن تظهر في النظام إلا بعد الحفظ — تُحفظ تلقائياً كمسودة.' : 'Entered data appears in the system only after save — auto-saved as draft.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            let amount = 0;
            let items: { descriptionAr: string; descriptionEn?: string; quantity: number; unitPrice: number; amount: number; accountId?: string }[] | undefined;
            if (docForm.useLineItems && docForm.items.length > 0) {
              items = docForm.items
                .filter((i) => i.descriptionAr.trim() && !isNaN(parseFloat(i.unitPrice)))
                .map((i) => {
                  const qty = i.quantity || 1;
                  const unitPrice = parseFloat(i.unitPrice) || 0;
                  return { descriptionAr: i.descriptionAr, quantity: qty, unitPrice, amount: qty * unitPrice, accountId: i.accountId || undefined };
                });
              amount = items.reduce((s, i) => s + i.amount, 0);
            } else {
              amount = parseFloat(docForm.amount) || 0;
            }
            if (isNaN(amount) || amount <= 0) return;
            if (['PURCHASE_INV', 'PURCHASE_ORDER', 'INVOICE'].includes(docForm.type) && !docForm.contactId) {
              alert(ar ? 'الرجاء اختيار العميل/المورد' : 'Please select contact/supplier');
              return;
            }
            const vatRate = docForm.vatRate || 0;
            const vatAmount = amount * (vatRate / 100);
            const totalAmount = amount + vatAmount;
            const docData = {
              type: docForm.type,
              status: 'APPROVED' as DocumentStatus,
              date: docForm.date,
              dueDate: docForm.dueDate || undefined,
              contactId: docForm.contactId || undefined,
              bankAccountId: docForm.bankAccountId || undefined,
              propertyId: docForm.propertyId ? parseInt(docForm.propertyId, 10) : undefined,
              projectId: docForm.projectId && !isNaN(parseInt(docForm.projectId, 10)) ? parseInt(docForm.projectId, 10) : undefined,
              amount,
              currency: docForm.currency || 'OMR',
              vatRate: vatRate > 0 ? vatRate : undefined,
              vatAmount: vatAmount > 0 ? vatAmount : undefined,
              totalAmount,
              descriptionAr: docForm.descriptionAr || undefined,
              descriptionEn: docForm.descriptionEn || undefined,
              items,
              ...(docForm.serialNumber?.trim() && { serialNumber: docForm.serialNumber.trim() }),
              purchaseOrder: docForm.purchaseOrder?.trim() || undefined,
              reference: docForm.reference?.trim() || undefined,
              branch: docForm.branch?.trim() || undefined,
              attachments: docForm.attachments?.length ? docForm.attachments : undefined,
            };
            try {
              if (useDb) {
                await apiCreateDocument(docData);
              } else {
                createDocument(docData);
              }
              await onCreated();
              clearFormDraft();
              onClose();
            } catch (err) {
              alert(err instanceof Error ? err.message : ar ? 'فشل إنشاء المستند' : 'Failed to create document');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'نوع المستند' : 'Document type'}</label>
            <select
              value={docForm.type}
              onChange={(e) => {
                const t = e.target.value as DocumentType;
                const useItems = ['INVOICE', 'QUOTE', 'PURCHASE_INV', 'PURCHASE_ORDER'].includes(t);
                setDocForm({ ...docForm, type: t, useLineItems: docForm.useLineItems || useItems });
              }}
              className="admin-select w-full"
            >
              {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).filter((t) => ['INVOICE', 'RECEIPT', 'QUOTE', 'DEPOSIT', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OTHER', 'PURCHASE_INV', 'PURCHASE_ORDER'].includes(t)).map((t) => (
                <option key={t} value={t}>{ar ? DOC_TYPE_LABELS[t].ar : DOC_TYPE_LABELS[t].en}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الفاتورة' : 'Invoice number'}</label>
              <input type="text" value={docForm.serialNumber} onChange={(e) => setDocForm({ ...docForm, serialNumber: e.target.value })} className="admin-input w-full" placeholder={ar ? 'يُولّد تلقائياً - يمكن التعديل' : 'Auto-generated - editable'} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العملة' : 'Currency'}</label>
              <select value={docForm.currency} onChange={(e) => setDocForm({ ...docForm, currency: e.target.value })} className="admin-select w-full">
                <option value="OMR">OMR ر.ع</option>
                <option value="USD">USD $</option>
                <option value="AED">AED د.إ</option>
                <option value="SAR">SAR ر.س</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ *' : 'Date *'}</label>
              <DateInput value={docForm.date} onChange={(v) => setDocForm({ ...docForm, date: v })} locale={locale} className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'تاريخ الاستحقاق *' : 'Due date *'}</label>
              <DateInput value={docForm.dueDate} onChange={(v) => setDocForm({ ...docForm, dueDate: v })} locale={locale} className="w-full" />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER') ? (ar ? 'المورد *' : 'Supplier *') : (ar ? 'العميل / المستلم *' : 'Contact *')}
            </label>
            <input
              type="text"
              value={selectedContact ? getContactDisplayFull(selectedContact, locale) : contactSearchQuery}
              onChange={(e) => {
                if (selectedContact) {
                  setDocForm({ ...docForm, contactId: '' });
                  setContactSearchQuery(e.target.value);
                } else {
                  setContactSearchQuery(e.target.value);
                  if (!e.target.value) setDocForm({ ...docForm, contactId: '' });
                }
                setContactDropdownOpen(true);
              }}
              onFocus={() => setContactDropdownOpen(true)}
              onBlur={() => setTimeout(() => setContactDropdownOpen(false), 200)}
              placeholder={ar ? 'ابحث بالاسم أو الهاتف أو الرقم المدني...' : 'Search by name, phone, or civil ID...'}
              className="admin-input w-full"
              autoComplete="off"
            />
            {['PURCHASE_INV', 'PURCHASE_ORDER', 'INVOICE'].includes(docForm.type) && !docForm.contactId && (
              <p className="text-red-500 text-xs mt-1">{ar ? 'مطلوب' : 'Required'}</p>
            )}
            {selectedContact && (
              <button type="button" onClick={() => { setDocForm({ ...docForm, contactId: '' }); setContactSearchQuery(''); }} className="absolute top-9 end-2 text-gray-400 hover:text-red-600 text-sm">
                ✕
              </button>
            )}
            {contactDropdownOpen && (
              <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                {filteredContacts.slice(0, 20).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDocForm({ ...docForm, contactId: c.id });
                        setContactSearchQuery('');
                        setContactDropdownOpen(false);
                      }}
                      className="w-full text-right px-4 py-2.5 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">{getContactDisplayFull(c, locale)}</span>
                      {c.phone && <span className="text-gray-500 block text-xs mt-0.5">{c.phone}</span>}
                      {c.civilId && <span className="text-gray-400 text-xs">{ar ? 'مدني:' : 'Civil:'} {c.civilId}</span>}
                    </button>
                  </li>
                ))}
                {filteredContacts.length === 0 && <li className="px-4 py-3 text-gray-500 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</li>}
              </ul>
            )}
          </div>
          {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER' || docForm.type === 'INVOICE' || docForm.type === 'QUOTE') && (
            <div className="grid grid-cols-2 gap-4">
              {(docForm.type === 'PURCHASE_INV' || docForm.type === 'PURCHASE_ORDER') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'أمر شراء' : 'Purchase order'}</label>
                  <input type="text" value={docForm.purchaseOrder} onChange={(e) => setDocForm({ ...docForm, purchaseOrder: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري' : 'Optional'} />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المرجع (يُملأ تلقائياً من العقار/المشروع أو يدوياً)' : 'Reference (auto from property/project or manual)'}</label>
                <input type="text" value={docForm.reference} onChange={(e) => setDocForm({ ...docForm, reference: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري - أو اختر عقار/مشروع' : 'Optional - or select property/project'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الفرع' : 'Branch'}</label>
                <input type="text" value={docForm.branch} onChange={(e) => setDocForm({ ...docForm, branch: e.target.value })} className="admin-input w-full" placeholder={ar ? 'اختياري' : 'Optional'} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العقار (المرجع)' : 'Property (Reference)'}</label>
                <select
                  value={docForm.propertyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const p = val ? mergedProperties.find((x) => String(x.id) === val) : null;
                    setDocForm({ ...docForm, propertyId: val, reference: p ? getPropertyDisplay(p) : docForm.reference });
                  }}
                  className="admin-select w-full"
                >
                  <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                  {mergedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المشروع (المرجع)' : 'Project (Reference)'}</label>
                <select
                  value={docForm.projectId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const p = val ? projectsList.find((x) => String(x.id) === val) : null;
                    setDocForm({ ...docForm, projectId: val, reference: p ? getProjectDisplay(p) : docForm.reference });
                  }}
                  className="admin-select w-full"
                >
                  <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="useLineItems" checked={docForm.useLineItems} onChange={(e) => setDocForm({ ...docForm, useLineItems: e.target.checked })} className="rounded" />
            <label htmlFor="useLineItems" className="text-sm font-semibold text-gray-700">{ar ? 'تجميع بنود الفاتورة' : 'Use line items (detailed invoice)'}</label>
          </div>
          {!docForm.useLineItems ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المبلغ *' : 'Amount *'}</label>
              <input type="number" step="0.01" min="0" required value={docForm.amount} onChange={(e) => setDocForm({ ...docForm, amount: e.target.value })} className="admin-input w-full" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ar ? 'منتج/منتجات' : 'Line items'}</label>
              <div className="overflow-x-auto">
                <table className="admin-table text-sm">
                  <thead>
                    <tr>
                      <th>{ar ? 'الوصف *' : 'Description *'}</th>
                      <th>{ar ? 'حساب *' : 'Account *'}</th>
                      <th>{ar ? 'الكمية *' : 'Qty *'}</th>
                      <th>{ar ? 'السعر * (خال من الضريبة)' : 'Price * (tax-free)'}</th>
                      <th>{ar ? 'المجموع' : 'Total'}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docForm.items.map((item, i) => {
                      const qty = item.quantity || 1;
                      const price = parseFloat(item.unitPrice) || 0;
                      const total = qty * price;
                      return (
                        <tr key={i}>
                          <td><input type="text" value={item.descriptionAr} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], descriptionAr: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-full min-w-[120px]" placeholder={ar ? 'الوصف' : 'Description'} required /></td>
                          <td>
                            <select value={item.accountId} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], accountId: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-select min-w-[140px]">
                              <option value="">{ar ? '— اختر —' : '— Select —'}</option>
                              {accounts.filter((a) => a.isActive).map((a) => (
                                <option key={a.id} value={a.id}>{a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}</option>
                              ))}
                            </select>
                          </td>
                          <td><input type="number" min="1" value={item.quantity} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], quantity: parseInt(e.target.value, 10) || 1 }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-16" /></td>
                          <td><input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => { const n = [...docForm.items]; n[i] = { ...n[i], unitPrice: e.target.value }; setDocForm({ ...docForm, items: n }); }} className="admin-input w-24" placeholder={ar ? 'السعر' : 'Price'} required /></td>
                          <td className="font-semibold">{total.toFixed(2)}</td>
                          <td><button type="button" onClick={() => setDocForm({ ...docForm, items: docForm.items.filter((_, j) => j !== i) })} className="text-red-600 p-1 hover:bg-red-50 rounded">✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setDocForm({ ...docForm, items: [...docForm.items, { descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm admin-accent-text hover:underline font-semibold">{ar ? 'أضف بند' : 'Add line'}</button>
                <button type="button" onClick={() => setDocForm({ ...docForm, items: docForm.items.length > 1 ? docForm.items.slice(0, -1) : [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm text-red-600 hover:underline">{ar ? 'حذف آخر بند' : 'Delete last line'}</button>
                <button type="button" onClick={() => setDocForm({ ...docForm, items: [{ descriptionAr: '', quantity: 1, unitPrice: '', accountId: '' }] })} className="text-sm text-amber-600 hover:underline">{ar ? 'مسح الكل' : 'Clear all'}</button>
              </div>
              {(() => {
                const sub = docForm.items.reduce((s, i) => s + (i.quantity || 1) * (parseFloat(i.unitPrice) || 0), 0);
                const vat = sub * (docForm.vatRate || 0) / 100;
                const tot = sub + vat;
                return (
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1 text-sm">
                    <div className="flex justify-between"><span>{ar ? 'المجموع الفرعي' : 'Subtotal'}</span><span>{sub.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>
                    {vat > 0 && <div className="flex justify-between"><span>{ar ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT'}</span><span>{vat.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>}
                    <div className="flex justify-between font-bold pt-2 border-t border-gray-200"><span>{ar ? 'المجموع' : 'Total'}</span><span>{tot.toFixed(2)} {docForm.currency || 'ر.ع'}</span></div>
                  </div>
                );
              })()}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ضريبة القيمة المضافة (%)' : 'VAT (%)'}</label>
            <select value={docForm.vatRate} onChange={(e) => setDocForm({ ...docForm, vatRate: parseInt(e.target.value, 10) })} className="admin-select w-full">
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={15}>15%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'مرفقات' : 'Attachments'}</label>
            <div className="flex flex-wrap gap-2">
              {docForm.attachments.map((att, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-sm">
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="admin-accent-text hover:underline truncate max-w-[120px]">{att.name}</a>
                  <button type="button" onClick={() => setDocForm({ ...docForm, attachments: docForm.attachments.filter((_, j) => j !== i) })} className="text-red-600">✕</button>
                </span>
              ))}
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 admin-accent-border-hover cursor-pointer text-sm font-medium text-gray-600">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      const res = await fetch('/api/upload/accounting', { method: 'POST', body: fd });
                      const json = await res.json();
                      if (json.url) setDocForm({ ...docForm, attachments: [...docForm.attachments, { url: json.url, name: json.name || file.name }] });
                    } catch {
                      alert(ar ? 'فشل رفع الملف' : 'Upload failed');
                    }
                    ev.target.value = '';
                  }}
                />
                <Icon name="archive" className="h-4 w-4" />
                {ar ? 'رفع ملف' : 'Upload file'}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الحساب البنكي' : 'Bank account'}</label>
            <select value={docForm.bankAccountId} onChange={(e) => setDocForm({ ...docForm, bankAccountId: e.target.value })} className="admin-select w-full">
              <option value="">{ar ? '— اختر —' : '— Select —'}</option>
              {bankAccounts.filter((a) => a.isActive).map((a) => (
                <option key={a.id} value={a.id}>{getBankAccountDisplay(a)}{a.branch ? ` (${a.branch})` : ''}</option>
              ))}
            </select>
            {(docForm.propertyId || docForm.projectId || docForm.reference) && (
              <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                <span className="font-medium text-blue-800">{ar ? 'المرجع في الحساب البنكي:' : 'Reference in bank account:'}</span>
                <p className="text-blue-700 mt-1 whitespace-pre-wrap">
                  {docForm.reference || (() => {
                    if (docForm.propertyId) {
                      const p = mergedProperties.find((x) => String(x.id) === docForm.propertyId);
                      return p ? getPropertyDisplay(p) : '';
                    }
                    if (docForm.projectId) {
                      const p = projectsList.find((x) => String(x.id) === docForm.projectId);
                      return p ? getProjectDisplay(p) : '';
                    }
                    return '';
                  })()}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
            <textarea value={docForm.descriptionAr} onChange={(e) => setDocForm({ ...docForm, descriptionAr: e.target.value })} className="admin-input w-full min-h-[100px] resize-y" placeholder={ar ? 'وصف المستند' : 'Document description'} rows={4} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
