'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getContractById,
  updateContract,
  approveContractByAdmin,
  approveContractByTenant,
  approveContractByLandlord,
  type RentalContract,
  type CheckInfo,
} from '@/lib/data/contracts';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  ADMIN_APPROVED: { ar: 'اعتمدته الإدارة', en: 'Admin Approved' },
  TENANT_APPROVED: { ar: 'اعتمده المستأجر', en: 'Tenant Approved' },
  LANDLORD_APPROVED: { ar: 'اعتمده المالك', en: 'Landlord Approved' },
  APPROVED: { ar: 'معتمد - نافذ', en: 'Approved - Active' },
};

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [contract, setContract] = useState<RentalContract | null>(null);
  const [form, setForm] = useState<Partial<RentalContract>>({});
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const c = getContractById(id);
    setContract(c ?? null);
    if (c) setForm({ ...c });
  }, [id]);

  const loadContract = () => {
    const c = getContractById(id);
    setContract(c ?? null);
    if (c) setForm({ ...c });
  };

  const handleSave = () => {
    if (!contract) return;
    updateContract(id, {
      tenantName: form.tenantName,
      tenantEmail: form.tenantEmail,
      tenantPhone: form.tenantPhone,
      tenantIdNumber: form.tenantIdNumber,
      tenantCivilId: form.tenantCivilId,
      landlordName: form.landlordName,
      landlordEmail: form.landlordEmail,
      landlordPhone: form.landlordPhone,
      monthlyRent: form.monthlyRent ?? 0,
      annualRent: (form.monthlyRent ?? 0) * 12,
      depositAmount: form.depositAmount ?? 0,
      checks: form.checks ?? [],
      guarantees: form.guarantees,
      startDate: form.startDate ?? '',
      endDate: form.endDate ?? '',
      durationMonths: form.durationMonths ?? 12,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadContract();
  };

  const addCheck = () => {
    const checks = [...(form.checks ?? []), { amount: 0, dueDate: new Date().toISOString().slice(0, 10) }];
    setForm({ ...form, checks });
  };

  const updateCheck = (idx: number, updates: Partial<CheckInfo>) => {
    const checks = [...(form.checks ?? [])];
    checks[idx] = { ...checks[idx], ...updates };
    setForm({ ...form, checks });
  };

  const removeCheck = (idx: number) => {
    const checks = (form.checks ?? []).filter((_, i) => i !== idx);
    setForm({ ...form, checks });
  };

  const handleApproveAdmin = () => {
    approveContractByAdmin(id);
    loadContract();
  };

  const handleApproveTenant = () => {
    approveContractByTenant(id);
    loadContract();
  };

  const handleApproveLandlord = () => {
    approveContractByLandlord(id);
    loadContract();
  };

  if (!contract) {
    return (
      <div className="space-y-8">
        <AdminPageHeader title={ar ? 'عقد الإيجار' : 'Rental Contract'} subtitle="" />
        <div className="admin-card p-16 text-center">
          <p className="text-gray-500">{ar ? 'العقد غير موجود' : 'Contract not found'}</p>
          <Link href={`/${locale}/admin/contracts`} className="text-[#8B6F47] hover:underline mt-2 inline-block">
            {ar ? 'العودة للعقود' : 'Back to contracts'}
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = contract.status === 'DRAFT';
  const isApproved = contract.status === 'APPROVED';

  return (
    <div className="space-y-8">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <Link
          href={`/${locale}/admin/contracts`}
          className="inline-flex items-center gap-2 text-[#8B6F47] hover:text-[#6B5535] font-semibold mb-4"
        >
          <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center">←</span>
          {ar ? 'العودة لعقود الإيجار' : 'Back to contracts'}
        </Link>
        <AdminPageHeader
          title={ar ? 'عقد الإيجار' : 'Rental Contract'}
          subtitle={`${ar ? contract.propertyTitleAr : contract.propertyTitleEn} ${contract.unitKey ? `- ${contract.unitKey}` : ''}`}
        />
      </div>

      {/* حالة العقد والاعتمادات */}
      <div className="admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className={`admin-badge ${isApproved ? 'admin-badge-success' : isDraft ? 'admin-badge-warning' : 'admin-badge-info'}`}>
              {ar ? STATUS_LABELS[contract.status]?.ar : STATUS_LABELS[contract.status]?.en}
            </span>
            <span className="text-sm text-gray-500 mr-3 font-mono">{contract.id}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {contract.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handleApproveAdmin}
                className="px-4 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                {ar ? 'اعتماد من الإدارة' : 'Admin Approve'}
              </button>
            )}
            {contract.status === 'ADMIN_APPROVED' && (
              <>
                <button type="button" onClick={handleApproveTenant} className="px-4 py-2 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100">
                  {ar ? 'اعتماد المستأجر' : 'Tenant Approve'}
                </button>
                <button type="button" onClick={handleApproveLandlord} className="px-4 py-2 rounded-xl font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100">
                  {ar ? 'اعتماد المالك' : 'Landlord Approve'}
                </button>
              </>
            )}
            {(contract.status === 'TENANT_APPROVED' || contract.status === 'LANDLORD_APPROVED') && (
              <>
                {contract.status === 'TENANT_APPROVED' && (
                  <button type="button" onClick={handleApproveLandlord} className="px-4 py-2 rounded-xl font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100">
                    {ar ? 'اعتماد المالك' : 'Landlord Approve'}
                  </button>
                )}
                {contract.status === 'LANDLORD_APPROVED' && (
                  <button type="button" onClick={handleApproveTenant} className="px-4 py-2 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100">
                    {ar ? 'اعتماد المستأجر' : 'Tenant Approve'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {!isDraft && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            {contract.adminApprovedAt && <span>{ar ? 'الإدارة:' : 'Admin:'} {new Date(contract.adminApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
            {contract.tenantApprovedAt && <span>{ar ? 'المستأجر:' : 'Tenant:'} {new Date(contract.tenantApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
            {contract.landlordApprovedAt && <span>{ar ? 'المالك:' : 'Landlord:'} {new Date(contract.landlordApprovedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB')}</span>}
          </div>
        )}
      </div>

      {/* نموذج بيانات العقد */}
      <div className="admin-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#8B6F47]/5 to-transparent">
          <h2 className="text-lg font-bold text-gray-900">{ar ? 'بيانات العقد' : 'Contract Data'}</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* المستأجر */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{ar ? 'المستأجر' : 'Tenant'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="admin-input-label">{ar ? 'الاسم' : 'Name'}</label>
                <input
                  type="text"
                  value={form.tenantName ?? ''}
                  onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'البريد' : 'Email'}</label>
                <input
                  type="email"
                  value={form.tenantEmail ?? ''}
                  onChange={(e) => setForm({ ...form, tenantEmail: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الهاتف' : 'Phone'}</label>
                <input
                  type="tel"
                  value={form.tenantPhone ?? ''}
                  onChange={(e) => setForm({ ...form, tenantPhone: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'رقم الهوية' : 'ID Number'}</label>
                <input
                  type="text"
                  value={form.tenantIdNumber ?? ''}
                  onChange={(e) => setForm({ ...form, tenantIdNumber: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الرقم المدني' : 'Civil ID'}</label>
                <input
                  type="text"
                  value={form.tenantCivilId ?? ''}
                  onChange={(e) => setForm({ ...form, tenantCivilId: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
            </div>
          </div>

          {/* المالك */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{ar ? 'المالك' : 'Landlord'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="admin-input-label">{ar ? 'الاسم' : 'Name'}</label>
                <input
                  type="text"
                  value={form.landlordName ?? ''}
                  onChange={(e) => setForm({ ...form, landlordName: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'البريد' : 'Email'}</label>
                <input
                  type="email"
                  value={form.landlordEmail ?? ''}
                  onChange={(e) => setForm({ ...form, landlordEmail: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الهاتف' : 'Phone'}</label>
                <input
                  type="tel"
                  value={form.landlordPhone ?? ''}
                  onChange={(e) => setForm({ ...form, landlordPhone: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
            </div>
          </div>

          {/* مالية العقد */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{ar ? 'المالية' : 'Financial'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="admin-input-label">{ar ? 'الإيجار الشهري (ر.ع)' : 'Monthly Rent (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.monthlyRent ?? ''}
                  onChange={(e) => setForm({ ...form, monthlyRent: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الإيجار السنوي (ر.ع)' : 'Annual Rent (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  value={((form.monthlyRent ?? 0) * 12).toFixed(2)}
                  readOnly
                  className="admin-input w-full bg-gray-50"
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'الضمان (ر.ع)' : 'Deposit (OMR)'}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.depositAmount ?? ''}
                  onChange={(e) => setForm({ ...form, depositAmount: parseFloat(e.target.value) || 0 })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'مدة العقد (شهر)' : 'Duration (months)'}</label>
                <input
                  type="number"
                  min={1}
                  value={form.durationMonths ?? ''}
                  onChange={(e) => setForm({ ...form, durationMonths: parseInt(e.target.value, 10) || 12 })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
            </div>
          </div>

          {/* التواريخ */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">{ar ? 'التواريخ' : 'Dates'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="admin-input-label">{ar ? 'تاريخ البداية' : 'Start Date'}</label>
                <input
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
              <div>
                <label className="admin-input-label">{ar ? 'تاريخ النهاية' : 'End Date'}</label>
                <input
                  type="date"
                  value={form.endDate ?? ''}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="admin-input w-full"
                  readOnly={!isDraft}
                />
              </div>
            </div>
          </div>

          {/* الشيكات */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase">{ar ? 'الشيكات' : 'Checks'}</h3>
              {isDraft && (
                <button type="button" onClick={addCheck} className="text-sm font-semibold text-[#8B6F47] hover:underline">
                  + {ar ? 'إضافة شيك' : 'Add check'}
                </button>
              )}
            </div>
            {(form.checks ?? []).length === 0 ? (
              <p className="text-gray-500 text-sm">{ar ? 'لا توجد شيكات' : 'No checks'}</p>
            ) : (
              <div className="space-y-2">
                {(form.checks ?? []).map((ch, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 rounded-xl">
                    <input
                      type="text"
                      placeholder={ar ? 'رقم الشيك' : 'Check #'}
                      value={ch.checkNumber ?? ''}
                      onChange={(e) => updateCheck(i, { checkNumber: e.target.value })}
                      className="admin-input flex-1 min-w-[100px]"
                      readOnly={!isDraft}
                    />
                    <input
                      type="number"
                      placeholder={ar ? 'المبلغ' : 'Amount'}
                      value={ch.amount || ''}
                      onChange={(e) => updateCheck(i, { amount: parseFloat(e.target.value) || 0 })}
                      className="admin-input w-24"
                      readOnly={!isDraft}
                    />
                    <input
                      type="date"
                      value={ch.dueDate ?? ''}
                      onChange={(e) => updateCheck(i, { dueDate: e.target.value })}
                      className="admin-input w-36"
                      readOnly={!isDraft}
                    />
                    <input
                      type="text"
                      placeholder={ar ? 'البنك' : 'Bank'}
                      value={ch.bankName ?? ''}
                      onChange={(e) => updateCheck(i, { bankName: e.target.value })}
                      className="admin-input flex-1 min-w-[100px]"
                      readOnly={!isDraft}
                    />
                    {isDraft && (
                      <button type="button" onClick={() => removeCheck(i)} className="text-red-600 hover:underline text-sm">
                        {ar ? 'حذف' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* الضمانات */}
          <div>
            <label className="admin-input-label">{ar ? 'الضمانات' : 'Guarantees'}</label>
            <textarea
              value={form.guarantees ?? ''}
              onChange={(e) => setForm({ ...form, guarantees: e.target.value })}
              className="admin-input w-full resize-none"
              rows={3}
              readOnly={!isDraft}
            />
          </div>

          {isDraft && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 rounded-xl font-bold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
              >
                {ar ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
              {saved && <span className="text-emerald-600 font-semibold">{ar ? 'تم الحفظ' : 'Saved'}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
