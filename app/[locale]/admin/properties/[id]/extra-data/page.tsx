'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';
import { getPropertyById, type Property } from '@/lib/data/properties';
import PropertyExtraDataForm from '@/components/admin/PropertyExtraDataForm';

export default function PropertyExtraDataPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const id = params?.id as string;

  const [property, setProperty] = useState<ReturnType<typeof getPropertyById>>(undefined);

  useEffect(() => {
    const prop = getPropertyById(id);
    setProperty(prop);
  }, [id]);

  const ar = locale === 'ar';

  if (!property) {
    return (
      <div className="admin-card">
        <div className="admin-card-body text-center py-16">
          <p className="text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const prop = property as Property & { serialNumber?: string; propertyTypeAr?: string; propertySubTypeAr?: string };
  const isMultiUnit = prop.propertyTypeAr === 'مبنى' && prop.propertySubTypeAr === 'متعدد الوحدات';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href={`/${locale}/admin/properties`} className="hover:text-[#8B6F47] transition-colors">
            {ar ? 'العقارات' : 'Properties'}
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/${locale}/admin/properties/${id}`} className="hover:text-[#8B6F47] transition-colors truncate max-w-[200px]">
            {(prop as { serialNumber?: string }).serialNumber}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-[#8B6F47] font-medium">{ar ? 'البيانات الإضافية' : 'Additional Data'}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title">{ar ? 'البيانات الإضافية للمبنى' : 'Additional Building Data'}</h1>
            <p className="admin-page-subtitle">
              {(prop as { serialNumber?: string }).serialNumber} — {ar ? prop.titleAr : prop.titleEn}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/${locale}/admin/properties/${id}`}
              className="admin-btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="pencil" className="w-4 h-4" />
              {ar ? 'تعديل العقار' : 'Edit Property'}
            </Link>
            <Link href={`/${locale}/admin/properties`} className="admin-btn-secondary">
              {ar ? 'العودة' : 'Back'}
            </Link>
          </div>
        </div>
      </div>

      {isMultiUnit && (
        <div className="admin-card border-[#8B6F47]/30 bg-[#8B6F47]/5">
          <div className="admin-card-body flex items-start gap-3">
            <Icon name="information" className="w-6 h-6 text-[#8B6F47] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {ar ? 'مبنى متعدد الوحدات' : 'Multi-Unit Building'}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {ar
                  ? 'بيانات العقار الأساسية للوحدات هي بيانات المبنى الأصلية. البيانات الإضافية هنا تُطبَّق على كل الوحدات. كل وحدة لها فقط رقم الوحدة — وباقي البيانات (المالك، العدادات، الحارس، إلخ) ترث من العقار الأم.'
                  : 'Unit core data is the building\'s original data. This additional data applies to all units. Each unit only has its unit number — all other data (landlord, meters, guard, etc.) is inherited from the parent property.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card border-amber-200 bg-amber-50/50">
        <div className="admin-card-body flex items-start gap-3">
          <Icon name="information" className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">
              {ar ? 'جميع الحقول إلزامية' : 'All fields are required'}
            </h3>
            <p className="text-sm text-amber-800">
              {ar
                ? 'يجب إكمال جميع البيانات الإضافية للمبنى قبل إنشاء عقد الإيجار بعد اعتماد المستندات.'
                : 'All additional building data must be completed before creating a rental contract after document approval.'}
            </p>
          </div>
        </div>
      </div>

      <PropertyExtraDataForm propertyId={id} locale={locale} embedded={false} />
    </div>
  );
}
