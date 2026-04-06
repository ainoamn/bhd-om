/**
 * تقسيم الاسم الكامل إلى حقول دفتر العناوين دون حذف مقاطع وسطى.
 * عند 5+ كلمات: الاسم الثاني = كل الأوسط ما عدا المقطع الأخير قبل العائلة (يدعم «عبد الحميد» مركّباً)، الثالث = المقطع قبل العائلة مباشرة.
 */

export type NamePartsFromFullName = {
  firstName: string;
  secondName?: string;
  thirdName?: string;
  familyName: string;
};

export function splitFullNameToParts(fullName: string): NamePartsFromFullName {
  const parts = fullName.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '—', familyName: '—' };
  }
  if (parts.length === 1) {
    const one = parts[0]!;
    return { firstName: one, familyName: one };
  }
  const firstName = parts[0]!;
  const familyName = parts[parts.length - 1]!;
  const remaining = parts.slice(1, -1);
  if (remaining.length === 0) {
    return { firstName, familyName };
  }
  if (remaining.length === 1) {
    return { firstName, secondName: remaining[0], familyName };
  }
  if (remaining.length === 2) {
    return { firstName, secondName: remaining[0], thirdName: remaining[1], familyName };
  }
  /** 3+ مقاطع وسطى: الثاني مركّب (ما عدا الأخير)، الثالث = ما قبل العائلة مباشرة */
  const thirdName = remaining[remaining.length - 1]!;
  const secondName = remaining.slice(0, -1).join(' ');
  return { firstName, secondName, thirdName, familyName };
}

/** يطبّق التقسيم على كائن JSON جهة اتصال (حقول الاسم الأربعة) */
export function applySplitFullNameToContactJson(data: Record<string, unknown>, fullName: string): void {
  const np = splitFullNameToParts(fullName);
  data.firstName = np.firstName;
  data.familyName = np.familyName;
  if (np.secondName !== undefined && np.secondName !== '') {
    data.secondName = np.secondName;
  } else {
    delete data.secondName;
  }
  if (np.thirdName !== undefined && np.thirdName !== '') {
    data.thirdName = np.thirdName;
  } else {
    delete data.thirdName;
  }
}
