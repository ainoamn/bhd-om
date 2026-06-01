'use client';

import { createAccount, type AccountType } from '@/lib/data/accounting';
import { ACCOUNT_TYPE_LABELS } from '@/lib/accounting/ui/accountTypeLabels';
import styles from '@/components/admin/accounting.module.css';

export default function AccountingAddAccountModal(props: {
  ar: boolean;
  open: boolean;
  onClose: () => void;
  accountForm: { code: string; nameAr: string; nameEn: string; type: AccountType };
  setAccountForm: (v: { code: string; nameAr: string; nameEn: string; type: AccountType }) => void;
  onCreated: () => void;
}) {
  const { ar, open, onClose, accountForm, setAccountForm, onCreated } = props;

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{ar ? 'إضافة حساب جديد' : 'Add new account'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!accountForm.code.trim() || !accountForm.nameAr.trim()) return;
            try {
              createAccount({
                code: accountForm.code.trim(),
                nameAr: accountForm.nameAr.trim(),
                nameEn: accountForm.nameEn.trim() || undefined,
                type: accountForm.type,
                isActive: true,
                sortOrder: 999,
              });
              onCreated();
              onClose();
            } catch (err) {
              alert(err instanceof Error ? err.message : ar ? 'خطأ' : 'Error');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رمز الحساب' : 'Account code'}</label>
            <input type="text" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} className="admin-input w-full" placeholder="مثال: 5110" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
            <input type="text" value={accountForm.nameAr} onChange={(e) => setAccountForm({ ...accountForm, nameAr: e.target.value })} className="admin-input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
            <input type="text" value={accountForm.nameEn} onChange={(e) => setAccountForm({ ...accountForm, nameEn: e.target.value })} className="admin-input w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'نوع الحساب' : 'Account type'}</label>
            <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as AccountType })} className="admin-select w-full">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                <option key={t} value={t}>{ar ? ACCOUNT_TYPE_LABELS[t].ar : ACCOUNT_TYPE_LABELS[t].en}</option>
              ))}
            </select>
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
