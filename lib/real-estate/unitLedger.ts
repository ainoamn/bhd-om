import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';
import { flattenReservations } from '@/lib/real-estate/reservationsParse';
import { daysUntil, normalizeBuildingKey, normalizeUnit, parseJson, toStr, unitRowKey } from '@/lib/real-estate/kvParse';

export type UnitLedgerEvent = {
  sortMs: number;
  typeAr: string;
  typeEn: string;
  party: string;
  ref: string;
  from: string;
  to: string;
  statusAr: string;
  statusEn: string;
  rent: string;
  note: string;
  staff: string;
  sourceKind: string;
};

export const UNIT_LEDGER_KV_KEYS = [
  'bhd_unit_reservations',
  'bhd_reservation_cancellations',
  'bhd_tenancy_contract_drafts',
  'bhd_saved_contracts_by_unit',
  'bhd_contract_history_by_unit',
  'bhd_eviction_requests',
  'bhd_maintenance_registry',
  'bhd_contract_cancellations',
  'bhd_contract_cancellation_requests',
  'bhd_contract_renewal_log',
  'bhd_contract_renewal_drafts',
  'bhd_contract_renewal_requests',
  'bhd_contract_edit_requests',
  'bhd_system_activity_log',
  'bhd_accounting_registry',
] as const;

function ledgerEventTimeMs(v: unknown): number {
  if (!v && v !== 0) return 0;
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v));
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatOmrAmount(v: unknown): string {
  const n = parseFloat(String(v ?? ''));
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(3);
}

function unitMatches(building: string, unit: string, bRaw: unknown, uRaw: unknown): boolean {
  return normalizeBuildingKey(bRaw) === building && normalizeUnit(uRaw) === unit;
}

function maintenanceUnitKey(building: string, unit: string): string {
  return `${toStr(building)}\t${toStr(unit)}`;
}

function accountingUnitKey(building: string, unit: string): string {
  return `${toStr(building)}\t${toStr(unit)}`;
}

type LedgerPushMeta = {
  sourceKind?: string;
  actionType?: string;
  actionId?: string;
};

type MutableLedgerRow = UnitLedgerEvent & {
  actionType?: string;
  actionId?: string;
};

function maintenanceStatusLabel(status: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    pending_approval: ['مطلوب موافقة الإدارة', 'Management approval required'],
    pending: ['معلق', 'Pending'],
    in_progress: ['قيد التنفيذ', 'In progress'],
    completed: ['مكتمل', 'Completed'],
    cancelled: ['ملغي', 'Cancelled'],
    approved: ['تمت موافقة الإدارة', 'Management approved'],
  };
  const pair = map[status];
  if (pair) return ar ? pair[0] : pair[1];
  return status || '—';
}

function maintenanceRequestTotal(req: Record<string, unknown>): number {
  const items = Array.isArray(req.items) ? req.items : [];
  return items.reduce((sum, it) => {
    if (!it || typeof it !== 'object') return sum;
    const row = it as Record<string, unknown>;
    const materials = parseFloat(String(row.materialsCost ?? 0)) || 0;
    const labor = parseFloat(String(row.laborCost ?? 0)) || 0;
    const qty = parseFloat(String(row.qty ?? 1)) || 1;
    return sum + (materials + labor) * qty;
  }, 0);
}

