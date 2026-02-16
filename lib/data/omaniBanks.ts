/**
 * البنوك العمانية المرخصة مع رموز سويفت
 * Licensed Omani Banks with SWIFT/BIC Codes
 */

export interface OmaniBank {
  nameAr: string;
  nameEn: string;
  swiftCode: string;
}

export const OMANI_BANKS: OmaniBank[] = [
  { nameAr: 'بنك مسقط', nameEn: 'Bank Muscat SAOG', swiftCode: 'BMUSOMRX' },
  { nameAr: 'بنك ظفار', nameEn: 'Bank Dhofar S.A.O.G.', swiftCode: 'BDOFOMRU' },
  { nameAr: 'البنك الوطني العماني', nameEn: 'National Bank of Oman', swiftCode: 'NBOMOMRX' },
  { nameAr: 'بنك عمان العربي', nameEn: 'Oman Arab Bank SAOG', swiftCode: 'OMABOMRU' },
  { nameAr: 'أهلي بنك', nameEn: 'Ahli Bank S.A.O.G.', swiftCode: 'AUBOOMRU' },
  { nameAr: 'بنك صحار الدولي', nameEn: 'Sohar International Bank S.A.O.G.', swiftCode: 'BSHROMRU' },
  { nameAr: 'بنك نزوى', nameEn: 'Bank Nizwa', swiftCode: 'BNZWOMRX' },
  { nameAr: 'بنك العزيز الإسلامي', nameEn: 'Alizz Islamic Bank', swiftCode: 'IZZBOMRU' },
  { nameAr: 'بنك الإسكان العماني', nameEn: 'Oman Housing Bank SAOC', swiftCode: '' },
  { nameAr: 'بنك التنمية العماني', nameEn: 'Development Bank SAOC', swiftCode: '' },
  { nameAr: 'بنك عمان للاستثمار', nameEn: 'Oman Investment Bank SAOC', swiftCode: 'OIBBOMRX' },
  { nameAr: 'بنك الخليج الدولي - فرع عمان', nameEn: 'Gulf International Bank (Oman Branch)', swiftCode: 'GULFOMRX' },
  { nameAr: 'إتش إس بي سي عمان', nameEn: 'HSBC Bank Middle East (Oman Branch)', swiftCode: 'HBMEOMRX' },
  { nameAr: 'ستاندرد تشارترد بنك', nameEn: 'Standard Chartered Bank', swiftCode: 'SCBLOMRX' },
  { nameAr: 'بنك أبوظبي الأول - عمان', nameEn: 'First Abu Dhabi Bank (Oman Branch)', swiftCode: 'NBADOMRX' },
  { nameAr: 'بنك قطر الوطني - عمان', nameEn: 'Qatar National Bank (Oman Branch)', swiftCode: 'QNBAOMRX' },
  { nameAr: 'بنك بارودا - عمان', nameEn: 'Bank of Baroda (Oman Branch)', swiftCode: 'BARBOMMX' },
  { nameAr: 'بنك بيروت - فرع عمان', nameEn: 'Bank of Beirut (Oman Branch)', swiftCode: 'BABEOMRX' },
  { nameAr: 'بنك حبيب عمان', nameEn: 'Habib Bank Oman', swiftCode: 'HABBOMRX' },
  { nameAr: 'بنك الدولة الهندي - عمان', nameEn: 'State Bank of India (Oman Branch)', swiftCode: 'SBINOMRX' },
  { nameAr: 'البنك المركزي العماني', nameEn: 'Central Bank of Oman', swiftCode: 'CBOMOMRU' },
  { nameAr: 'بنك مسقط - الخدمات المصرفية الإسلامية', nameEn: 'Bank Muscat - Islamic Banking', swiftCode: 'BMUSOMRXISL' },
  { nameAr: 'بنك ظفار - ميسرة للخدمات المصرفية الإسلامية', nameEn: 'Bank Dhofar - Maisarah Islamic', swiftCode: 'BDOFOMRUMIB' },
  { nameAr: 'البنك الوطني العماني - مزون الإسلامي', nameEn: 'National Bank of Oman - Muzn Islamic', swiftCode: 'NBOMOMRXIBS' },
  { nameAr: 'بنك عمان العربي - اليسر الإسلامي', nameEn: 'Oman Arab Bank - Al Yusr Islamic', swiftCode: 'OMABOMRUYSR' },
  { nameAr: 'بنك صحار - صحار الإسلامي', nameEn: 'Sohar International - Sohar Islamic', swiftCode: 'BSHROMRUISL' },
];

/** الحصول على رمز سويفت من اسم البنك (عربي أو إنجليزي) */
export function getSwiftCodeForBank(bankName: string): string | undefined {
  const q = (bankName || '').trim().toLowerCase();
  if (!q) return undefined;
  const bank = OMANI_BANKS.find(
    (b) =>
      b.nameAr.toLowerCase().includes(q) ||
      q.includes(b.nameAr.toLowerCase()) ||
      b.nameEn.toLowerCase().includes(q) ||
      q.includes(b.nameEn.toLowerCase())
  );
  return bank?.swiftCode || undefined;
}
