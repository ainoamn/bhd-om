'use client';

import Icon from '@/components/icons/Icon';
import { getStatusLabel } from '@/lib/real-estate/contractLifecycle';
import { formatOmr } from '@/lib/real-estate/dashboardStats';
import { buildLegacyUnitActionUrl } from '@/lib/real-estate/legacyUnitLinks';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';

type Props = {
  locale: 'ar' | 'en';
  unit: OperationsUnitRow | null;
  onClose: () => void;
};

function DetailSection({
  title,
  fields,
}: {
  title: string;
  fields: [string, string | number | null | undefined][];
}) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">{title}</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
            <div className="text-[10px] opacity-60 mb-0.5">{label}</div>
            <div className="text-sm font-semibold break-words">{value != null && value !== '' ? String(value) : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RealEstateUnitDetailsModal({ locale, unit, onClose }: Props) {
  const ar = locale === 'ar';
  if (!unit) return null;

  const contractStatus =
    unit.daysLeft !== null && unit.daysLeft < 0
      ? ar
        ? 'منتهي'
        : 'Expired'
      : unit.statusToken === 'Vacant'
        ? ar
          ? 'شاغر'
          : 'Vacant'
        : ar
          ? 'ساري'
          : 'Active';

  const monthsLeft =
    unit.daysLeft !== null ? (unit.daysLeft / 30).toFixed(2) : unit.monthsLeft ?? '—';

  return (
    <div
      className="re-unit-details-overlay fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="re-unit-details-card admin-card w-full overflow-auto"
        style={{ width: 'min(1280px, 98vw)', maxHeight: '96vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
          <div>
            <h3 className="text-base font-bold">
              {ar ? 'تفاصيل الوحدة' : 'Unit details'}{' '}
              <span dir="ltr">
                {unit.unit} | {unit.building}
              </span>
            </h3>
            <p className="text-xs opacity-60 mt-1">
              {ar ? unit.contractStateLabelAr : unit.contractStateLabelEn}
              {' · '}
              {getStatusLabel(unit.statusToken, locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn-ghost p-2"
            aria-label={ar ? 'إغلاق' : 'Close'}
          >
            <Icon name="x" className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <DetailSection
            title={ar ? 'بيانات الوحدة' : 'Unit data'}
            fields={[
              [ar ? 'المبنى' : 'Building', unit.building],
              [ar ? 'المالك' : 'Owner', unit.ownerNames],
              [ar ? 'الوحدة' : 'Unit', unit.unit],
              [ar ? 'الطابق' : 'Floor', unit.floor],
              [ar ? 'نوع الوحدة' : 'Unit type', unit.unitType],
              [ar ? 'الحالة' : 'Status', unit.status],
            ]}
          />
          <DetailSection
            title={ar ? 'بيانات المستأجر' : 'Tenant data'}
            fields={[
              [ar ? 'اسم المستأجر' : 'Tenant', unit.tenant],
              [ar ? 'اسم المستأجر (EN)' : 'Tenant (EN)', unit.tenantEn],
              [ar ? 'الرقم المدني' : 'Civil ID', unit.civilCard],
              [ar ? 'التواصل' : 'Contact', unit.contactNo || unit.mobile],
            ]}
          />
          <DetailSection
            title={ar ? 'العقد والتواريخ' : 'Contract & dates'}
            fields={[
              [ar ? 'حالة العقد' : 'Contract status', contractStatus],
              [ar ? 'رقم العقد' : 'Agreement no.', unit.agreementNo],
              [ar ? 'تاريخ البداية' : 'Start date', unit.startDate],
              [ar ? 'تاريخ النهاية' : 'End date', unit.endDate],
              [ar ? 'متبقي يوم' : 'Days left', unit.daysLeft ?? '—'],
              [ar ? 'الأشهر المتبقية' : 'Months left', monthsLeft],
              [ar ? 'تاريخ الإخلاء' : 'Evacuation', unit.evacuationDate],
            ]}
          />
          <DetailSection
            title={ar ? 'المبالغ والعدادات' : 'Amounts & meters'}
            fields={[
              [ar ? 'الإيجار الشهري' : 'Monthly rent', formatOmr(Number(unit.monthlyRent) || 0, locale)],
              [ar ? 'إيجار الاتفاقية' : 'Agreement rent', formatOmr(Number(unit.agreementRent) || 0, locale)],
              [ar ? 'كهرباء' : 'Electricity', unit.electricity],
              [ar ? 'قراءة الكهرباء' : 'Elec. reading', unit.electricityReading],
              [ar ? 'ماء' : 'Water', unit.water],
              [ar ? 'قراءة الماء' : 'Water reading', unit.waterReading],
            ]}
          />
          {unit.remarks ? (
            <DetailSection title={ar ? 'ملاحظات' : 'Notes'} fields={[[ar ? 'ملاحظات' : 'Notes', unit.remarks]]} />
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
          <a
            href={buildLegacyUnitActionUrl(unit.building, unit.unit, 'fill', locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary text-sm"
          >
            {ar ? 'تعبئة العقد' : 'Fill contract'}
          </a>
          <a
            href={buildLegacyUnitActionUrl(unit.building, unit.unit, 'renew', locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary text-sm"
          >
            {ar ? 'تجديد' : 'Renew'}
          </a>
          <a
            href={buildLegacyUnitActionUrl(unit.building, unit.unit, 'print', locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-primary text-sm"
          >
            {ar ? 'طباعة' : 'Print'}
          </a>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost text-sm ms-auto">
            {ar ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
