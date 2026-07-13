'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import {
  filterReservationsRows,
  paginateReservationsRows,
  sortReservationsRows,
  type ReservationListRow,
  type ReservationsSortKey,
  type ReservationsSortState,
} from '@/lib/real-estate/buildReservationsList';
import { buildLegacyReservationsUrl } from '@/lib/real-estate/legacyUnitLinks';
import {
  openReservationFormPrintWindow,
  openReservationsListPrintWindow,
} from '@/lib/real-estate/reservationsListPrint';

type Props = {
  locale: 'ar' | 'en';
};

type ReservationsResponse = {
  rows: ReservationListRow[];
  buildings: string[];
  total: number;
};

const DEFAULT_SORT: ReservationsSortState = { key: 'since', dir: 'desc' };
const PAGE_SIZES = [50, 100, 200] as const;

export default function RealEstateReservationsTable({ locale }: Props) {
  const ar = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allRows, setAllRows] = useState<ReservationListRow[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [building, setBuilding] = useState('all');
  const [state, setState] = useState('all');
  const [sort, setSort] = useState<ReservationsSortState>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);

  const legacyReservationsHref = buildLegacyReservationsUrl(locale);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/reservations', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('reservations failed');
      const json = (await res.json()) as ReservationsResponse;
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
    void loadReservations();
  }, [loadReservations]);

  const filteredSorted = useMemo(() => {
    const filtered = filterReservationsRows(allRows, { search, building, state });
    return sortReservationsRows(filtered, sort);
  }, [allRows, search, building, state, sort]);

  const { rows: pageRows, total, totalPages } = useMemo(
    () => paginateReservationsRows(filteredSorted, page, pageSize),
    [filteredSorted, page, pageSize]
  );

  useEffect(() => {
    setPage(0);
  }, [search, building, state, pageSize]);

  const toggleSort = (key: ReservationsSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const resetFilters = () => {
    setSearch('');
    setBuilding('all');
    setState('all');
    setSort(DEFAULT_SORT);
    setPage(0);
  };

  const sortIndicator = (key: ReservationsSortKey) => {
    if (sort.key !== key) return '↕';
    return sort.dir === 'asc' ? '↑' : '↓';
  };

  return (
    <section className="re-units-section mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold opacity-90">
            {ar ? '📌 سجل الحجوزات' : '📌 Reservations registry'}
          </h3>
          <p className="text-xs opacity-60 mt-1">
            {ar
              ? 'بحث وفلترة — استكمال الحجز والتحويل عبر النظام التشغيلي'
              : 'Search & filter — resume/convert via operational system'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadReservations()}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Icon name="arrowPath" className="w-4 h-4" aria-hidden />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => openReservationsListPrintWindow(filteredSorted, locale)}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Icon name="printer" className="w-4 h-4" aria-hidden />
            {ar ? 'طباعة القائمة' : 'Print list'}
          </button>
          <a
            href={legacyReservationsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary text-sm"
          >
            {ar ? 'حجز جديد (legacy)' : 'New reservation (legacy)'}
          </a>
          <Link href={`/${locale}/admin/real-estate-dashboard`} prefetch className="admin-btn admin-btn-ghost text-sm">
            {ar ? 'لوحة الوحدات' : 'Units dashboard'}
          </Link>
        </div>
      </div>

      <div className="re-units-filters admin-card p-3 sm:p-4 mb-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ar ? 'بحث بالمبنى أو المحجوز أو الجوال' : 'Search building, name, or phone'}
            className="admin-input text-sm col-span-full sm:col-span-2"
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
          <select value={state} onChange={(e) => setState(e.target.value)} className="admin-input text-sm">
            <option value="all">{ar ? 'كل الحالات' : 'All statuses'}</option>
            <option value="draft">{ar ? 'مسودة' : 'Draft'}</option>
            <option value="confirmed">{ar ? 'مكتمل' : 'Completed'}</option>
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
          {ar ? 'جاري تحميل الحجوزات…' : 'Loading reservations…'}
        </p>
      ) : error ? (
        <p className="text-sm text-red-600 py-8 text-center">
          {ar ? 'تعذر تحميل سجل الحجوزات.' : 'Could not load reservations registry.'}
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
                      ['reservedBy', ar ? 'المحجوز' : 'Reserved by'],
                      ['phone', ar ? 'الجوال' : 'Phone'],
                      ['since', ar ? 'التاريخ' : 'Date'],
                      ['state', ar ? 'الحالة' : 'Status'],
                    ] as [ReservationsSortKey, string][]
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
                    <td colSpan={7} className="text-center opacity-60 py-8">
                      {ar ? 'لا توجد حجوزات مطابقة' : 'No matching reservations'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={`${r.index}-${r.building}-${r.unitsLabel}`}>
                      <td>{r.building}</td>
                      <td>
                        {r.unitsLabel}
                        {r.unitCount > 1 ? (
                          <span className="ms-1 text-[10px] opacity-60">({r.unitCount})</span>
                        ) : null}
                      </td>
                      <td>{r.reservedBy || '—'}</td>
                      <td dir="ltr">{r.phone || '—'}</td>
                      <td dir="ltr">{r.since || '—'}</td>
                      <td>
                        <span
                          className={`re-units-chip ${r.state === 'confirmed' ? 're-units-chip--rented' : 're-units-chip--warn'}`}
                        >
                          {ar ? r.stateLabelAr : r.stateLabelEn}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <a
                            href={legacyReservationsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold admin-accent-text hover:underline whitespace-nowrap"
                          >
                            {ar ? 'استكمال' : 'Resume'}
                          </a>
                          {r.state === 'confirmed' ? (
                            <button
                              type="button"
                              onClick={() => openReservationFormPrintWindow(r, locale)}
                              className="text-[10px] font-semibold admin-accent-text hover:underline whitespace-nowrap"
                            >
                              {ar ? 'طباعة' : 'Print'}
                            </button>
                          ) : null}
                          <a
                            href={legacyReservationsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold admin-accent-text hover:underline whitespace-nowrap"
                          >
                            {ar ? 'تحويل عقد' : 'Convert'}
                          </a>
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
              {ar ? `إجمالي: ${total} حجز` : `Total: ${total} reservation(s)`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
