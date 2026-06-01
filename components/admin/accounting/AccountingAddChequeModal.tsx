'use client';

import DateInput from '@/components/shared/DateInput';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import {
  createDocument,
  getNextDocumentSerial,
  type DocumentStatus,
} from '@/lib/data/accounting';
import { createDocument as apiCreateDocument } from '@/lib/accounting/api/client';
import type { ChequeFormState } from '@/lib/accounting/types/formTypes';
import type { Property } from '@/lib/data/properties';
import styles from '@/components/admin/accounting.module.css';

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

export default function AccountingAddChequeModal(props: {
  ar: boolean;
  locale: string;
  open: boolean;
  onClose: () => void;
  chequeForm: ChequeFormState;
  setChequeForm: React.Dispatch<React.SetStateAction<ChequeFormState>>;
  contacts: Contact[];
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
    chequeForm,
    setChequeForm,
    contacts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    useDb,
    onCreated,
  } = props;

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} data-testid="accounting-modal-cheque">
      <div className={`${styles.modalContent} ${styles.modalContentWide}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{ar ? 'إضافة شيك' : 'Add Cheque'}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseFloat(chequeForm.amount) || 0;
            if (amount <= 0) {
              alert(ar ? 'أدخل المبلغ' : 'Enter amount');
              return;
            }
            const docData = {
              type: 'RECEIPT' as const,
              status: 'APPROVED' as DocumentStatus,
              date: chequeForm.date,
              dueDate: chequeForm.dueDate || undefined,
              contactId: chequeForm.contactId || undefined,
              propertyId: chequeForm.propertyId ? parseInt(chequeForm.propertyId, 10) : undefined,
              projectId: chequeForm.projectId && !isNaN(parseInt(chequeForm.projectId, 10)) ? parseInt(chequeForm.projectId, 10) : undefined,
              contractId: chequeForm.contractId?.trim() || undefined,
              amount,
              currency: 'OMR',
              totalAmount: amount,
              descriptionAr: chequeForm.descriptionAr || undefined,
              paymentMethod: 'CHEQUE' as const,
              paymentReference: chequeForm.chequeNumber?.trim() || undefined,
              chequeNumber: chequeForm.chequeNumber?.trim() || undefined,
              chequeDueDate: chequeForm.dueDate || undefined,
              chequeBankName: chequeForm.bankName?.trim() || undefined,
              serialNumber: getNextDocumentSerial('RECEIPT'),
            };
            try {
              if (useDb) {
                await apiCreateDocument(docData);
              } else {
                createDocument(docData);
              }
              await onCreated();
              onClose();
            } catch (err) {
              alert(err instanceof Error ? err.message : ar ? 'فشل إنشاء الشيك' : 'Failed to create cheque');
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الشيك *' : 'Cheque # *'}</label>
              <input type="text" value={chequeForm.chequeNumber} onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })} className="admin-input w-full" placeholder={ar ? 'رقم الشيك' : 'Cheque number'} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المبلغ *' : 'Amount *'}</label>
              <input type="number" step="0.01" min="0" value={chequeForm.amount} onChange={(e) => setChequeForm({ ...chequeForm, amount: e.target.value })} className="admin-input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <DateInput value={chequeForm.dueDate} onChange={(v) => setChequeForm({ ...chequeForm, dueDate: v })} locale={locale} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'اسم البنك' : 'Bank Name'}</label>
              <input type="text" value={chequeForm.bankName} onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })} className="admin-input w-full" placeholder={ar ? 'البنك' : 'Bank'} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
              <DateInput value={chequeForm.date} onChange={(v) => setChequeForm({ ...chequeForm, date: v })} locale={locale} className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العميل' : 'Contact'}</label>
              <select value={chequeForm.contactId} onChange={(e) => setChequeForm({ ...chequeForm, contactId: e.target.value })} className="admin-select w-full">
                <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العقار' : 'Property'}</label>
              <select value={chequeForm.propertyId} onChange={(e) => setChequeForm({ ...chequeForm, propertyId: e.target.value })} className="admin-select w-full">
                <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                {mergedProperties.map((p) => <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المشروع' : 'Project'}</label>
              <select value={chequeForm.projectId} onChange={(e) => setChequeForm({ ...chequeForm, projectId: e.target.value })} className="admin-select w-full">
                <option value="">{ar ? '— اختياري —' : '— Optional —'}</option>
                {projectsList.map((p) => <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
            <textarea value={chequeForm.descriptionAr} onChange={(e) => setChequeForm({ ...chequeForm, descriptionAr: e.target.value })} className="admin-input w-full" rows={2} placeholder={ar ? 'وصف اختياري' : 'Optional description'} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة شيك' : 'Add Cheque'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
