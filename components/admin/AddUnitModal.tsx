'use client';

import { useState } from 'react';
import { addPropertyUnit } from '@/lib/data/properties';

export type UnitType = 'shop' | 'showroom' | 'apartment';

export interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (unitKey: string) => void;
  propertyId: number;
  locale?: string;
}

export default function AddUnitModal({
  open,
  onClose,
  onAdded,
  propertyId,
  locale = 'ar',
}: AddUnitModalProps) {
  const ar = locale === 'ar';
  const [unitType, setUnitType] = useState<UnitType>('apartment');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [livingRooms, setLivingRooms] = useState('0');
  const [majlis, setMajlis] = useState('0');
  const [parkingSpaces, setParkingSpaces] = useState('0');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const priceNum = parseFloat(price);
    const areaNum = parseFloat(area);
    if (isNaN(priceNum) || priceNum < 0) {
      setError(ar ? 'أدخل مبلغ إيجار صحيح' : 'Enter valid rent amount');
      return;
    }
    if (isNaN(areaNum) || areaNum <= 0) {
      setError(ar ? 'أدخل مساحة صحيحة' : 'Enter valid area');
      return;
    }
    try {
      const unitData: Record<string, number | string | undefined> = {
        price: priceNum,
        area: areaNum,
        unitNumber: unitNumber.trim() || undefined,
      };
      if (unitType === 'apartment') {
        unitData.bedrooms = parseInt(bedrooms, 10) || 0;
        unitData.bathrooms = parseInt(bathrooms, 10) || 0;
        unitData.livingRooms = parseInt(livingRooms, 10) || 0;
        unitData.majlis = parseInt(majlis, 10) || 0;
        unitData.parkingSpaces = parseInt(parkingSpaces, 10) || 0;
      }
      const unitKey = addPropertyUnit(propertyId, unitType, unitData as { price: number; area: number; unitNumber?: string; bedrooms?: number; bathrooms?: number; livingRooms?: number; majlis?: number; parkingSpaces?: number });
      onAdded(unitKey);
      onClose();
      setPrice('');
      setArea('');
      setUnitNumber('');
      setBedrooms('0');
      setBathrooms('0');
      setLivingRooms('0');
      setMajlis('0');
      setParkingSpaces('0');
    } catch (err) {
      setError(ar ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{ar ? 'إضافة وحدة جديدة' : 'Add New Unit'}</h3>
          <p className="text-sm text-gray-500 mt-1">{ar ? 'أضف وحدة للعقار المحدد' : 'Add a unit to the selected property'}</p>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'نوع الوحدة' : 'Unit Type'}</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as UnitType)}
              className="admin-select w-full"
            >
              <option value="shop">{ar ? 'محل' : 'Shop'}</option>
              <option value="showroom">{ar ? 'معرض' : 'Showroom'}</option>
              <option value="apartment">{ar ? 'شقة' : 'Apartment'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'رقم الوحدة' : 'Unit Number'}</label>
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="admin-input w-full"
              placeholder={ar ? 'اختياري' : 'Optional'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الإيجار (ر.ع) *' : 'Rent (OMR) *'}</label>
              <input
                type="number"
                required
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المساحة (م²) *' : 'Area (m²) *'}</label>
              <input
                type="number"
                required
                min={0}
                step={0.01}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="admin-input w-full"
              />
            </div>
          </div>
          {unitType === 'apartment' && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'غرف النوم' : 'Bedrooms'}</label>
                <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'دورات المياه' : 'Bathrooms'}</label>
                <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'الصالات' : 'Living Rooms'}</label>
                <input type="number" min={0} value={livingRooms} onChange={(e) => setLivingRooms(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'المجلس' : 'Majlis'}</label>
                <input type="number" min={0} value={majlis} onChange={(e) => setMajlis(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'مواقف السيارات' : 'Parking'}</label>
                <input type="number" min={0} value={parkingSpaces} onChange={(e) => setParkingSpaces(e.target.value)} className="admin-input w-full" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
              {ar ? 'إضافة' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
