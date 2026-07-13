'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import type { DashboardCalendarEvent, CalendarEventKind } from '@/lib/real-estate/dashboardCalendar';
import { buildLegacyUnitActionUrl } from '@/lib/real-estate/legacyUnitLinks';

type Props = {
  locale: 'ar' | 'en';
};

type CalendarResponse = {
  year: number;
  month: number;
  events: DashboardCalendarEvent[];
};

const DOW_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const KIND_CLASS: Record<CalendarEventKind, string> = {
  task: 're-cal-ev--task',
  rent: 're-cal-ev--rent',
  cheque: 're-cal-ev--cheque',
  contract: 're-cal-ev--contract',
  overdue: 're-cal-ev--overdue',
};

export default function RealEstateDashboardCalendar({ locale }: Props) {
  const ar = locale === 'ar';
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<DashboardCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/real-estate-dashboard/calendar?year=${year}&month=${month}`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (!res.ok) throw new Error('calendar failed');
      const json = (await res.json()) as CalendarResponse;
      setEvents(json.events);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDay(null);
  };

  const byDate = useMemo(() => {
    const map = new Map<string, DashboardCalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<{ ymd: string | null; day: number | null }> = [];
    for (let i = 0; i < startDow; i++) cells.push({ ymd: null, day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ ymd, day });
    }
    return cells;
  }, [year, month]);

  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
  const selectedEvents = selectedDay ? byDate.get(selectedDay) || [] : [];

  return (
    <section className="re-calendar-section admin-card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold opacity-90">
            {ar ? 'التقويم التشغيلي' : 'Operations calendar'}
          </h3>
          <p className="text-xs opacity-60 mt-1">
            {ar
              ? `${events.length} حدث — مهام، إيجار، شيكات، انتهاء عقود`
              : `${events.length} events — tasks, rent, cheques, contract expiry`}
            {' · '}
            <span dir="ltr">{monthLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="admin-btn admin-btn-secondary text-xs px-2 py-1">
            ◀
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="admin-btn admin-btn-secondary text-xs px-2 py-1">
            ▶
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="admin-btn admin-btn-secondary inline-flex items-center gap-1 text-xs"
          >
            <Icon name="arrowPath" className="w-3.5 h-3.5" aria-hidden />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm opacity-60 py-6 text-center">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
      ) : (
        <>
          <div className="re-cal-grid mb-3">
            {(ar ? DOW_AR : DOW_EN).map((d) => (
              <div key={d} className="re-cal-dow text-xs font-semibold opacity-60 text-center py-1">
                {d}
              </div>
            ))}
            {grid.map((cell, idx) => {
              if (!cell.ymd || cell.day === null) {
                return <div key={`empty-${idx}`} className="re-cal-day re-cal-day--empty" />;
              }
              const dayEvents = byDate.get(cell.ymd) || [];
              const hasEvents = dayEvents.length > 0;
              const isToday = cell.ymd === todayYmd;
              const isSelected = cell.ymd === selectedDay;
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : cell.ymd)}
                  className={`re-cal-day text-left${isToday ? ' re-cal-day--today' : ''}${hasEvents ? ' re-cal-day--has-events' : ''}${isSelected ? ' re-cal-day--selected' : ''}`}
                >
                  <span className="re-cal-day-num">
                    {cell.day}
                    {hasEvents ? <span className="re-cal-day-badge">{dayEvents.length}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] opacity-80 mb-3">
            <span className="re-cal-legend re-cal-ev--task">{ar ? 'مهام' : 'Tasks'}</span>
            <span className="re-cal-legend re-cal-ev--rent">{ar ? 'إيجار' : 'Rent'}</span>
            <span className="re-cal-legend re-cal-ev--cheque">{ar ? 'شيكات' : 'Cheques'}</span>
            <span className="re-cal-legend re-cal-ev--contract">{ar ? 'عقود' : 'Contracts'}</span>
            <span className="re-cal-legend re-cal-ev--overdue">{ar ? 'متأخر' : 'Overdue'}</span>
          </div>

          {selectedDay ? (
            <div className="re-cal-day-panel border-t border-[var(--admin-border)] pt-3">
              <p className="text-xs font-semibold mb-2" dir="ltr">
                {selectedDay}
                {' — '}
                {selectedEvents.length} {ar ? 'حدث' : 'events'}
              </p>
              {selectedEvents.length === 0 ? (
                <p className="text-xs opacity-60">{ar ? 'لا أحداث' : 'No events'}</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEvents.map((ev) => (
                    <li key={ev.id} className="text-xs flex flex-wrap items-start gap-2">
                      <span className={`re-cal-ev-pill ${KIND_CLASS[ev.kind]}`}>
                        {ar ? ev.titleAr : ev.titleEn}
                      </span>
                      <span className="opacity-70">{ar ? ev.subtitleAr : ev.subtitleEn}</span>
                      {ev.building && ev.unit ? (
                        <a
                          href={buildLegacyUnitActionUrl(ev.building, ev.unit, 'details', locale)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-accent-text font-semibold hover:underline"
                        >
                          {ar ? 'فتح' : 'Open'}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
