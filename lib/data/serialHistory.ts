/**
 * أرشيف الأرقام المتسلسلة السابقة
 * يُستخدم عند تغيير نوع العقار أو حالة المشروع
 * للبحث عن التسلسل والتدرج التاريخي
 */

export type SerialHistoryEntity = 'PROJECT' | 'PROPERTY';

export interface SerialHistoryEntry {
  id: string;
  entityType: SerialHistoryEntity;
  entityId: string | number;
  serialNumber: string;
  typeOrStatus: string;
  entityTitleAr: string;
  entityTitleEn: string;
  changedAt: string;
  currentSerial?: string;
}

// بيانات تجريبية: أرشيف أرقام سابقة عند تغيير حالة المشاريع أو نوع العقارات
export const serialHistory: SerialHistoryEntry[] = [
  {
    id: 'sh1',
    entityType: 'PROJECT',
    entityId: 2,
    serialNumber: 'PRJ-D-2024-0015',
    typeOrStatus: 'UNDER_DEVELOPMENT',
    entityTitleAr: 'مجمع الأعمال التجاري',
    entityTitleEn: 'Business Complex',
    changedAt: '2024-12-01T10:00:00Z',
    currentSerial: 'PRJ-UC-2025-0001',
  },
  {
    id: 'sh2',
    entityType: 'PROJECT',
    entityId: 3,
    serialNumber: 'PRJ-P-2024-0008',
    typeOrStatus: 'PLANNING',
    entityTitleAr: 'واحة السعادة',
    entityTitleEn: 'Al Saada Oasis',
    changedAt: '2024-06-15T14:30:00Z',
    currentSerial: 'PRJ-D-2025-0001',
  },
  {
    id: 'sh3',
    entityType: 'PROPERTY',
    entityId: 2,
    serialNumber: 'PRP-R-2024-0022',
    typeOrStatus: 'RENT',
    entityTitleAr: 'شقة للبيع في السيب',
    entityTitleEn: 'Apartment for Sale in Seeb',
    changedAt: '2024-09-20T09:00:00Z',
    currentSerial: 'PRP-S-2025-0001',
  },
];

export function searchSerialHistory(query: string): SerialHistoryEntry[] {
  const q = query?.trim().toUpperCase();
  if (!q) return serialHistory;
  return serialHistory.filter(
    (e) =>
      e.serialNumber.toUpperCase().includes(q) ||
      (e.currentSerial?.toUpperCase().includes(q) ?? false) ||
      e.entityTitleAr.includes(query) ||
      e.entityTitleEn.toUpperCase().includes(q)
  );
}