export function gatherUnitLedgerFromKv(
  kv: LegacyKvStringMap,
  buildingRaw: string,
  unitRaw: string
): UnitLedgerEvent[] {
  const bk = normalizeBuildingKey(buildingRaw);
  const uk = normalizeUnit(unitRaw);
  if (!bk || !uk) return [];

  const out: MutableLedgerRow[] = [];

  const pushLedger = (
    sortMs: unknown,
    typeAr: string,
    typeEn: string,
    party: string,
    ref: string,
    from: string,
    to: string,
    statusAr: string,
    statusEn: string,
    rent: string,
    note: string,
    staff: string,
    meta?: LedgerPushMeta
  ) => {
    out.push({
      sortMs: ledgerEventTimeMs(sortMs),
      typeAr,
      typeEn,
      party: party || '-',
      ref: ref || '-',
      from: from || '-',
      to: to || '-',
      statusAr,
      statusEn,
      rent: rent || '-',
      note: note || '',
      staff: toStr(staff).trim() || '-',
      sourceKind: meta?.sourceKind ?? '',
      actionType: meta?.actionType,
      actionId: meta?.actionId,
    });
  };

  flattenReservations(kv.bhd_unit_reservations).forEach((r) => {
    if (!unitMatches(bk, uk, r.building, r.unit)) return;
    const state = toStr(r.state);
    pushLedger(
      r.since ?? Date.now(),
      'حجز',
      'Reservation',
      toStr(r.reservedBy),
      toStr(r.agreementNo),
      toStr(r.since),
      '-',
      state === 'confirmed' ? 'مؤكَّد' : 'مسودة',
      state === 'confirmed' ? 'Confirmed' : 'Draft',
      '-',
      toStr(r.phone) ? `جوال المحجوز — ${toStr(r.phone)}` : '',
      toStr(r.staffName),
      { sourceKind: 'reservation' }
    );
  });

  const cancelReservations = parseJson<Record<string, unknown>[]>(kv.bhd_reservation_cancellations, []);
  cancelReservations.forEach((c) => {
    if (!unitMatches(bk, uk, c.building, c.unit)) return;
    pushLedger(
      c.loggedAt ?? c.cancelledAt,
      'إلغاء حجز',
      'Reservation cancelled',
      toStr(c.reservedBy),
      toStr(c.agreementNo),
      toStr(c.since),
      '-',
      'ملغى',
      'Cancelled',
      '-',
      [
        toStr(c.cancelledAt) ? `تاريخ الإلغاء — ${toStr(c.cancelledAt)}` : '',
        toStr(c.cancelReason) ? `السبب — ${toStr(c.cancelReason)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      toStr(c.staffName),
      { sourceKind: 'reservation_cancelled' }
    );
  });

  const draftMap = parseJson<Record<string, { payload?: Record<string, unknown>; updatedAt?: string; lastActorName?: string }>>(
    kv.bhd_tenancy_contract_drafts,
    {}
  );
  Object.entries(draftMap).forEach(([dk, e]) => {
    const p = e?.payload;
    if (!p) return;
    if (!unitMatches(bk, uk, p.buildingNo, p.flatNo)) return;
    pushLedger(
      e.updatedAt ?? p._savedAt,
      'مسودة عقد',
      'Tenancy draft',
      toStr(p.tenantNameAr),
      toStr(p.agreementNo),
      toStr(p.startDate),
      toStr(p.endDate),
      'مسودة',
      'Draft',
      formatOmrAmount(p.monthlyRent),
      `آخر تحديث: ${toStr(e.updatedAt ?? p._savedAt).slice(0, 16)}`,
      toStr(e.lastActorName),
      { sourceKind: 'tenancy_draft', actionId: dk }
    );
  });

  const cancelReqMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_cancellation_requests, {});
  Object.entries(cancelReqMap).forEach(([rk, req]) => {
    if (!req || toStr(req.status) !== 'pending') return;
    const parts = rk.split('\t');
    if (!unitMatches(bk, uk, parts[0], parts[1])) return;
    const events = Array.isArray(req.events) ? req.events : [];
    events.forEach((ev) => {
      if (!ev || typeof ev !== 'object') return;
      const row = ev as Record<string, unknown>;
      pushLedger(
        row.at ?? req.requestedAt,
        'طلب إلغاء عقد',
        'Contract cancellation request',
        toStr(req.tenant),
        toStr(req.agreementNo),
        toStr(req.startDate),
        toStr(req.endDate),
        'معلّق',
        'Pending',
        '-',
        [
          toStr(req.cancelDate) ? `تاريخ الإلغاء المطلوب — ${toStr(req.cancelDate)}` : '',
          toStr(row.note),
        ]
          .filter(Boolean)
          .join(' · '),
        toStr(row.staffName || req.staffName),
        { sourceKind: 'cancellation_request_event', actionId: rk }
      );
    });
  });

  const contractCancellations = parseJson<Record<string, unknown>[]>(kv.bhd_contract_cancellations, []);
  contractCancellations.forEach((c) => {
    if (!unitMatches(bk, uk, c.building, c.unit)) return;
    pushLedger(
      c.at ?? c.cancelDate,
      'إلغاء عقد',
      'Contract cancelled',
      toStr(c.tenant),
      toStr(c.agreementNo),
      toStr(c.startDate),
      toStr(c.endDate),
      'ملغى',
      'Cancelled',
      '-',
      [
        toStr(c.cancelDate) ? `تاريخ الإلغاء — ${toStr(c.cancelDate)}` : '',
        toStr(c.notes),
      ]
        .filter(Boolean)
        .join(' · '),
      toStr(c.staffName),
      { sourceKind: 'contract_cancelled' }
    );
  });

  const historyMap = parseJson<Record<string, Record<string, unknown>[]>>(kv.bhd_contract_history_by_unit, {});
  const hk = unitRowKey(buildingRaw, unitRaw);
  const hist = (Array.isArray(historyMap[hk]) ? historyMap[hk] : [])
    .slice()
    .sort((a, b) => ledgerEventTimeMs(a.archivedAt) - ledgerEventTimeMs(b.archivedAt));
  hist.forEach((row, idx) => {
    const p = row?.payload as Record<string, unknown> | undefined;
    if (!p) return;
    pushLedger(
      row.archivedAt,
      idx === 0 ? 'العقد الأصلي (أرشيف)' : `تجديد ${idx} (أرشيف)`,
      idx === 0 ? 'Original contract (archive)' : `Renewal ${idx} (archive)`,
      toStr(p.tenantNameAr || p.tenantNameEn),
      toStr(p.agreementNo),
      toStr(p.startDate),
      toStr(p.endDate),
      'منتهي / مؤرشف',
      'Ended / archived',
      formatOmrAmount(p.monthlyRent),
      [
        row.supersededBy ? `استُبدل بعقد ${toStr(row.supersededBy)}` : '',
        toStr(p.municipalFormNo) ? `استمارة بلدية — ${toStr(p.municipalFormNo)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      toStr(row.archivedBy),
      { sourceKind: 'contract_archive' }
    );
  });

  const savedMap = parseJson<Record<string, { payload?: Record<string, unknown>; lifecycleStatus?: string }>>(
    kv.bhd_saved_contracts_by_unit,
    {}
  );
  const savedEntry = savedMap[hk];
  const savedPayload = savedEntry?.payload;
  if (savedPayload && unitMatches(bk, uk, savedPayload.buildingNo, savedPayload.flatNo)) {
    const end = toStr(savedPayload.endDate);
    const dLeft = daysUntil(end);
    let stAr = 'ساري (محفوظ)';
    let stEn = 'Active (saved)';
    if (end && dLeft !== null && dLeft < 0) {
      stAr = 'منتهي';
      stEn = 'Expired';
    }
    pushLedger(
      savedPayload.contractSavedAt ?? Date.now(),
      'عقد محفوظ',
      'Saved contract',
      toStr(savedPayload.tenantNameAr),
      toStr(savedPayload.agreementNo),
      toStr(savedPayload.startDate),
      end,
      stAr,
      stEn,
      formatOmrAmount(savedPayload.monthlyRent),
      toStr(savedEntry.lifecycleStatus) ? `حالة: ${toStr(savedEntry.lifecycleStatus)}` : '',
      '-',
      { sourceKind: 'saved_contract' }
    );
  }

  const evictions = parseJson<Record<string, unknown>[]>(kv.bhd_eviction_requests, []);
  evictions.forEach((ev) => {
    if (!unitMatches(bk, uk, ev.building, ev.unit)) return;
    pushLedger(
      ev.plannedDate ?? ev.requestDate,
      'إخلاء / طلب',
      'Eviction request',
      toStr(ev.tenant),
      '-',
      toStr(ev.requestDate),
      toStr(ev.plannedDate),
      'قيد المتابعة',
      'Queued',
      '-',
      toStr(ev.notes) ? `ملاحظات — ${toStr(ev.notes)}` : '',
      toStr(ev.staffName),
      { sourceKind: 'eviction_request' }
    );
  });

  const renewalLog = parseJson<Record<string, unknown>[]>(kv.bhd_contract_renewal_log, []);
  const renewalTypeMap: Record<string, [string, string]> = {
    started: ['بدء تجديد عقد', 'Contract renewal started'],
    draft_started: ['مسودة تجديد (بدء)', 'Renewal draft started'],
    cancelled: ['إلغاء تجديد عقد', 'Contract renewal cancelled'],
    completed: ['تجديد عقد مكتمل', 'Contract renewal completed'],
  };
  const renewalStatusMap: Record<string, [string, string]> = {
    started: ['بدء', 'Started'],
    draft_started: ['مسودة', 'Draft'],
    cancelled: ['ملغى', 'Cancelled'],
    completed: ['مكتمل', 'Completed'],
  };
  renewalLog.forEach((e) => {
    if (!unitMatches(bk, uk, e.building, e.unit)) return;
    const ev = toStr(e.eventType);
    const [typeAr, typeEn] = renewalTypeMap[ev] ?? ['تجديد عقد', 'Contract renewal'];
    const [stAr, stEn] = renewalStatusMap[ev] ?? ['—', '—'];
    const ref =
      toStr(e.agreementNo) && toStr(e.prevAgreementNo) && e.agreementNo !== e.prevAgreementNo
        ? `${toStr(e.prevAgreementNo)} → ${toStr(e.agreementNo)}`
        : toStr(e.agreementNo) || toStr(e.prevAgreementNo);
    pushLedger(
      e.at,
      typeAr,
      typeEn,
      toStr(e.party),
      ref,
      toStr(e.from) || toStr(e.prevFrom),
      toStr(e.to) || toStr(e.prevTo),
      stAr,
      stEn,
      toStr(e.rent) || '-',
      [
        toStr(e.prevFrom) && toStr(e.prevTo)
          ? `الفترة السابقة: ${toStr(e.prevFrom)} — ${toStr(e.prevTo)}`
          : '',
        toStr(e.note),
      ]
        .filter(Boolean)
        .join(' · '),
      toStr(e.staffName),
      { sourceKind: 'renewal_log', actionId: toStr(e.id) }
    );
  });

  const renewalDraftMap = parseJson<Record<string, Record<string, unknown>>>(kv.bhd_contract_renewal_drafts, {});
  Object.values(renewalDraftMap).forEach((e) => {
    if (!e) return;
    const p = (e.payload && typeof e.payload === 'object' ? e.payload : {}) as Record<string, unknown>;
    const r = (e.renewal && typeof e.renewal === 'object' ? e.renewal : {}) as Record<string, unknown>;
    const prev = (e.previousSnapshot && typeof e.previousSnapshot === 'object'
      ? e.previousSnapshot
      : {}) as Record<string, unknown>;
    if (!unitMatches(bk, uk, p.buildingNo, p.flatNo)) return;
    const pending = toStr(e.lifecycleStatus) === 'renewal_pending';
    pushLedger(
      e.updatedAt,
      'مسودة تجديد عقد',
      'Contract renewal draft',
      toStr(prev.tenantNameAr || prev.tenantNameEn),
      toStr(r.agreementNo || p.agreementNo),
      toStr(r.newStart || p.startDate),
      toStr(r.newEnd || p.endDate),
      pending ? 'تجديد — مطلوب بيانات' : 'مسودة',
      pending ? 'Renewal — additional data' : 'Draft',
      formatOmrAmount(p.monthlyRent ?? prev.monthlyRent),
      [
        toStr(prev.agreementNo) ? `العقد السابق: ${toStr(prev.agreementNo)}` : '',
        `آخر تحديث: ${toStr(e.updatedAt).slice(0, 16)}`,
      ]
        .filter(Boolean)
        .join(' · '),
      toStr(e.lastActorName),
      { sourceKind: 'renewal_draft' }
    );
  });

  const renewalRequests = parseJson<Record<string, unknown>[]>(kv.bhd_contract_renewal_requests, []);
  const reqStatusMap: Record<string, [string, string]> = {
    pending: ['معلّق', 'Pending'],
    approved: ['موافق عليه', 'Approved'],
    rejected: ['مرفوض', 'Rejected'],
  };
  renewalRequests.forEach((req) => {
    if (!unitMatches(bk, uk, req.buildingNo, req.flatNo)) return;
    const st = toStr(req.status);
    const [stAr, stEn] = reqStatusMap[st] ?? ['—', '—'];
    pushLedger(
      req.resolvedAt ?? req.requestedAt,
      'طلب تجديد مبكر',
      'Early renewal request',
      toStr(req.requestedByName),
      toStr(req.agreementNo),
      toStr(req.requestedAt).slice(0, 10),
      toStr(req.contractEndDate).slice(0, 10) || '-',
      stAr,
      stEn,
      '-',
      [toStr(req.note), req.rejectionNote ? `سبب الرفض: ${toStr(req.rejectionNote)}` : '']
        .filter(Boolean)
        .join(' · '),
      toStr(req.requestedByName),
      { sourceKind: 'renewal_request', actionId: toStr(req.id) }
    );
  });

  const editRequests = parseJson<Record<string, unknown>[]>(kv.bhd_contract_edit_requests, []);
  editRequests.forEach((req) => {
    if (!unitMatches(bk, uk, req.buildingNo, req.flatNo)) return;
    const st = toStr(req.status);
    const stMap: Record<string, [string, string]> = {
      pending: ['معلّق', 'Pending'],
      approved: ['موافق', 'Approved'],
      rejected: ['مرفوض', 'Rejected'],
    };
    const [stAr, stEn] = stMap[st] ?? [st || '—', st || '—'];
    pushLedger(
      req.lastMessageAt ?? req.resolvedAt ?? req.requestedAt,
      'طلب تعديل عقد',
      'Contract edit request',
      toStr(req.requestedByName),
      toStr(req.agreementNo),
      toStr(req.requestedAt).slice(0, 10),
      toStr(req.resolvedAt).slice(0, 10) || '-',
      stAr,
      stEn,
      '-',
      toStr(req.summaryNote) || toStr(req.note),
      toStr(req.requestedByName),
      { sourceKind: 'contract_edit_request', actionId: toStr(req.id) }
    );
  });

  const activityLog = parseJson<Record<string, unknown>[]>(kv.bhd_system_activity_log, []);
  activityLog.forEach((act) => {
    if (!act || typeof act !== 'object') return;
    if (!unitMatches(bk, uk, act.building, act.unit)) return;
    const when = toStr(act.actedAt || act.at);
    pushLedger(
      when,
      toStr(act.actionAr) || 'حركة نظام',
      toStr(act.actionEn) || 'System activity',
      '-',
      toStr(act.ref) || '-',
      when.slice(0, 10) || '-',
      '-',
      'مُسجَّلة',
      'Logged',
      '-',
      [toStr(act.note), toStr(act.storageKey) ? `KV: ${toStr(act.storageKey)}` : ''].filter(Boolean).join(' · '),
      toStr(act.staffName),
      { sourceKind: 'system_activity', actionId: toStr(act.id) }
    );
  });

  const mntReg = parseJson<{ requests?: Record<string, unknown>[] }>(kv.bhd_maintenance_registry, { requests: [] });
  const mntUk = maintenanceUnitKey(buildingRaw, unitRaw);
  const mntUkNorm = `${bk}\t${uk}`;
  (mntReg.requests ?? []).forEach((req) => {
    if (!req || typeof req !== 'object') return;
    const row = req as Record<string, unknown>;
    const key = toStr(row.unitKey);
    if (key !== mntUk && key !== mntUkNorm) return;
    const items = Array.isArray(row.items) ? row.items : [];
    const note = items
      .map((it) => {
        if (!it || typeof it !== 'object') return '';
        const item = it as Record<string, unknown>;
        return toStr(item.labelAr || item.subtypeKey);
      })
      .filter(Boolean)
      .join('، ');
    pushLedger(
      row.completedAt ?? row.createdAt,
      'صيانة',
      'Maintenance',
      toStr(row.tenant),
      toStr(row.requestNo),
      toStr(row.createdAt).slice(0, 10),
      toStr(row.completedAt).slice(0, 10) || '-',
      maintenanceStatusLabel(toStr(row.status), true),
      maintenanceStatusLabel(toStr(row.status), false),
      formatOmrAmount(maintenanceRequestTotal(row)),
      note,
      toStr(row.completedBy || row.createdBy),
      { sourceKind: 'maintenance', actionId: toStr(row.id) }
    );
  });

  const accReg = parseJson<{ cheques?: Record<string, unknown>[]; entries?: Record<string, unknown>[] }>(
    kv.bhd_accounting_registry,
    { cheques: [], entries: [] }
  );
  const accUk = accountingUnitKey(buildingRaw, unitRaw);
  (accReg.cheques ?? []).forEach((c) => {
    if (!c || typeof c !== 'object') return;
    if (toStr((c as Record<string, unknown>).unitKey) !== accUk) return;
    const row = c as Record<string, unknown>;
    const st = toStr(row.status);
    pushLedger(
      row.lastActionDate ?? row.dueDate ?? row.createdAt,
      'شيك محاسبة',
      'Accounting cheque',
      toStr(row.tenantName || row.party),
      toStr(row.linkedKey || row.chequeNo),
      toStr(row.dueDate).slice(0, 10),
      toStr(row.lastActionDate).slice(0, 10) || '-',
      st || '—',
      st || '—',
      formatOmrAmount(row.amount),
      toStr(row.accountantNote),
      toStr(row.lastActorName),
      { sourceKind: 'accounting_cheque' }
    );
  });
  (accReg.entries ?? []).forEach((e) => {
    if (!e || typeof e !== 'object') return;
    if (toStr((e as Record<string, unknown>).unitKey) !== accUk) return;
    const row = e as Record<string, unknown>;
    pushLedger(
      row.postedAt ?? row.createdAt,
      'قيد محاسبة',
      'Accounting entry',
      toStr(row.party || row.tenantName),
      toStr(row.ref || row.entryNo),
      toStr(row.postedAt || row.createdAt).slice(0, 10),
      '-',
      toStr(row.status) || '—',
      toStr(row.status) || '—',
      formatOmrAmount(row.amount),
      toStr(row.note || row.description),
      toStr(row.postedBy || row.createdBy),
      { sourceKind: 'accounting_entry' }
    );
  });

  out.sort((a, b) => (b.sortMs || 0) - (a.sortMs || 0));

  const seen = new Set<string>();
  return out
    .filter((row) => {
      const fp = `${row.actionId || ''}|${row.typeAr}|${row.party}|${row.ref}|${row.from}|${row.to}|${row.statusAr}|${row.note}|${row.staff}`;
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    })
    .map(({ actionType: _a, actionId: _i, ...rest }) => rest);
}

export function ledgerStatusKind(statusAr: string, statusEn: string): string {
  const raw = `${statusAr} ${statusEn}`.toLowerCase();
  if (/ملغ|cancel/i.test(raw)) return 'cancelled';
  if (/مؤرشف|archiv|منتهي|ended/i.test(raw)) return 'archived';
  if (/مكتمل|completed|حالي|نشط|active|current|ساري/i.test(raw)) return 'current';
  if (/مسودة|draft/i.test(raw)) return 'draft';
  if (/معلق|pending|قيد/i.test(raw)) return 'pending';
  return 'pending';
}
