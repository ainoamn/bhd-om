import { buildOperationsUnitsFromKv } from '@/lib/real-estate/buildOperationsUnits';
import type { LegacyKvStringMap } from '@/lib/real-estate/dashboardKvKeys';
import { daysUntil, parseJson, toStr } from '@/lib/real-estate/kvParse';

export type CalendarEventKind =
  | 'task'
  | 'rent'
  | 'cheque'
  | 'contract'
  | 'overdue'
  | 'document'
  | 'birthday_tenant'
  | 'birthday_contact'
  | 'occasion';

export type DashboardCalendarEvent = {
  id: string;
  date: string;
  kind: CalendarEventKind;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  building?: string;
  unit?: string;
};

const TASK_OPEN = new Set(['open', 'in_progress', 'pending']);
const PAID_CHEQUE = new Set(['paid_full', 'paid_partial', 'paid_cash']);

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function inMonth(dateStr: string, year: number, month: number): boolean {
  const d = toStr(dateStr).slice(0, 10);
  return d.slice(0, 7) === monthKey(year, month);
}

function isChequeOverdue(dueDate: string, status: string): boolean {
  const st = toStr(status);
  if (st === 'pending_receipt' || st === 'receipt_rejected') return false;
  if (st !== 'pending' && st !== 'paid_partial' && st !== 'deferred') return false;
  const d = daysUntil(dueDate);
  return d !== null && d < 0;
}

function pushEvent(
  out: DashboardCalendarEvent[],
  ev: Omit<DashboardCalendarEvent, 'id'> & { id?: string }
): void {
  out.push({
    ...ev,
    id: ev.id || `${ev.kind}-${ev.date}-${out.length}`,
  });
}

