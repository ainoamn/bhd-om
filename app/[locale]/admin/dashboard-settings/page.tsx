'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getSectionsForRole,
  setSectionsForRole,
  resetToDefaults,
  disableSectionForAll,
  enableSectionForAll,
  disableAllForType,
  enableAllForType,
  DASHBOARD_SETTINGS_EVENT,
} from '@/lib/data/dashboardSettings';
import type { DashboardSectionKey, DashboardType } from '@/lib/config/dashboardRoles';
import { ALL_DASHBOARD_TYPES } from '@/lib/config/dashboardRoles';
import { getPermissionGroupsForSettings } from '@/lib/config/adminNav';
import Icon from '@/components/icons/Icon';

const DASHBOARD_TYPE_LABEL_KEYS: Record<DashboardType, string> = {
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

export default function DashboardSettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('admin.nav');
  const tAddr = useTranslations('addressBook');
  const ar = locale === 'ar';
  const [sectionsByType, setSectionsByType] = useState<Partial<Record<DashboardType, DashboardSectionKey[]>>>({});
  const [saved, setSaved] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(new Set());

  const loadSections = () => {
    const next: Partial<Record<DashboardType, DashboardSectionKey[]>> = {};
    for (const type of ALL_DASHBOARD_TYPES) {
      next[type] = getSectionsForRole(type);
    }
    setSectionsByType(next);
  };

  useEffect(loadSections, []);

  useEffect(() => {
    const handler = () => loadSections();
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_SETTINGS_EVENT, handler);
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSubGroup = (key: string) => {
    setExpandedSubGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSection = (type: DashboardType, section: DashboardSectionKey) => {
    const current = sectionsByType[type] ?? [];
    const next = current.includes(section)
      ? current.filter((s) => s !== section)
      : [...current, section];
    setSectionsForRole(type, next);
    setSectionsByType((prev) => ({ ...prev, [type]: next }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    loadSections();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const permissionGroups = getPermissionGroupsForSettings();

  const renderSectionRow = (section: string, labelKey: string) => {
    const enabledByType = (type: DashboardType) => sectionsByType[type]?.includes(section as DashboardSectionKey);

    return (
      <tr key={section} className="border-b border-gray-200 hover:bg-gray-50/50">
        <td className="py-2 px-4 pl-8 font-medium text-gray-800 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>{t(labelKey)}</span>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  disableSectionForAll(section as DashboardSectionKey);
                  loadSections();
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                className="px-2 py-0.5 text-[10px] rounded bg-red-100 text-red-700 hover:bg-red-200"
                title={ar ? 'إلغاء هذه الصلاحية عن الجميع' : 'Disable for all'}
              >
                {ar ? '✕ للجميع' : '✕ All'}
              </button>
              <button
                type="button"
                onClick={() => {
                  enableSectionForAll(section as DashboardSectionKey);
                  loadSections();
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                className="px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                title={ar ? 'منح هذه الصلاحية للجميع' : 'Enable for all'}
              >
                {ar ? '✓ للجميع' : '✓ All'}
              </button>
            </div>
          </div>
        </td>
        {ALL_DASHBOARD_TYPES.map((type) => {
          const enabled = enabledByType(type);
          return (
            <td key={type} className="py-2 px-2 text-center">
              <label className="inline-flex items-center justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleSection(type, section as DashboardSectionKey)}
                  className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47] cursor-pointer"
                />
              </label>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div>
      <AdminPageHeader
        title={t('dashboardSettings')}
        subtitle={t('dashboardSettingsDesc')}
      />

      <div className="space-y-6">
        <div className="admin-card overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <p className="text-gray-600 text-sm mb-1">
              {ar
                ? 'حدّد الميزات المفعّلة لكل نوع مستخدم. صح = مفعّل، إزالة الصح = معطّل.'
                : 'Set which features are enabled for each user type. Check = enabled, uncheck = disabled.'}
            </p>
            <p className="text-gray-500 text-xs">
              {ar ? 'اضغط على المجموعة لفتح/إغلاق القائمة. استخدم أزرار «إلغاء للجميع» أو «✓/✕ الكل» لتسريع الإعداد.' : 'Click a group to expand/collapse. Use "Disable for all" or "✓/✕ All" to speed up setup.'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                <tr className="border-b-2 border-[#8B6F47] bg-gray-50">
                  <th className="text-right py-3 px-4 font-bold text-gray-900 min-w-[220px]">
                    {t('permissionType')}
                  </th>
                  {ALL_DASHBOARD_TYPES.map((type) => (
                    <th
                      key={type}
                      className="text-center py-2 px-2 font-bold text-[#8B6F47] bg-[#8B6F47]/5 text-xs align-top"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{tAddr(DASHBOARD_TYPE_LABEL_KEYS[type])}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              disableAllForType(type);
                              loadSections();
                              setSaved(true);
                              setTimeout(() => setSaved(false), 2000);
                            }}
                            className="px-2 py-0.5 text-[10px] rounded bg-red-100 text-red-700 hover:bg-red-200"
                            title={ar ? 'إلغاء كل الصلاحيات لهذا النوع' : 'Disable all for this type'}
                          >
                            {ar ? '✕ الكل' : '✕ All'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              enableAllForType(type);
                              loadSections();
                              setSaved(true);
                              setTimeout(() => setSaved(false), 2000);
                            }}
                            className="px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            title={ar ? 'منح كل الصلاحيات لهذا النوع' : 'Enable all for this type'}
                          >
                            {ar ? '✓ الكل' : '✓ All'}
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionGroups.map((group) => {
                  const isGroupExpanded = expandedGroups.has(group.groupKey);
                  return (
                    <Fragment key={group.groupKey}>
                      <tr className="border-b border-gray-200">
                        <td colSpan={ALL_DASHBOARD_TYPES.length + 1} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.groupKey)}
                            className="w-full flex items-center gap-2 py-3 px-4 font-bold text-[#8B6F47] bg-amber-50/50 hover:bg-amber-50 text-right transition-colors"
                          >
                            {isGroupExpanded ? (
                              <Icon name="chevronDown" className="w-4 h-4 shrink-0" />
                            ) : (
                              <Icon name="chevronRight" className="w-4 h-4 shrink-0" />
                            )}
                            {t(group.groupLabelKey)}
                          </button>
                        </td>
                      </tr>
                      {isGroupExpanded &&
                        group.items.map((item) => {
                          if (item.type === 'subsection') {
                            const subKey = `${group.groupKey}-${item.subGroupKey}`;
                            const isSubExpanded = expandedSubGroups.has(subKey);
                            return (
                              <Fragment key={subKey}>
                                <tr className="border-t border-gray-100 bg-gray-50/30">
                                  <td colSpan={ALL_DASHBOARD_TYPES.length + 1} className="p-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubGroup(subKey)}
                                      className="w-full flex items-center gap-2 py-2.5 px-6 font-semibold text-gray-700 hover:bg-gray-100 text-right transition-colors"
                                    >
                                      {isSubExpanded ? (
                                        <Icon name="chevronDown" className="w-4 h-4 shrink-0" />
                                      ) : (
                                        <Icon name="chevronRight" className="w-4 h-4 shrink-0" />
                                      )}
                                      {t(item.subGroupLabelKey)}
                                    </button>
                                  </td>
                                </tr>
                                {isSubExpanded &&
                                  item.sections.map(({ section, labelKey }) =>
                                    renderSectionRow(section, labelKey)
                                  )}
                              </Fragment>
                            );
                          }
                          return renderSectionRow(item.section, item.labelKey);
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {saved && (
            <div className="px-6 py-4 border-t border-gray-200">
              <p className="text-emerald-600 text-sm font-medium">
                {ar ? 'تم الحفظ' : 'Saved'}
              </p>
            </div>
          )}
        </div>

        <div className="admin-card p-6 bg-amber-50/50 border-amber-200">
          <h3 className="font-bold text-amber-900 mb-2">
            {ar ? 'إعادة للإعداد الافتراضي' : 'Reset to Default'}
          </h3>
          <p className="text-amber-800 text-sm mb-4">
            {ar
              ? 'إعادة جميع إعدادات الأنواع إلى القيم الافتراضية.'
              : 'Reset all type settings to their default values.'}
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
