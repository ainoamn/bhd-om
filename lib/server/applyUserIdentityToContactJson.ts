/**
 * يطبّق حقول الهوية من جدول User على كائن جهة الاتصال (JSON دفتر العناوين)
 * حتى تتطابق العرض مع صفحة المستخدمين وليس مع نسخة JSON قديمة.
 */

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
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
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
}
