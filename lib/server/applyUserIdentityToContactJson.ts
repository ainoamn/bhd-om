/**
 * يطبّق حقول الهوية من جدول User على كائن جهة الاتصال (JSON دفتر العناوين)
 * حتى تتطابق العرض مع صفحة المستخدمين وليس مع نسخة JSON قديمة.
 *
 * مرآة لجدول المستخدمين: `User.name` يُنسَخ إلى `data.name` وتُعاد مزامنة أجزاء الاسم منه دائماً
 * (لا نحتفظ بأجزاء قديمة قد تختلف عن الاسم المعروض في «المستخدمين»).
 */

import { applySplitFullNameToContactJson } from '@/lib/server/namePartsFromFullName';

function normSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
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

  applySplitFullNameToContactJson(data, user.name);
}
