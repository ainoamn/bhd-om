/**
 * يطبّق حقول الهوية من جدول User على كائن جهة الاتصال (JSON دفتر العناوين)
 * حتى تتطابق العرض مع صفحة المستخدمين وليس مع نسخة JSON قديمة.
 *
 * أجزاء الاسم (الأول/الثاني/الثالث/العائلة) تُؤخذ من JSON المحفوظ عند وجودها —
 * لا نعيد تقسيم `User.name` فوقها (كان يفسد الأسماء المركبة ويدمج الوسطى مع العائلة).
 */

function hasStoredNameParts(data: Record<string, unknown>): boolean {
  for (const k of ['firstName', 'secondName', 'thirdName', 'familyName'] as const) {
    const v = data[k];
    if (typeof v === 'string' && v.trim().length > 0) return true;
  }
  return false;
}

/** Fallback قديم: لا يوجد إلا User.name — تقسيم بسيط (لا يُستدعى إذا وُجدت أجزاء في JSON) */
function applyNamePartsFromUserFullName(data: Record<string, unknown>, fullName: string): void {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return;
  data.firstName = parts[0];
  data.familyName = parts.length > 1 ? parts[parts.length - 1]! : parts[0];
  if (parts.length > 3) {
    data.secondName = parts[1];
    data.thirdName = parts[2];
  } else if (parts.length === 3) {
    data.secondName = parts[1];
    data.thirdName = undefined;
  } else {
    data.secondName = undefined;
    data.thirdName = undefined;
  }
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
  if (hasStoredNameParts(data)) {
    return;
  }
  applyNamePartsFromUserFullName(data, user.name || '');
}
