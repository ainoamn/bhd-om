/**
 * منع حجز مزدوج لنفس العقار/الوحدة من نفس المستخدم (خادم).
 */

function normalizeEmail(e: string): string {
  return (e || '').trim().toLowerCase();
}

function normalizePhoneLast8(phone: string): string {
  const d = (phone || '').replace(/\D/g, '');
  const without = d.startsWith('968') ? d.slice(3) : d.replace(/^0+/, '');
  return without.slice(-8);
}

function sameBookingIdentity(
  a: { email?: string; phone?: string; userId?: string | null },
  b: { email?: string; phone?: string; userId?: string | null }
): boolean {
  const ua = (a.userId || '').trim();
  const ub = (b.userId || '').trim();
  if (ua && ub && ua === ub) return true;
  const ea = normalizeEmail(a.email || '');
  const eb = normalizeEmail(b.email || '');
  if (ea.length >= 3 && eb.length >= 3 && ea === eb) return true;
  const pa = normalizePhoneLast8(a.phone || '');
  const pb = normalizePhoneLast8(b.phone || '');
  if (pa.length >= 8 && pb.length >= 8 && pa === pb) return true;
  return false;
}

function isActiveBookingStatus(status: string | undefined): boolean {
  const s = (status || 'PENDING').toUpperCase();
  return s !== 'CANCELLED' && s !== 'RENTED' && s !== 'SOLD';
}

export function parseBookingJson(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * يعيد معرف الحجز المتعارض إن وُجد حجز BOOKING نشط لنفس العقار/الوحدة ونفس المستخدم.
 */
export function findConflictingActiveBooking(
  incoming: Record<string, unknown>,
  existingRows: Array<{ bookingId: string; data: string }>
): { conflictingBookingId: string } | null {
  const newId = String(incoming.id || '').trim();
  if (String(incoming.type || '') !== 'BOOKING') return null;
  if (!isActiveBookingStatus(String(incoming.status))) return null;

  const pid = Number(incoming.propertyId);
  if (!Number.isFinite(pid)) return null;
  const unitKey = typeof incoming.unitKey === 'string' ? incoming.unitKey : '';

  const newUser = {
    email: typeof incoming.email === 'string' ? incoming.email : '',
    phone: typeof incoming.phone === 'string' ? incoming.phone : '',
    userId: typeof incoming.userId === 'string' ? incoming.userId : null,
  };

  for (const row of existingRows) {
    if (row.bookingId === newId) continue;
    const b = parseBookingJson(row.data);
    if (!b) continue;
    if (String(b.type || '') !== 'BOOKING') continue;
    if (!isActiveBookingStatus(String(b.status))) continue;
    if (Number(b.propertyId) !== pid) continue;
    if ((typeof b.unitKey === 'string' ? b.unitKey : '') !== unitKey) continue;

    const existingUser = {
      email: typeof b.email === 'string' ? b.email : '',
      phone: typeof b.phone === 'string' ? b.phone : '',
      userId: typeof b.userId === 'string' ? b.userId : null,
    };
    if (sameBookingIdentity(newUser, existingUser)) {
      return { conflictingBookingId: row.bookingId };
    }
  }
  return null;
}
