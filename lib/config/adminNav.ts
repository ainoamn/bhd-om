/**
 * السجل المركزي لعناصر لوحة التحكم
 *
 * لإضافة صفحة جديدة:
 * 1. أضف عنصراً في topLevelItems أو dashboardSubItems أو accountingSubItems أو propertiesSubItems
 *    مع { href, labelKey, icon, section: 'مفتاح_فريد' }
 * 2. أضف المفتاح في SECTION_ORDER للترتيب المطلوب (أو سيُضاف تلقائياً في النهاية)
 * 3. أضف DashboardSectionKey في lib/config/dashboardRoles.ts لنوع TypeScript
 *
 * ستظهر الصفحة تلقائياً في: لوحة التحكم + إعدادات لوحات التحكم (للمنح/الإلغاء)
 */

export interface NavItemWithSection {
  href: string;
  labelKey: string;
  icon: string;
  section: string;
  isHeader?: boolean;
}

const accountingSubItems: NavItemWithSection[] = [
  { href: '/admin/accounting?tab=dashboard', labelKey: 'accountingHome', icon: 'dashboard', section: 'accountingHome' },
  { href: '/admin/accounting?tab=sales', labelKey: 'accountingSales', icon: 'archive', section: 'accountingSales' },
  { href: '/admin/accounting?tab=purchases', labelKey: 'accountingPurchases', icon: 'archive', section: 'accountingPurchases' },
  { href: '/admin/accounting?tab=journal', labelKey: 'accountingJournal', icon: 'documentText', section: 'accountingJournal' },
  { href: '/admin/accounting?tab=documents', labelKey: 'accountingDocuments', icon: 'archive', section: 'accountingDocuments' },
  { href: '/admin/accounting?tab=accounts', labelKey: 'accountingAccounts', icon: 'archive', section: 'accountingAccounts' },
  { href: '/admin/accounting?tab=reports', labelKey: 'accountingReports', icon: 'chartBar', section: 'accountingReports' },
  { href: '/admin/accounting?tab=claims', labelKey: 'accountingClaims', icon: 'inbox', section: 'accountingClaims' },
  { href: '/admin/accounting?tab=cheques', labelKey: 'accountingCheques', icon: 'archive', section: 'accountingCheques' },
  { href: '/admin/accounting?tab=payments', labelKey: 'accountingPayments', icon: 'archive', section: 'accountingPayments' },
  { href: '/admin/accounting?tab=periods', labelKey: 'accountingPeriods', icon: 'calendar', section: 'accountingPeriods' },
  { href: '/admin/accounting?tab=audit', labelKey: 'accountingAudit', icon: 'shieldCheck', section: 'accountingAudit' },
  { href: '/admin/accounting?tab=settings', labelKey: 'accountingSettings', icon: 'cog', section: 'accountingSettings' },
  { href: '#', labelKey: 'accountingQuickActions', icon: 'cog', section: 'accountingQuickActions', isHeader: true },
  { href: '/admin/accounting?tab=journal&action=add', labelKey: 'accountingAddJournal', icon: 'documentText', section: 'accountingAddJournal' },
  { href: '/admin/accounting?tab=accounts&action=add', labelKey: 'accountingAddAccount', icon: 'plus', section: 'accountingAddAccount' },
  { href: '/admin/accounting?tab=documents&action=add', labelKey: 'accountingAddDocument', icon: 'plus', section: 'accountingAddDocument' },
  { href: '/admin/accounting?tab=cheques&action=add', labelKey: 'accountingAddCheque', icon: 'plus', section: 'accountingAddCheque' },
];

const dashboardSubItems: NavItemWithSection[] = [
  { href: '/admin/address-book', labelKey: 'addressBook', icon: 'users', section: 'addressBook' },
  { href: '/admin/bank-details', labelKey: 'bankDetails', icon: 'archive', section: 'bankDetails' },
  { href: '/admin/company-data', labelKey: 'companyData', icon: 'building', section: 'companyData' },
  { href: '/admin/document-templates', labelKey: 'documentTemplates', icon: 'documentText', section: 'documentTemplates' },
  { href: '/admin/site', labelKey: 'site', icon: 'globe', section: 'site' },
];

