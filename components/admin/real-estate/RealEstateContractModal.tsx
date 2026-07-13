'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/icons/Icon';
import { openContractOfficialPrintWindow } from '@/lib/real-estate/contractOfficialPrint';
import { openMunicipalFormPrintWindow } from '@/lib/real-estate/municipalFormPrint';
import { openContractSummaryPrintWindow } from '@/lib/real-estate/contractSummaryPrint';
import {
  CONTRACT_DOCUMENT_SLOTS,
  type ContractDocumentCategory,
  type ContractDocumentItem,
  upsertDocument,
} from '@/lib/real-estate/contractDocuments';
import { buildLegacyUnitActionUrl } from '@/lib/real-estate/legacyUnitLinks';
import type { OperationsUnitRow } from '@/lib/real-estate/operationsUnit';
import type {
  ContractWorkspaceMode,
  UnitContractFormValues,
  UnitContractWorkspace,
} from '@/lib/real-estate/unitContractWorkspace';

type Props = {
  locale: 'ar' | 'en';
  unit: OperationsUnitRow;
  mode: ContractWorkspaceMode;
  onClose: () => void;
  onSaved?: () => void;
};

type ContractResponse = {
  workspace: UnitContractWorkspace;
};

const UNIT_TYPES = ['Flat', 'Shop', 'Office', 'Studio', 'Other'] as const;

