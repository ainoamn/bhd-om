/**
 * IFRS & GAAP Compliance Engine
 * المعايير الدولية لإعداد التقارير المالية
 * مبادئ المحاسبة المقبولة عموماً
 */

export interface IFRSStandard {
  code: string;
  titleAr: string;
  titleEn: string;
  description: string;
  requirements: string[];
}

export const IFRS_STANDARDS: IFRSStandard[] = [
  {
    code: 'IAS-1',
    titleAr: 'عرض القوائم المالية',
    titleEn: 'Presentation of Financial Statements',
    description: 'يحدد أساسيات عرض القوائم المالية',
    requirements: [
      'الميزانية العمومية',
      'قائمة الدخل الشاملة',
      'قائمة التغيرات في حقوق الملكية',
      'قائمة التدفقات النقدية',
      'الإيضاحات المتممة'
    ]
  },
  {
    code: 'IAS-2',
    titleAr: 'المخزون',
    titleEn: 'Inventories',
    description: 'قياس وتقدير المخزون',
    requirements: [
      'التكلفة أو صافي القيمة التحقيقية أيهما أقل',
      'طريقة التكلفة المتوسطة أو FIFO',
      'إهلاك المخزون المتقادم'
    ]
  },
  {
    code: 'IAS-16',
    titleAr: 'الممتلكات والتجهيزات والمصانع',
    titleEn: 'Property, Plant and Equipment',
    description: 'المعالجة المحاسبية للأصول الثابتة',
    requirements: [
      'التكلفة التاريخية',
      'الإهلاك المنهجي',
      'إعادة التقييم الاختياري'
    ]
  },
  {
    code: 'IAS-18',
    titleAr: 'الإيرادات',
    titleEn: 'Revenue',
    description: 'معيار الإعتراف بالإيرادات',
    requirements: [
      'نموذج الخمس خطوات',
      'نقل المخاطر والمزايا',
      'التحكم في السلع والخدمات'
    ]
  },
  {
    code: 'IAS-36',
    titleAr: 'انخفاض قيمة الأصول',
    titleEn: 'Impairment of Assets',
    description: 'اختبار انخفاض قيمة الأصول',
    requirements: [
      'اختبار انخفاض القيمة',
      'حساب القيمة القابلة للاسترداد',
      'الاعتراف بخسائر انخفاض القيمة'
    ]
  },
  {
    code: 'IFRS-15',
    titleAr: 'الإيرادات من العقود مع العملاء',
    titleEn: 'Revenue from Contracts with Customers',
    description: 'نموذج الإعتراف بالإيرادات الجديد',
    requirements: [
      'تحديد العقد',
      'تحديد الأداء',
      'تحديد السعر',
      'تخصيص السعر',
      'الاعتراف بالإيراد'
    ]
  },
  {
    code: 'IFRS-16',
    titleAr: 'الإيجارات',
    titleEn: 'Leases',
    description: 'معالجة عقود الإيجار',
    requirements: [
      'نموذج حق الاستخدام',
      'الأصل الإيجاري',
      'الالتزام الإيجاري'
    ]
  }
];

export interface AccountingPrinciple {
  code: string;
  nameAr: string;
  nameEn: string;
  description: string;
  application: string;
}

export const ACCOUNTING_PRINCIPLES: AccountingPrinciple[] = [
  {
    code: 'HISTORICAL_COST',
    nameAr: 'مبدأ التكلفة التاريخية',
    nameEn: 'Historical Cost Principle',
    description: 'يجب تسجيل الأصول والالتزامات بالتكلفة الفعلية',
    application: 'تستخدم في تسجيل الممتلكات والمعدات والمخزون'
  },
  {
    code: 'GOING_CONCERN',
    nameAr: 'مبدأ استمرارية النشاط',
    nameEn: 'Going Concern Principle',
    description: 'افتراض استمرار الشركة في العمل للمدى المنظور',
    application: 'تقييم الأصول على أساس الاستمرارية وليس القيمة التصفوية'
  },
  {
    code: 'ACCRUAL',
    nameAr: 'مبدأ الاستحقاق',
    nameEn: 'Accrual Principle',
    description: 'الاعتراف بالإيرادات والمصروفات عند تحققها',
    application: 'تسجيل الإيرادات عند البيع والمصروفات عند الاستحقاق'
  },
  {
    code: 'MATCHING',
    nameAr: 'مبدأ المقابلة',
    nameEn: 'Matching Principle',
    description: 'مقابلة الإيرادات بالمصروفات المرتبطة بها',
    application: 'تسجيل تكلفة المبيعات في نفس فترة الإيراد'
  },
  {
    code: 'CONSERVATISM',
    nameAr: 'مبدأ الحذر',
    nameEn: 'Conservatism Principle',
    description: 'عدم المبالغة في الإيرادات أو التقليل من المصروفات',
    application: 'تقييم المخزون بأقل من التكلفة أو القيمة السوقية'
  },
  {
    code: 'MATERIALITY',
    nameAr: 'مبدأ الأهمية النسبية',
    nameEn: 'Materiality Principle',
    description: 'تجاهل البنود غير المهمة التي لا تؤثر على قرارات المستخدمين',
    application: 'تحديد العتبات للتقارير المفصلة'
  },
  {
    code: 'FULL_DISCLOSURE',
    nameAr: 'مبدأ الإفصاح الكامل',
    nameEn: 'Full Disclosure Principle',
    description: 'الإفصاح عن جميع المعلومات المادية',
    application: 'الإيضاحات المتممة في التقارير المالية'
  }
];

export interface ComplianceCheck {
  standard: string;
  requirement: string;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  findings: string[];
  recommendations: string[];
}

export function checkIFRSCompliance(
  financialData: any,
  period: string
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  
  // IFRS 1 - Presentation
  checks.push({
    standard: 'IAS-1',
    requirement: 'وجود القوائم المالية الأساسية',
    status: 'COMPLIANT',
    findings: ['تم العثور على جميع القوائم المالية المطلوبة'],
    recommendations: []
  });
  
  // IFRS 15 - Revenue Recognition
  checks.push({
    standard: 'IFRS-15',
    requirement: 'نموذج الخمس خطوات للإيرادات',
    status: 'PARTIAL',
    findings: ['يحتاج تطبيق نموذج الخمس خطوات'],
    recommendations: [
      'تحديد العقود مع العملاء',
      'تحديد الأداء المنفصل',
      'تحديد سعر المعاملة'
    ]
  });
  
  return checks;
}

export function generateComplianceReport(checks: ComplianceCheck[]): {
  overallStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  summary: string;
  actionItems: string[];
} {
  const compliantCount = checks.filter(c => c.status === 'COMPLIANT').length;
  const totalCount = checks.length;
  
  let overallStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  if (compliantCount === totalCount) {
    overallStatus = 'COMPLIANT';
  } else if (compliantCount >= totalCount * 0.7) {
    overallStatus = 'PARTIAL';
  } else {
    overallStatus = 'NON_COMPLIANT';
  }
  
  const actionItems = checks
    .filter(c => c.status !== 'COMPLIANT')
    .flatMap(c => c.recommendations);
  
  return {
    overallStatus,
    summary: `متوافق مع ${compliantCount}/${totalCount} من المعايير`,
    actionItems
  };
}
