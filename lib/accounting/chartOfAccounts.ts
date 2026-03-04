/**
 * دليل الحسابات الافتراضي (Chart of Accounts)
 * يتوافق مع معايير المحاسبة الدولية IFRS
 */

import { prisma } from '@/lib/prisma'
import { AccountingAccountType } from '@prisma/client'

export interface DefaultAccount {
  code: string
  nameAr: string
  nameEn: string
  accountType: AccountingAccountType
  description?: string
}

// ==================== دليل الحسابات الافتراضي ====================

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // الأصول (1000)
  { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', accountType: AccountingAccountType.ASSET },
  { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', accountType: AccountingAccountType.ASSET },
  { code: '1110', nameAr: 'النقدية في الصندوق', nameEn: 'Cash on Hand', accountType: AccountingAccountType.ASSET, description: 'النقدية الفعلية في الخزينة' },
  { code: '1120', nameAr: 'البنك - حساب جاري', nameEn: 'Bank - Current Account', accountType: AccountingAccountType.ASSET },
  { code: '1130', nameAr: 'العملاء', nameEn: 'Accounts Receivable', accountType: AccountingAccountType.ASSET },
  { code: '1140', nameAr: 'أوراق القبض', nameEn: 'Notes Receivable', accountType: AccountingAccountType.ASSET },
  { code: '1150', nameAr: 'مخزون العقارات', nameEn: 'Property Inventory', accountType: AccountingAccountType.ASSET, description: 'العقارات الجاهزة للبيع' },
  { code: '1160', nameAr: 'مصاريف مدفوعة مقدماً', nameEn: 'Prepaid Expenses', accountType: AccountingAccountType.ASSET },
  { code: '1170', nameAr: 'الأمانات', nameEn: 'Deposits', accountType: AccountingAccountType.ASSET },
  
  { code: '1200', nameAr: 'الأصول غير المتداولة', nameEn: 'Non-Current Assets', accountType: AccountingAccountType.ASSET },
  { code: '1210', nameAr: 'العقارات للاستثمار', nameEn: 'Investment Properties', accountType: AccountingAccountType.ASSET, description: 'العقارات المؤجرة' },
  { code: '1220', nameAr: 'الأراضي', nameEn: 'Land', accountType: AccountingAccountType.ASSET },
  { code: '1230', nameAr: 'المباني', nameEn: 'Buildings', accountType: AccountingAccountType.ASSET },
  { code: '1240', nameAr: 'السيارات', nameEn: 'Vehicles', accountType: AccountingAccountType.ASSET },
  { code: '1250', nameAr: 'الأثاث والتجهيزات', nameEn: 'Furniture & Fixtures', accountType: AccountingAccountType.ASSET },
  { code: '1260', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', accountType: AccountingAccountType.ASSET, description: 'حساب خصم (contra-asset)' },
  
  // الالتزامات (2000)
  { code: '2000', nameAr: 'الالتزامات', nameEn: 'Liabilities', accountType: AccountingAccountType.LIABILITY },
  { code: '2100', nameAr: 'الالتزامات المتداولة', nameEn: 'Current Liabilities', accountType: AccountingAccountType.LIABILITY },
  { code: '2110', nameAr: 'الموردين', nameEn: 'Accounts Payable', accountType: AccountingAccountType.LIABILITY },
  { code: '2120', nameAr: 'أوراق الدفع', nameEn: 'Notes Payable', accountType: AccountingAccountType.LIABILITY },
  { code: '2130', nameAr: 'القروض قصيرة الأجل', nameEn: 'Short-term Loans', accountType: AccountingAccountType.LIABILITY },
  { code: '2140', nameAr: 'الإيرادات المستحقة مقدماً', nameEn: 'Unearned Revenue', accountType: AccountingAccountType.LIABILITY, description: 'الإيجارات المدفوعة مقدماً' },
  { code: '2150', nameAr: 'ضريبة القيمة المضافة مستحقة', nameEn: 'VAT Payable', accountType: AccountingAccountType.LIABILITY },
  { code: '2160', nameAr: 'الرواتب المستحقة', nameEn: 'Salaries Payable', accountType: AccountingAccountType.LIABILITY },
  
  { code: '2200', nameAr: 'الالتزامات طويلة الأجل', nameEn: 'Long-term Liabilities', accountType: AccountingAccountType.LIABILITY },
  { code: '2210', nameAr: 'القروض طويلة الأجل', nameEn: 'Long-term Loans', accountType: AccountingAccountType.LIABILITY },
  { code: '2220', nameAr: 'التزامات التأجير', nameEn: 'Lease Liabilities', accountType: AccountingAccountType.LIABILITY },
  
  // حقوق الملكية (3000)
  { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', accountType: AccountingAccountType.EQUITY },
  { code: '3100', nameAr: 'رأس المال', nameEn: 'Share Capital', accountType: AccountingAccountType.EQUITY },
  { code: '3200', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', accountType: AccountingAccountType.EQUITY },
  { code: '3300', nameAr: 'صافي الدخل السنوي', nameEn: 'Current Year Earnings', accountType: AccountingAccountType.EQUITY },
  { code: '3400', nameAr: 'الجاري للشركاء', nameEn: 'Partners Current Account', accountType: AccountingAccountType.EQUITY },
  
  // الإيرادات (4000)
  { code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', accountType: AccountingAccountType.REVENUE },
  { code: '4100', nameAr: 'إيرادات بيع العقارات', nameEn: 'Property Sales Revenue', accountType: AccountingAccountType.REVENUE },
  { code: '4200', nameAr: 'إيرادات الإيجارات', nameEn: 'Rental Revenue', accountType: AccountingAccountType.REVENUE },
  { code: '4300', nameAr: 'إيرادات الخدمات', nameEn: 'Service Revenue', accountType: AccountingAccountType.REVENUE },
  { code: '4400', nameAr: 'إيرادات الفوائد', nameEn: 'Interest Revenue', accountType: AccountingAccountType.REVENUE },
  { code: '4500', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', accountType: AccountingAccountType.REVENUE },
  
  // المصروفات (5000)
  { code: '5000', nameAr: 'المصروفات', nameEn: 'Expenses', accountType: AccountingAccountType.EXPENSE },
  { code: '5100', nameAr: 'تكلفة العقارات المباعة', nameEn: 'Cost of Properties Sold', accountType: AccountingAccountType.EXPENSE },
  { code: '5200', nameAr: 'مصروفات الإيجار', nameEn: 'Rent Expense', accountType: AccountingAccountType.EXPENSE },
  { code: '5300', nameAr: 'الرواتب والأجور', nameEn: 'Salaries & Wages', accountType: AccountingAccountType.EXPENSE },
  { code: '5400', nameAr: 'الإهلاك', nameEn: 'Depreciation', accountType: AccountingAccountType.EXPENSE },
  { code: '5500', nameAr: 'المرافق والخدمات', nameEn: 'Utilities', accountType: AccountingAccountType.EXPENSE },
  { code: '5600', nameAr: 'التسويق والإعلان', nameEn: 'Marketing & Advertising', accountType: AccountingAccountType.EXPENSE },
  { code: '5700', nameAr: 'الصيانة والإصلاحات', nameEn: 'Maintenance & Repairs', accountType: AccountingAccountType.EXPENSE },
  { code: '5800', nameAr: 'الفوائد', nameEn: 'Interest Expense', accountType: AccountingAccountType.EXPENSE },
  { code: '5900', nameAr: 'مصروفات إدارية أخرى', nameEn: 'Other Administrative Expenses', accountType: AccountingAccountType.EXPENSE },
]

// ==================== إنشاء دليل الحسابات ====================

export async function initializeChartOfAccounts(): Promise<{ success: boolean; message: string }> {
  try {
    // التحقق من وجود حسابات مسبقاً
    const existingCount = await prisma.accountingAccount.count()
    if (existingCount > 0) {
      return { success: false, message: 'دليل الحسابات موجود مسبقاً' }
    }
    
    // إنشاء الحسابات
    for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
      await prisma.accountingAccount.create({
        data: {
          code: account.code,
          nameAr: account.nameAr,
          nameEn: account.nameEn,
          type: account.accountType,
          // Note: description, balance, and currency fields don't exist in current schema
          // These will need to be updated when implemented
          isActive: true
        }
      })
    }
    
    return { success: true, message: `تم إنشاء ${DEFAULT_CHART_OF_ACCOUNTS.length} حساب بنجاح` }
  } catch (error) {
    console.error('Error initializing chart of accounts:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطأ في إنشاء دليل الحسابات'
    }
  }
}

// ==================== إدارة الحسابات ====================

export async function createAccount(data: {
  code: string
  nameAr: string
  nameEn: string
  type: AccountingAccountType
  description?: string
  openingBalance?: number
}) {
  // التحقق من عدم تكرار الكود
  const existing = await prisma.accountingAccount.findUnique({
    where: { code: data.code }
  })
  
  if (existing) {
    throw new Error(`الكود ${data.code} مستخدم مسبقاً`)
  }
  
  return await prisma.accountingAccount.create({
    data: {
      ...data,
      // Note: balance and currency fields don't exist in current schema
      // These will need to be updated when implemented
      isActive: true
    }
  })
}

export async function getAccountBalance(accountId: string): Promise<number> {
  // Note: balance field doesn't exist in current schema
  // This will need to be updated when balance tracking is implemented
  const account = await prisma.accountingAccount.findUnique({
    where: { id: accountId }
  })
  
  return 0 // Return 0 for now until balance field is implemented
}
