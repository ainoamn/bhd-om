'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createJournalEntry } from '@/lib/accounting/core'
import DateInput from '@/components/shared/DateInput'

interface PostingLine {
  id: string
  accountId: string
  accountName?: string
  debit: number
  credit: number
  description: string
}

export function JournalEntryForm() {
  const t = useTranslations('accounting')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'ar'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    descriptionAr: '',
    descriptionEn: '',
    reference: '',
    notes: ''
  })
  
  const [postings, setPostings] = useState<PostingLine[]>([
    { id: '1', accountId: '', debit: 0, credit: 0, description: '' },
    { id: '2', accountId: '', debit: 0, credit: 0, description: '' }
  ])

  const addPostingLine = () => {
    setPostings([...postings, {
      id: Math.random().toString(36).substr(2, 9),
      accountId: '',
      debit: 0,
      credit: 0,
      description: ''
    }])
  }

  const removePostingLine = (id: string) => {
    if (postings.length <= 2) {
      setError('يجب أن يحتوي القيد على طرفين على الأقل')
      return
    }
    setPostings(postings.filter(p => p.id !== id))
  }

  const updatePosting = (id: string, field: keyof PostingLine, value: string | number) => {
    setPostings(postings.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const calculateTotals = () => {
    let debits = 0
    let credits = 0
    
    for (const posting of postings) {
      debits += posting.debit || 0
      credits += posting.credit || 0
    }
    
    return { debits, credits, isBalanced: Math.abs(debits - credits) < 0.001 }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { isBalanced } = calculateTotals()
      if (!isBalanced) {
        throw new Error('القيد غير متوازن - مجموع المدين يجب أن يساوي مجموع الدائن')
      }

      const result = await createJournalEntry({
        date: new Date(formData.date),
        descriptionAr: formData.descriptionAr,
        descriptionEn: formData.descriptionEn || undefined,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        lines: postings
          .filter(p => p.accountId && (p.debit > 0 || p.credit > 0))
          .map(p => ({
            accountId: p.accountId,
            debit: p.debit,
            credit: p.credit,
            descriptionAr: p.description,
            descriptionEn: p.description
          })),
        createdBy: 'current-user-id' // استبدل بـ ID المستخدم الحقيقي
      })

      if (result.success) {
        router.push('/ar/admin/accounting/entries')
        router.refresh()
      } else {
        setError(result.error || 'فشل في إنشاء القيد')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف')
    } finally {
      setIsLoading(false)
    }
  }

  const { debits, credits, isBalanced } = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* رسالة الخطأ */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* معلومات القيد الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('date')} *
          </label>
          <DateInput
            value={formData.date}
            onChange={(v) => setFormData({...formData, date: v})}
            locale={locale}
            required
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('reference')}
          </label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({...formData, reference: e.target.value})}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder={t('invoice_number_or_reference')}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('description')} *
          </label>
          <input
            type="text"
            required
            value={formData.descriptionAr}
            onChange={(e) => setFormData({...formData, descriptionAr: e.target.value})}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder={t('entry_description')}
          />
        </div>
      </div>

      {/* خطوط القيد */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحساب</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">مدين</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">دائن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">البيان</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {postings.map((posting, index) => (
              <tr key={posting.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <select
                    value={posting.accountId}
                    onChange={(e) => updatePosting(posting.id, 'accountId', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="">اختر الحساب...</option>
                    {/* سيتم تعبئتها ديناميكياً */}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={posting.debit || ''}
                    onChange={(e) => updatePosting(posting.id, 'debit', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center"
                    placeholder="0.000"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={posting.credit || ''}
                    onChange={(e) => updatePosting(posting.id, 'credit', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center"
                    placeholder="0.000"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={posting.description}
                    onChange={(e) => updatePosting(posting.id, 'description', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="بيان إضافي..."
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removePostingLine(posting.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td className="px-4 py-3 text-right">المجموع:</td>
              <td className="px-4 py-3 text-center">
                <span className="text-blue-700">{debits.toFixed(3)}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-green-700">{credits.toFixed(3)}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                  {isBalanced ? '✓ متوازن' : '✗ غير متوازن'}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={addPostingLine}
        className="text-[#8B6F47] hover:text-[#6B5535] text-sm font-medium flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        إضافة سطر جديد
      </button>

      {/* ملاحظات */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('notes')}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      {/* أزرار */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading || !isBalanced}
          className="bg-[#8B6F47] text-white px-6 py-2 rounded hover:bg-[#6B5535] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'جاري الحفظ...' : 'حفظ القيد'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
