'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import RealEstateContractModal from '@/components/admin/real-estate/RealEstateContractModal';
import RealEstateUnitDetailsModal from '@/components/admin/real-estate/RealEstateUnitDetailsModal';
import { openContractOfficialPrintWindow } from '@/lib/real-estate/contractOfficialPrint';
import { openContractSummaryPrintWindow } from '@/lib/real-estate/contractSummaryPrint';
import { openContractsListPrintWindow } from '@/lib/real-estate/contractsListPrint';
import {
  filterContractsRows,
  paginateContractsRows,
  sortContractsRows,
} from '@/lib/real-estate/contractsTableFilters';
import { formatOmr } from '@/lib/real-estate/dashboardStats';
import type { ContractWorkspaceMode } from '@/lib/real-estate/unitContractWorkspace';
import type {
  ContractsSortKey,
  ContractsSortState,
  SavedContractListRow,
} from '@/lib/real-estate/savedContractListRow';
import { savedContractToOperationsUnit as toOpsUnit } from '@/lib/real-estate/savedContractListRow';

type Props = {
  locale: 'ar' | 'en';
};

type ContractsResponse = {
  rows: SavedContractListRow[];
  buildings: string[];
  syncedAt: string;
  total: number;
};

const DEFAULT_SORT: ContractsSortState = { key: 'days', dir: 'asc' };
const PAGE_SIZES = [50, 100, 200, 500] as const;

const LIFECYCLE_OPTIONS: { value: string; ar: string; en: string }[] = [
  { value: 'all', ar: 'كل الحالات', en: 'All statuses' },
  { value: 'active', ar: 'نشط', en: 'Active' },
  { value: 'active_pending', ar: 'نشط — بيانات ناقصة', en: 'Active — pending data' },
  { value: 'active_docs_pending', ar: 'نشط — مستندات', en: 'Active — documents pending' },
  { value: 'active_accounting_pending', ar: 'نشط — محاسبة', en: 'Active — accounting pending' },
  { value: 'renewal_pending', ar: 'تجديد معلّق', en: 'Renewal pending' },
  { value: 'draft', ar: 'مسودة', en: 'Draft' },
  { value: 'cancelled', ar: 'ملغي', en: 'Cancelled' },
];