const propertiesSubItems: NavItemWithSection[] = [
  { href: '/admin/properties', labelKey: 'propertiesManage', icon: 'building', section: 'propertiesManage' },
  { href: '/admin/bookings', labelKey: 'bookingsManage', icon: 'calendar', section: 'bookingsManage' },
  { href: '/admin/contracts', labelKey: 'contractsManage', icon: 'archive', section: 'contractsManage' },
  { href: '/admin/maintenance', labelKey: 'maintenanceManage', icon: 'wrench', section: 'maintenanceManage' },
  { href: '/admin/data', labelKey: 'dataManage', icon: 'database', section: 'dataManage' },
];

const topLevelItems: NavItemWithSection[] = [
  { href: '/admin', labelKey: 'clientNav.dashboard', icon: 'dashboard', section: 'dashboard' },
  { href: '/admin/my-bookings', labelKey: 'clientNav.myBookings', icon: 'calendar', section: 'myBookings' },
  { href: '/admin/my-contracts', labelKey: 'clientNav.myContracts', icon: 'archive', section: 'myContracts' },
  { href: '/admin/my-properties', labelKey: 'ownerNav.myProperties', icon: 'building', section: 'myProperties' },
  { href: '/admin/my-invoices', labelKey: 'clientNav.myInvoices', icon: 'documentText', section: 'myInvoices' },
  { href: '/admin/my-receipts', labelKey: 'clientNav.myReceipts', icon: 'documentText', section: 'myReceipts' },
  { href: '/admin/notifications', labelKey: 'clientNav.notifications', icon: 'inbox', section: 'notifications' },
  { href: '/admin/my-account', labelKey: 'clientNav.myAccount', icon: 'users', section: 'myAccount' },
  { href: '/admin/projects', labelKey: 'projects', icon: 'projects', section: 'projects' },
  { href: '/admin/services', labelKey: 'services', icon: 'cog', section: 'services' },
  { href: '/admin/contact', labelKey: 'contact', icon: 'mail', section: 'contact' },
  { href: '/admin/submissions', labelKey: 'submissions', icon: 'inbox', section: 'submissions' },
  { href: '/admin/dashboard-settings', labelKey: 'dashboardSettings', icon: 'cog', section: 'dashboardSettings' },
  { href: '/admin/contact-category-permissions', labelKey: 'contactCategoryPermissions', icon: 'shieldCheck', section: 'contactCategoryPermissions' },
  { href: '/admin/users', labelKey: 'users', icon: 'users', section: 'users' },
  { href: '/admin/serial-history', labelKey: 'serialHistory', icon: 'archive', section: 'serialHistory' },
  { href: '/admin/backup', labelKey: 'backup', icon: 'database', section: 'backup' },
];

/** جميع عناصر التنقل مسطّحة — للتجريب والصلاحيات */
function collectAllNavItems(): NavItemWithSection[] {
  const seen = new Set<string>();
  const out: NavItemWithSection[] = [];
  for (const item of [...topLevelItems, ...dashboardSubItems, ...accountingSubItems, ...propertiesSubItems]) {
    if (!item.isHeader && item.section && !seen.has(item.section)) {
      seen.add(item.section);
      out.push(item);
    } else if (item.section && !seen.has(item.section)) {
      seen.add(item.section);
      out.push(item);
    }
  }
  return out;
}

const ALL_NAV_ITEMS = collectAllNavItems();

/** ترتيب افتراضي للصلاحيات — يمكن إضافة أقسام جديدة في الأسفل */
const SECTION_ORDER: string[] = [
  'dashboard', 'myBookings', 'myContracts', 'myProperties', 'myInvoices', 'myReceipts', 'notifications', 'myAccount',
  'addressBook', 'bankDetails', 'companyData', 'documentTemplates', 'site',
  'accountingHome', 'accountingSales', 'accountingPurchases', 'accountingJournal', 'accountingDocuments', 'accountingAccounts',
  'accountingReports', 'accountingClaims', 'accountingCheques', 'accountingPayments', 'accountingPeriods', 'accountingAudit',
  'accountingSettings', 'accountingQuickActions', 'accountingAddJournal', 'accountingAddAccount', 'accountingAddDocument', 'accountingAddCheque',
  'propertiesManage', 'bookingsManage', 'contractsManage', 'maintenanceManage', 'dataManage', 'projects', 'services',
  'contact', 'submissions', 'dashboardSettings', 'contactCategoryPermissions', 'users', 'serialHistory', 'backup',
];

