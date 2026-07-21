import {
  LEGACY_KV_CONTRACT_KEYS,
  LEGACY_KV_PROPERTY_KEYS,
  type LegacyKvKey,
} from '@/lib/server/legacyKvKeys';

/** مفاتيح تُدمَج عند الحفظ في Neon بدل الاستبدال الأعمى — يمنع فقدان بيانات أغنى من متصفح آخر */
export const LEGACY_KV_MERGE_ON_PUT_KEYS: readonly LegacyKvKey[] = [
  ...LEGACY_KV_CONTRACT_KEYS,
  ...LEGACY_KV_PROPERTY_KEYS,
  'bhd_accounting_registry',
  'bhd_file_registry',
  'bhd_maintenance_registry',
  'bhd_tasks_registry',
];

function safeParseObject(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function safeParseArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function parsePayloadJsonArray(payload: Record<string, unknown>, jsonKey: string, arrayKey: string): unknown[] {
  const direct = payload[arrayKey];
  if (Array.isArray(direct) && direct.length) return direct;
  const raw = str(payload[jsonKey]);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function attachmentPresent(att: Record<string, unknown> | null | undefined): boolean {
  if (!att || typeof att !== 'object') return false;
  if (str(att.relativePath) || str(att.fileId) || str(att.attachmentRelativePath)) return true;
  if (str(att.checkAttachmentRelativePath) || str(att.checkAttachmentFileId)) return true;
  const dataUrl = str(att.dataUrl) || str(att.attachmentDataUrl) || str(att.checkAttachmentDataUrl);
  return dataUrl.length > 80;
}

function contractFinancialRichnessScore(payload: Record<string, unknown>): number {
  let n = 0;
  const schedule = parsePayloadJsonArray(payload, 'paymentScheduleJson', 'paymentSchedule');
  if (schedule.length) n += 4;
  schedule.forEach((row) => {
    const r = row as Record<string, unknown>;
    if (str(r.amount)) n += 1;
    if (str(r.dueDate) || str(r.paymentDate)) n += 1;
    if (str(r.chequeNo) || str(r.checkNo)) n += 1;
    if (attachmentPresent(r)) n += 3;
  });
  const vat = parsePayloadJsonArray(payload, 'vatChequeScheduleJson', 'vatChequeSchedule');
  if (vat.length) n += 3;
  const docs = parsePayloadJsonArray(payload, 'propertyDocumentsBundleJson', 'propertyDocumentsBundle');
  docs.forEach((d) => {
    if (attachmentPresent(d as Record<string, unknown>)) n += 2;
  });
  if (str(payload.municipalFormNo)) n += 1;
  if (str(payload.municipalContractNo)) n += 1;
  if (str(payload.depositAttachmentRelativePath) || str(payload.depositAttachmentFileId)) n += 3;
  return n;
}

export function mergeContractPayloads(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!existing) return incoming && typeof incoming === 'object' ? { ...incoming } : {};
  if (!incoming) return { ...existing };

  const prevAg = str(existing.agreementNo);
  const nextAg = str(incoming.agreementNo);
  const renewalReplace =
    (nextAg && prevAg && nextAg !== prevAg) ||
    (!!incoming.isRenewalContract &&
      (str(incoming.startDate) !== str(existing.startDate) || str(incoming.endDate) !== str(existing.endDate)));

  if (renewalReplace) {
    const out: Record<string, unknown> = { ...existing, ...incoming };
    [
      'startDate',
      'endDate',
      'agreementNo',
      'previousAgreementNo',
      'contractMonths',
      'monthlyRent',
      'agreementRent',
      'paymentMethod',
      'municipalFormNo',
      'municipalContractNo',
      'graceDays',
      'graceAmount',
      'isRenewalContract',
      'isRenewalDraft',
      'contractSavedStatus',
      'contractSavedAt',
    ].forEach((f) => {
      if (incoming[f] != null && str(incoming[f]) !== '') out[f] = incoming[f];
    });
    (
      [
        ['paymentScheduleJson', 'paymentSchedule'],
        ['vatChequeScheduleJson', 'vatChequeSchedule'],
        ['customRentItemsJson', 'customRentItems'],
      ] as const
    ).forEach(([jsonKey, arrayKey]) => {
      const inc = parsePayloadJsonArray(incoming, jsonKey, arrayKey);
      if (inc.length) {
        out[arrayKey] = inc;
        out[jsonKey] = JSON.stringify(inc);
      }
    });
    return out;
  }

  const scoreA = contractFinancialRichnessScore(existing);
  const scoreB = contractFinancialRichnessScore(incoming);
  const rich = scoreA >= scoreB ? existing : incoming;
  const poor = scoreA >= scoreB ? incoming : existing;
  const out: Record<string, unknown> = { ...poor, ...rich };
  const richDocs = parsePayloadJsonArray(rich, 'propertyDocumentsBundleJson', 'propertyDocumentsBundle');
  const poorDocs = parsePayloadJsonArray(poor, 'propertyDocumentsBundleJson', 'propertyDocumentsBundle');
  const docByKey = new Map<string, Record<string, unknown>>();
  [...poorDocs, ...richDocs].forEach((d) => {
    const doc = d as Record<string, unknown>;
    const k = str(doc.category) || str(doc.name) || '__misc';
    const prev = docByKey.get(k);
    if (!prev || (attachmentPresent(doc) && !attachmentPresent(prev))) docByKey.set(k, doc);
    else if (attachmentPresent(doc) && attachmentPresent(prev)) docByKey.set(k, { ...prev, ...doc });
  });
  const mergedDocs = [...docByKey.values()];
  if (mergedDocs.length) {
    out.propertyDocumentsBundle = mergedDocs;
    out.propertyDocumentsBundleJson = JSON.stringify(mergedDocs);
  }
  out.propertyDocumentsComplete =
    rich.propertyDocumentsComplete === true ||
    poor.propertyDocumentsComplete === true ||
    str(rich.propertyDocumentsComplete) === 'true' ||
    str(poor.propertyDocumentsComplete) === 'true';
  if (rich.propertyDocumentsCompletedAt || poor.propertyDocumentsCompletedAt) {
    out.propertyDocumentsCompletedAt = rich.propertyDocumentsCompletedAt || poor.propertyDocumentsCompletedAt;
  }
  [
    'municipalFormNo',
    'municipalContractNo',
    'paymentMethod',
    'depositAmount',
    'agreementNo',
    'contractSavedStatus',
  ].forEach((f) => {
    out[f] = str(rich[f]) || str(poor[f]) || '';
  });
  return out;
}

type SavedContractEntry = {
  payload?: Record<string, unknown>;
  lifecycleStatus?: string;
  updatedAt?: string;
  savedAt?: string;
};

function lifecycleRank(k: string): number {
  if (k === 'draft') return 0;
  if (k === 'reservation_draft') return 1;
  if (k === 'reservation_confirmed') return 2;
  if (k === 'cancellation_pending') return 6;
  if (k === 'renewal_pending') return 7;
  if (k === 'active_pending') return 8;
  if (k === 'active_docs_pending') return 9;
  if (k === 'active_accounting_pending') return 9;
  if (k === 'active') return 10;
  return 9;
}

function pickMergedLifecycleStatus(
  mergedPayload: Record<string, unknown>,
  ...statuses: Array<string | undefined>
): string {
  const stored = statuses.map((s) => str(s)).filter(Boolean);
  const fromPayload = str(mergedPayload.contractSavedStatus);
  const candidates = fromPayload ? [fromPayload, ...stored] : stored;
  if (!candidates.length) return 'active_pending';
  let best = candidates[0];
  let bestRank = lifecycleRank(best);
  candidates.forEach((st) => {
    if (st === 'active_pending') return;
    const r = lifecycleRank(st);
    if (r > bestRank) {
      best = st;
      bestRank = r;
    }
  });
  if (bestRank >= lifecycleRank('active_docs_pending')) return best;
  return best;
}

function mergeSavedContractsByUnitMaps(
  local: Record<string, SavedContractEntry>,
  external: Record<string, SavedContractEntry>
): Record<string, SavedContractEntry> {
  const merged: Record<string, SavedContractEntry> = { ...local };
  Object.keys(external).forEach((key) => {
    const ext = external[key];
    if (!ext || typeof ext !== 'object') return;
    const loc = merged[key];
    if (!loc?.payload || typeof loc.payload !== 'object') {
      merged[key] = ext;
      return;
    }
    if (!ext.payload || typeof ext.payload !== 'object') return;
    const payload = mergeContractPayloads(loc.payload, ext.payload);
    const extTime = str(ext.updatedAt || ext.savedAt);
    const locTime = str(loc.updatedAt || loc.savedAt);
    const preferIncomingMeta = extTime >= locTime;
    const lifecycleStatus = pickMergedLifecycleStatus(
      payload,
      preferIncomingMeta ? str(ext.lifecycleStatus) : str(loc.lifecycleStatus),
      preferIncomingMeta ? str(loc.lifecycleStatus) : str(ext.lifecycleStatus),
      str(payload.contractSavedStatus)
    );
    merged[key] = {
      ...loc,
      ...ext,
      payload: {
        ...payload,
        contractSavedStatus: lifecycleStatus,
      },
      lifecycleStatus,
      updatedAt: extTime >= locTime ? extTime || locTime : locTime || extTime,
    };
  });
  return merged;
}

function mergeShallowJsonObjects(existingRaw: string, incomingRaw: string): string {
  const a = safeParseObject(existingRaw);
  const b = safeParseObject(incomingRaw);
  return JSON.stringify({ ...a, ...b, ...mergeTopLevelPreferLonger(a, b) });
}

function mergeTopLevelPreferLonger(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach((k) => {
    const av = a[k];
    const bv = b[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      out[k] = bv.length >= av.length ? bv : av;
      return;
    }
    if (typeof av === 'object' && av && typeof bv === 'object' && bv) {
      out[k] = mergeTopLevelPreferLonger(av as Record<string, unknown>, bv as Record<string, unknown>);
      return;
    }
    const as = JSON.stringify(av ?? '');
    const bs = JSON.stringify(bv ?? '');
    out[k] = bs.length >= as.length ? bv : av;
  });
  return out;
}

type AcctRecord = Record<string, unknown>;

function acctRecordTime(r: AcctRecord): number {
  const t = Date.parse(str(r.updatedAt) || str(r.receiptApprovedAt) || '');
  return Number.isFinite(t) ? t : 0;
}

function acctStatusScore(status: unknown, r?: AcctRecord): number {
  const s = str(status);
  let score = 50;
  if (s === 'held' || s === 'released' || s === 'refunded') score = 100;
  else if (s === 'pending' || s === 'paid_full' || s === 'confirmed' || s === 'invoiced') score = 95;
  else if (s === 'paid_partial' || s === 'paid_cash' || s === 'deferred') score = 85;
  else if (s === 'pending_receipt') score = 10;
  else if (s === 'awaiting_contract_data') score = 5;
  else if (s === 'receipt_rejected' || s === 'rejected') score = 0;
  if (r?.receiptApprovedAt) score += 40;
  return score;
}

function acctRecordMergeKey(r: AcctRecord): string {
  const sourceType = str(r.sourceType);
  if (sourceType === 'rent' || sourceType === 'vat') {
    const idx =
      sourceType === 'vat'
        ? parseInt(str(r.chequeIndex), 10) || 0
        : parseInt(str(r.monthIndex), 10) || 0;
    const unitKey = str(r.unitKey).trim();
    const ag = str(r.agreementNo).trim();
    if (unitKey && ag) return `chq:${unitKey}:${ag}:${sourceType}:${idx}`;
  }
  const linked = str(r.linkedKey).trim();
  if (linked) return `lk:${linked}`;
  const id = str(r.id).trim();
  if (id) return `id:${id}`;
  return `anon:${str(r.unitKey)}:${str(r.chequeNo)}:${str(r.type)}:${str(r.amount)}`;
}

function pickBetterAcctRecord(a: AcctRecord, b: AcctRecord): AcctRecord {
  const sa = acctStatusScore(a.status, a);
  const sb = acctStatusScore(b.status, b);
  if (sa !== sb) return sa > sb ? a : b;
  const ta = acctRecordTime(a);
  const tb = acctRecordTime(b);
  if (ta !== tb) return ta > tb ? a : b;
  return JSON.stringify(a).length >= JSON.stringify(b).length ? a : b;
}

function mergeAcctRecordArrays(a: unknown, b: unknown): AcctRecord[] {
  const map = new Map<string, AcctRecord>();
  const ingest = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const rec = row as AcctRecord;
      const k = acctRecordMergeKey(rec);
      const prev = map.get(k);
      map.set(k, prev ? pickBetterAcctRecord(prev, rec) : rec);
    });
  };
  ingest(a);
  ingest(b);
  return [...map.values()];
}

