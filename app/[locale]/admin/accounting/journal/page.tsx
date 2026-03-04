/**
 * Journal Entries Page
 * صفحة القيود المحاسبية - واجهة احترافية
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getStored, saveStored } from '@/lib/accounting/data/storage';
import { KEYS } from '@/lib/accounting/data/storage';
import { createJournalEntry } from '@/lib/accounting/engine/journalEngine';
import { generateTrialBalance } from '@/lib/accounting/ledger/generalLedger';
import type { JournalEntry, ChartAccount } from '@/lib/accounting/domain/types';

export default function JournalEntriesPage() {
  const params = useParams();
  const { data: session } = useSession();
  const t = useTranslations('accounting');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('2025');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    descriptionAr: '',
    descriptionEn: '',
    lines: [{ accountId: '', debit: 0, credit: 0, descriptionAr: '', descriptionEn: '' }]
  });

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = () => {
    try {
      const allEntries = getStored<JournalEntry[]>(KEYS.JOURNAL);
      const allAccounts = getStored<ChartAccount[]>(KEYS.ACCOUNTS);
      
      const periodEntries = allEntries.filter(entry => entry.date.startsWith(selectedPeriod));
      
      setEntries(periodEntries.sort((a, b) => b.date.localeCompare(a.date)));
      setAccounts(allAccounts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) return;

    try {
      const journalEntry = createJournalEntry({
        date: formData.date,
        lines: formData.lines.filter(line => line.accountId && (line.debit > 0 || line.credit > 0)),
        descriptionAr: formData.descriptionAr,
        descriptionEn: formData.descriptionEn,
        documentType: 'JOURNAL',
        status: 'APPROVED'
      }, session.user.id);

      const allEntries = getStored<JournalEntry[]>(KEYS.JOURNAL);
      allEntries.push(journalEntry);
      saveStored(KEYS.JOURNAL, allEntries);

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        descriptionAr: '',
        descriptionEn: '',
        lines: [{ accountId: '', debit: 0, credit: 0, descriptionAr: '', descriptionEn: '' }]
      });
      setShowNewEntry(false);
      loadData();
    } catch (error) {
      alert(ar ? 'خطأ في حفظ القيد' : 'Error saving entry');
      console.error(error);
    }
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', debit: 0, credit: 0, descriptionAr: '', descriptionEn: '' }]
    }));
  };

  const removeLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B6F47] mx-auto"></div>
          <p className="text-gray-500 mt-4">{ar ? 'جاري تحميل القيود...' : 'Loading entries...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200/60 shadow-lg">
        <div className="flex items-center justify-between px-8 py-5 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#8B6F47] to-[#A68B5B] rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="documentText" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] bg-clip-text text-transparent">
                {ar ? 'قيود اليومية' : 'Journal Entries'}
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {ar ? 'إدارة القيود المحاسبية' : 'Manage accounting entries'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
            <button
              onClick={() => setShowNewEntry(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] text-white hover:from-[#8B6F47]/90 hover:to-[#A68B5B]/90 transition-all duration-200 font-semibold text-sm shadow-lg"
            >
              <Icon name="plus" className="h-5 w-5" />
              {ar ? 'قيد جديد' : 'New Entry'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Entries Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">
              {ar ? 'القيود المحاسبية' : 'Accounting Entries'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {ar ? `إجمالي القيود: ${entries.length}` : `Total entries: ${entries.length}`}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200/60">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'الرقم' : 'No.'}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'الوصف' : 'Description'}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'المدين' : 'Debit'}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'الدائن' : 'Credit'}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{ar ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{entry.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{entry.serialNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ar ? entry.descriptionAr : entry.descriptionEn || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {entry.totalDebit.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {entry.totalCredit.toLocaleString(ar ? 'ar-OM' : 'en-US')} {ar ? 'ر.ع' : 'OMR'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ar ? 
                          (entry.status === 'APPROVED' ? 'معتمد' : 'مسودة') : 
                          (entry.status === 'APPROVED' ? 'Approved' : 'Draft')
                        }
                      </span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-4">
                        <Icon name="documentText" className="h-16 w-16 text-gray-300" />
                        <p className="text-lg font-medium">{ar ? 'لا توجد قيود' : 'No entries found'}</p>
                        <button
                          onClick={() => setShowNewEntry(true)}
                          className="px-6 py-3 bg-[#8B6F47] text-white rounded-xl hover:bg-[#8B6F47]/90 transition-colors font-semibold"
                        >
                          {ar ? 'إنشاء أول قيد' : 'Create first entry'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-[#8B6F47]/5 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {ar ? 'قيد يومي جديد' : 'New Journal Entry'}
                </h3>
                <button
                  onClick={() => setShowNewEntry(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon name="x" className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'التاريخ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'الوصف (عربي)' : 'Description (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {ar ? 'بنود القيد' : 'Entry Lines'}
                  </h4>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8B6F47] text-white rounded-lg hover:bg-[#8B6F47]/90 transition-colors text-sm font-medium"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    {ar ? 'إضافة بند' : 'Add Line'}
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {ar ? 'الحساب' : 'Account'}
                        </label>
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                          required
                        >
                          <option value="">{ar ? 'اختر الحساب' : 'Select account'}</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {ar ? account.nameAr : account.nameEn || account.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {ar ? 'المدين' : 'Debit'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {ar ? 'الدائن' : 'Credit'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {ar ? 'الوصف البند' : 'Line Description'}
                        </label>
                        <input
                          type="text"
                          value={line.descriptionAr}
                          onChange={(e) => updateLine(index, 'descriptionAr', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-end">
                        {formData.lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewEntry(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] text-white rounded-lg hover:from-[#8B6F47]/90 hover:to-[#A68B5B]/90 transition-all duration-200 font-semibold shadow-lg"
                >
                  {ar ? 'حفظ القيد' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