/** كل الصلاحيات المستخرجة من السجل — الصفحات الجديدة المُضافة في الأسفل تُدرج تلقائياً */
export function getAllPermissionSections(): string[] {
  const fromNav = new Set<string>();
  for (const item of ALL_NAV_ITEMS) {
    if (item.section && !item.isHeader) fromNav.add(item.section);
  }
  const ordered = SECTION_ORDER.filter((s) => fromNav.has(s));
  for (const s of fromNav) {
    if (!ordered.includes(s)) ordered.push(s);
  }
  return ordered;
}

/** عناصر التنقل الكاملة مع أقسامها — للمستخدم غير الأدمن */
export function getFullNavItemsForPermissions(): Array<{ href: string; labelKey: string; icon: string; section: string }> {
  return ALL_NAV_ITEMS.filter((i) => !i.isHeader);
}

/** مفتاح الترجمة لكل قسم — لعرض الاسم في إعدادات لوحات التحكم */
export function getSectionLabelKey(section: string): string {
  const item = ALL_NAV_ITEMS.find((i) => i.section === section);
  return item?.labelKey ?? section;
}

/** هيكل القائمة الجانبية للأدمن — مُستمد من السجل، الصفحات الجديدة تُضاف تلقائياً */
export interface AdminNavGroupItem {
  href: string;
  labelKey: string;
  icon: string;
  comingSoon?: boolean;
  isHeader?: boolean;
}
export interface AdminNavSubGroup {
  groupKey: string;
  subItems: AdminNavGroupItem[];
}
export interface AdminNavGroup {
  groupKey: string;
  items: Array<AdminNavGroupItem | AdminNavSubGroup>;
}

/** عناصر التنقل للأدمن فقط (لا تشمل حجوزاتي، عقودي، إلخ) */
const ADMIN_ONLY_SECTIONS = new Set([
  'addressBook', 'bankDetails', 'companyData', 'documentTemplates', 'site',
  'accountingHome', 'accountingSales', 'accountingPurchases', 'accountingJournal', 'accountingDocuments',
  'accountingAccounts', 'accountingReports', 'accountingClaims', 'accountingCheques', 'accountingPayments',
  'accountingPeriods', 'accountingAudit', 'accountingSettings', 'accountingQuickActions',
  'accountingAddJournal', 'accountingAddAccount', 'accountingAddDocument', 'accountingAddCheque',
  'propertiesManage', 'bookingsManage', 'contractsManage', 'maintenanceManage', 'dataManage',
  'projects', 'services', 'contact', 'submissions', 'dashboardSettings', 'contactCategoryPermissions',
  'users', 'serialHistory', 'backup',
]);

/** بناء هيكل القائمة الجانبية للأدمن من السجل المركزي */
export function getAdminNavGroupsConfig(): AdminNavGroup[] {
  const toItem = (n: NavItemWithSection): AdminNavGroupItem => ({
    href: n.href,
    labelKey: n.labelKey,
    icon: n.icon,
    isHeader: n.isHeader,
  });

  const dashboardItems = dashboardSubItems
    .filter((i) => ADMIN_ONLY_SECTIONS.has(i.section))
    .map(toItem);

  const propertiesItems = propertiesSubItems.map((i) => ({
    ...toItem(i),
    comingSoon: ['contractsManage', 'maintenanceManage', 'dataManage'].includes(i.section),
  }));

  const topLevelForAdmin = topLevelItems
    .filter((i) => ADMIN_ONLY_SECTIONS.has(i.section))
    .map(toItem);

  return [
    {
      groupKey: 'general',
      items: [
        { groupKey: 'dashboard', subItems: dashboardItems },
        { groupKey: 'accounting', subItems: accountingSubItems.map(toItem) },
      ],
    },
    {
      groupKey: 'content',
      items: [
        { groupKey: 'properties', subItems: propertiesItems },
        ...topLevelForAdmin.filter((i) => i.labelKey === 'projects' || i.labelKey === 'services'),
      ],
    },
    {
      groupKey: 'communication',
      items: topLevelForAdmin.filter((i) => i.labelKey === 'contact' || i.labelKey === 'submissions'),
    },
    {
      groupKey: 'system',
      items: topLevelForAdmin.filter((i) =>
        ['dashboardSettings', 'contactCategoryPermissions', 'users', 'serialHistory', 'backup'].includes(i.labelKey)
      ),
    },
  ];
}