function mergeAccountingAccounts(a: unknown, b: unknown): Record<string, unknown> {
  const ao = a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, AcctRecord>) : {};
  const bo = b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, AcctRecord>) : {};
  const out: Record<string, unknown> = { ...ao };
  Object.entries(bo).forEach(([k, bv]) => {
    const av = ao[k];
    if (!av || typeof av !== 'object') {
      out[k] = bv;
      return;
    }
    out[k] = acctRecordTime(bv) >= acctRecordTime(av) ? bv : av;
  });
  return out;
}

/** دمج سجل المحاسبة — يحافظ على اعتمادات الاستلام الأحدث ولا يعيد pending_receipt */
export function mergeAccountingRegistryJson(existingRaw: string, incomingRaw: string): string {
  const a = safeParseObject(existingRaw);
  const b = safeParseObject(incomingRaw);
  if (!Object.keys(a).length) return incomingRaw;
  if (!Object.keys(b).length) return existingRaw;

  const merged: Record<string, unknown> = { ...a, ...b };
  merged.accounts = mergeAccountingAccounts(a.accounts, b.accounts);
  merged.cheques = mergeAcctRecordArrays(a.cheques, b.cheques);
  merged.deposits = mergeAcctRecordArrays(a.deposits, b.deposits);
  merged.entries = mergeAcctRecordArrays(a.entries, b.entries);
  merged.invoices = mergeAcctRecordArrays(a.invoices, b.invoices);
  merged.bankAccounts = mergeAcctRecordArrays(a.bankAccounts, b.bankAccounts);
  merged.chartOfAccounts = mergeAcctRecordArrays(a.chartOfAccounts, b.chartOfAccounts);
  merged.journalLedgerVersion = Math.max(
    parseInt(str(a.journalLedgerVersion), 10) || 0,
    parseInt(str(b.journalLedgerVersion), 10) || 0
  );
  merged._journalLedgerDirty = !!(a._journalLedgerDirty || b._journalLedgerDirty);
  merged.version = Math.max(parseInt(str(a.version), 10) || 1, parseInt(str(b.version), 10) || 1);

  const settingsA = a.settings && typeof a.settings === 'object' ? a.settings : {};
  const settingsB = b.settings && typeof b.settings === 'object' ? b.settings : {};
  merged.settings = { ...settingsA, ...settingsB };

  return JSON.stringify(merged);
}

