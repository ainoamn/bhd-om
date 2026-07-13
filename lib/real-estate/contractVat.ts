import type { UnitContractFormValues } from '@/lib/real-estate/unitContractWorkspace';

/** Matches legacy CONTRACT_VAT_RATE */
export const CONTRACT_VAT_RATE = 0.05;

export function isVatChequesEnabled(values: Pick<UnitContractFormValues, 'contractSubjectToVat' | 'vatPaymentMode'>): boolean {
  return values.contractSubjectToVat === 'yes' && values.vatPaymentMode === 'separate';
}

export function estimateVatTotal(values: Pick<UnitContractFormValues, 'monthlyRent' | 'contractMonths'>): number {
  const rent = parseFloat(values.monthlyRent) || 0;
  const months = Math.max(1, parseInt(values.contractMonths, 10) || 12);
  return parseFloat((rent * months * CONTRACT_VAT_RATE).toFixed(3));
}

export function buildVatChequeSchedule(values: UnitContractFormValues): Record<string, unknown>[] {
  if (!isVatChequesEnabled(values)) return [];
  const count = Math.max(1, parseInt(values.vatChequeCount, 10) || 12);
  const start = values.startDate.trim();
  const total = estimateVatTotal(values);
  if (!start || total <= 0) return [];
  const perCheque = parseFloat((total / count).toFixed(3));
  const schedule: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    schedule.push({
      chequeIndex: i + 1,
      monthIndex: i + 1,
      dueDate: d.toISOString().slice(0, 10),
      amount: perCheque.toFixed(3),
    });
  }
  return schedule;
}

export function buildPaymentSchedule(values: UnitContractFormValues): Record<string, unknown>[] {
  const months = Math.max(1, parseInt(values.contractMonths, 10) || 12);
  const rent = parseFloat(values.monthlyRent) || 0;
  const start = values.startDate.trim();
  if (!start || rent <= 0 || values.paymentMethod !== 'cheque') return [];
  const schedule: Record<string, unknown>[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    schedule.push({
      monthIndex: i + 1,
      dueDate: d.toISOString().slice(0, 10),
      amount: rent.toFixed(3),
    });
  }
  return schedule;
}
