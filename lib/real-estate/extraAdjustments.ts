/** Simplified port of legacy computeExtraAdjustmentLineTotal for accounting sync. */
export function computeExtraAdjustmentLineTotal(
  item: Record<string, unknown>,
  contractData: Record<string, unknown>
): number {
  const amount = parseFloat(String(item.amount ?? '')) || 0;
  if (amount <= 0) return 0;
  const sign = String(item.kind ?? '') === 'discount' ? -1 : 1;
  const rec = String(item.recurrence ?? 'one_time');
  if (rec === 'with_renewal') return 0;
  if (rec === 'one_time') return sign * amount;
  const months = Math.max(
    1,
    parseInt(String(contractData.contractMonths ?? ''), 10) || 12
  );
  if (rec === 'every_3_months') return sign * amount * Math.ceil(months / 3);
  if (rec === 'monthly' || rec === 'custom') return sign * amount * months;
  return sign * amount;
}
