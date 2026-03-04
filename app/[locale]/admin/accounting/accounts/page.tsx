/**
 * Chart of Accounts Page
 * صفحة دليل الحسابات - واجهة احترافية
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getStored, saveStored } from '@/lib/accounting/data/storage';
import { KEYS } from '@/lib/accounting/data/storage';
import type { ChartAccount } from '@/lib/accounting/domain/types';

export default function ChartOfAccountsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const t = useTranslations('accounting');
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    type: 'ASSET' as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    parentId: '',
    sortOrder: 0,
    isActive: true
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    try {
      const allAccounts: ChartAccount[] = getStored<ChartAccount>(KEYS.ACCOUNTS);
      setAccounts([...allAccounts].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) return;

    try {
      if (editingAccount) {
        // Update existing account
        const updatedAccounts = accounts.map(acc => 
          acc.id === editingAccount.id 
            ? { ...acc, ...formData, updatedAt: new Date().toISOString() }
            : acc
        );
        saveStored(KEYS.ACCOUNTS, updatedAccounts);
      } else {
        // Create new account
        const newAccount: ChartAccount = {
          id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          code: formData.code,
          nameAr: formData.nameAr,
          nameEn: formData.nameEn,
          type: formData.type,
          parentId: formData.parentId || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const updatedAccounts = [...accounts, newAccount];
        saveStored(KEYS.ACCOUNTS, updatedAccounts);
      }

      // Reset form
      setFormData({
        code: '',
        nameAr: '',
        nameEn: '',
        type: 'ASSET',
        parentId: '',
        sortOrder: 0,
        isActive: true
      });
      setEditingAccount(null);
      setShowNewAccount(false);
      loadAccounts();
    } catch (error) {
      alert(ar ? 'خطأ في حفظ الحساب' : 'Error saving account');
      console.error(error);
    }
  };

  const handleEdit = (account: ChartAccount) => {
    setFormData({
      code: account.code,
      nameAr: account.nameAr,
      nameEn: account.nameEn || '',
      type: account.type,
      parentId: account.parentId || '',
      sortOrder: account.sortOrder,
      isActive: account.isActive
    });
    setEditingAccount(account);
    setShowNewAccount(true);
  };

  const handleDelete = (accountId: string) => {
    if (!confirm(ar ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this account?')) {
      return;
    }

    try {
      const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
      saveStored(KEYS.ACCOUNTS, updatedAccounts);
      loadAccounts();
    } catch (error) {
      alert(ar ? 'خطأ في حذف الحساب' : 'Error deleting account');
      console.error(error);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = searchTerm === '' || 
      account.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || account.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const accountTypes = [
    { value: 'ALL', label: ar ? 'الكل' : 'All', color: 'gray' },
    { value: 'ASSET', label: ar ? 'الأصول' : 'Assets', color: 'blue' },
    { value: 'LIABILITY', label: ar ? 'الالتزامات' : 'Liabilities', color: 'red' },
    { value: 'EQUITY', label: ar ? 'حقوق الملكية' : 'Equity', color: 'green' },
    { value: 'REVENUE', label: ar ? 'الإيرادات' : 'Revenue', color: 'purple' },
    { value: 'EXPENSE', label: ar ? 'المصروفات' : 'Expenses', color: 'orange' }
  ];

  const getAccountTypeColor = (type: string) => {
    const typeConfig = accountTypes.find(t => t.value === type);
    return typeConfig?.color || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B6F47] mx-auto"></div>
          <p className="text-gray-500 mt-4">{ar ? 'جاري تحميل الحسابات...' : 'Loading accounts...'}</p>
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
              <Icon name="folder" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] bg-clip-text text-transparent">
                {ar ? 'دليل الحسابات' : 'Chart of Accounts'}
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {ar ? 'إدارة الحسابات المحاسبية' : 'Manage accounting accounts'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder={ar ? 'بحث في الحسابات...' : 'Search accounts...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent w-64"
              />
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowNewAccount(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] text-white hover:from-[#8B6F47]/90 hover:to-[#A68B5B]/90 transition-all duration-200 font-semibold text-sm shadow-lg"
            >
              <Icon name="plus" className="h-5 w-5" />
              {ar ? 'حساب جديد' : 'New Account'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {ar ? 'فلترة الحسابات' : 'Filter Accounts'}
            </h2>
            <div className="flex items-center gap-2">
              {accountTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    filterType === type.value
                      ? `bg-${type.color}-100 text-${type.color}-700 border-2 border-${type.color}-300`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">
              {ar ? 'الحسابات المحاسبية' : 'Accounting Accounts'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {ar ? `إجمالي الحسابات: ${filteredAccounts.length}` : `Total accounts: ${filteredAccounts.length}`}
            </p>
          </div>
          
          <div className="p-8">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="folder" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {ar ? 'لا توجد حسابات' : 'No accounts found'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {ar ? 'لم يتم العثور على حسابات تطابق معايير البحث' : 'No accounts found matching your search criteria'}
                </p>
                <button
                  onClick={() => setShowNewAccount(true)}
                  className="px-6 py-3 bg-[#8B6F47] text-white rounded-xl hover:bg-[#8B6F47]/90 transition-colors font-semibold"
                >
                  {ar ? 'إنشاء أول حساب' : 'Create first account'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200/60 p-6 hover:shadow-lg transition-all duration-200 hover:border-[#8B6F47]/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-${getAccountTypeColor(account.type)}-100 rounded-lg flex items-center justify-center`}>
                          <Icon name="folder" className={`h-5 w-5 text-${getAccountTypeColor(account.type)}-600`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{account.nameAr}</h3>
                          <p className="text-sm text-gray-500">{account.nameEn || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {account.isActive ? (ar ? 'نشط' : 'Active') : (ar ? 'غير نشط' : 'Inactive')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(account)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Icon name="pencil" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'الرمز' : 'Code'}:</span>
                        <span className="font-mono font-semibold text-gray-900">{account.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'النوع' : 'Type'}:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-${getAccountTypeColor(account.type)}-100 text-${getAccountTypeColor(account.type)}-700`}>
                          {ar ? 
                            (account.type === 'ASSET' ? 'أصل' :
                             account.type === 'LIABILITY' ? 'التزام' :
                             account.type === 'EQUITY' ? 'حقوق ملكية' :
                             account.type === 'REVENUE' ? 'إيراد' : 'مصروف')
                            : account.type
                          }
                        </span>
                      </div>
                      {account.parentId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{ar ? 'حساب أصل' : 'Parent Account'}:</span>
                          <span className="text-gray-900">
                            {accounts.find(acc => acc.id === account.parentId)?.nameAr || '-'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">{ar ? 'الترتيب' : 'Sort Order'}:</span>
                        <span className="text-gray-900">{account.sortOrder}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New/Edit Account Modal */}
      {showNewAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-[#8B6F47]/5 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingAccount ? (ar ? 'تعديل الحساب' : 'Edit Account') : (ar ? 'حساب جديد' : 'New Account')}
                </h3>
                <button
                  onClick={() => {
                    setShowNewAccount(false);
                    setEditingAccount(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon name="x" className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'رمز الحساب' : 'Account Code'}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'نوع الحساب' : 'Account Type'}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                    required
                  >
                    <option value="ASSET">{ar ? 'أصل' : 'Asset'}</option>
                    <option value="LIABILITY">{ar ? 'التزام' : 'Liability'}</option>
                    <option value="EQUITY">{ar ? 'حقوق ملكية' : 'Equity'}</option>
                    <option value="REVENUE">{ar ? 'إيراد' : 'Revenue'}</option>
                    <option value="EXPENSE">{ar ? 'مصروف' : 'Expense'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'اسم الحساب (عربي)' : 'Account Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'اسم الحساب (إنجليزي)' : 'Account Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'حساب الأصل' : 'Parent Account'}
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                  >
                    <option value="">{ar ? 'لا يوجد' : 'None'}</option>
                    {accounts
                      .filter(acc => acc.type === formData.type || acc.id === editingAccount?.id)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.nameAr}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ar ? 'الترتيب' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6F47] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-[#8B6F47] border-gray-300 rounded focus:ring-[#8B6F47]"
                  />
                  <label htmlFor="isActive" className="mr-2 text-sm font-medium text-gray-700">
                    {ar ? 'حساب نشط' : 'Active Account'}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAccount(false);
                    setEditingAccount(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-[#8B6F47] to-[#A68B5B] text-white rounded-lg hover:from-[#8B6F47]/90 hover:to-[#A68B5B]/90 transition-all duration-200 font-semibold shadow-lg"
                >
                  {editingAccount ? (ar ? 'تحديث الحساب' : 'Update Account') : (ar ? 'إنشاء الحساب' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