export function collectDashboardCalendarEvents(
  kv: LegacyKvStringMap,
  year: number,
  month: number
): DashboardCalendarEvent[] {
  const events: DashboardCalendarEvent[] = [];
  const { rows: units } = buildOperationsUnitsFromKv(kv);

  const tasksReg = parseJson<{
    tasks?: Array<{
      id?: string;
      title?: string;
      taskNo?: string;
      status?: string;
      dueDate?: string;
      createdAt?: string;
      building?: string;
      unit?: string;
    }>;
    settings?: {
      occasions?: Array<{ id?: string; date?: string; titleAr?: string; titleEn?: string }>;
    };
  }>(kv.bhd_tasks_registry, {});

  (tasksReg.tasks || []).forEach((task) => {
    if (!TASK_OPEN.has(toStr(task.status).toLowerCase())) return;
    const dt = toStr(task.dueDate) || toStr(task.createdAt).slice(0, 10);
    if (!dt || !inMonth(dt, year, month)) return;
    pushEvent(events, {
      date: dt.slice(0, 10),
      kind: 'task',
      titleAr: toStr(task.title) || 'مهمة',
      titleEn: toStr(task.title) || 'Task',
      subtitleAr: [task.taskNo, task.building, task.unit].filter(Boolean).join(' · '),
      subtitleEn: [task.taskNo, task.building, task.unit].filter(Boolean).join(' · '),
      building: task.building,
      unit: task.unit,
    });
  });

  const acct = parseJson<{
    cheques?: Array<{
      id?: string;
      dueDate?: string;
      status?: string;
      sourceType?: string;
      chequeNo?: string;
      building?: string;
      unit?: string;
      tenant?: string;
      amount?: number | string;
    }>;
    entries?: Array<{
      id?: string;
      dueDate?: string;
      status?: string;
      title?: string;
      building?: string;
      unit?: string;
      amount?: number | string;
    }>;
  }>(kv.bhd_accounting_registry, {});

  (acct.cheques || []).forEach((c) => {
    const due = toStr(c.dueDate);
    if (!due || !inMonth(due, year, month)) return;
    if (PAID_CHEQUE.has(toStr(c.status))) return;
    const overdue = isChequeOverdue(due, toStr(c.status));
    const isVat = toStr(c.sourceType) === 'vat';
    const kind: CalendarEventKind = overdue ? 'overdue' : isVat ? 'cheque' : 'rent';
    pushEvent(events, {
      id: `cheque-${c.id || due}`,
      date: due.slice(0, 10),
      kind,
      titleAr: isVat
        ? `شيك ضريبة ${toStr(c.chequeNo) || '—'}`
        : `إيجار مستحق ${toStr(c.chequeNo) || '—'}`,
      titleEn: isVat
        ? `VAT cheque ${toStr(c.chequeNo) || '—'}`
        : `Rent due ${toStr(c.chequeNo) || '—'}`,
      subtitleAr: `${c.building || ''} / ${c.unit || ''} — ${c.tenant || '—'}`,
      subtitleEn: `${c.building || ''} / ${c.unit || ''} — ${c.tenant || '—'}`,
      building: c.building,
      unit: c.unit,
    });
  });

  (acct.entries || []).forEach((e) => {
    const due = toStr(e.dueDate);
    if (!due || !inMonth(due, year, month)) return;
    const st = toStr(e.status).toLowerCase();
    if (st === 'paid' || st === 'cancelled') return;
    pushEvent(events, {
      id: `entry-${e.id || due}`,
      date: due.slice(0, 10),
      kind: 'rent',
      titleAr: `مستحق: ${toStr(e.title) || '—'}`,
      titleEn: `Due: ${toStr(e.title) || '—'}`,
      subtitleAr: `${e.building || ''} / ${e.unit || ''}`,
      subtitleEn: `${e.building || ''} / ${e.unit || ''}`,
      building: e.building,
      unit: e.unit,
    });
  });

  units.forEach((unit) => {
    const end = toStr(unit.endDate);
    if (!end || !inMonth(end, year, month)) return;
    if (toStr(unit.status).toLowerCase() !== 'rented') return;
    const days = unit.daysLeft;
    pushEvent(events, {
      date: end.slice(0, 10),
      kind: 'contract',
      titleAr: `انتهاء عقد ${toStr(unit.agreementNo) || '—'}`,
      titleEn: `Contract ends ${toStr(unit.agreementNo) || '—'}`,
      subtitleAr: `${unit.building} / ${unit.unit} — ${unit.tenant || '—'}${days != null ? ` (${days} يوم)` : ''}`,
      subtitleEn: `${unit.building} / ${unit.unit} — ${unit.tenant || '—'}${days != null ? ` (${days}d)` : ''}`,
      building: unit.building,
      unit: unit.unit,
    });
  });

  (tasksReg.settings?.occasions || []).forEach((oc: { id?: string; date?: string; titleAr?: string; titleEn?: string }) => {
    const dt = toStr(oc.date);
    if (!dt || !inMonth(dt, year, month)) return;
    pushEvent(events, {
      id: `occasion-${oc.id || dt}`,
      date: dt.slice(0, 10),
      kind: 'occasion',
      titleAr: toStr(oc.titleAr) || toStr(oc.titleEn) || 'مناسبة',
      titleEn: toStr(oc.titleEn) || toStr(oc.titleAr) || 'Occasion',
      subtitleAr: 'مناسبة من إعدادات المهام',
      subtitleEn: 'Occasion from task settings',
    });
  });

  type AbEntry = {
    name?: string;
    nameEn?: string;
    type?: string;
    birthDate?: string;
    idExpiryDate?: string;
    passportExpiryDate?: string;
    commercialRegExpiry?: string;
    building?: string;
    unit?: string;
  };

  const addressBook = parseJson<AbEntry[]>(kv.bhd_address_book, []);
  addressBook.forEach((entry) => {
    const name = toStr(entry.name) || toStr(entry.nameEn) || '—';
    const docExpiries: Array<{ labelAr: string; labelEn: string; date: string }> = [];
    if (toStr(entry.idExpiryDate)) {
      docExpiries.push({ labelAr: 'بطاقة', labelEn: 'ID', date: entry.idExpiryDate! });
    }
    if (toStr(entry.passportExpiryDate)) {
      docExpiries.push({ labelAr: 'جواز', labelEn: 'Passport', date: entry.passportExpiryDate! });
    }
    if (toStr(entry.commercialRegExpiry)) {
      docExpiries.push({ labelAr: 'سجل تجاري', labelEn: 'CR', date: entry.commercialRegExpiry! });
    }
    docExpiries.forEach((doc) => {
      if (!inMonth(doc.date, year, month)) return;
      const days = daysUntil(doc.date);
      pushEvent(events, {
        date: doc.date.slice(0, 10),
        kind: 'document',
        titleAr: `${doc.labelAr} — ${name}`,
        titleEn: `${doc.labelEn} — ${name}`,
        subtitleAr:
          days !== null && days < 0
            ? 'منتهي'
            : days !== null
              ? `ينتهي خلال ${days} يوم`
              : '',
        subtitleEn:
          days !== null && days < 0
            ? 'Expired'
            : days !== null
              ? `Expires in ${days} days`
              : '',
        building: entry.building,
        unit: entry.unit,
      });
    });

    const bd = toStr(entry.birthDate);
    if (bd) {
      const parts = bd.slice(0, 10).split('-');
      if (parts.length === 3) {
        const bMonth = Number(parts[1]);
        const bDay = Number(parts[2]);
        if (bMonth === month && Number.isFinite(bDay)) {
          const ymd = `${year}-${String(month).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
          const entType = toStr(entry.type).toLowerCase();
          const kind: CalendarEventKind =
            entType === 'tenant' ? 'birthday_tenant' : 'birthday_contact';
          const typeLblAr =
            entType === 'tenant' ? 'مستأجر' : entType === 'owner' ? 'مالك' : 'جهة اتصال';
          const typeLblEn =
            entType === 'tenant' ? 'Tenant' : entType === 'owner' ? 'Owner' : 'Contact';
          pushEvent(events, {
            date: ymd,
            kind,
            titleAr: `🎂 ${name}`,
            titleEn: `🎂 ${name}`,
            subtitleAr: typeLblAr,
            subtitleEn: typeLblEn,
            building: entry.building,
            unit: entry.unit,
          });
        }
      }
    }
  });

  events.sort((a, b) => a.date.localeCompare(b.date) || a.titleAr.localeCompare(b.titleAr, 'ar'));
  return events;
}

export const CALENDAR_KV_KEYS = [
  'bhd_managed_units',
  'bhd_saved_contracts_by_unit',
  'bhd_tenancy_contract_drafts',
  'bhd_building_profiles',
  'bhd_owner_building_map',
  'bhd_unit_reservations',
  'bhd_contract_renewal_drafts',
  'bhd_tasks_registry',
  'bhd_accounting_registry',
  'bhd_address_book',
] as const;
