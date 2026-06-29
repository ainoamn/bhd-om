/** هل قيمة KV تحتوي بيانات تشغيلية فعلية (وليس هيكل فارغ) */
export function legacyKvHasSubstantiveUserData(key: string, raw: string | null | undefined): boolean {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim();
  if (!s) return false;

  if (key === 'bhd_accounting_registry') {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      if (!o || typeof o !== 'object') return false;
      if (Array.isArray(o.cheques) && o.cheques.length) return true;
      if (Array.isArray(o.deposits) && o.deposits.length) return true;
      if (Array.isArray(o.entries) && o.entries.length) return true;
      if (Array.isArray(o.invoices) && o.invoices.length) return true;
      if (o.accounts && typeof o.accounts === 'object' && Object.keys(o.accounts as object).length) return true;
      return false;
    } catch {
      return true;
    }
  }

  if (key === 'bhd_maintenance_registry' || key === 'bhd_tasks_registry') {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      if (!o || typeof o !== 'object') return false;
      const tasks = o.tasks || o.requests || o.items;
      return Array.isArray(tasks) && tasks.length > 0;
    } catch {
      return true;
    }
  }

  if (s === '[]' || s === '{}' || s === 'null') return false;
  try {
    const o = JSON.parse(s);
    if (Array.isArray(o) && o.length === 0) return false;
    if (o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === 0) return false;
  } catch {
    /* non-JSON strings with content count as substantive */
  }
  return true;
}
