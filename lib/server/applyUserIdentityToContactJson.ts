/**
 * يطبّق حقول الهوية من جدول User على كائن جهة الاتصال (JSON دفتر العناوين)
 * حتى تتطابق العرض مع صفحة المستخدمين وليس مع نسخة JSON قديمة.
 *
 * - `User.name` مصدر الاسم الكامل المعروض؛ يُخزَّن في `data.name`.
 * - إذا وُجدت أجزاء في JSON وتطابق دمجها `User.name` نحتفظ بها (أسماء مركبة محفوظة من «حسابي»).
 * - إذا اختلف الدمج عن `User.name` نُعيد تعبئة الأجزاء عبر `splitFullNameToParts` (لا حذف للمقطع قبل العائلة؛ الاسم الثاني المركّب يُجمَّع في حقل واحد).
 */

import { applySplitFullNameToContactJson } from '@/lib/server/namePartsFromFullName';

function normSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function hasStoredNameParts(data: Record<string, unknown>): boolean {
  for (const k of ['firstName', 'secondName', 'thirdName', 'familyName'] as const) {
    const v = data[k];
    if (typeof v === 'string' && v.trim().length > 0) return true;
  }
  return false;
}

function joinedPartsFromData(data: Record<string, unknown>): string {
  const parts = ['firstName', 'secondName', 'thirdName', 'familyName']
    .map((k) => (typeof data[k] === 'string' ? String(data[k]).trim() : ''))
    .filter((x) => x.length > 0);
  return normSpaces(parts.join(' '));
}

export function applyUserIdentityToContactJson(
  data: Record<string, unknown>,
  user: { id: string; serialNumber: string; name: string; email: string; phone: string | null }
): void {
  data.serialNumber = user.serialNumber;
  data.userId = user.id;
  const el = (user.email || '').toLowerCase();
  if (!el.includes('@nologin.bhd')) {
    data.email = user.email;
  }
  if (user.phone) {
    data.phone = user.phone;
  }

  const un = normSpaces(user.name || '');
  data.name = user.name;

  if (!un) {
    return;
  }

  const partsJoined = joinedPartsFromData(data);
  if (hasStoredNameParts(data) && partsJoined && normSpaces(partsJoined) === un) {
    return;
  }
  applySplitFullNameToContactJson(data, user.name);
}
