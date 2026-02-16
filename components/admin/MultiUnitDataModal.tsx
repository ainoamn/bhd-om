'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/icons/Icon';
import ImagePicker from './ImagePicker';

type ShopUnit = { unitNumber: string; price: string; area: string; images: string[] };
type ApartmentUnit = { unitNumber: string; price: string; area: string; bedrooms: string; bathrooms: string; livingRooms: string; majlis: string; parkingSpaces: string; images: string[] };

interface MultiUnitDataModalProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  shops: ShopUnit[];
  showrooms: ShopUnit[];
  apartments: ApartmentUnit[];
  highlightedUnitIds?: Set<string>;
  onSave: (shops: ShopUnit[], showrooms: ShopUnit[], apartments: ApartmentUnit[]) => void;
}

function formatIncompleteList(items: string[], ar: boolean): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return ar ? `${items[0]} و ${items[1]}` : `${items[0]} and ${items[1]}`;
  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  return ar ? `${rest.join('، ')} و ${last}` : `${rest.join(', ')} and ${last}`;
}

export default function MultiUnitDataModal({
  open,
  onClose,
  locale,
  shops,
  showrooms,
  apartments,
  highlightedUnitIds,
  onSave,
}: MultiUnitDataModalProps) {
  const [activeTab, setActiveTab] = useState<'shops' | 'showrooms' | 'apartments'>('shops');
  const [localShops, setLocalShops] = useState<ShopUnit[]>([]);
  const [localShowrooms, setLocalShowrooms] = useState<ShopUnit[]>([]);
  const [localApartments, setLocalApartments] = useState<ApartmentUnit[]>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [imageModal, setImageModal] = useState<{ type: 'shop' | 'showroom' | 'apartment'; index: number } | null>(null);

  const ar = locale === 'ar';

  const isUnitValid = (type: 'shop' | 'showroom' | 'apartment', index: number): boolean => {
    if (type === 'shop') {
      const u = localShops[index];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0);
    }
    if (type === 'showroom') {
      const u = localShowrooms[index];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0);
    }
    if (type === 'apartment') {
      const u = localApartments[index];
      return !!(u && u.price?.trim() && Number(u.price) > 0 && u.area?.trim() && Number(u.area) > 0 &&
        u.bedrooms?.trim() !== '' && u.bathrooms?.trim() !== '' && u.livingRooms?.trim() !== '' &&
        u.majlis?.trim() !== '' && u.parkingSpaces?.trim() !== '');
    }
    return false;
  };

  const unitRowHighlight = (type: 'shop' | 'showroom' | 'apartment', index: number) => {
    const id = `${type}-${index}`;
    if (!highlightedUnitIds?.has(id)) return '';
    return isUnitValid(type, index) ? 'ring-2 ring-green-500 border-green-500 bg-green-50' : 'ring-2 ring-red-500 border-red-500 bg-red-50';
  };

  useEffect(() => {
    if (open) {
      setLocalShops(shops.map((s) => ({ ...s, images: s.images ?? [], unitNumber: s.unitNumber ?? '' })));
      setLocalShowrooms(showrooms.map((s) => ({ ...s, images: s.images ?? [], unitNumber: s.unitNumber ?? '' })));
      setLocalApartments(apartments.map((a) => ({ ...a, images: a.images ?? [], unitNumber: a.unitNumber ?? '' })));
      setActiveTab(shops.length ? 'shops' : showrooms.length ? 'showrooms' : 'apartments');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && (localShops.length > 0 || localShowrooms.length > 0 || localApartments.length > 0)) {
      onSave(localShops, localShowrooms, localApartments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localShops, localShowrooms, localApartments]);

  const applyShopSequence = (firstNum: number) => {
    const arr = localShops.map((u, i) => ({ ...u, unitNumber: i === 0 ? String(firstNum) : String(firstNum + i) }));
    setLocalShops(arr);
  };
  const applyShowroomSequence = (firstNum: number) => {
    const arr = localShowrooms.map((u, i) => ({ ...u, unitNumber: i === 0 ? String(firstNum) : String(firstNum + i) }));
    setLocalShowrooms(arr);
  };
  const applyApartmentSequence = (firstNum: number) => {
    const arr = localApartments.map((u, i) => ({ ...u, unitNumber: i === 0 ? String(firstNum) : String(firstNum + i) }));
    setLocalApartments(arr);
  };

  const validateAll = (): string[] => {
    const missing: string[] = [];
    const shopLabel = ar ? 'محل' : 'Shop';
    const showroomLabel = ar ? 'معرض' : 'Showroom';
    const aptLabel = ar ? 'شقة' : 'Apartment';

    localShops.forEach((u, i) => {
      if (!u.price?.trim() || Number(u.price) <= 0 || !u.area?.trim() || Number(u.area) <= 0) {
        missing.push(`${shopLabel} ${i + 1}`);
      }
    });
    localShowrooms.forEach((u, i) => {
      if (!u.price?.trim() || Number(u.price) <= 0 || !u.area?.trim() || Number(u.area) <= 0) {
        missing.push(`${showroomLabel} ${i + 1}`);
      }
    });
    localApartments.forEach((u, i) => {
      if (
        !u.price?.trim() || Number(u.price) <= 0 ||
        !u.area?.trim() || Number(u.area) <= 0 ||
        u.bedrooms?.trim() === '' || u.bathrooms?.trim() === '' ||
        u.livingRooms?.trim() === '' || u.majlis?.trim() === '' || u.parkingSpaces?.trim() === ''
      ) {
        missing.push(`${aptLabel} ${i + 1}`);
      }
    });
    return missing;
  };

  const handleSave = () => {
    const missing = validateAll();
    if (missing.length > 0) {
      setMissingItems(missing);
      setShowMissingModal(true);
      return;
    }
    onSave(localShops, localShowrooms, localApartments);
    onClose();
  };

  const copyShopFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localShops[index - 1];
    const prevNum = parseInt(prev.unitNumber || '0', 10) || 0;
    const arr = [...localShops];
    arr[index] = { ...prev, images: [...(prev.images ?? [])], unitNumber: String(prevNum + 1) };
    setLocalShops(arr);
  };

  const copyShowroomFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localShowrooms[index - 1];
    const prevNum = parseInt(prev.unitNumber || '0', 10) || 0;
    const arr = [...localShowrooms];
    arr[index] = { ...prev, images: [...(prev.images ?? [])], unitNumber: String(prevNum + 1) };
    setLocalShowrooms(arr);
  };

  const copyApartmentFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localApartments[index - 1];
    const prevNum = parseInt(prev.unitNumber || '0', 10) || 0;
    const arr = [...localApartments];
    arr[index] = { ...prev, images: [...(prev.images ?? [])], unitNumber: String(prevNum + 1) };
    setLocalApartments(arr);
  };

  const copyShopImagesFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localShops[index - 1];
    const arr = [...localShops];
    arr[index] = { ...arr[index], images: [...(prev.images ?? [])] };
    setLocalShops(arr);
  };

  const copyShowroomImagesFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localShowrooms[index - 1];
    const arr = [...localShowrooms];
    arr[index] = { ...arr[index], images: [...(prev.images ?? [])] };
    setLocalShowrooms(arr);
  };

  const copyApartmentImagesFromPrev = (index: number) => {
    if (index <= 0) return;
    const prev = localApartments[index - 1];
    const arr = [...localApartments];
    arr[index] = { ...arr[index], images: [...(prev.images ?? [])] };
    setLocalApartments(arr);
  };

  const updateShopImages = (index: number, images: string[]) => {
    const arr = [...localShops];
    arr[index] = { ...arr[index], images };
    setLocalShops(arr);
  };

  const updateShowroomImages = (index: number, images: string[]) => {
    const arr = [...localShowrooms];
    arr[index] = { ...arr[index], images };
    setLocalShowrooms(arr);
  };

  const updateApartmentImages = (index: number, images: string[]) => {
    const arr = [...localApartments];
    arr[index] = { ...arr[index], images };
    setLocalApartments(arr);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 overflow-y-auto" onClick={() => onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-fadeIn my-0 sm:my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{ar ? 'بيانات الوحدات' : 'Unit Data'}</h2>
          <button type="button" onClick={onClose} className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 touch-manipulation" aria-label={ar ? 'إغلاق' : 'Close'}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-gray-200 overflow-x-auto pb-px -mb-px">
          {localShops.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('shops')}
              className={`px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${activeTab === 'shops' ? 'bg-primary text-white -mb-px' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {ar ? 'المحلات' : 'Shops'} ({localShops.length})
            </button>
          )}
          {localShowrooms.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('showrooms')}
              className={`px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${activeTab === 'showrooms' ? 'bg-primary text-white -mb-px' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {ar ? 'المعارض' : 'Showrooms'} ({localShowrooms.length})
            </button>
          )}
          {localApartments.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('apartments')}
              className={`px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${activeTab === 'apartments' ? 'bg-primary text-white -mb-px' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {ar ? 'الشقق' : 'Apartments'} ({localApartments.length})
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
          {activeTab === 'shops' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 w-16">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'رقم الوحدة' : 'Unit No.'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'السعر (ر.ع)' : 'Price (OMR)'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'المساحة (م²)' : 'Area (m²)'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[140px]">{ar ? 'الصور' : 'Images'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 w-24">{ar ? 'نسخ' : 'Copy'}</th>
                  </tr>
                </thead>
                <tbody>
                  {localShops.map((u, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${highlightedUnitIds?.has(`shop-${i}`) ? (isUnitValid('shop', i) ? 'bg-green-50' : 'bg-red-50') : ''}`}
                    >
                      <td className="py-2 px-4 text-gray-600">{i + 1}</td>
                      <td className="py-2 px-4">
                        <input type="text" inputMode="numeric" value={u.unitNumber} onChange={(e) => { const arr = [...localShops]; arr[i] = { ...arr[i], unitNumber: e.target.value }; setLocalShops(arr); }} onBlur={() => { if (i === 0) { const n = parseInt(u.unitNumber || '0', 10); if (n && localShops.length > 1) applyShopSequence(n); } }} className="admin-input py-1.5 text-sm w-full" placeholder="8001" />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={u.price ?? ''}
                          onChange={(e) => { const arr = [...localShops]; arr[i] = { ...arr[i], price: e.target.value }; setLocalShops(arr); }}
                          className={`admin-input py-1.5 text-sm w-full ${unitRowHighlight('shop', i)}`}
                          placeholder=""
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={u.area ?? ''}
                          onChange={(e) => { const arr = [...localShops]; arr[i] = { ...arr[i], area: e.target.value }; setLocalShops(arr); }}
                          className={`admin-input py-1.5 text-sm w-full ${unitRowHighlight('shop', i)}`}
                          placeholder=""
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.images?.length ? <span className="text-xs text-gray-500">{u.images.length} {ar ? 'صورة' : 'img'}</span> : null}
                          <button type="button" onClick={() => setImageModal({ type: 'shop', index: i })} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            {u.images?.length ? (ar ? 'تعديل' : 'Edit') : (ar ? 'إضافة' : 'Add')}
                          </button>
                          {i > 0 && (
                            <button type="button" onClick={() => copyShopImagesFromPrev(i)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                              {ar ? 'نسخ الصور' : 'Copy img'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        {i > 0 ? (
                          <button type="button" onClick={() => copyShopFromPrev(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {ar ? 'من السابق' : 'From prev'}
                          </button>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'showrooms' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 w-16">#</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'رقم الوحدة' : 'Unit No.'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'السعر (ر.ع)' : 'Price (OMR)'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[100px]">{ar ? 'المساحة (م²)' : 'Area (m²)'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[140px]">{ar ? 'الصور' : 'Images'}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 w-24">{ar ? 'نسخ' : 'Copy'}</th>
                  </tr>
                </thead>
                <tbody>
                  {localShowrooms.map((u, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${highlightedUnitIds?.has(`showroom-${i}`) ? (isUnitValid('showroom', i) ? 'bg-green-50' : 'bg-red-50') : ''}`}
                    >
                      <td className="py-2 px-4 text-gray-600">{i + 1}</td>
                      <td className="py-2 px-4">
                        <input type="text" inputMode="numeric" value={u.unitNumber} onChange={(e) => { const arr = [...localShowrooms]; arr[i] = { ...arr[i], unitNumber: e.target.value }; setLocalShowrooms(arr); }} onBlur={() => { if (i === 0) { const n = parseInt(u.unitNumber || '0', 10); if (n && localShowrooms.length > 1) applyShowroomSequence(n); } }} className="admin-input py-1.5 text-sm w-full" placeholder="8001" />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={u.price ?? ''}
                          onChange={(e) => { const arr = [...localShowrooms]; arr[i] = { ...arr[i], price: e.target.value }; setLocalShowrooms(arr); }}
                          className={`admin-input py-1.5 text-sm w-full ${unitRowHighlight('showroom', i)}`}
                          placeholder=""
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={u.area ?? ''}
                          onChange={(e) => { const arr = [...localShowrooms]; arr[i] = { ...arr[i], area: e.target.value }; setLocalShowrooms(arr); }}
                          className={`admin-input py-1.5 text-sm w-full ${unitRowHighlight('showroom', i)}`}
                          placeholder=""
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.images?.length ? <span className="text-xs text-gray-500">{u.images.length} {ar ? 'صورة' : 'img'}</span> : null}
                          <button type="button" onClick={() => setImageModal({ type: 'showroom', index: i })} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            {u.images?.length ? (ar ? 'تعديل' : 'Edit') : (ar ? 'إضافة' : 'Add')}
                          </button>
                          {i > 0 && (
                            <button type="button" onClick={() => copyShowroomImagesFromPrev(i)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                              {ar ? 'نسخ الصور' : 'Copy img'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        {i > 0 ? (
                          <button type="button" onClick={() => copyShowroomFromPrev(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {ar ? 'من السابق' : 'From prev'}
                          </button>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'apartments' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-12">#</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 min-w-[90px]">{ar ? 'رقم الوحدة' : 'Unit No.'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 min-w-[80px]">{ar ? 'السعر' : 'Price'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 min-w-[60px]">{ar ? 'المساحة' : 'Area'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-14">{ar ? 'غرف' : 'Beds'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-14">{ar ? 'حمامات' : 'Bath'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-14">{ar ? 'صالات' : 'Liv'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-14">{ar ? 'مجالس' : 'Maj'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-14">{ar ? 'مواقف' : 'Park'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 min-w-[120px]">{ar ? 'الصور' : 'Images'}</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 w-20">{ar ? 'نسخ' : 'Copy'}</th>
                  </tr>
                </thead>
                <tbody>
                  {localApartments.map((u, i) => {
                    const aptHighlight = unitRowHighlight('apartment', i);
                    return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${highlightedUnitIds?.has(`apartment-${i}`) ? (isUnitValid('apartment', i) ? 'bg-green-50' : 'bg-red-50') : ''}`}
                    >
                      <td className="py-2 px-2 text-gray-600">{i + 1}</td>
                      <td className="py-2 px-2">
                        <input type="text" inputMode="numeric" value={u.unitNumber} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], unitNumber: e.target.value }; setLocalApartments(arr); }} onBlur={() => { if (i === 0) { const n = parseInt(u.unitNumber || '0', 10); if (n && localApartments.length > 1) applyApartmentSequence(n); } }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="8001" />
                      </td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.price ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], price: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.area ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], area: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.bedrooms ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], bedrooms: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.bathrooms ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], bathrooms: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.livingRooms ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], livingRooms: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.majlis ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], majlis: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2"><input type="text" inputMode="numeric" value={u.parkingSpaces ?? ''} onChange={(e) => { const arr = [...localApartments]; arr[i] = { ...arr[i], parkingSpaces: e.target.value }; setLocalApartments(arr); }} className={`admin-input py-1.5 text-sm w-full ${aptHighlight}`} placeholder="" /></td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.images?.length ? <span className="text-xs text-gray-500">{u.images.length} {ar ? 'صورة' : 'img'}</span> : null}
                          <button type="button" onClick={() => setImageModal({ type: 'apartment', index: i })} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            {u.images?.length ? (ar ? 'تعديل' : 'Edit') : (ar ? 'إضافة' : 'Add')}
                          </button>
                          {i > 0 && (
                            <button type="button" onClick={() => copyApartmentImagesFromPrev(i)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                              {ar ? 'نسخ الصور' : 'Copy img'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {i > 0 ? (
                          <button type="button" onClick={() => copyApartmentFromPrev(i)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {ar ? 'من السابق' : 'Prev'}
                          </button>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="admin-btn-secondary">{ar ? 'إلغاء' : 'Cancel'}</button>
          <button type="button" onClick={handleSave} className="admin-btn-primary">
            <Icon name="check" className="w-5 h-5" />
            {ar ? 'حفظ' : 'Save'}
          </button>
        </div>
      </div>

      {/* Missing data modal */}
      {showMissingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMissingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{ar ? 'بيانات ناقصة' : 'Missing Data'}</h3>
                <p className="text-sm text-gray-500">
                  {ar ? 'يرجى إكمال بيانات الوحدات التالية قبل الحفظ:' : 'Please complete the following unit data before saving:'}
                </p>
              </div>
            </div>
            <p className="text-amber-700 font-medium mb-4">{formatIncompleteList(missingItems, ar)}</p>
            <button type="button" onClick={() => setShowMissingModal(false)} className="w-full admin-btn-primary">
              {ar ? 'حسناً' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Image picker modal for a unit */}
      {imageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setImageModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {imageModal.type === 'shop' && (ar ? `صور المحل ${imageModal.index + 1}` : `Shop ${imageModal.index + 1} Images`)}
                {imageModal.type === 'showroom' && (ar ? `صور المعرض ${imageModal.index + 1}` : `Showroom ${imageModal.index + 1} Images`)}
                {imageModal.type === 'apartment' && (ar ? `صور الشقة ${imageModal.index + 1}` : `Apartment ${imageModal.index + 1} Images`)}
              </h3>
              <button type="button" onClick={() => setImageModal(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {imageModal.type === 'shop' && (
                <ImagePicker
                  images={localShops[imageModal.index]?.images ?? []}
                  onImagesChange={(imgs) => updateShopImages(imageModal.index, imgs)}
                  locale={locale}
                />
              )}
              {imageModal.type === 'showroom' && (
                <ImagePicker
                  images={localShowrooms[imageModal.index]?.images ?? []}
                  onImagesChange={(imgs) => updateShowroomImages(imageModal.index, imgs)}
                  locale={locale}
                />
              )}
              {imageModal.type === 'apartment' && (
                <ImagePicker
                  images={localApartments[imageModal.index]?.images ?? []}
                  onImagesChange={(imgs) => updateApartmentImages(imageModal.index, imgs)}
                  locale={locale}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
