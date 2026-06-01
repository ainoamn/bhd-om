'use client';

import { useMemo, useState } from 'react';
import DateInput from '@/components/shared/DateInput';
import {
  createJournalEntry,
  type ChartAccount,
  type DocumentStatus,
} from '@/lib/data/accounting';
import { createJournalEntry as apiCreateJournalEntry, suggestJournalEntry } from '@/lib/accounting/api/client';
import { resolveJournalAccountSuggestion } from '@/lib/accounting/ai/journalAccountSuggest';
import type { JournalFormState } from '@/lib/accounting/types/formTypes';
import styles from '@/components/admin/accounting.module.css';

export default function AccountingAddJournalModal(props: {
  ar: boolean;
  locale: string;
  open: boolean;
  onClose: () => void;
  journalForm: JournalFormState;
  setJournalForm: React.Dispatch<React.SetStateAction<JournalFormState>>;
  accounts: ChartAccount[];
  useDb: boolean;
  onCreated: () => void | Promise<void>;
}) {
  const { ar, locale, open, onClose, journalForm, setJournalForm, accounts, useDb, onCreated } = props;

  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestMsg, setAiSuggestMsg] = useState('');

  const aiSuggestedAccount = useMemo(
    () => resolveJournalAccountSuggestion(journalForm.descriptionAr, journalForm.descriptionEn, accounts),
    [journalForm.descriptionAr, journalForm.descriptionEn, accounts]
  );

  const handleAiSuggestEntry = async () => {
    const desc = journalForm.descriptionAr.trim();
    if (!desc || !useDb) return;
    setAiSuggestLoading(true);
    setAiSuggestMsg('');
    try {
      const result = await suggestJournalEntry(desc);
      setJournalForm({
        ...journalForm,
        descriptionAr: desc,
        lines: result.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit > 0 ? String(l.debit) : '',
          credit: l.credit > 0 ? String(l.credit) : '',
          desc: l.descriptionAr || desc,
        })),
      });
      setAiSuggestMsg(ar ? result.explanationAr : result.explanationEn);
    } catch (err) {
      setAiSuggestMsg(err instanceof Error ? err.message : ar ? 'تعذّر الاقتراح' : 'Suggest failed');
    } finally {
      setAiSuggestLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} data-testid="accounting-modal-journal">
      <div className={`${styles.modalContent} ${styles.modalContentWide}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{ar ? 'قيد يومية يدوي' : 'Manual journal entry'}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const lines = journalForm.lines
              .filter((l) => l.accountId && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
              .map((l) => ({
                accountId: l.accountId,
                debit: parseFloat(l.debit) || 0,
                credit: parseFloat(l.credit) || 0,
                descriptionAr: l.desc || undefined,
                descriptionEn: l.desc || undefined,
              }));
            if (lines.length < 2) {
              alert(ar ? 'أضف سطرين على الأقل (مدين ودائن)' : 'Add at least 2 lines (debit and credit)');
              return;
            }
            try {
              const entryData = {
                date: journalForm.date,
                lines,
                descriptionAr: journalForm.descriptionAr || undefined,
                descriptionEn: journalForm.descriptionEn || undefined,
                documentType: 'JOURNAL' as const,
                status: 'APPROVED' as DocumentStatus,
              };
              if (useDb) {
                await apiCreateJournalEntry(entryData);
              } else {
                createJournalEntry(entryData);
              }
              await onCreated();
              onClose();
            } catch (err) {
              alert(err instanceof Error ? err.message : ar ? 'قيد غير متوازن' : 'Unbalanced entry');
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
              <DateInput value={journalForm.date} onChange={(v) => setJournalForm({ ...journalForm, date: v })} locale={locale} className="w-full" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الوصف' : 'Description'}</label>
              <input type="text" value={journalForm.descriptionAr} onChange={(e) => setJournalForm({ ...journalForm, descriptionAr: e.target.value })} className="admin-input w-full" placeholder={ar ? 'وصف القيد' : 'Entry description'} />
              {aiSuggestedAccount && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <span>✨ {ar ? 'اقتراح ذكي:' : 'AI suggestion:'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const n = [...journalForm.lines];
                      if (!n[0].accountId) n[0] = { ...n[0], accountId: aiSuggestedAccount.id };
                      setJournalForm({ ...journalForm, lines: n });
                    }}
                    className="font-semibold underline hover:no-underline"
                  >
                    {aiSuggestedAccount.code} - {ar ? aiSuggestedAccount.nameAr : aiSuggestedAccount.nameEn}
                  </button>
                </p>
              )}
              {useDb && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiSuggestEntry}
                    disabled={aiSuggestLoading || !journalForm.descriptionAr.trim()}
                    className="text-xs font-semibold admin-btn-secondary !py-1.5 !px-3"
                  >
                    {aiSuggestLoading ? (ar ? 'جاري التحليل...' : 'Analyzing...') : (ar ? '✨ اقتراح قيد كامل بالذكاء' : '✨ AI suggest full entry')}
                  </button>
                  {aiSuggestMsg && <span className="text-xs text-gray-600">{aiSuggestMsg}</span>}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">{ar ? 'بنود القيد' : 'Entry lines'}</label>
              <button
                type="button"
                onClick={() => setJournalForm({ ...journalForm, lines: [...journalForm.lines, { accountId: '', debit: '', credit: '', desc: '' }] })}
                className="text-xs font-semibold admin-accent-text hover:underline"
              >
                {ar ? '+ سطر' : '+ Line'}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {journalForm.lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={line.accountId}
                    onChange={(e) => {
                      const next = [...journalForm.lines];
                      next[i] = { ...next[i], accountId: e.target.value };
                      setJournalForm({ ...journalForm, lines: next });
                    }}
                    className="admin-select flex-1 min-w-0"
                    required
                  >
                    <option value="">{ar ? '— الحساب —' : '— Account —'}</option>
                    {accounts.filter((a) => a.isActive).map((a) => (
                      <option key={a.id} value={a.id}>{a.code} - {ar ? a.nameAr : a.nameEn || a.nameAr}</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min="0" placeholder={ar ? 'مدين' : 'Debit'} value={line.debit} onChange={(e) => { const n = [...journalForm.lines]; n[i] = { ...n[i], debit: e.target.value, credit: '' }; setJournalForm({ ...journalForm, lines: n }); }} className="admin-input w-24" />
                  <input type="number" step="0.01" min="0" placeholder={ar ? 'دائن' : 'Credit'} value={line.credit} onChange={(e) => { const n = [...journalForm.lines]; n[i] = { ...n[i], credit: e.target.value, debit: '' }; setJournalForm({ ...journalForm, lines: n }); }} className="admin-input w-24" />
                  <button type="button" onClick={() => setJournalForm({ ...journalForm, lines: journalForm.lines.filter((_, j) => j !== i) })} className="text-red-600 hover:text-red-700 p-1" title={ar ? 'حذف' : 'Remove'}>✕</button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{ar ? 'المدين = الدائن (قيد مزدوج)' : 'Debit = Credit (double-entry)'}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">{ar ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="flex-1 px-4 py-2.5 admin-btn-primary">{ar ? 'إضافة القيد' : 'Add entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
