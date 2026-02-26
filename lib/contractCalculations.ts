/**
 * حسابات العقود - مستوحى من نظام عين عُمان
 * رسوم البلدية، فترة السماح، الضريبة، إلخ
 */

/** رسوم البلدية = (الإيجار الشهري × المدة) × 3% */
export function calcMunicipalityFees(monthlyRent: number, durationMonths: number): number {
  if (!monthlyRent || !durationMonths) return 0;
  const totalRent = monthlyRent * durationMonths;
  return Math.round(totalRent * 0.03 * 1000) / 1000;
}

/** أيام فترة السماح = الفرق بالأيام بين تاريخ الاستئجار الفعلي وتاريخ البداية */
export function calcGracePeriodDays(actualRentalDate: string, startDate: string): number {
  if (!actualRentalDate || !startDate) return 0;
  const a = (actualRentalDate || '').trim();
  const s = (startDate || '').trim();
  if (!a || !s) return 0;
  try {
    const actual = new Date(a.includes('T') ? a : a + 'T12:00:00').getTime();
    const start = new Date(s.includes('T') ? s : s + 'T12:00:00').getTime();
    if (isNaN(actual) || isNaN(start)) return 0;
    const diffMs = Math.abs(actual - start);
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

/** مبلغ فترة السماح = (الإيجار الشهري / 30) × عدد أيام السماح */
export function calcGracePeriodAmount(monthlyRent: number, gracePeriodDays: number): number {
  if (!monthlyRent || !gracePeriodDays) return 0;
  const dailyRent = monthlyRent / 30;
  return Math.round(dailyRent * gracePeriodDays * 1000) / 1000;
}

/** الضريبة المضافة الشهرية والإجمالية */
export function calcVAT(
  monthlyRent: number,
  durationMonths: number,
  vatRate: number = 0.05
): { monthlyVATAmount: number; totalVATAmount: number } {
  if (!monthlyRent || !durationMonths) return { monthlyVATAmount: 0, totalVATAmount: 0 };
  const monthlyVAT = monthlyRent * vatRate;
  const totalVAT = monthlyVAT * durationMonths;
  return {
    monthlyVATAmount: Math.round(monthlyVAT * 1000) / 1000,
    totalVATAmount: Math.round(totalVAT * 1000) / 1000,
  };
}

/** تاريخ انتهاء العقد = تاريخ البداية + المدة - يوم واحد */
export function calcEndDate(startDate: string, durationMonths: number): string {
  if (!startDate || !durationMonths) return '';
  try {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    end.setDate(end.getDate() - 1);
    return end.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/** الإيجار السنوي = الإيجار الشهري × 12 */
export function calcAnnualRent(monthlyRent: number): number {
  return (monthlyRent ?? 0) * 12;
}

/** الإيجار الشهري من المساحة والسعر للمتر */
export function calcRentFromArea(rentArea: number, pricePerMeter: number): number {
  if (!rentArea || !pricePerMeter) return 0;
  return Math.round(rentArea * pricePerMeter * 1000) / 1000;
}

/**
 * أساس الحساب = إجمالي الإيجار - التخفيض
 * تُطبَّق عليه رسوم البلدية والضريبة والضرائب الأخرى
 */
export function calcRentBaseForFees(
  totalRent: number,
  discountAmount: number = 0
): number {
  const base = Math.max(0, totalRent - (discountAmount ?? 0));
  return Math.round(base * 1000) / 1000;
}

/** ضرائب أخرى: الشهري والإجمالي من أساس الحساب */
export function calcOtherTax(
  rentBase: number,
  durationMonths: number,
  otherTaxRate: number
): { monthlyOtherTaxAmount: number; totalOtherTaxAmount: number } {
  if (!rentBase || !durationMonths || !otherTaxRate) {
    return { monthlyOtherTaxAmount: 0, totalOtherTaxAmount: 0 };
  }
  const total = Math.round(rentBase * otherTaxRate * 1000) / 1000;
  const monthly = durationMonths > 0 ? Math.round((total / durationMonths) * 1000) / 1000 : 0;
  return { monthlyOtherTaxAmount: monthly, totalOtherTaxAmount: total };
}