/** هيكل مجموعات الصلاحيات لصفحة إعدادات لوحات التحكم — مطابق لهيكل لوحة التحكم */
export interface PermissionGroupForSettings {
  groupKey: string;
  groupLabelKey: string;
  items: Array<
    | { type: 'subsection'; subGroupKey: string; subGroupLabelKey: string; sections: Array<{ section: string; labelKey: string }> }
    | { type: 'single'; section: string; labelKey: string }
  >;
}

export function getPermissionGroupsForSettings(): PermissionGroupForSettings[] {
  const personalSections = getPersonalDashboardSectionsForSettings();
  return [
    {
      groupKey: 'general',
      groupLabelKey: 'groups.general',
      items: [
        {
          type: 'subsection',
          subGroupKey: 'personal',
          subGroupLabelKey: 'groups.personalDashboard',
          sections: personalSections,
        },
        {
          type: 'subsection',
          subGroupKey: 'dashboard',
          subGroupLabelKey: 'dashboard',
          sections: dashboardSubItems.map((i) => ({ section: i.section, labelKey: i.labelKey })),
        },
        {
          type: 'subsection',
          subGroupKey: 'accounting',
          subGroupLabelKey: 'accounting',
          sections: accountingSubItems.filter((i) => !i.isHeader).map((i) => ({ section: i.section, labelKey: i.labelKey })),
        },
      ],
    },
    {
      groupKey: 'content',
      groupLabelKey: 'groups.content',
      items: [
        {
          type: 'subsection',
          subGroupKey: 'properties',
          subGroupLabelKey: 'properties',
          sections: propertiesSubItems.map((i) => ({ section: i.section, labelKey: i.labelKey })),
        },
        { type: 'single', section: 'projects', labelKey: 'projects' },
        { type: 'single', section: 'services', labelKey: 'services' },
      ],
    },
    {
      groupKey: 'communication',
      groupLabelKey: 'groups.communication',
      items: [
        { type: 'single', section: 'contact', labelKey: 'contact' },
        { type: 'single', section: 'submissions', labelKey: 'submissions' },
      ],
    },
    {
      groupKey: 'system',
      groupLabelKey: 'groups.system',
      items: [
        { type: 'single', section: 'dashboardSettings', labelKey: 'dashboardSettings' },
        { type: 'single', section: 'contactCategoryPermissions', labelKey: 'contactCategoryPermissions' },
        { type: 'single', section: 'users', labelKey: 'users' },
        { type: 'single', section: 'serialHistory', labelKey: 'serialHistory' },
        { type: 'single', section: 'backup', labelKey: 'backup' },
      ],
    },
  ];
}

/** لوحة التحكم الشخصية: لوحتي، حجوزاتي، عقودي، إلخ */
export function getPersonalDashboardSectionsForSettings(): Array<{ section: string; labelKey: string }> {
  return [
    { section: 'dashboard', labelKey: 'clientNav.dashboard' },
    { section: 'myBookings', labelKey: 'clientNav.myBookings' },
    { section: 'myContracts', labelKey: 'clientNav.myContracts' },
    { section: 'myProperties', labelKey: 'ownerNav.myProperties' },
    { section: 'myInvoices', labelKey: 'clientNav.myInvoices' },
    { section: 'myReceipts', labelKey: 'clientNav.myReceipts' },
    { section: 'notifications', labelKey: 'clientNav.notifications' },
    { section: 'myAccount', labelKey: 'clientNav.myAccount' },
  ];
}

export { accountingSubItems, dashboardSubItems, propertiesSubItems, topLevelItems };
