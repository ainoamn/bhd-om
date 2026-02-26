'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getAllowedCategoriesForRole,
  setAllowedCategoriesForRole,
  resetToDefaults,
  PERMISSIONS_EVENT,
  ALL_CATEGORIES,
  type PermissionRole,
  type ContactCategoryOrCompany,
} from '@/lib/data/contactCategoryPermissions';
import { ALL_DASHBOARD_TYPES } from '@/lib/config/dashboardRoles';
import { useTranslations as useNavTranslations } from 'next-intl';

const CATEGORY_LABEL_KEYS: Record<ContactCategoryOrCompany, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
  AUTHORIZED_REP: 'categoryAuthorizedRep',
  COMPANY: 'categoryCompany',
  OTHER: 'categoryOther',
};

export default function ContactCategoryPermissionsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('addressBook');
  const tNav = useNavTranslations('admin.nav');
  const ar = locale === 'ar';
  const [allowedByType, setAllowedByType] = useState<Partial<Record<PermissionRole, ContactCategoryOrCompany[]>>>({});
  const [saved, setSaved] = useState(false);

  const loadPermissions = () => {
    const next: Partial<Record<PermissionRole, ContactCategoryOrCompany[]>> = {};
    for (const t of ALL_DASHBOARD_TYPES) {
      next[t] = getAllowedCategoriesForRole(t);
    }
    setAllowedByType(next);
  };

  useEffect(loadPermissions, []);

  useEffect(() => {
    const handler = () => loadPermissions();
    window.addEventListener(PERMISSIONS_EVENT, handler);
    return () => window.removeEventListener(PERMISSIONS_EVENT, handler);
  }, []);

  const toggleCategory = (type: PermissionRole, category: ContactCategoryOrCompany) => {
    const current = allowedByType[type] ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setAllowedCategoriesForRole(type, next);
    setAllowedByType((prev) => ({ ...prev, [type]: next }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    loadPermissions();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <AdminPageHeader
        title={t('categoryPermissions')}
        subtitle={t('categoryPermissionsDesc')}
      />

      <div className="space-y-6">
        <div className="admin-card p-6 overflow-x-auto">
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'حدّد التصنيفات التي يمكن لكل دور الاطلاع عليها أو استخدامها. صح = مسموح، إزالة الصح = غير مسموح.'
              : 'Set which categories each role can view or use. Check = allowed, uncheck = not allowed.'}
          </p>
          <p className="text-gray-500 text-xs mb-3">
            {ar ? 'الأعمدة: عميل، مستأجر، مالك، مورد، شريك، جهة حكومية، مفوض بالتوقيع، شركة، أخرى' : 'Columns: Client, Tenant, Landlord, Supplier, Partner, Government, Authorized Rep, Company, Other'}
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b-2 border-[#8B6F47]">
                <th
                  className="text-right py-3 px-4 font-bold text-gray-900 bg-gray-50"
                  style={{ minWidth: ar ? 180 : 200 }}
                >
                  {tNav('permissionType')}
                </th>
                {ALL_DASHBOARD_TYPES.map((type) => (
                  <th
                    key={type}
                    className="text-center py-2 px-1 font-bold text-[#8B6F47] bg-[#8B6F47]/5 text-xs"
                  >
                    {t(CATEGORY_LABEL_KEYS[type])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_CATEGORIES.map((category) => (
                <tr key={category} className="border-b border-gray-200 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {t(CATEGORY_LABEL_KEYS[category])}
                  </td>
                  {ALL_DASHBOARD_TYPES.map((type) => {
                    const enabled = allowedByType[type]?.includes(category);
                    return (
                      <td key={type} className="py-2 px-1 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleCategory(type, category)}
                            className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47] cursor-pointer"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {saved && (
            <p className="mt-4 text-emerald-600 text-sm font-medium">
              {ar ? 'تم الحفظ' : 'Saved'}
            </p>
          )}
        </div>

        <div className="admin-card p-6 bg-amber-50/50 border-amber-200">
          <h3 className="font-bold text-amber-900 mb-2">
            {ar ? 'إعادة للإعداد الافتراضي' : 'Reset to Default'}
          </h3>
          <p className="text-amber-800 text-sm mb-4">
            {ar
              ? 'إعادة جميع الصلاحيات إلى الافتراضي (كل التصنيفات مسموح بها لكل دور).'
              : 'Reset all permissions to default (all categories allowed for all roles).'}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
          >
            {ar ? 'إعادة' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}
