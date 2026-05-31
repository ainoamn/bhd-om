/**
 * إيجاد ودمج جهات اتصال مكررة — مشترك بين العميل والخادم
 */
import type { Contact } from '@/lib/data/addressBook';
import { getRepDisplayName, normalizePhoneForComparison } from '@/lib/data/addressBook';

export function findDuplicateContactFieldsInList(
  list: Contact[],
  phone: string,
  civilId?: string,
  passportNumber?: string,
  excludeContactId?: string,
  commercialRegistrationNumber?: string,
  excludeContactIds?: string[]
): {
  phone?: Contact;
  civilId?: Contact;
  passportNumber?: Contact;
  commercialRegistration?: Contact;
} {
  const normPhone = normalizePhoneForComparison(phone || '');
  const normCivilId = (civilId || '').replace(/\D/g, '').trim();
  const normPassport = (passportNumber || '').trim().toUpperCase();
  const normCr = (commercialRegistrationNumber || '').replace(/\D/g, '').trim();
  const result: {
    phone?: Contact;
    civilId?: Contact;
    passportNumber?: Contact;
    commercialRegistration?: Contact;
  } = {};
  const excludeSet = new Set((excludeContactIds || []).map((x) => String(x).trim()));
  if (excludeContactId) excludeSet.add(String(excludeContactId).trim());

  for (const c of list) {
    const cId = String(c.id ?? '').trim();
    if (cId && excludeSet.has(cId)) continue;
    const cNorm = normalizePhoneForComparison(c.phone || '');
    if (normPhone.length >= 6 && cNorm.length >= 6 && normPhone === cNorm) result.phone = c;
    if (normCivilId.length >= 4 && (c.civilId || '').replace(/\D/g, '').trim() === normCivilId) result.civilId = c;
    if (normPassport.length >= 4 && (c.passportNumber || '').trim().toUpperCase() === normPassport)
      result.passportNumber = c;
    if (normCr.length >= 4 && (c.companyData?.commercialRegistrationNumber || '').replace(/\D/g, '').trim() === normCr)
      result.commercialRegistration = c;
  }
  return result;
}

/** إيجاد مجموعات التكرار (إغلاق متعدٍ) من قائمة جهات */
export function findDuplicateContactGroupsFromList(list: Contact[]): Contact[][] {
  const seen = new Set<string>();
  const groups: Contact[][] = [];

  const addTransitive = (start: Contact): Contact[] => {
    const group: Contact[] = [];
    const toProcess = [start];
    const inGroup = new Set<string>();
    while (toProcess.length > 0) {
      const cur = toProcess.pop()!;
      if (inGroup.has(cur.id)) continue;
      inGroup.add(cur.id);
      group.push(cur);
      const crNum = cur.companyData?.commercialRegistrationNumber;
      const dups = findDuplicateContactFieldsInList(list, cur.phone, cur.civilId, cur.passportNumber, undefined, crNum);
      for (const d of [dups.phone, dups.civilId, dups.passportNumber, dups.commercialRegistration]) {
        if (d && !inGroup.has(d.id)) toProcess.push(d);
      }
    }
    return group;
  };

  for (const c of list) {
    if (seen.has(c.id)) continue;
    const group = addTransitive(c);
    if (group.length > 1) {
      group.forEach((m) => seen.add(m.id));
      groups.push(group);
    }
  }
  return groups;
}

/** دمج مجموعة جهات — يُحفظ الأقدم ويُرجع المعرفات المحذوفة */
export function mergeContactGroup(toMerge: Contact[]): { merged: Contact; removeIds: string[] } | null {
  if (toMerge.length < 2) return null;
  const byDate = [...toMerge].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const keep = byDate[0];
  const mergeFrom = byDate.slice(1);
  const allHistory = [
    ...(keep.categoryChangeHistory || []),
    ...mergeFrom.flatMap((o) => o.categoryChangeHistory || []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const merged: Contact = {
    ...keep,
    firstName: keep.firstName || mergeFrom.find((o) => o.firstName)?.firstName || keep.firstName,
    secondName: keep.secondName || mergeFrom.find((o) => o.secondName)?.secondName,
    thirdName: keep.thirdName || mergeFrom.find((o) => o.thirdName)?.thirdName,
    familyName: keep.familyName || mergeFrom.find((o) => o.familyName)?.familyName || keep.familyName,
    phone: keep.phone || mergeFrom.find((o) => o.phone)?.phone || keep.phone,
    email: keep.email || mergeFrom.find((o) => o.email)?.email,
    civilId: keep.civilId || mergeFrom.find((o) => o.civilId)?.civilId,
    passportNumber: keep.passportNumber || mergeFrom.find((o) => o.passportNumber)?.passportNumber,
    phoneSecondary: keep.phoneSecondary || mergeFrom.find((o) => o.phoneSecondary)?.phoneSecondary,
    categoryChangeHistory: allHistory.length ? allHistory : undefined,
    archived: false,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  const companies = [keep, ...mergeFrom].filter((c) => c.contactType === 'COMPANY' && c.companyData);
  if (companies.length >= 1) {
    const cd = companies[0].companyData!;
    const allReps = companies.flatMap((c) => c.companyData?.authorizedRepresentatives || []);
    const seenKeys = new Set<string>();
    const mergedReps = allReps.filter((r) => {
      const repName = getRepDisplayName(r);
      const key = `${(repName !== '—' ? repName : (r.name || '')).trim()}|${(r.phone || '').replace(/\D/g, '')}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    merged.contactType = 'COMPANY';
    merged.companyData = {
      companyNameAr:
        cd.companyNameAr || companies.find((c) => c.companyData?.companyNameAr)?.companyData?.companyNameAr || '',
      companyNameEn:
        cd.companyNameEn || companies.find((c) => c.companyData?.companyNameEn?.trim())?.companyData?.companyNameEn,
      commercialRegistrationNumber:
        cd.commercialRegistrationNumber ||
        companies.find((c) => c.companyData?.commercialRegistrationNumber)?.companyData?.commercialRegistrationNumber ||
        '',
      commercialRegistrationExpiry:
        cd.commercialRegistrationExpiry ||
        companies.find((c) => c.companyData?.commercialRegistrationExpiry?.trim())?.companyData
          ?.commercialRegistrationExpiry,
      establishmentDate:
        cd.establishmentDate ||
        companies.find((c) => c.companyData?.establishmentDate?.trim())?.companyData?.establishmentDate,
      authorizedRepresentatives: mergedReps,
    };
  }

  const removeIds = mergeFrom.map((c) => c.id);
  return { merged, removeIds };
}