export default function RealEstateContractsTable({ locale }: Props) {
  const ar = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allRows, setAllRows] = useState<SavedContractListRow[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [building, setBuilding] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  const [expire, setExpire] = useState('all');
  const [vat, setVat] = useState('all');
  const [sort, setSort] = useState<ContractsSortState>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);

  const [detailsUnit, setDetailsUnit] = useState<ReturnType<typeof toOpsUnit> | null>(null);
  const [contractModal, setContractModal] = useState<{
    row: SavedContractListRow;
    mode: ContractWorkspaceMode;
  } | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/contracts', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('contracts failed');
      const json = (await res.json()) as ContractsResponse;
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
    void loadContracts();
  }, [loadContracts]);

  const filteredSorted = useMemo(() => {
    const filtered = filterContractsRows(allRows, { search, building, lifecycle, expire, vat });
    return sortContractsRows(filtered, sort);
  }, [allRows, search, building, lifecycle, expire, vat, sort]);

  const { rows: pageRows, total, totalPages } = useMemo(
    () => paginateContractsRows(filteredSorted, page, pageSize),
    [filteredSorted, page, pageSize]
  );

  useEffect(() => {
    setPage(0);
  }, [search, building, lifecycle, expire, vat, pageSize]);

  const toggleSort = (key: ContractsSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const resetFilters = () => {
    setSearch('');
    setBuilding('all');
    setLifecycle('all');
    setExpire('all');
    setVat('all');
    setSort(DEFAULT_SORT);
    setPage(0);
  };

  const sortIndicator = (key: ContractsSortKey) => {
    if (sort.key !== key) return '↕';
    return sort.dir === 'asc' ? '↑' : '↓';
  };

  const openContract = (row: SavedContractListRow, mode: ContractWorkspaceMode) => {
    setContractModal({ row, mode });
  };

  const printContract = async (row: SavedContractListRow, official: boolean) => {
    const unit = toOpsUnit(row);
    try {
      const qs = new URLSearchParams({ building: row.building, unit: row.unit, mode: 'view' });
      const res = await fetch(`/api/admin/real-estate-dashboard/unit-contract?${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('load failed');
      const json = (await res.json()) as { workspace: { values: Parameters<typeof openContractSummaryPrintWindow>[1] } };
      if (official) {
        openContractOfficialPrintWindow(unit, json.workspace.values, locale);
      } else {
        openContractSummaryPrintWindow(unit, json.workspace.values, locale);
      }
    } catch {
      alert(ar ? 'تعذر تحميل بيانات العقد للطباعة.' : 'Could not load contract data for printing.');
    }
  };

  const contractActionBtn = (
    row: SavedContractListRow,
    mode: ContractWorkspaceMode,
    label: string,
    onClick?: () => void
  ) => (
    <button
      type="button"
      onClick={onClick ?? (() => openContract(row, mode))}
      className="text-[10px] font-semibold admin-accent-text hover:underline whitespace-nowrap"
    >
      {label}
    </button>
  );

  return (
    <section className="re-units-section mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold opacity-90">
            {ar ? '📋 سجل العقود المحفوظة' : '📋 Saved contracts registry'}
          </h3>
          <p className="text-xs opacity-60 mt-1">
            {ar
              ? 'بحث وفلترة — عرض/تجديد/طباعة من React'
              : 'Search & filter — view/renew/print in React'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadContracts()}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Icon name="arrowPath" className="w-4 h-4" aria-hidden />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => openContractsListPrintWindow(filteredSorted, locale)}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Icon name="printer" className="w-4 h-4" aria-hidden />
            {ar ? 'طباعة القائمة' : 'Print list'}
          </button>
          <Link
            href={`/${locale}/admin/real-estate-dashboard`}
            prefetch
            className="admin-btn admin-btn-ghost text-sm"
          >
            {ar ? 'لوحة الوحدات' : 'Units dashboard'}
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
              ar ? 'بحث بالعقد أو المستأجر أو الوحدة' : 'Search agreement, tenant, or unit'
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
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
            className="admin-input text-sm"
          >
            {LIFECYCLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {ar ? opt.ar : opt.en}
              </option>
            ))}
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
          <select value={vat} onChange={(e) => setVat(e.target.value)} className="admin-input text-sm">
            <option value="all">{ar ? 'الضريبة: الكل' : 'VAT: all'}</option>
            <option value="yes">{ar ? 'خاضع للضريبة' : 'Subject to VAT'}</option>
            <option value="no">{ar ? 'غير خاضع' : 'Not subject to VAT'}</option>
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
        <p className="text-sm opacity-60 py-8 text-center">
          {ar ? 'جاري تحميل العقود…' : 'Loading contracts…'}
        </p>
      ) : error ? (
        <p className="text-sm text-red-600 py-8 text-center">
          {ar ? 'تعذر تحميل سجل العقود.' : 'Could not load contracts registry.'}
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
                      ['unit', ar ? 'الوحدة' : 'Unit'],
                      ['agreementNo', ar ? 'رقم العقد' : 'Agreement'],
                      ['tenant', ar ? 'المستأجر' : 'Tenant'],
                      ['owner', ar ? 'المالك' : 'Owner'],
                      ['startDate', ar ? 'البداية' : 'Start'],
                      ['endDate', ar ? 'النهاية' : 'End'],
                      ['days', ar ? 'متبقي' : 'Days'],
                      ['rent', ar ? 'الإيجار' : 'Rent'],
                      ['lifecycle', ar ? 'حالة العقد' : 'Status'],
                    ] as [ContractsSortKey, string][]
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
                  <th>{ar ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center opacity-60 py-8">
                      {ar ? 'لا توجد عقود مطابقة' : 'No matching contracts'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={`${r.building}::${r.unit}::${r.agreementNo}`}>
                      <td>{r.building}</td>
                      <td>{r.unit}</td>
                      <td dir="ltr">{r.agreementNo || '—'}</td>
                      <td>{r.tenantNameAr || r.tenantNameEn || '—'}</td>
                      <td>{r.ownerNames || '—'}</td>
                      <td dir="ltr">{r.startDate || '—'}</td>
                      <td dir="ltr">{r.endDate || '—'}</td>
                      <td dir="ltr">{r.daysLeft ?? '—'}</td>
                      <td dir="ltr">
                        {r.monthlyRent
                          ? `${formatOmr(parseFloat(r.monthlyRent) || 0, locale)} ${ar ? 'ر.ع.' : 'OMR'}`
                          : '—'}
                      </td>
                      <td>
                        <span className={`re-units-chip re-units-chip--state re-units-chip--${r.lifecycleStatus}`}>
                          {ar ? r.lifecycleLabelAr : r.lifecycleLabelEn}
                        </span>
                        {r.hasRenewalDraft ? (
                          <span className="ms-1 text-[10px] opacity-70">
                            {ar ? '(مسودة تجديد)' : '(renewal draft)'}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <button
                            type="button"
                            onClick={() => setDetailsUnit(toOpsUnit(r))}
                            className="text-[10px] font-semibold admin-accent-text hover:underline whitespace-nowrap"
                          >
                            {ar ? 'تفاصيل' : 'Details'}
                          </button>
                          {contractActionBtn(r, 'view', ar ? 'عرض' : 'View')}
                          {contractActionBtn(r, 'renew', ar ? 'تجديد' : 'Renew')}
                          {contractActionBtn(r, 'view', ar ? 'ملخص' : 'Summary', () => void printContract(r, false))}
                          {contractActionBtn(r, 'view', ar ? 'رسمي' : 'Official', () => void printContract(r, true))}
                        </div>
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
                    className="admin-input text-xs py-1 w-auto"
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
                  className="admin-btn admin-btn-ghost text-xs py-1"
                >
                  {ar ? 'السابق' : 'Prev'}
                </button>
                <span>
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="admin-btn admin-btn-ghost text-xs py-1"
                >
                  {ar ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs opacity-60 mt-2">
              {ar ? `إجمالي: ${total} عقد` : `Total: ${total} contract(s)`}
            </p>
          )}
        </>
      )}

      {detailsUnit ? (
        <RealEstateUnitDetailsModal
          locale={locale}
          unit={detailsUnit}
          onClose={() => setDetailsUnit(null)}
        />
      ) : null}

      {contractModal ? (
        <RealEstateContractModal
          locale={locale}
          unit={toOpsUnit(contractModal.row)}
          mode={contractModal.mode}
          onClose={() => setContractModal(null)}
          onSaved={() => void loadContracts()}
        />
      ) : null}
    </section>
  );
}