/** دمج قيمة KV قبل الكتابة في Neon */
export function mergeLegacyKvOnPut(key: string, existingRaw: string | null | undefined, incomingRaw: string): string {
  if (!existingRaw || !existingRaw.trim()) return incomingRaw;
  if (!(LEGACY_KV_MERGE_ON_PUT_KEYS as readonly string[]).includes(key)) return incomingRaw;

  if (key === 'bhd_saved_contracts_by_unit') {
    const merged = mergeSavedContractsByUnitMaps(
      safeParseObject(existingRaw) as Record<string, SavedContractEntry>,
      safeParseObject(incomingRaw) as Record<string, SavedContractEntry>
    );
    return JSON.stringify(merged);
  }

  if (key === 'bhd_accounting_registry') {
    return mergeAccountingRegistryJson(existingRaw, incomingRaw);
  }

  if (key === 'bhd_file_registry') {
    return mergeShallowJsonObjects(existingRaw, incomingRaw);
  }

  try {
    const a = safeParseObject(existingRaw);
    const b = safeParseObject(incomingRaw);
    if (Object.keys(a).length && Object.keys(b).length) {
      return JSON.stringify({ ...a, ...b });
    }
  } catch {
    /* fall through */
  }

  return incomingRaw.length >= existingRaw.length ? incomingRaw : existingRaw;
}
