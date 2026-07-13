'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { getStatusLabel } from '@/lib/real-estate/contractLifecycle';
import type { OperationsUnitRow, UnitsSortKey, UnitsSortState } from '@/lib/real-estate/operationsUnit';
import {
  filterUnitsRows,
  paginateUnitsRows,
  sortUnitsRows,
} from '@/lib/real-estate/unitsTableFilters';

type Props = {
  locale: 'ar' | 'en';
};

type UnitsResponse = {
  rows: OperationsUnitRow[];
  buildings: string[];
  syncedAt: string;
};

const DEFAULT_SORT: UnitsSortState = { key: 'days', dir: 'asc' };
const PAGE_SIZES = [50, 100, 200, 500] as const;

function formatOwnerCell(ownerNames: string, locale: 'ar' | 'en'): string {
  if (!ownerNames) return '—';
  if (locale === 'en') {
    const parts = ownerNames.split(/\s*-\s*/);
    return parts[parts.length - 1]?.trim() || ownerNames;
  }
  return ownerNames;
}

function statusChipClass(token: OperationsUnitRow['statusToken'], rawStatus: string): string {
  if (token === 'Expiring' || token === 'Overdue') return 're-units-chip re-units-chip--warn';
  if (rawStatus === 'Vacant' || token === 'Vacant') return 're-units-chip re-units-chip--vacant';
  return 're-units-chip re-units-chip--rented';
}