function ContractDocumentsSection({
  locale,
  building,
  unit,
  documents,
  readOnly,
  onChange,
}: {
  locale: 'ar' | 'en';
  building: string;
  unit: string;
  documents: ContractDocumentItem[];
  readOnly: boolean;
  onChange: (docs: ContractDocumentItem[]) => void;
}) {
  const ar = locale === 'ar';
  const [uploading, setUploading] = useState<ContractDocumentCategory | null>(null);

  const uploadFile = async (category: ContractDocumentCategory, file: File, titleAr: string, titleEn: string) => {
    setUploading(category);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('storeContext', 'contract');
      fd.append('storeKey', `${building}\t${unit}`);
      fd.append('fieldKey', category);
      const res = await fetch('/api/admin/legacy-bridge/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error('upload failed');
      const json = (await res.json()) as { fileId?: string; url?: string; name?: string };
      const item: ContractDocumentItem = {
        category,
        titleAr,
        titleEn,
        name: json.name || file.name,
        fileId: json.fileId,
        attachmentRelativePath: json.url,
        storedOnDisk: true,
      };
      onChange(upsertDocument(documents, item));
    } catch {
      alert(ar ? 'تعذر رفع الملف.' : 'Failed to upload file.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="mb-5 sm:col-span-2 lg:col-span-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">
        {ar ? 'مستندات العقار' : 'Property documents'}
      </h4>
      <div className="grid gap-2 sm:grid-cols-3">
        {CONTRACT_DOCUMENT_SLOTS.map((slot) => {
          const doc = documents.find((d) => d.category === slot.category);
          return (
            <div key={slot.category} className="rounded-lg border border-[var(--admin-border)] p-3">
              <div className="text-xs font-semibold mb-1">{ar ? slot.titleAr : slot.titleEn}</div>
              {doc ? (
                <p className="text-[11px] text-green-700 mb-2 truncate" title={doc.name}>
                  ✓ {doc.name}
                </p>
              ) : (
                <p className="text-[11px] opacity-50 mb-2">{ar ? 'لم يُرفع' : 'Not uploaded'}</p>
              )}
              {!readOnly ? (
                <label className="admin-btn admin-btn-secondary text-xs inline-flex cursor-pointer">
                  {uploading === slot.category
                    ? ar
                      ? 'جاري الرفع…'
                      : 'Uploading…'
                    : ar
                      ? 'رفع ملف'
                      : 'Upload file'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={uploading !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(slot.category, f, slot.titleAr, slot.titleEn);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
      {!readOnly ? (
        <p className="text-[10px] opacity-60 mt-2">
          {ar
            ? 'PDF أو صورة — تُحفظ في KV مع العقد عند الحفظ/التفعيل.'
            : 'PDF or image — saved to KV with the contract on save/activate.'}
        </p>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  dir,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: 'ltr' | 'rtl';
  readOnly?: boolean;
}) {
  return (
    <label className="re-contract-field">
      <span className="re-contract-field-label">{label}</span>
      <input
        type={type}
        className="admin-input w-full text-sm"
        value={value}
        dir={dir}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function RealEstateContractModal({ locale, unit, mode, onClose, onSaved }: Props) {
  const ar = locale === 'ar';
  const readOnly = mode === 'view';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceMeta, setWorkspaceMeta] = useState<UnitContractWorkspace | null>(null);
  const [values, setValues] = useState<UnitContractFormValues | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const qs = new URLSearchParams({ building: unit.building, unit: unit.unit, mode });
      const res = await fetch(`/api/admin/real-estate-dashboard/unit-contract?${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 409) {
        setError(
          ar
            ? 'التجديد غير متاح لهذه الوحدة (يتطلب عقداً محفوظاً وحالة مؤجرة).'
            : 'Renewal is not available for this unit (requires saved contract and rented status).'
        );
        setValues(null);
        return;
      }
      if (!res.ok) throw new Error('load failed');
      const json = (await res.json()) as ContractResponse;
      setWorkspaceMeta(json.workspace);
      setValues(json.workspace.values);
    } catch {
      setError(ar ? 'تعذر تحميل بيانات العقد.' : 'Failed to load contract data.');
      setValues(null);
    } finally {
      setLoading(false);
    }
  }, [unit.building, unit.unit, mode, ar]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const setField = <K extends keyof UnitContractFormValues>(key: K, val: UnitContractFormValues[K]) => {
    setValues((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const handleSave = async () => {
    if (!values || readOnly) return;
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/unit-contract', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building: unit.building,
          unit: unit.unit,
          mode,
          values,
          action: 'draft',
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || 'save failed');
      }
      setSaveMsg(
        mode === 'renew'
          ? ar
            ? 'تم حفظ مسودة التجديد في KV — أكمل التفعيل من النظام التشغيلي عند الحاجة.'
            : 'Renewal draft saved to KV — complete activation in the operational system if needed.'
          : ar
            ? 'تم حفظ مسودة العقد في KV.'
            : 'Contract draft saved to KV.'
      );
      onSaved?.();
      await loadWorkspace();
    } catch (e) {
      setError(
        e instanceof Error && e.message && e.message !== 'save failed'
          ? e.message
          : ar
            ? 'تعذر حفظ المسودة.'
            : 'Failed to save draft.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!values || readOnly) return;
    const confirmMsg =
      mode === 'renew'
        ? ar
          ? 'تفعيل تجديد العقد؟ سيُؤرشف العقد السابق ويُحدَّث سجل الوحدة.'
          : 'Activate contract renewal? The previous contract will be archived and the unit registry updated.'
        : ar
          ? 'تفعيل العقد؟ سيُحفظ في KV ويُحدَّث سجل الوحدة.'
          : 'Activate contract? It will be saved to KV and the unit registry will be updated.';
    if (!window.confirm(confirmMsg)) return;

    setActivating(true);
    setSaveMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/unit-contract', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building: unit.building,
          unit: unit.unit,
          mode,
          values,
          action: 'activate',
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        lifecycleStatus?: string;
        accountingSynced?: { cheques: number; deposits: number; entries?: number };
      };
      if (!res.ok) {
        throw new Error(json.error || 'activate failed');
      }
      const acct = json.accountingSynced;
      const acctNote =
        acct && (acct.cheques > 0 || acct.deposits > 0 || (acct.entries ?? 0) > 0)
          ? ar
            ? ` | محاسبة: ${acct.cheques} شيك، ${acct.deposits} ضمان${(acct.entries ?? 0) > 0 ? `، ${acct.entries} بند` : ''}`
            : ` | Accounting: ${acct.cheques} cheque(s), ${acct.deposits} deposit(s)${(acct.entries ?? 0) > 0 ? `, ${acct.entries} entry/entries` : ''}`
          : '';
      setSaveMsg(
        ar
          ? `تم تفعيل العقد — الحالة: ${json.lifecycleStatus || 'active'}${acctNote}`
          : `Contract activated — status: ${json.lifecycleStatus || 'active'}${acctNote}`
      );
      onSaved?.();
      await loadWorkspace();
    } catch (e) {
      setError(
        e instanceof Error && e.message && e.message !== 'activate failed'
          ? e.message
          : ar
            ? 'تعذر تفعيل العقد.'
            : 'Failed to activate contract.'
      );
    } finally {
      setActivating(false);
    }
  };

  const handlePrint = () => {
    if (!values) return;
    openContractSummaryPrintWindow(unit, values, locale);
  };

  const handlePrintOfficial = () => {
    if (!values) return;
    openContractOfficialPrintWindow(unit, values, locale);
  };

  const handlePrintMunicipal = () => {
    if (!values) return;
    openMunicipalFormPrintWindow(unit, values, locale);
  };

  const title =
    mode === 'renew'
      ? ar
        ? 'تجديد العقد'
        : 'Renew contract'
      : mode === 'view'
        ? ar
          ? 'عرض العقد'
          : 'View contract'
        : ar
          ? 'تعبئة العقد'
          : 'Fill contract';

  const legacyAction = mode === 'renew' ? 'renew' : mode === 'view' ? 'print' : 'fill';

  return (
    <div
      className="re-contract-overlay fixed inset-0 z-[210] flex items-center justify-center p-2 sm:p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="re-contract-card admin-card w-full overflow-auto"
        style={{ width: 'min(1280px, 98vw)', maxHeight: '96vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
          <div>
            <h3 className="text-base font-bold">
              {title}{' '}
              <span dir="ltr">
                {unit.unit} | {unit.building}
              </span>
            </h3>
            {workspaceMeta ? (
              <p className="text-xs opacity-60 mt-1">
                {[
                  workspaceMeta.hasSavedContract ? (ar ? 'عقد محفوظ' : 'Saved contract') : null,
                  workspaceMeta.hasTenancyDraft ? (ar ? 'مسودة تعبئة' : 'Fill draft') : null,
                  workspaceMeta.hasRenewalDraft ? (ar ? 'مسودة تجديد' : 'Renewal draft') : null,
                  workspaceMeta.lifecycleStatus || null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
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
          {loading ? (
            <p className="text-sm opacity-60 text-center py-8">
              {ar ? 'جاري التحميل…' : 'Loading…'}
            </p>
          ) : error && !values ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : values ? (
            <>
              {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
              {saveMsg ? <p className="text-sm text-green-700 mb-3">{saveMsg}</p> : null}

              <div className="re-contract-form-grid mb-6">
                <FormField
                  label={ar ? 'رقم العقد' : 'Agreement no.'}
                  value={values.agreementNo}
                  onChange={(v) => setField('agreementNo', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <label className="re-contract-field">
                  <span className="re-contract-field-label">{ar ? 'نوع العقد' : 'Contract type'}</span>
                  <select
                    className="admin-input w-full text-sm"
                    value={values.contractType}
                    disabled={readOnly}
                    onChange={(e) =>
                      setField('contractType', e.target.value as 'residential' | 'commercial')
                    }
                  >
                    <option value="residential">{ar ? 'سكني' : 'Residential'}</option>
                    <option value="commercial">{ar ? 'تجاري' : 'Commercial'}</option>
                  </select>
                </label>
                <FormField
                  label={ar ? 'اسم المستأجر (عربي)' : 'Tenant (Arabic)'}
                  value={values.tenantNameAr}
                  onChange={(v) => setField('tenantNameAr', v)}
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'اسم المستأجر (EN)' : 'Tenant (English)'}
                  value={values.tenantNameEn}
                  onChange={(v) => setField('tenantNameEn', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'الرقم المدني' : 'Civil ID'}
                  value={values.civilCard}
                  onChange={(v) => setField('civilCard', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'الجوال' : 'Mobile'}
                  value={values.tenantMobile}
                  onChange={(v) => setField('tenantMobile', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'المبنى' : 'Building'}
                  value={values.buildingNo}
                  onChange={(v) => setField('buildingNo', v)}
                  readOnly
                />
                <FormField
                  label={ar ? 'الوحدة' : 'Unit'}
                  value={values.flatNo}
                  onChange={(v) => setField('flatNo', v)}
                  dir="ltr"
                  readOnly
                />
                <FormField
                  label={ar ? 'الطابق' : 'Floor'}
                  value={values.floorDetails}
                  onChange={(v) => setField('floorDetails', v)}
                  readOnly={readOnly}
                />
                <label className="re-contract-field">
                  <span className="re-contract-field-label">{ar ? 'نوع الوحدة' : 'Unit type'}</span>
                  <select
                    className="admin-input w-full text-sm"
                    value={values.unitType}
                    disabled={readOnly}
                    onChange={(e) => setField('unitType', e.target.value)}
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <FormField
                  label={ar ? 'تاريخ البداية' : 'Start date'}
                  value={values.startDate}
                  onChange={(v) => setField('startDate', v)}
                  type="date"
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'تاريخ النهاية' : 'End date'}
                  value={values.endDate}
                  onChange={(v) => setField('endDate', v)}
                  type="date"
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'المدة (أشهر)' : 'Duration (months)'}
                  value={values.contractMonths}
                  onChange={(v) => setField('contractMonths', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'الإيجار الشهري (ر.ع.)' : 'Monthly rent (OMR)'}
                  value={values.monthlyRent}
                  onChange={(v) => setField('monthlyRent', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'عداد الكهرباء' : 'Electricity meter'}
                  value={values.electricityMeter}
                  onChange={(v) => setField('electricityMeter', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'عداد الماء' : 'Water meter'}
                  value={values.waterMeter}
                  onChange={(v) => setField('waterMeter', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'مبلغ الضمان (ر.ع.)' : 'Deposit (OMR)'}
                  value={values.depositAmount}
                  onChange={(v) => setField('depositAmount', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <label className="re-contract-field">
                  <span className="re-contract-field-label">{ar ? 'طريقة الدفع' : 'Payment method'}</span>
                  <select
                    className="admin-input w-full text-sm"
                    value={values.paymentMethod}
                    disabled={readOnly}
                    onChange={(e) =>
                      setField(
                        'paymentMethod',
                        e.target.value as UnitContractFormValues['paymentMethod']
                      )
                    }
                  >
                    <option value="">{ar ? '—' : '—'}</option>
                    <option value="cheque">{ar ? 'شيك' : 'Cheque'}</option>
                    <option value="cash">{ar ? 'نقداً' : 'Cash'}</option>
                    <option value="transfer">{ar ? 'تحويل بنكي' : 'Bank transfer'}</option>
                  </select>
                </label>
                <label className="re-contract-field">
                  <span className="re-contract-field-label">
                    {ar ? 'خاضع لضريبة القيمة المضافة' : 'Subject to VAT'}
                  </span>
                  <select
                    className="admin-input w-full text-sm"
                    value={values.contractSubjectToVat}
                    disabled={readOnly}
                    onChange={(e) =>
                      setField('contractSubjectToVat', e.target.value as 'yes' | 'no')
                    }
                  >
                    <option value="no">{ar ? 'لا' : 'No'}</option>
                    <option value="yes">{ar ? 'نعم' : 'Yes'}</option>
                  </select>
                </label>
                {values.contractSubjectToVat === 'yes' ? (
                  <>
                    <label className="re-contract-field">
                      <span className="re-contract-field-label">
                        {ar ? 'طريقة دفع الضريبة' : 'VAT payment mode'}
                      </span>
                      <select
                        className="admin-input w-full text-sm"
                        value={values.vatPaymentMode}
                        disabled={readOnly}
                        onChange={(e) =>
                          setField(
                            'vatPaymentMode',
                            e.target.value as UnitContractFormValues['vatPaymentMode']
                          )
                        }
                      >
                        <option value="">{ar ? '—' : '—'}</option>
                        <option value="included">{ar ? 'ضمن الإيجار' : 'Included in rent'}</option>
                        <option value="separate">
                          {ar ? 'شيكات ضريبة منفصلة' : 'Separate VAT cheques'}
                        </option>
                      </select>
                    </label>
                    {values.vatPaymentMode === 'separate' ? (
                      <FormField
                        label={ar ? 'عدد شيكات الضريبة' : 'VAT cheque count'}
                        value={values.vatChequeCount}
                        onChange={(v) => setField('vatChequeCount', v)}
                        dir="ltr"
                        readOnly={readOnly}
                      />
                    ) : null}
                  </>
                ) : null}
                <FormField
                  label={ar ? 'استمارة بلدية' : 'Municipal form'}
                  value={values.municipalFormNo}
                  onChange={(v) => setField('municipalFormNo', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
                <FormField
                  label={ar ? 'عقد بلدي' : 'Municipal contract'}
                  value={values.municipalContractNo}
                  onChange={(v) => setField('municipalContractNo', v)}
                  dir="ltr"
                  readOnly={readOnly}
                />
              </div>

              <ContractDocumentsSection
                locale={locale}
                building={unit.building}
                unit={unit.unit}
                documents={values.documents || []}
                readOnly={readOnly}
                onChange={(docs) => setField('documents', docs)}
              />

              <div className="re-contract-form-grid mb-4">
                <label className="re-contract-field sm:col-span-2 lg:col-span-3">
                  <span className="re-contract-field-label">{ar ? 'ملاحظات' : 'Notes'}</span>
                  <textarea
                    className="admin-input w-full text-sm min-h-[72px]"
                    value={values.remarks}
                    readOnly={readOnly}
                    onChange={(e) => setField('remarks', e.target.value)}
                  />
                </label>
              </div>

              <p className="text-xs opacity-60 mb-2">
                {ar
                  ? 'حفظ المسودة يكتب في KV. «تفعيل العقد» يحفظ العقد ويحدّث المحاسبة (إيجار + ضريبة + ضمان). «طباعة رسمية» تستخدم نموذج A4 الموحّد.'
                  : 'Save draft writes to KV. «Activate contract» saves the contract and syncs accounting (rent + VAT + deposit). «Official print» uses the unified A4 template.'}
              </p>
            </>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || activating || loading || !values}
                className="admin-btn admin-btn-secondary text-sm"
              >
                {saving ? (ar ? 'جاري الحفظ…' : 'Saving…') : ar ? 'حفظ المسودة' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={() => void handleActivate()}
                disabled={saving || activating || loading || !values}
                className="admin-btn admin-btn-primary text-sm"
              >
                {activating
                  ? ar
                    ? 'جاري التفعيل…'
                    : 'Activating…'
                  : mode === 'renew'
                    ? ar
                      ? 'تفعيل التجديد'
                      : 'Activate renewal'
                    : ar
                      ? 'تفعيل العقد'
                      : 'Activate contract'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={handlePrintMunicipal}
            disabled={loading || !values}
            className="admin-btn admin-btn-secondary text-sm inline-flex items-center gap-1"
          >
            <Icon name="printer" className="w-4 h-4" aria-hidden />
            {ar ? 'استمارة بلدية' : 'Municipal form'}
          </button>
          <button
            type="button"
            onClick={handlePrintOfficial}
            disabled={loading || !values}
            className="admin-btn admin-btn-secondary text-sm inline-flex items-center gap-1"
          >
            <Icon name="printer" className="w-4 h-4" aria-hidden />
            {ar ? 'طباعة رسمية' : 'Official print'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !values}
            className="admin-btn admin-btn-ghost text-sm inline-flex items-center gap-1"
          >
            <Icon name="printer" className="w-4 h-4" aria-hidden />
            {ar ? 'ملخص' : 'Summary'}
          </button>
          <a
            href={buildLegacyUnitActionUrl(unit.building, unit.unit, legacyAction, locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-ghost text-sm"
          >
            {ar ? 'النظام الكامل (متقدم)' : 'Full system (advanced)'}
          </a>
          <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost text-sm ms-auto">
            {ar ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