export default function RealEstateUnitsTable({ locale }: Props) {
  const ar = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allRows, setAllRows] = useState<OperationsUnitRow[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [building, setBuilding] = useState('all');
  const [status, setStatus] = useState('all');
  const [expire, setExpire] = useState('all');
  const [utilities, setUtilities] = useState('all');
  const [sort, setSort] = useState<UnitsSortState>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/units', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('units failed');
      const json = (await res.json()) as UnitsResponse;
      setAllRows(json.rows);
      setBuildings(json.buildings);
    } catch {
      setError(true);
      setAllRows([]);
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const filteredSorted = useMemo(() => {
    const filtered = filterUnitsRows(allRows, { search, building, status, expire, utilities });
    return sortUnitsRows(filtered, sort);
  }, [allRows, search, building, status, expire, utilities, sort]);

  const { rows: pageRows, total, totalPages } = useMemo(
    () => paginateUnitsRows(filteredSorted, page, pageSize),
    [filteredSorted, page, pageSize]
  );

  useEffect(() => {
    setPage(0);
  }, [search, building, status, expire, utilities, pageSize]);

  const toggleSort = (key: UnitsSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const resetFilters = () => {
    setSearch('');
    setBuilding('all');
    setStatus('all');
    setExpire('all');
    setUtilities('all');
    setSort(DEFAULT_SORT);
    setPage(0);
  };

  const sortIndicator = (key: UnitsSortKey) => {
    if (sort.key !== key) return '↕';
    return sort.dir === 'asc' ? '↑' : '↓';
  };

  const legacyManageHref = `/${locale}/admin/real-estate-system`;

  return (
    <section className="re-units-section mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold opacity-90">
            {ar ? '🏢 سجل الوحدات' : '🏢 Units registry'}
          </h3>
          <p className="text-xs opacity-60 mt-1">
            {ar
              ? 'بحث وفلترة فورية — الإجراءات التفصيلية في النظام الكامل'
              : 'Instant search & filters — detailed actions in the full system'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadUnits()}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Icon name="arrowPath" className="w-4 h-4" aria-hidden />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
          <Link href={legacyManageHref} prefetch className="admin-btn admin-btn-secondary text-sm">
            {ar ? 'النظام الكامل' : 'Full system'}
          </Link>
        </div>
      </div>

      <div className="re-units-filters admin-card p-3 sm:p-4 mb-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              ar
                ? 'بحث بالاسم أو الوحدة أو العداد'
                : 'Search by name, unit, or meter'
            }
            className="admin-input text-sm col-span-full sm:col-span-2 lg:col-span-2"
          />
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="admin-input text-sm"
          >
            <option value="all">{ar ? 'كل المباني' : 'All buildings'}</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="admin-input text-sm"
          >
            <option value="all">{ar ? 'كل الحالات' : 'All statuses'}</option>
            <option value="Rented">{ar ? 'مؤجر' : 'Rented'}</option>
            <option value="Vacant">{ar ? 'شاغر' : 'Vacant'}</option>
            <option value="Expiring">{ar ? 'قريب الانتهاء' : 'Expiring soon'}</option>
            <option value="Overdue">{ar ? 'منتهي' : 'Overdue'}</option>
            <option value="NoEndDate">{ar ? 'بدون تاريخ' : 'No end date'}</option>
          </select>
          <select
            value={expire}
            onChange={(e) => setExpire(e.target.value)}
            className="admin-input text-sm"
          >
            <option value="all">{ar ? 'كل الفترات' : 'All periods'}</option>
            <option value="30">{ar ? 'ينتهي خلال 30 يوم' : 'Within 30 days'}</option>
            <option value="60">{ar ? 'ينتهي خلال 60 يوم' : 'Within 60 days'}</option>
            <option value="90">{ar ? 'ينتهي خلال 90 يوم' : 'Within 90 days'}</option>
          </select>
          <select
            value={utilities}
            onChange={(e) => setUtilities(e.target.value)}
            className="admin-input text-sm"
          >
            <option value="all">{ar ? 'العدادات: الكل' : 'Meters: all'}</option>
            <option value="complete">{ar ? 'مكتملة' : 'Complete'}</option>
            <option value="missing">{ar ? 'ناقصة' : 'Missing'}</option>
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="mt-3 text-xs font-semibold opacity-70 hover:opacity-100 hover:underline"
        >
          {ar ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm opacity-60 py-8 text-center">{ar ? 'جاري تحميل الوحدات…' : 'Loading units…'}</p>
      ) : error ? (
        <p className="text-sm text-red-600 py-8 text-center">
          {ar ? 'تعذر تحميل سجل الوحدات.' : 'Could not load units registry.'}
        </p>
      ) : (
        <>
          <div className="admin-table-wrapper admin-card">
            <table className="admin-table re-units-table text-sm">
              <thead>
                <tr>
                  {(
                    [
                      ['building', ar ? 'المبنى' : 'Building'],
                      ['owner', ar ? 'المالك' : 'Owner'],
                      ['unit', ar ? 'الوحدة' : 'Unit'],
                      ['tenant', ar ? 'المستأجر' : 'Tenant'],
                      ['status', ar ? 'الحالة' : 'Status'],
                      ['contractState', ar ? 'حالة العقد' : 'Contract'],
                      ['endDate', ar ? 'الانتهاء' : 'End date'],
                      ['days', ar ? 'متبقي' : 'Days'],
                      ['electricity', ar ? 'كهرباء' : 'Electricity'],
                      ['water', ar ? 'ماء' : 'Water'],
                    ] as [UnitsSortKey, string][]
                  ).map(([key, label]) => (
                    <th key={key}>
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 font-semibold hover:opacity-80"
                      >
                        {label}
                        <span className="text-[10px] opacity-60">{sortIndicator(key)}</span>
                      </button>
                    </th>
                  ))}
                  <th>{ar ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center opacity-60 py-8">
                      {ar ? 'لا توجد وحدات مطابقة' : 'No matching units'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                    <tr key={`${u.building}::${u.unit}`}>
                      <td>{u.building}</td>
                      <td>{formatOwnerCell(u.ownerNames, locale)}</td>
                      <td>{u.unit}</td>
                      <td>{u.tenant || '—'}</td>
                      <td>
                        <span className={statusChipClass(u.statusToken, u.status)}>
                          {getStatusLabel(u.statusToken, locale)}
                        </span>
                      </td>
                      <td>
                        <span className={`re-units-chip re-units-chip--state re-units-chip--${u.contractStateKey}`}>
                          {ar ? u.contractStateLabelAr : u.contractStateLabelEn}
                        </span>
                      </td>
                      <td dir="ltr">{u.endDate || '—'}</td>
                      <td dir="ltr">{u.daysLeft === null ? '—' : u.daysLeft}</td>
                      <td dir="ltr">{u.electricity || '—'}</td>
                      <td dir="ltr">{u.water || '—'}</td>
                      <td>
                        <Link
                          href={legacyManageHref}
                          prefetch
                          className="text-xs font-semibold admin-accent-text hover:underline whitespace-nowrap"
                        >
                          {ar ? 'فتح' : 'Open'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize ? (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs opacity-80">
              <span>
                {ar
                  ? `عرض ${page * pageSize + 1}–${page * pageSize + pageRows.length} من ${total}`
                  : `Showing ${page * pageSize + 1}–${page * pageSize + pageRows.length} of ${total}`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2">
                  <span>{ar ? 'صفوف' : 'Rows'}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="admin-input text-xs py-1"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="admin-btn admin-btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                >
                  {ar ? 'السابق' : 'Previous'}
                </button>
                <span>
                  {page + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="admin-btn admin-btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                >
                  {ar ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
