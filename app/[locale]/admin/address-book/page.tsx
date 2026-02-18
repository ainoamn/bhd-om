'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getAllContacts,
  searchContacts,
  createContact,
  updateContact,
  deleteContact,
  archiveContact,
  restoreContact,
  exportContactsToCsv,
  importContactsFromCsv,
  getContactDisplayName,
  getContactLocalizedField,
  getContactById,
  isOmaniNationality,
  isCompanyContact,
  isAuthorizedRepresentative,
  getLinkedCompanyName,
  getLinkedRepPosition,
  getLinkedRepDisplay,
  getLinkedRepDisplayItems,
  getCompaniesForRep,
  validatePhoneWithCountryCode,
  validateCivilIdExpiry,
  validatePassportExpiry,
  findDuplicateContactFields,
  findContactsByCivilIdOrName,
  findContactsBySerialPrefix,
  getAllPersonalContacts,
  findDuplicateContactGroups,
  mergeDuplicateContacts,
  type Contact,
  type ContactCategory,
  type ContactAddress,
  type ContactGender,
  type ContactType,
  type AuthorizedRepresentative,
} from '@/lib/data/addressBook';
import { getContactLinkedBookings, getContactLinkedContracts, getContactLinkedBookingDocuments, isContactLinked, getContactDerivedCategories, type ContactLinkedBooking, type ContactLinkedContract } from '@/lib/data/contactLinks';
import { syncBookingContactsToAddressBook } from '@/lib/data/bookings';
import TranslateField from '@/components/admin/TranslateField';
import { getAllNationalityValues } from '@/lib/data/nationalities';
import { siteConfig } from '@/config/site';
import PhoneCountryCodeSelect from '@/components/admin/PhoneCountryCodeSelect';
import { parsePhoneToCountryAndNumber } from '@/lib/data/countryDialCodes';

const CATEGORY_KEYS: Record<ContactCategory, string> = {
  CLIENT: 'categoryClient',
  TENANT: 'categoryTenant',
  LANDLORD: 'categoryLandlord',
  SUPPLIER: 'categorySupplier',
  PARTNER: 'categoryPartner',
  GOVERNMENT: 'categoryGovernment',
  AUTHORIZED_REP: 'categoryAuthorizedRep',
  OTHER: 'categoryOther',
};

const emptyAddress: ContactAddress = {
  governorate: '',
  state: '',
  area: '',
  village: '',
  street: '',
  building: '',
  floor: '',
  fullAddress: '',
  fullAddressEn: '',
};

const emptyRep = (): AuthorizedRepresentative => ({
  id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: '',
  nameEn: '',
  nationality: '',
  civilId: '',
  civilIdExpiry: '',
  passportNumber: '',
  passportExpiry: '',
  phone: '',
  position: '',
});

const emptyForm = {
  contactType: 'PERSONAL' as ContactType,
  firstName: '',
  secondName: '',
  thirdName: '',
  familyName: '',
  nationality: '',
  gender: 'MALE' as ContactGender,
  email: '',
  phoneCountryCode: '968',
  phone: '',
  phoneSecondary: '',
  civilId: '',
  civilIdExpiry: '',
  passportNumber: '',
  passportExpiry: '',
  workplace: '',
  workplaceEn: '',
  nameEn: '',
  company: '',
  position: '',
  category: 'OTHER' as ContactCategory,
  address: { ...emptyAddress },
  notes: '',
  notesEn: '',
  tags: [] as string[],
  // Company fields
  companyNameAr: '',
  companyNameEn: '',
  commercialRegistrationNumber: '',
  commercialRegistrationExpiry: '',
  establishmentDate: '',
  authorizedRepresentatives: [] as AuthorizedRepresentative[],
};

export default function AdminAddressBookPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('addressBook');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'ALL'>('ALL');
  const [filterContactType, setFilterContactType] = useState<ContactType | 'ALL'>('ALL');
  const [filterTag, setFilterTag] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'choose' | 'form'>('choose');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mounted, setMounted] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number } | null>(null);
  const [mergeResult, setMergeResult] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [repLinkModal, setRepLinkModal] = useState<{ repIdx: number; matches: Contact[] } | null>(null);
  const [repSearchTarget, setRepSearchTarget] = useState<number | null>(null);
  const [repDropdownOpen, setRepDropdownOpen] = useState<number | null>(null);
  const repDropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (repDropdownOpen === null) return;
    const close = (e: MouseEvent) => {
      if (repDropdownRef.current?.contains(e.target as Node)) return;
      setRepDropdownOpen(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [repDropdownOpen]);


  useEffect(() => {
    if (repSearchTarget === null) return;
    const timer = setTimeout(() => {
      const rep = form.authorizedRepresentatives[repSearchTarget];
      if (!rep || (rep as { contactId?: string }).contactId) {
        setRepLinkModal(null);
        setRepSearchTarget(null);
        return;
      }
      const exclude = form.authorizedRepresentatives
        .map((r) => (r as { contactId?: string }).contactId)
        .filter(Boolean) as string[];
      if (editingId) exclude.push(editingId);
      const civilId = rep.civilId?.trim();
      const passport = rep.passportNumber?.trim();
      const nameInput = (rep.name || '').trim();
      const firstName = nameInput.split(/\s+/)[0];
      const looksLikeSerial = /^[A-Za-z0-9-]{2,}$/.test(nameInput) && (nameInput.includes('-') || /^CNT/i.test(nameInput) || /^\d/.test(nameInput));
      let matches: Contact[] = [];
      if (looksLikeSerial) {
        matches = findContactsBySerialPrefix(nameInput, exclude);
      }
      const nameQuery = nameInput || firstName;
      if (matches.length === 0 && ((civilId && civilId.replace(/\D/g, '').length >= 4) || (passport && passport.length >= 4) || (nameQuery && nameQuery.length >= 1))) {
        matches = findContactsByCivilIdOrName(civilId, passport, nameQuery, exclude);
      }
      const dedupe = Array.from(new Map(matches.map((c) => [c.id, c])).values());
      if (dedupe.length > 0) setRepLinkModal({ repIdx: repSearchTarget, matches: dedupe });
      else setRepLinkModal(null);
      setRepSearchTarget(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [repSearchTarget, form.authorizedRepresentatives, editingId]);

  const triggerRepSearch = (repIdx: number) => {
    if ((form.authorizedRepresentatives[repIdx] as { contactId?: string })?.contactId) return;
    setRepSearchTarget(repIdx);
  };

  const loadData = () => setContacts(getAllContacts(showArchived));

  useEffect(() => {
    try {
      const result = syncBookingContactsToAddressBook();
      setContacts(getAllContacts(showArchived));
      if (result.added > 0 || result.updated > 0) setSyncResult(result);
    } catch {
      setContacts(getAllContacts(showArchived));
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_address_book' || e.key === 'bhd_property_bookings') {
        try { syncBookingContactsToAddressBook(); } catch {}
        setContacts(getAllContacts(showArchived));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [showArchived]);

  const handleSyncFromBookings = () => {
    const result = syncBookingContactsToAddressBook();
    loadData();
    setSyncResult(result);
    setTimeout(() => setSyncResult(null), 4000);
  };

  const duplicateGroups = findDuplicateContactGroups();
  const handleMergeDuplicates = () => {
    let merged = 0;
    for (const group of duplicateGroups) {
      const result = mergeDuplicateContacts(group.map((c) => c.id));
      if (result) merged += group.length - 1;
    }
    loadData();
    setMergeResult(merged);
    setTimeout(() => setMergeResult(null), 4000);
  };

  const filteredContacts = searchContacts(search, showArchived).filter((c) => {
    if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
    if (filterContactType !== 'ALL') {
      const ct = c.contactType || 'PERSONAL';
      if (ct !== filterContactType) return false;
    }
    if (filterTag.trim()) {
      const tag = filterTag.trim().toLowerCase();
      return (c.tags || []).some((t) => t.toLowerCase().includes(tag));
    }
    return true;
  });

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || []))).sort();

  const stats = {
    total: contacts.length,
    clients: contacts.filter((c) => c.category === 'CLIENT').length,
    tenants: contacts.filter((c) => c.category === 'TENANT').length,
    landlords: contacts.filter((c) => c.category === 'LANDLORD').length,
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalStep('choose');
    setShowModal(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id);
    const isCompany = c.contactType === 'COMPANY';
    setForm({
      contactType: (c.contactType || 'PERSONAL') as ContactType,
      firstName: c.firstName || '',
      secondName: c.secondName || '',
      thirdName: c.thirdName || '',
      familyName: c.familyName || '',
      nationality: c.nationality || '',
      gender: c.gender || 'MALE',
      email: c.email || '',
      phoneCountryCode: (() => {
        const { code } = parsePhoneToCountryAndNumber(c.phone || '');
        return code || '968';
      })(),
      phone: (() => {
        const parsed = parsePhoneToCountryAndNumber(c.phone || '');
        const digits = (c.phone || '').replace(/\D/g, '').replace(/^0+/, '');
        return parsed.number || (digits.startsWith(parsed.code) ? digits.slice(parsed.code.length) : digits) || '';
      })(),
      phoneSecondary: c.phoneSecondary || '',
      civilId: c.civilId || '',
      civilIdExpiry: c.civilIdExpiry || '',
      passportNumber: c.passportNumber || '',
      passportExpiry: c.passportExpiry || '',
      workplace: c.workplace || '',
      workplaceEn: c.workplaceEn || '',
      nameEn: (c.nameEn || getContactDisplayName(c, 'en') || '').trim() || '',
      company: c.company || '',
      position: c.position || '',
      category: c.category,
      address: { ...emptyAddress, ...c.address },
      notes: c.notes || '',
      notesEn: c.notesEn || '',
      tags: c.tags || [],
      companyNameAr: isCompany ? (c.companyData?.companyNameAr || '') : '',
      companyNameEn: isCompany ? (c.companyData?.companyNameEn || '') : '',
      commercialRegistrationNumber: isCompany ? (c.companyData?.commercialRegistrationNumber || '') : '',
      commercialRegistrationExpiry: isCompany ? (c.companyData?.commercialRegistrationExpiry || '') : '',
      establishmentDate: isCompany ? (c.companyData?.establishmentDate || '') : '',
      authorizedRepresentatives: isCompany ? (c.companyData?.authorizedRepresentatives || []).map((r) => {
        const repContactId = (r as { contactId?: string }).contactId;
        const linkedContact = repContactId ? getContactById(repContactId) : undefined;
        const nameFromContact = linkedContact ? getContactDisplayName(linkedContact, locale) : '';
        const nameEnFromContact = linkedContact ? getContactDisplayName(linkedContact, 'en') : '';
        const parsed = parsePhoneToCountryAndNumber(r.phone || linkedContact?.phone || '');
        const digits = (r.phone || linkedContact?.phone || '').replace(/\D/g, '').replace(/^0+/, '');
        const localNumber = parsed.number || (digits.startsWith(parsed.code) ? digits.slice(parsed.code.length) : digits) || '';
        return {
          ...r,
          id: r.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: (r.name || nameFromContact).trim() || '',
          nameEn: (r.nameEn || nameEnFromContact).trim() || '',
          phoneCountryCode: parsed.code,
          phone: localNumber,
          ...(linkedContact && {
            nationality: r.nationality || linkedContact.nationality || '',
            civilId: r.civilId ?? linkedContact.civilId ?? '',
            civilIdExpiry: r.civilIdExpiry ?? linkedContact.civilIdExpiry ?? '',
            passportNumber: r.passportNumber ?? linkedContact.passportNumber ?? '',
            passportExpiry: r.passportExpiry ?? linkedContact.passportExpiry ?? '',
          }),
        };
      }) : [],
    });
    setFormErrors({});
    setModalStep('form');
    setShowModal(true);
  };

  const selectContactTypeAndOpenForm = (type: ContactType) => {
    setForm({
      ...emptyForm,
      contactType: type,
      authorizedRepresentatives: type === 'COMPANY' ? [emptyRep()] : [],
    });
    setModalStep('form');
  };

  const goBackToChoose = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalStep('choose');
  };

  const requiredFieldLabels: Record<string, string> = {
    firstName: t('firstName'),
    familyName: t('familyName'),
    nationality: t('nationality'),
    phone: t('phone'),
    address: t('address'),
    civilId: t('civilId'),
    passportNumber: t('passportNumber'),
    email: t('companyEmail'),
    companyNameAr: t('companyNameAr'),
    commercialRegistrationNumber: t('commercialRegistrationNumber'),
  };

  const repFieldKeyMap: Record<string, string> = {
    name: 'repName',
    nameEn: 'repNameEn',
    position: 'repPosition',
    phone: 'repPhone',
    nationality: 'nationality',
    civilId: 'repCivilId',
    civilIdExpiry: 'repCivilIdExpiry',
    passportNumber: 'repPassport',
    passportExpiry: 'repPassportExpiry',
  };

  const getErrorFieldLabel = (key: string): string => {
    if (requiredFieldLabels[key]) return requiredFieldLabels[key];
    const repMatch = key.match(/^rep_(\d+)_(.+)$/);
    if (repMatch) {
      const subKey = repFieldKeyMap[repMatch[2]];
      return subKey ? t(subKey as 'repName') : key;
    }
    return key;
  };

  const getRequiredFieldClass = (field: keyof typeof requiredFieldLabels) => {
    if (formErrors[field]) return 'border-2 border-red-400 ring-2 ring-red-200';
    const isEmpty =
      field === 'address' ? !(form.address?.fullAddress?.trim() || form.address?.fullAddressEn?.trim()) :
      field === 'firstName' ? !form.firstName?.trim() :
      field === 'familyName' ? !form.familyName?.trim() :
      field === 'nationality' ? !form.nationality?.trim() :
      field === 'phone' ? !form.phone?.trim() : false;
    if (isEmpty) return 'border-2 border-red-400 ring-2 ring-red-200';
    return 'border-2 border-emerald-400';
  };

  const getFieldErrorClass = (field: string) => (formErrors[field] ? 'border-2 border-red-400 ring-2 ring-red-200' : '');

  const getFullPhone = () => {
    const digits = (form.phone || '').replace(/\D/g, '');
    const cc = form.phoneCountryCode || '968';
    return digits.startsWith(cc) ? digits : cc + digits.replace(/^0+/, '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const isCompany = form.contactType === 'COMPANY';
    const fullPhone = getFullPhone();

    const phoneValidation = validatePhoneWithCountryCode(form.phone?.trim() || '', form.phoneCountryCode || '968');
    if (form.phone?.trim() && !phoneValidation.valid && phoneValidation.message) {
      errors.phone = t(phoneValidation.message as 'invalidPhoneShort');
    }

    if (isCompany) {
      if (!form.companyNameAr?.trim()) errors.companyNameAr = t('fieldRequired');
      if (!form.commercialRegistrationNumber?.trim()) errors.commercialRegistrationNumber = t('fieldRequired');
      if (!form.phone?.trim()) errors.phone = errors.phone || t('fieldRequired');
      if (!form.email?.trim()) errors.email = t('fieldRequired');
      if (form.authorizedRepresentatives.length === 0) errors.authorizedRepresentatives = t('authorizedRepRequired');
      for (let i = 0; i < form.authorizedRepresentatives.length; i++) {
        const r = form.authorizedRepresentatives[i];
        if (!r.name?.trim()) errors[`rep_${i}_name`] = t('fieldRequired');
        if (!r.nameEn?.trim()) errors[`rep_${i}_nameEn`] = t('fieldRequired');
        if (!r.position?.trim()) errors[`rep_${i}_position`] = t('fieldRequired');
        if (!r.phone?.trim()) errors[`rep_${i}_phone`] = t('fieldRequired');
        else {
          const repCc = (r as { phoneCountryCode?: string }).phoneCountryCode || '968';
          const rpv = validatePhoneWithCountryCode(r.phone, repCc);
          if (!rpv.valid && rpv.message) errors[`rep_${i}_phone`] = t(rpv.message as 'invalidPhoneShort');
        }
        if (!r.nationality?.trim()) errors[`rep_${i}_nationality`] = t('fieldRequired');
        if (!r.civilId?.trim()) errors[`rep_${i}_civilId`] = t('fieldRequired');
        const repContactId = (r as { contactId?: string }).contactId;
        if (!repContactId) {
          const repDups = findDuplicateContactFields('', r.civilId?.trim(), r.passportNumber?.trim(), undefined, undefined, editingId ? [editingId] : undefined);
          if (repDups.civilId) errors[`rep_${i}_civilId`] = t('duplicateCivilId');
          if (repDups.passportNumber) errors[`rep_${i}_passportNumber`] = t('duplicatePassportNumber');
        }
        const omani = isOmaniNationality(r.nationality || '');
        if (omani) {
          if (!r.civilIdExpiry?.trim()) errors[`rep_${i}_civilIdExpiry`] = t('fieldRequired');
          else if (!validateCivilIdExpiry(r.civilIdExpiry).valid) errors[`rep_${i}_civilIdExpiry`] = t('civilIdExpiryMinDays');
        } else if (r.nationality?.trim()) {
          if (!r.passportNumber?.trim()) errors[`rep_${i}_passportNumber`] = t('fieldRequired');
          if (!r.passportExpiry?.trim()) errors[`rep_${i}_passportExpiry`] = t('fieldRequired');
          else if (!validatePassportExpiry(r.passportExpiry).valid) errors[`rep_${i}_passportExpiry`] = t('passportExpiryMinDays');
        }
      }
    } else {
    if (!form.firstName?.trim()) errors.firstName = t('fieldRequired');
    if (!form.familyName?.trim()) errors.familyName = t('fieldRequired');
    if (!form.nationality?.trim()) errors.nationality = t('fieldRequired');
      if (!form.phone?.trim()) errors.phone = errors.phone || t('fieldRequired');
      if (!(form.address?.fullAddress?.trim() || form.address?.fullAddressEn?.trim())) errors.address = t('fieldRequired');
      if (form.civilIdExpiry?.trim() && !validateCivilIdExpiry(form.civilIdExpiry).valid) errors.civilIdExpiry = t('civilIdExpiryMinDays');
      if (form.passportExpiry?.trim() && !validatePassportExpiry(form.passportExpiry).valid) errors.passportExpiry = t('passportExpiryMinDays');
    }

    const dups = findDuplicateContactFields(
      fullPhone,
      form.civilId?.trim(),
      form.passportNumber?.trim(),
      editingId || undefined,
      isCompany ? form.commercialRegistrationNumber?.trim() : undefined
    );
    if (dups.phone) errors.phone = t('duplicatePhone');
    if (dups.civilId) errors.civilId = t('duplicateCivilId');
    if (dups.passportNumber) errors.passportNumber = t('duplicatePassportNumber');
    if (dups.commercialRegistration) errors.commercialRegistrationNumber = t('duplicateCommercialRegistration');

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const hasAddr = form.address?.fullAddress?.trim() || form.address?.fullAddressEn?.trim() || Object.keys(form.address || {}).some((k) => (form.address as Record<string, string>)[k]);
    const addr = hasAddr
      ? {
          ...form.address,
          fullAddress: form.address?.fullAddress?.trim() || undefined,
          fullAddressEn: form.address?.fullAddressEn?.trim() || undefined,
        }
        : undefined;

    const payload: Partial<Contact> = {
      contactType: form.contactType,
      firstName: isCompany ? form.companyNameAr.trim() : form.firstName.trim(),
      secondName: isCompany ? undefined : form.secondName?.trim() || undefined,
      thirdName: isCompany ? undefined : form.thirdName?.trim() || undefined,
      familyName: isCompany ? '' : form.familyName.trim(),
      nationality: isCompany ? '' : form.nationality.trim(),
      gender: isCompany ? 'MALE' : form.gender,
      email: form.email?.trim() || undefined,
      phone: fullPhone,
      phoneSecondary: form.phoneSecondary?.trim() || undefined,
      civilId: isCompany ? undefined : form.civilId?.trim() || undefined,
      civilIdExpiry: isCompany ? undefined : form.civilIdExpiry?.trim() || undefined,
      passportNumber: isCompany ? undefined : form.passportNumber?.trim() || undefined,
      passportExpiry: isCompany ? undefined : form.passportExpiry?.trim() || undefined,
      workplace: form.workplace?.trim() || undefined,
      workplaceEn: form.workplaceEn?.trim() || undefined,
      nameEn: isCompany ? form.companyNameEn?.trim() || undefined : form.nameEn?.trim() || undefined,
      company: form.company?.trim() || undefined,
      position: form.position?.trim() || undefined,
      category: form.category,
      address: addr,
      notes: form.notes?.trim() || undefined,
      notesEn: form.notesEn?.trim() || undefined,
      tags: form.tags?.length ? form.tags : undefined,
    };

    if (isCompany) {
      payload.companyData = {
        companyNameAr: form.companyNameAr.trim(),
        companyNameEn: form.companyNameEn?.trim() || undefined,
        commercialRegistrationNumber: form.commercialRegistrationNumber.trim(),
        commercialRegistrationExpiry: form.commercialRegistrationExpiry?.trim() || undefined,
        establishmentDate: form.establishmentDate?.trim() || undefined,
        authorizedRepresentatives: form.authorizedRepresentatives.map((r) => {
          const cc = (r as { phoneCountryCode?: string }).phoneCountryCode || '968';
          const rDigits = (r.phone || '').replace(/\D/g, '').replace(/^0+/, '');
          const rPhone = rDigits.startsWith(cc) ? rDigits : cc + rDigits;
          const { phoneCountryCode: _cc, ...repRest } = r as { phoneCountryCode?: string; contactId?: string } & typeof r;
          return {
            ...repRest,
            id: r.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            contactId: repRest.contactId || undefined,
            name: r.name.trim(),
            nameEn: r.nameEn?.trim() || undefined,
            nationality: r.nationality?.trim() || undefined,
            civilId: r.civilId?.trim() || undefined,
            civilIdExpiry: r.civilIdExpiry?.trim() || undefined,
            passportNumber: r.passportNumber?.trim() || undefined,
            passportExpiry: r.passportExpiry?.trim() || undefined,
            phone: rPhone || r.phone.trim(),
            position: r.position.trim(),
          };
        }),
      };
    } else {
      payload.companyData = undefined;
    }

    try {
    if (editingId) {
      updateContact(editingId, payload);
    } else {
        createContact(payload as Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setShowModal(false);
    setFormErrors({});
    loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'DUPLICATE_PHONE') setFormErrors((e) => ({ ...e, phone: t('duplicatePhone') }));
      else if (msg === 'DUPLICATE_CIVIL_ID') setFormErrors((e) => ({ ...e, civilId: t('duplicateCivilId'), authorizedRepresentatives: isCompany ? t('duplicateCivilId') : undefined }));
      else if (msg === 'DUPLICATE_PASSPORT') setFormErrors((e) => ({ ...e, passportNumber: t('duplicatePassportNumber'), authorizedRepresentatives: isCompany ? t('duplicatePassportNumber') : undefined }));
      else if (msg === 'DUPLICATE_COMMERCIAL_REGISTRATION') setFormErrors((e) => ({ ...e, commercialRegistrationNumber: t('duplicateCommercialRegistration') }));
    }
  };

  const buildPrintHtml = (contact: Contact, linkedBookings: ContactLinkedBooking[], linkedContracts: ContactLinkedContract[], linkedDocs: Array<{ id: string; labelAr: string; labelEn: string; fileUrl?: string; fileName?: string; status: string; uploadedAt?: string; unitDisplay?: string; propertyTitleAr?: string; propertyTitleEn?: string }>) => {
    const isCompany = isCompanyContact(contact);
    const fullName = isCompany ? (contact.companyData?.companyNameAr || contact.firstName || '—') : ([contact.firstName, contact.secondName, contact.thirdName, contact.familyName].filter(Boolean).join(' ') || '—');
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    const statusKey = (s: string) => (s === 'ACTIVE' ? t('statusActive') : s === 'ENDED' ? t('statusEnded') : s === 'RENEWED' ? t('statusRenewed') : s === 'CANCELLED' ? t('statusCancelled') : t('statusDraft'));
    const statusBilingual = (s: string) => (s === 'ACTIVE' ? 'نشط / Active' : s === 'ENDED' ? 'منتهي / Ended' : s === 'RENEWED' ? 'مجدد / Renewed' : s === 'CANCELLED' ? 'ملغي / Cancelled' : 'مسودة / Draft');
    const categoryBilingual: Record<string, string> = { CLIENT: 'عميل / Client', TENANT: 'مستأجر / Tenant', LANDLORD: 'مالك / Landlord', SUPPLIER: 'مورد / Supplier', PARTNER: 'شريك / Partner', GOVERNMENT: 'جهة حكومية / Government', AUTHORIZED_REP: 'مفوض بالتوقيع / Authorized Rep', OTHER: 'أخرى / Other' };
    const derivedCats = getContactDerivedCategories(contact);
    const repCompanies = getCompaniesForRep(contact.id);
    const repCompaniesStr = repCompanies.length > 0
      ? 'مفوض: ' + repCompanies.map((co) => (co.position ? co.position + ' → ' : '') + (locale === 'en' && co.nameEn ? co.nameEn : co.nameAr)).join('، ')
      : '';
    const derivedCatsStr = derivedCats.length > 0
      ? 'نشاط: ' + derivedCats.map((cat) => categoryBilingual[cat] || t(CATEGORY_KEYS[cat] as 'categoryClient')).join('، ')
      : '';
    const categoryDisplay = [categoryBilingual[contact.category] || t(CATEGORY_KEYS[contact.category] as 'categoryClient'), repCompaniesStr, derivedCatsStr].filter(Boolean).join(' | ');
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const hasFinancial = linkedBookings.some((b) => b.hasFinancialClaims) || linkedContracts.some((c) => c.hasFinancialClaims);
    const tableStyle = 'width:100%;border-collapse:collapse;border:1px solid #9ca3af;font-size:12px;margin-bottom:16px';
    const thStyle = 'border:1px solid #9ca3af;padding:8px;background:#8B6F47;color:white;text-align:right;font-weight:bold';
    const tdStyle = 'border:1px solid #9ca3af;padding:6px 8px';
    const tdLabelStyle = tdStyle + ';background:#f9fafb;font-weight:600;width:140px';
    const sectionTitle = 'font-size:14px;font-weight:bold;color:#8B6F47;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #d1d5db';
    const emptyRow = `<tr><td colspan="4" style="${tdStyle};text-align:center;color:#6b7280">—</td></tr>`;
    const bookingsEmptyRow = `<tr><td colspan="5" style="${tdStyle};text-align:center;color:#6b7280">—</td></tr>`;

    const propDisplay = (ar: string, en: string) => (ar && en ? `${ar} / ${en}` : ar || en || '—');
    const cardCell = (b: typeof linkedBookings[0]) => (b.cardLast4 || b.cardholderName)
      ? `${b.cardLast4 ? '****' + b.cardLast4 : ''}${b.cardExpiry ? ' ' + (locale === 'ar' ? 'انتهاء' : 'exp') + ' ' + b.cardExpiry : ''}${b.cardholderName ? ' — ' + (b.cardholderName || '').replace(/</g, '&lt;') : ''}`
      : '—';
    const bookingsRows = linkedBookings.length > 0
      ? linkedBookings.map((b) => `<tr><td style="${tdStyle}">${fmtDate(b.date)}</td><td style="${tdStyle}">${(b.unitDisplay || propDisplay(b.propertyTitleAr, b.propertyTitleEn)).replace(/</g, '&lt;')}</td><td style="${tdStyle}">${statusBilingual(b.status)}</td><td style="${tdStyle}">${b.hasFinancialClaims ? t('yes') + ' / Yes' : t('no') + ' / No'}</td><td style="${tdStyle}">${cardCell(b)}</td></tr>`).join('')
      : bookingsEmptyRow;

    const contractsRows = linkedContracts.length > 0
      ? linkedContracts.map((c2) => `<tr><td style="${tdStyle}">${fmtDate(c2.date)}</td><td style="${tdStyle}">${(c2.unitDisplay || propDisplay(c2.propertyTitleAr, c2.propertyTitleEn)).replace(/</g, '&lt;')}</td><td style="${tdStyle}">${(c2.role === 'tenant' ? (t('categoryTenant') + ' / Tenant') : (t('landlord') + ' / Landlord'))}</td><td style="${tdStyle}">${(c2.landlordName || '').replace(/</g, '&lt;')}</td><td style="${tdStyle}">${fmtDate(c2.startDate)}</td><td style="${tdStyle}">${fmtDate(c2.endDate)}</td><td style="${tdStyle}">${statusBilingual(c2.status)}</td><td style="${tdStyle}">${c2.hasFinancialClaims ? t('yes') + ' / Yes' : t('no') + ' / No'}</td></tr>`).join('')
      : emptyRow;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isImage = (url?: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url || '');
    const docsRows = linkedDocs.filter((d) => d.fileUrl).map((d) => {
      const fullUrl = d.fileUrl!.startsWith('http') ? d.fileUrl : origin + d.fileUrl;
      const label = locale === 'ar' ? d.labelAr : d.labelEn;
      const imgHtml = isImage(d.fileUrl) ? `<img src="${fullUrl}" alt="${(d.fileName || label).replace(/"/g, '&quot;')}" style="max-width:100%;max-height:200px;display:block;margin:8px 0" />` : '';
      const linkHtml = `<a href="${fullUrl}" target="_blank" style="color:#8B6F47;font-weight:600">${(d.fileName || label).replace(/</g, '&lt;')}</a>`;
      return `<tr><td style="${tdStyle}">${(label + (d.unitDisplay ? ' - ' + d.unitDisplay : '')).replace(/</g, '&lt;')}</td><td style="${tdStyle}">${linkHtml}${imgHtml ? '<br/>' + imgHtml : ''}</td><td style="${tdStyle}">${d.status === 'APPROVED' ? 'معتمد / Approved' : d.status === 'UPLOADED' ? 'مرفوع / Uploaded' : d.status === 'REJECTED' ? 'مرفوض / Rejected' : 'بانتظار الرفع / Pending'}</td></tr>`;
    }).join('');
    const docsEmptyRow = `<tr><td colspan="3" style="${tdStyle};text-align:center;color:#6b7280">—</td></tr>`;
    const docsTable = linkedDocs.length > 0
      ? `<div><h2 style="${sectionTitle}">3. المستندات المرفوعة / Uploaded Documents</h2>
  <table style="${tableStyle}"><thead><tr><th style="${thStyle}">المستند / Document</th><th style="${thStyle}">الملف / File</th><th style="${thStyle}">الحالة / Status</th></tr></thead><tbody>${docsRows || docsEmptyRow}</tbody></table></div>`
      : '';

    return `<!DOCTYPE html><html dir="${dir}" lang="${locale}"><head><meta charset="utf-8"><title>${t('printReportTitle')}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#111;background:#fff}@media print{body{padding:0}}</style></head><body>
<div style="border:2px solid #8B6F47;padding:24px;max-width:210mm;margin:0 auto">
  <div style="border-bottom:2px solid #8B6F47;padding-bottom:20px;margin-bottom:24px;text-align:center">
    <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo-bhd.png" alt="Logo" style="width:64px;height:64px;object-fit:contain;vertical-align:middle;margin-${locale === 'ar' ? 'left' : 'right'}:12px">
    <div style="display:inline-block;text-align:center;vertical-align:middle">
      <h1 style="margin:0;font-size:20px;color:#8B6F47">${siteConfig.company.nameAr} / ${siteConfig.company.nameEn}</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#4b5563">${siteConfig.company.legalName}</p>
      <p style="margin:8px 0 0;font-size:13px;font-weight:bold;color:#8B6F47">${t('printReportTitle')} / Contact Report</p>
    </div>
  </div>
  <div style="margin-bottom:20px">
    <h2 style="${sectionTitle}">البيانات الأساسية / Basic Information</h2>
    <table style="${tableStyle}"><tbody>
      <tr><td style="${tdLabelStyle}">${t('serialNo')} / Serial No.</td><td style="${tdStyle}">${(contact.serialNumber || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('contactType')} / Type</td><td style="${tdStyle}">${isCompany ? (t('contactTypeCompany') + ' / Company') : (t('contactTypePersonal') + ' / Personal')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('name')} / Name</td><td style="${tdStyle}">${fullName.replace(/</g, '&lt;')}</td></tr>
      ${(contact.nameEn || contact.companyData?.companyNameEn || '').trim() ? `<tr><td style="${tdLabelStyle}">الاسم (EN) / Name (EN)</td><td style="${tdStyle}">${(contact.nameEn || contact.companyData?.companyNameEn || '').replace(/</g, '&lt;')}</td></tr>` : ''}
      ${isCompany && contact.companyData ? `
      <tr><td style="${tdLabelStyle}">${t('commercialRegistrationNumber')} / CR No.</td><td style="${tdStyle}">${(contact.companyData.commercialRegistrationNumber || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('commercialRegistrationExpiry')} / CR Expiry</td><td style="${tdStyle}">${(contact.companyData.commercialRegistrationExpiry || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('establishmentDate')} / Est. Date</td><td style="${tdStyle}">${(contact.companyData.establishmentDate || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td colspan="2" style="${tdStyle};background:#f9fafb;font-weight:bold;padding:10px">${t('authorizedRepresentatives')} / المفوضون بالتوقيع</td></tr>
      ${(contact.companyData.authorizedRepresentatives || []).map((r, i) => `
      <tr><td style="${tdLabelStyle}">المفوض ${i + 1} / Rep ${i + 1}</td><td style="${tdStyle}">
        الاسم / Name: ${(r.name || '—').replace(/</g, '&lt;')}${(r.nameEn || '').trim() ? ' | ' + (r.nameEn || '').replace(/</g, '&lt;') : ''}<br/>
        المنصب / Position: ${(r.position || '—').replace(/</g, '&lt;')}<br/>
        الهاتف / Phone: ${(r.phone || '—').replace(/</g, '&lt;')}<br/>
        الجنسية / Nationality: ${(r.nationality || '—').replace(/</g, '&lt;')}<br/>
        الرقم المدني / Civil ID: ${(r.civilId || '—').replace(/</g, '&lt;')}<br/>
        انتهاء البطاقة / Civil ID Expiry: ${(r.civilIdExpiry || '—').replace(/</g, '&lt;')}<br/>
        رقم الجواز / Passport: ${(r.passportNumber || '—').replace(/</g, '&lt;')}<br/>
        انتهاء الجواز / Passport Expiry: ${(r.passportExpiry || '—').replace(/</g, '&lt;')}
      </td></tr>`).join('')}
      ` : ''}
      ${!isCompany ? `<tr><td style="${tdLabelStyle}">${t('nationality')} / Nationality</td><td style="${tdStyle}">${(contact.nationality || '—').replace(/</g, '&lt;')}</td></tr>` : ''}
      ${!isCompany ? `<tr><td style="${tdLabelStyle}">${t('gender')} / Gender</td><td style="${tdStyle}">${contact.gender === 'FEMALE' ? t('female') + ' / Female' : t('male') + ' / Male'}</td></tr>` : ''}
      <tr><td style="${tdLabelStyle}">${t('phone')} / Phone</td><td style="${tdStyle}">${(contact.phone || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('phoneAlt')} / Alt. Phone</td><td style="${tdStyle}">${(contact.phoneSecondary || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('email')} / Email</td><td style="${tdStyle}">${(contact.email || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('address')} / Address</td><td style="${tdStyle}">${(contact.address?.fullAddress || '—').replace(/</g, '&lt;')}</td></tr>
      ${(contact.address?.fullAddressEn || '').trim() ? `<tr><td style="${tdLabelStyle}">العنوان (EN) / Address (EN)</td><td style="${tdStyle}">${(contact.address?.fullAddressEn || '').replace(/</g, '&lt;')}</td></tr>` : ''}
      ${(contact.address?.governorate || contact.address?.state || contact.address?.area || contact.address?.village || contact.address?.street || contact.address?.building) ? `
      <tr><td style="${tdLabelStyle}">تفاصيل العنوان / Address Details</td><td style="${tdStyle}">
        ${[contact.address?.governorate && ('المحافظة: ' + contact.address.governorate), contact.address?.state && ('الولاية: ' + contact.address.state), contact.address?.area && ('المنطقة: ' + contact.address.area), contact.address?.village && ('القرية: ' + contact.address.village), contact.address?.street && ('الشارع: ' + contact.address.street), contact.address?.building && ('المبنى: ' + contact.address.building), contact.address?.floor && ('الطابق: ' + contact.address.floor)].filter(Boolean).map((s) => (s || '').replace(/</g, '&lt;')).join(' | ')}
      </td></tr>` : ''}
      <tr><td style="${tdLabelStyle}">${t('category')} / Category</td><td style="${tdStyle}">${categoryDisplay.replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('workplace')} / Workplace</td><td style="${tdStyle}">${(contact.workplace || '—').replace(/</g, '&lt;')}</td></tr>
      ${(contact.workplaceEn || '').trim() ? `<tr><td style="${tdLabelStyle}">جهة العمل (EN) / Workplace (EN)</td><td style="${tdStyle}">${(contact.workplaceEn || '').replace(/</g, '&lt;')}</td></tr>` : ''}
      ${!isCompany ? `
      <tr><td style="${tdLabelStyle}">${t('civilId')} / Civil ID</td><td style="${tdStyle}">${(contact.civilId || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">انتهاء الرقم المدني / Civil ID Expiry</td><td style="${tdStyle}">${(contact.civilIdExpiry || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">${t('passportNumber')} / Passport</td><td style="${tdStyle}">${(contact.passportNumber || '—').replace(/</g, '&lt;')}</td></tr>
      <tr><td style="${tdLabelStyle}">انتهاء الجواز / Passport Expiry</td><td style="${tdStyle}">${(contact.passportExpiry || '—').replace(/</g, '&lt;')}</td></tr>
      ` : ''}
      ${(contact.tags || []).length > 0 ? `<tr><td style="${tdLabelStyle}">العلامات / Tags</td><td style="${tdStyle}">${(contact.tags || []).join('، ').replace(/</g, '&lt;')}</td></tr>` : ''}
      <tr><td style="${tdLabelStyle}">${t('notes')} / Notes</td><td style="${tdStyle}">${(contact.notes || '—').replace(/</g, '&lt;')}</td></tr>
      ${(contact.notesEn || '').trim() ? `<tr><td style="${tdLabelStyle}">ملاحظات (EN) / Notes (EN)</td><td style="${tdStyle}">${(contact.notesEn || '').replace(/</g, '&lt;')}</td></tr>` : ''}
      ${repCompanies.length > 0 && !isCompany ? `
      <tr><td colspan="2" style="${tdStyle};background:#fef3c7;font-weight:bold;padding:10px">الشركات المفوض عنها / Authorized For Companies</td></tr>
      ${repCompanies.map((co) => `<tr><td style="${tdLabelStyle}">${(locale === 'en' && co.nameEn ? co.nameEn : co.nameAr).replace(/</g, '&lt;')}</td><td style="${tdStyle}">${(co.position || '—').replace(/</g, '&lt;')}</td></tr>`).join('')}
      ` : ''}
    </tbody></table>
  </div>
  <div><h2 style="${sectionTitle}">1. الحجوزات / Bookings</h2>
  <table style="${tableStyle}"><thead><tr><th style="${thStyle}">${t('bookingDate')} / Date</th><th style="${thStyle}">${t('propertyNumber')} / Property</th><th style="${thStyle}">الحالة / Status</th><th style="${thStyle}">${t('hasFinancialClaims')}</th><th style="${thStyle}">بطاقة / Card</th></tr></thead><tbody>${bookingsRows}</tbody></table></div>
  <div><h2 style="${sectionTitle}">2. عقود الإيجار / Rental Contracts</h2>
  <table style="${tableStyle}"><thead><tr><th style="${thStyle}">${t('bookingDate')} / Date</th><th style="${thStyle}">${t('propertyNumber')} / Property</th><th style="${thStyle}">الدور / Role</th><th style="${thStyle}">${t('landlord')}</th><th style="${thStyle}">${t('startDate')}</th><th style="${thStyle}">${t('endDate')}</th><th style="${thStyle}">الحالة / Status</th><th style="${thStyle}">${t('hasFinancialClaims')}</th></tr></thead><tbody>${contractsRows}</tbody></table></div>
  ${docsTable}
  <div><h2 style="${sectionTitle}">4. طلبات الصيانة / Maintenance Requests</h2>
  <table style="${tableStyle}"><thead><tr><th style="${thStyle}">التاريخ / Date</th><th style="${thStyle}">الوصف / Description</th><th style="${thStyle}">الحالة / Status</th></tr></thead><tbody>${emptyRow}</tbody></table>
  <p style="font-size:11px;color:#6b7280;margin:-8px 0 0">${t('maintenanceRequestsEmpty')}</p></div>
  <div><h2 style="${sectionTitle}">5. المطالبات المالية / Financial Claims</h2>
  <table style="${tableStyle}"><tbody>
    <tr><td style="${tdLabelStyle}">هل توجد مطالبات مالية معلقة؟ / Pending financial claims?</td><td style="${tdStyle}">${hasFinancial ? t('yes') + ' / Yes' : t('no') + ' / No'}</td></tr>
    <tr><td style="${tdLabelStyle}">الانضباط في الدفع / Payment discipline</td><td style="${tdStyle}">${hasFinancial ? 'يوجد متأخرات / Has arrears' : 'منضبط / Compliant'}</td></tr>
  </tbody></table></div>
  <div><h2 style="${sectionTitle}">6. تقييم المستخدم / User Rating</h2>
  <table style="${tableStyle}"><tbody><tr><td style="${tdStyle};text-align:center;color:#6b7280">${t('userRatingEmpty')}</td></tr></tbody></table></div>
  <div style="border-top:2px solid #8B6F47;padding-top:16px;margin-top:24px;font-size:11px;color:#4b5563">
    <p style="margin:0;font-weight:600;color:#111">${siteConfig.company.nameAr} | ${siteConfig.company.nameEn} | ${siteConfig.company.legalName}</p>
    <p style="margin:4px 0 0">${siteConfig.company.address} | ${siteConfig.company.addressEn}</p>
    <p style="margin:2px 0 0">${siteConfig.company.email} | ${siteConfig.company.phone}</p>
    <p style="margin:12px 0 0;color:#9ca3af">${new Date().toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')} © ${new Date().getFullYear()}</p>
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body></html>`;
  };

  const handlePrint = () => {
    const contact = editingId ? getContactById(editingId) : null;
    const c = contact || {
      id: '', serialNumber: '', firstName: form.firstName, secondName: form.secondName, thirdName: form.thirdName, familyName: form.familyName,
      nameEn: form.nameEn, nationality: form.nationality, gender: form.gender, phone: form.phone, phoneSecondary: form.phoneSecondary, email: form.email,
      civilId: form.civilId, civilIdExpiry: form.civilIdExpiry, passportNumber: form.passportNumber, passportExpiry: form.passportExpiry,
      workplace: form.workplace, workplaceEn: form.workplaceEn, address: form.address, notes: form.notes, notesEn: form.notesEn, tags: form.tags,
      category: form.category, categoryChangeHistory: [], createdAt: '', updatedAt: '',
    } as Contact;
    const html = buildPrintHtml(c, getContactLinkedBookings(c), getContactLinkedContracts(c), getContactLinkedBookingDocuments(c));
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handlePrintContact = (c: Contact) => {
    const html = buildPrintHtml(c, getContactLinkedBookings(c), getContactLinkedContracts(c), getContactLinkedBookingDocuments(c));
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleArchive = (id: string) => {
    const c = getContactById(id);
    if (!c) return;
    const { linked } = isContactLinked(c);
    if (linked) return;
    archiveContact(id);
    setDeleteId(null);
    setContacts(getAllContacts(showArchived));
  };

  const handleRestore = (id: string) => {
    restoreContact(id);
    setContacts(getAllContacts(showArchived));
  };

  const handleDelete = () => {
    if (deleteId) {
      try {
      deleteContact(deleteId);
      setDeleteId(null);
        setContacts(getAllContacts(showArchived));
      } catch (err) {
        if ((err as Error).message === 'CANNOT_DELETE_LINKED') {
          setDeleteId(null);
        }
      }
    }
  };

  const formatAddress = (a?: ContactAddress) => {
    if (!a) return '—';
    if (a.fullAddress) return a.fullAddress;
    const parts = [a.governorate, a.state, a.area, a.village, a.street, a.building, a.floor].filter(Boolean);
    return parts.length ? parts.join(' - ') : '—';
  };

  return (
    <>
    <div className="space-y-8 address-book-main w-full max-w-full min-h-0">
      {importResult !== null && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-medium">
          {t('importSuccess', { count: importResult })}
        </div>
      )}
      {syncResult && (syncResult.added > 0 || syncResult.updated > 0) && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-blue-800 font-medium">
          {locale === 'ar'
            ? `تمت المزامنة: ${syncResult.added} جهة جديدة، ${syncResult.updated} محدثة من الحجوزات`
            : `Synced: ${syncResult.added} new, ${syncResult.updated} updated from bookings`}
        </div>
      )}
      {mergeResult !== null && mergeResult > 0 && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-medium">
          {t('mergeDuplicatesSuccess', { count: mergeResult })}
        </div>
      )}
      <AdminPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer">
              <span>📤</span>
              {t('importCsv')}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    const text = r.result as string;
                    const n = importContactsFromCsv(text);
                    setImportResult(n);
                    loadData();
                    setTimeout(() => setImportResult(null), 3000);
                  };
                  r.readAsText(f, 'UTF-8');
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const csv = exportContactsToCsv(filteredContacts);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <span>📥</span>
              {t('exportCsv')}
            </button>
            <button
              type="button"
              onClick={handleSyncFromBookings}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-all no-print"
            >
              <span>🔄</span>
              {locale === 'ar' ? 'تحديث من الحجوزات' : 'Sync from Bookings'}
            </button>
            {duplicateGroups.length > 0 && (
              <button
                type="button"
                onClick={handleMergeDuplicates}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all no-print"
              >
                <span>🔗</span>
                {t('mergeDuplicates')} ({duplicateGroups.length})
              </button>
            )}
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535] transition-all shadow-sm no-print"
            >
              <span>➕</span>
              {t('addContact')}
            </button>
          </div>
        }
      />

      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">{t('total')}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="admin-card p-4 border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">{t('clients')}</p>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.clients}</p>
        </div>
        <div className="admin-card p-4 border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase">{t('tenants')}</p>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.tenants}</p>
        </div>
        <div className="admin-card p-4 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase">{t('landlords')}</p>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.landlords}</p>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">{t('contacts')}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="admin-input w-48 sm:w-56 py-2 text-sm"
            />
            <select
              value={filterContactType}
              onChange={(e) => setFilterContactType(e.target.value as ContactType | 'ALL')}
              className="admin-select text-sm py-2"
            >
              <option value="ALL">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="PERSONAL">{t('contactTypePersonal')}</option>
              <option value="COMPANY">{t('contactTypeCompany')}</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ContactCategory | 'ALL')}
              className="admin-select text-sm py-2"
            >
              <option value="ALL">{t('allCategories')}</option>
              {(Object.keys(CATEGORY_KEYS) as ContactCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {t(CATEGORY_KEYS[cat] as 'categoryClient')}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">{t('showArchived')}</span>
            </label>
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="admin-select text-sm py-2"
              >
                <option value="">{t('allTags')}</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📇</div>
            <p className="text-gray-500 font-medium text-lg">{t('noContacts')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('noContactsHint')}</p>
            <button type="button" onClick={openAdd} className="mt-4 text-[#8B6F47] font-semibold hover:underline">
              {t('addContact')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full min-w-0 -mx-px">
            <table className="admin-table min-w-[1000px] text-sm w-full">
              <thead>
                <tr>
                  <th className="w-24 px-3 py-2 text-xs">{t('serialNo')}</th>
                  <th className="w-20 px-3 py-2 text-xs">{t('contactType')}</th>
                  <th className="w-36 px-3 py-2 text-xs">{t('name')}</th>
                  <th className="w-20 px-3 py-2 text-xs">{t('nationality')}</th>
                  <th className="w-28 px-3 py-2 text-xs">{t('phone')}</th>
                  <th className="w-24 px-3 py-2 text-xs">{t('civilId')}</th>
                  <th className="w-40 px-3 py-2 text-xs max-w-[160px]">{t('email')}</th>
                  <th className="w-28 px-3 py-2 text-xs">{t('workplace')}</th>
                  <th className="w-24 px-3 py-2 text-xs">{t('category')}</th>
                  <th className="w-36 px-3 py-2 text-xs max-w-[140px]">{t('linkedUnit')}</th>
                  <th className="w-24 px-3 py-2 text-xs">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr key={c.id} className={`border-t border-gray-100 hover:bg-gray-50/50 ${c.archived ? 'bg-gray-50/70 opacity-80' : ''}`}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="font-mono text-xs text-[#8B6F47] font-medium whitespace-nowrap hover:underline text-right w-full cursor-pointer"
                        title={locale === 'ar' ? 'عرض بيانات الجهة' : 'View contact details'}
                      >
                        {c.serialNumber || '—'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${(c.contactType || 'PERSONAL') === 'COMPANY' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                        {(c.contactType || 'PERSONAL') === 'COMPANY' ? t('contactTypeCompany') : t('contactTypePersonal')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-right w-full block cursor-pointer"
                      >
                        <div className="font-semibold text-gray-900 truncate max-w-[140px] hover:text-[#8B6F47] hover:underline cursor-pointer" title={getContactDisplayName(c, locale)}>
                          {getContactDisplayName(c, locale)}
                        </div>
                        {isAuthorizedRepresentative(c) && getLinkedCompanyName(c, locale) && (
                          <div className="text-xs text-[#8B6F47] truncate max-w-[140px]" title={getLinkedCompanyName(c, locale)}>
                            {getLinkedCompanyName(c, locale)}
                          </div>
                        )}
                        {getLinkedRepPosition(c) && <div className="text-xs text-gray-500 truncate max-w-[140px]">{getLinkedRepPosition(c)}</div>}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{c.nationality || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <a href={`tel:${c.phone}`} className="text-[#8B6F47] hover:underline text-xs truncate">{c.phone}</a>
                        {c.phoneSecondary && (
                          <a href={`tel:${c.phoneSecondary}`} className="text-xs text-gray-500 hover:underline truncate">{c.phoneSecondary}</a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {isCompanyContact(c) ? (c.companyData?.commercialRegistrationNumber || '—') : (c.civilId || '—')}
                    </td>
                    <td className="px-3 py-2 max-w-[160px]">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-[#8B6F47] hover:underline truncate block text-xs" title={c.email}>
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-gray-700 truncate block max-w-[110px] text-xs" title={getContactLocalizedField(c, 'workplace', locale) === '—' ? (c.company || '') : getContactLocalizedField(c, 'workplace', locale)}>
                        {getContactLocalizedField(c, 'workplace', locale) === '—' ? (c.company || '—') : getContactLocalizedField(c, 'workplace', locale)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isAuthorizedRepresentative(c) && getLinkedRepDisplayItems(c, locale).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const companies = getCompaniesForRep(c.id);
                              const first = companies[0] ? getContactById(companies[0].id) : getContactById(c.authorizedForCompanyId!);
                              if (first) openEdit(first);
                            }}
                            className="admin-badge admin-badge-info text-xs text-right block cursor-pointer hover:opacity-90 px-3 py-1.5"
                            title={locale === 'ar' ? `عرض سجل الشركة: ${getLinkedRepDisplay(c, locale)}` : `View company: ${getLinkedRepDisplay(c, locale)}`}
                          >
                            <div className="flex flex-col gap-1 items-end">
                              {getLinkedRepDisplayItems(c, locale).map((item, i) => (
                                <div key={i} className="text-right">
                                  <div className="font-semibold truncate max-w-[140px] text-xs">
                                    {item.companyName}
                                  </div>
                                  {item.position && (
                                    <div className="text-[11px] opacity-90 truncate max-w-[140px]">
                                      {item.position}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </button>
                        ) : null}
                        {getContactDerivedCategories(c).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFilterCategory(cat)}
                            className="admin-badge admin-badge-info text-xs whitespace-nowrap hover:opacity-90 cursor-pointer"
                            title={locale === 'ar' ? 'تصفية حسب هذا التصنيف' : 'Filter by this category'}
                          >
                            {t(CATEGORY_KEYS[cat] as 'categoryClient')}
                          </button>
                        ))}
                        {!isAuthorizedRepresentative(c) && getContactDerivedCategories(c).length === 0 && (
                          <button
                            type="button"
                            onClick={() => setFilterCategory(c.category)}
                            className="admin-badge admin-badge-info text-xs whitespace-nowrap hover:opacity-90 cursor-pointer"
                            title={locale === 'ar' ? 'تصفية حسب هذا التصنيف' : 'Filter by this category'}
                          >
                            {t(CATEGORY_KEYS[c.category] as 'categoryClient')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[140px]">
                      {c.linkedPropertyId != null ? (
                        <Link
                          href={`/${locale}/admin/properties/${c.linkedPropertyId}`}
                          className="text-xs text-[#8B6F47] hover:underline truncate block font-medium cursor-pointer"
                          title={locale === 'ar' ? `عرض العقار: ${c.linkedUnitDisplay || ''}` : `View property: ${c.linkedUnitDisplay || ''}`}
                        >
                          {c.linkedUnitDisplay || '—'}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-600 truncate block" title={c.linkedUnitDisplay || ''}>
                          {c.linkedUnitDisplay || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${c.phone}`} className="p-1.5 rounded hover:bg-gray-100 text-emerald-600" title={t('call')}>📞</a>
                        <a
                          href={`https://wa.me/${(() => { const d = (c.phone || '').replace(/\D/g, ''); return d.startsWith('968') ? d : '968' + d.replace(/^0/, ''); })()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-emerald-600"
                          title="WhatsApp"
                        >
                          💬
                        </a>
                        {c.email && <a href={`mailto:${c.email}`} className="p-1.5 rounded hover:bg-gray-100 text-blue-600" title={t('email')}>✉️</a>}
                        <button type="button" onClick={() => handlePrintContact(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title={t('printForm')}>🖨️</button>
                        <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-[#8B6F47] text-xs font-medium">{t('edit')}</button>
                        {c.archived ? (
                          <button type="button" onClick={() => handleRestore(c.id)} className="p-1.5 rounded hover:bg-gray-100 text-emerald-600 text-xs font-medium">{t('restore')}</button>
                        ) : isContactLinked(c).linked ? (
                          <span className="p-1.5 text-gray-400 text-xs cursor-not-allowed" title={t('cannotArchiveLinked')}>{t('archive')}</span>
                        ) : (
                          <button type="button" onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-gray-100 text-amber-600 text-xs font-medium">{t('archive')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: إضافة / تعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-print-hide onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* خطوة اختيار النوع - عند الإضافة فقط */}
            {modalStep === 'choose' && !editingId && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{t('addContactTitle')}</h3>
                <p className="text-gray-500 text-sm text-center mb-8">{locale === 'ar' ? 'اختر نوع جهة الاتصال' : 'Choose contact type'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => selectContactTypeAndOpenForm('PERSONAL')}
                    className="group p-8 rounded-2xl border-2 border-gray-200 hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 transition-all duration-200 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-[#8B6F47]/10 flex items-center justify-center text-3xl mx-auto mb-4 transition-colors">👤</div>
                    <div className="font-bold text-gray-900 group-hover:text-[#8B6F47] text-lg">{t('contactTypePersonal')}</div>
                    <p className="text-gray-500 text-sm mt-1">{locale === 'ar' ? 'فرد - ذكر أو أنثى' : 'Individual - Male or Female'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectContactTypeAndOpenForm('COMPANY')}
                    className="group p-8 rounded-2xl border-2 border-gray-200 hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 transition-all duration-200 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-[#8B6F47]/10 flex items-center justify-center text-3xl mx-auto mb-4 transition-colors">🏢</div>
                    <div className="font-bold text-gray-900 group-hover:text-[#8B6F47] text-lg">{t('contactTypeCompany')}</div>
                    <p className="text-gray-500 text-sm mt-1">{locale === 'ar' ? 'شركة - مع المفوضين بالتوقيع' : 'Company - With authorized representatives'}</p>
                  </button>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="w-full mt-6 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                  {t('cancel')}
                </button>
              </div>
            )}

            {/* خطوة النموذج */}
            {modalStep === 'form' && (
              <>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gradient-to-r from-[#8B6F47]/5 to-transparent">
              <div className="flex items-center gap-3">
                {!editingId && (
                  <button
                    type="button"
                    onClick={goBackToChoose}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#8B6F47] transition-all text-sm font-medium"
                    title={locale === 'ar' ? 'الرجوع لاختيار النوع' : 'Back to choose type'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={locale === 'ar' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} /></svg>
                    {locale === 'ar' ? 'تغيير النوع' : 'Change type'}
                  </button>
                )}
              <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? t('editContact') : (form.contactType === 'COMPANY' ? t('contactTypeCompany') : t('contactTypePersonal'))}
              </h3>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${form.contactType === 'COMPANY' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                  {form.contactType === 'COMPANY' ? t('contactTypeCompany') : t('contactTypePersonal')}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <span>🖨️</span>
                {t('printForm')}
              </button>
            </div>
            {Object.keys(formErrors).length > 0 && (
              <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="font-semibold text-red-800 mb-2">{t('pleaseCorrectErrors')}:</p>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {Object.entries(formErrors).map(([key, msg]) => (
                    <li key={key}><span className="font-medium">{getErrorFieldLabel(key)}:</span> {msg}</li>
                  ))}
                </ul>
              </div>
            )}
            <form id="contact-form-print" className="flex flex-col flex-1 min-h-0" onSubmit={handleSave}>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {form.contactType === 'PERSONAL' && (
              <>
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-5">
                <h4 className="text-sm font-bold text-[#8B6F47] flex items-center gap-2 pb-2 border-b border-gray-200">
                  <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center text-base">👤</span>
                  {locale === 'ar' ? 'البيانات الشخصية' : 'Personal Information'}
                </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('firstName')} *</label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={`admin-input w-full ${getRequiredFieldClass('firstName')}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('secondName')}</label>
                  <input type="text" value={form.secondName} onChange={(e) => setForm({ ...form, secondName: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('thirdName')}</label>
                  <input type="text" value={form.thirdName} onChange={(e) => setForm({ ...form, thirdName: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('familyName')} *</label>
                  <input type="text" required value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} className={`admin-input w-full ${getRequiredFieldClass('familyName')}`} />
                </div>
              </div>
              <TranslateField
                label={t('name') + ' (EN)'}
                value={form.nameEn}
                onChange={(v) => setForm({ ...form, nameEn: v })}
                sourceValue={[form.firstName, form.secondName, form.thirdName, form.familyName].filter(Boolean).join(' ')}
                onTranslateFromSource={(v) => setForm({ ...form, nameEn: v })}
                translateFrom="ar"
                locale={locale}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('nationality')} *</label>
                  <input
                    type="text"
                    list="nationalities"
                    required
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className={`admin-input w-full ${getRequiredFieldClass('nationality')}`}
                    placeholder={t('nationalityPlaceholder')}
                  />
                  <datalist id="nationalities">
                    {getAllNationalityValues(locale).map((val) => (
                      <option key={val} value={val} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('gender')}</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as ContactGender })} className="admin-select w-full">
                    <option value="MALE">{t('male')}</option>
                    <option value="FEMALE">{t('female')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phone')} *</label>
                  <div className="flex gap-2">
                    <PhoneCountryCodeSelect value={form.phoneCountryCode} onChange={(v) => setForm({ ...form, phoneCountryCode: v })} locale={locale as 'ar' | 'en'} />
                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`admin-input flex-1 ${getRequiredFieldClass('phone')} ${getFieldErrorClass('phone')}`} placeholder="91234567" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{locale === 'ar' ? 'عمان: 8 أرقام على الأقل' : 'Oman: min 8 digits'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('phoneAlt')}</label>
                  <input type="tel" value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilId')}</label>
                  <input type="text" value={form.civilId} onChange={(e) => setForm({ ...form, civilId: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('civilId')}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('civilIdExpiry')}</label>
                  <input type="date" value={form.civilIdExpiry} onChange={(e) => setForm({ ...form, civilIdExpiry: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              {!isOmaniNationality(form.nationality) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="col-span-2 text-sm font-medium text-amber-800">{t('expatNote')}</p>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportNumber')}</label>
                    <input type="text" value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('passportNumber')}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('passportExpiry')}</label>
                    <input type="date" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} className="admin-input w-full" />
                  </div>
                </div>
              )}
              <div>
                <TranslateField
                  label={t('workplace')}
                  value={form.workplace}
                  onChange={(v) => setForm({ ...form, workplace: v })}
                  sourceValue={form.workplaceEn}
                  onTranslateFromSource={(v) => setForm({ ...form, workplace: v })}
                  translateFrom="en"
                  locale={locale}
                />
                <TranslateField
                  label={t('workplace') + ' (EN)'}
                  value={form.workplaceEn}
                  onChange={(v) => setForm({ ...form, workplaceEn: v })}
                  sourceValue={form.workplace}
                  onTranslateFromSource={(v) => setForm({ ...form, workplaceEn: v })}
                  translateFrom="ar"
                  locale={locale}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('category')} *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContactCategory })} className="admin-select w-full">
                    {(Object.keys(CATEGORY_KEYS) as ContactCategory[]).map((cat) => (
                      <option key={cat} value={cat}>{t(CATEGORY_KEYS[cat] as 'categoryClient')}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TranslateField
                    label={t('address') + ' (عربي) *'}
                    value={form.address?.fullAddress || ''}
                    onChange={(v) => setForm({ ...form, address: { ...form.address, fullAddress: v } })}
                    sourceValue={form.address?.fullAddressEn}
                    onTranslateFromSource={(v) => setForm({ ...form, address: { ...form.address, fullAddress: v } })}
                    translateFrom="en"
                    locale={locale}
                    inputErrorClass={getRequiredFieldClass('address')}
                  />
                  <TranslateField
                    label={t('address') + ' (EN) *'}
                    value={form.address?.fullAddressEn || ''}
                    onChange={(v) => setForm({ ...form, address: { ...form.address, fullAddressEn: v } })}
                    sourceValue={form.address?.fullAddress}
                    onTranslateFromSource={(v) => setForm({ ...form, address: { ...form.address, fullAddressEn: v } })}
                    translateFrom="ar"
                    locale={locale}
                    inputErrorClass={getRequiredFieldClass('address')}
                  />
                </div>
              </div>
              <div>
                <TranslateField
                  label={t('notes')}
                  value={form.notes}
                  onChange={(v) => setForm({ ...form, notes: v })}
                  sourceValue={form.notesEn}
                  onTranslateFromSource={(v) => setForm({ ...form, notes: v })}
                  translateFrom="en"
                  locale={locale}
                  multiline
                  rows={3}
                />
                <TranslateField
                  label={t('notes') + ' (EN)'}
                  value={form.notesEn}
                  onChange={(v) => setForm({ ...form, notesEn: v })}
                  sourceValue={form.notes}
                  onTranslateFromSource={(v) => setForm({ ...form, notesEn: v })}
                  translateFrom="ar"
                  locale={locale}
                  multiline
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tags')}</label>
                <input
                  type="text"
                  value={form.tags?.join(', ') || ''}
                  onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
                  className="admin-input w-full"
                  placeholder={t('tagsPlaceholder')}
                />
              </div>
              </div>
              </>
              )}

              {form.contactType === 'COMPANY' && (
              <>
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-5">
                <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 pb-2 border-b border-blue-200">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-base">🏢</span>
                  {locale === 'ar' ? 'بيانات الشركة' : 'Company Information'}
                </h4>
              <TranslateField
                label={t('companyNameAr') + ' *'}
                value={form.companyNameAr}
                onChange={(v) => setForm({ ...form, companyNameAr: v })}
                sourceValue={form.companyNameEn}
                onTranslateFromSource={(v) => setForm({ ...form, companyNameAr: v })}
                translateFrom="en"
                locale={locale}
                inputErrorClass={getFieldErrorClass('companyNameAr')}
              />
              <TranslateField
                label={t('companyNameEn')}
                value={form.companyNameEn}
                onChange={(v) => setForm({ ...form, companyNameEn: v })}
                sourceValue={form.companyNameAr}
                onTranslateFromSource={(v) => setForm({ ...form, companyNameEn: v })}
                translateFrom="ar"
                locale={locale}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('commercialRegistrationNumber')} *</label>
                  <input type="text" value={form.commercialRegistrationNumber} onChange={(e) => setForm({ ...form, commercialRegistrationNumber: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('commercialRegistrationNumber')}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('commercialRegistrationExpiry')}</label>
                  <input type="date" value={form.commercialRegistrationExpiry} onChange={(e) => setForm({ ...form, commercialRegistrationExpiry: e.target.value })} className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('establishmentDate')}</label>
                  <input type="date" value={form.establishmentDate} onChange={(e) => setForm({ ...form, establishmentDate: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('companyPhone')} *</label>
                  <div className="flex gap-2">
                    <PhoneCountryCodeSelect value={form.phoneCountryCode} onChange={(v) => setForm({ ...form, phoneCountryCode: v })} locale={locale as 'ar' | 'en'} />
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`admin-input flex-1 ${getFieldErrorClass('phone')}`} placeholder="91234567" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{locale === 'ar' ? 'عمان: 8 أرقام على الأقل' : 'Oman: min 8 digits'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('companyPhoneAlt')}</label>
                  <input type="tel" value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} className="admin-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('companyEmail')} *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`admin-input w-full ${getFieldErrorClass('email')}`} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">{t('authorizedRepresentatives')} *</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, authorizedRepresentatives: [...form.authorizedRepresentatives, { ...emptyRep(), phoneCountryCode: '968' }] })}
                    className="text-sm font-semibold text-[#8B6F47] hover:underline"
                  >
                    + {t('addAuthorizedRep')}
                  </button>
                </div>
                {formErrors.authorizedRepresentatives && <p className="text-sm text-red-600 mb-2">{formErrors.authorizedRepresentatives}</p>}
                <div className="space-y-4">
                  {form.authorizedRepresentatives.map((rep, idx) => (
                    <div key={rep.id} className="p-5 rounded-2xl border border-blue-200 bg-white shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">{locale === 'ar' ? `المفوض ${idx + 1}` : `Representative ${idx + 1}`}</span>
                        <button
                          type="button"
                          onClick={() => form.authorizedRepresentatives.length > 1 && setForm({ ...form, authorizedRepresentatives: form.authorizedRepresentatives.filter((_, i) => i !== idx) })}
                          disabled={form.authorizedRepresentatives.length <= 1}
                          className="text-red-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                        >
                          {locale === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="relative" ref={repDropdownOpen === idx ? repDropdownRef : undefined}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <TranslateField
                              label={t('repName') + ' *'}
                              value={rep.name}
                              onChange={(v) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], name: v };
                                setForm({ ...form, authorizedRepresentatives: arr });
                                triggerRepSearch(idx);
                              }}
                              onFocus={() => setRepDropdownOpen(idx)}
                              sourceValue={rep.nameEn}
                              onTranslateFromSource={(v) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], name: v };
                                setForm({ ...form, authorizedRepresentatives: arr });
                              }}
                              translateFrom="en"
                              locale={locale}
                              inputErrorClass={getFieldErrorClass(`rep_${idx}_name`)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setRepDropdownOpen(repDropdownOpen === idx ? null : idx)}
                            className="self-end mb-1 px-3 py-2 rounded-lg text-sm font-medium bg-[#8B6F47]/15 text-[#8B6F47] hover:bg-[#8B6F47]/25 border border-[#8B6F47]/30"
                          >
                            {locale === 'ar' ? 'اختيار من القائمة' : 'Select from list'}
                          </button>
                        </div>
                        {((repDropdownOpen === idx) || (repLinkModal?.repIdx === idx && repLinkModal.matches.length > 0)) && (() => {
                          const excludeIds = form.authorizedRepresentatives
                            .map((r, i) => i !== idx ? (r as { contactId?: string }).contactId : undefined)
                            .filter(Boolean) as string[];
                          if (editingId) excludeIds.push(editingId);
                          const list = repDropdownOpen === idx
                            ? getAllPersonalContacts(excludeIds, (rep.name || '').trim() || undefined)
                            : (repLinkModal?.matches ?? []);
                          return (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                            <p className="px-3 py-2 text-xs text-gray-500 border-b sticky top-0 bg-white">
                              {locale === 'ar' ? 'اختر جهة اتصال من القائمة أو اكتب الاسم للتصفية' : 'Select a contact or type to filter'}
                            </p>
                            {list.length === 0 ? (
                              <p className="px-3 py-4 text-sm text-gray-500">{locale === 'ar' ? 'لا توجد نتائج' : 'No results'}</p>
                            ) : (
                              list.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    const parsed = parsePhoneToCountryAndNumber(c.phone || '');
                                    const digits = (c.phone || '').replace(/\D/g, '').replace(/^0+/, '');
                                    const localNumber = parsed.number || (digits.startsWith(parsed.code) ? digits.slice(parsed.code.length) : digits) || '';
                                    const arr = [...form.authorizedRepresentatives];
                                    arr[idx] = {
                                      ...arr[idx],
                                      contactId: c.id,
                                      name: [c.firstName, c.secondName, c.thirdName, c.familyName].filter(Boolean).join(' ') || (c as { name?: string }).name || '',
                                      nameEn: (c.nameEn || getContactDisplayName(c, 'en') || '').trim() || '',
                                      position: arr[idx].position,
                                      phone: localNumber,
                                      phoneCountryCode: parsed.code || '968',
                                      nationality: c.nationality || '',
                                      civilId: c.civilId || '',
                                      civilIdExpiry: c.civilIdExpiry || '',
                                      passportNumber: c.passportNumber || '',
                                      passportExpiry: c.passportExpiry || '',
                                    };
                                    setForm({ ...form, authorizedRepresentatives: arr });
                                    setRepLinkModal(null);
                                    setRepDropdownOpen(null);
                                  }}
                                  className="w-full text-right p-3 hover:bg-amber-50 border-b border-gray-100 last:border-0 text-sm"
                                >
                                  <span className="font-mono font-semibold text-[#8B6F47] block">{c.serialNumber || '—'}</span>
                                  <span className="text-gray-700">{getContactDisplayName(c, locale)}</span>
                                  <span className="block text-xs text-gray-500">{c.civilId || c.passportNumber || c.phone}</span>
                                </button>
                              ))
                            )}
                            <button type="button" onClick={() => { setRepLinkModal(null); setRepDropdownOpen(null); }} className="w-full p-2 text-xs text-gray-500 hover:bg-gray-50 border-t sticky bottom-0 bg-white">
                              {locale === 'ar' ? 'إغلاق' : 'Close'}
                            </button>
                          </div>
                          );
                        })()}
                        </div>
                        <TranslateField
                          label={(locale === 'ar' ? 'اسم المفوض (EN)' : 'Rep Name (EN)') + ' *'}
                          value={rep.nameEn || ''}
                          onChange={(v) => {
                            const arr = [...form.authorizedRepresentatives];
                            arr[idx] = { ...arr[idx], nameEn: v };
                            setForm({ ...form, authorizedRepresentatives: arr });
                          }}
                          sourceValue={rep.name}
                          onTranslateFromSource={(v) => {
                            const arr = [...form.authorizedRepresentatives];
                            arr[idx] = { ...arr[idx], nameEn: v };
                            setForm({ ...form, authorizedRepresentatives: arr });
                          }}
                          translateFrom="ar"
                          locale={locale}
                          inputErrorClass={getFieldErrorClass(`rep_${idx}_nameEn`)}
                        />
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('repPosition')} *</label>
                          <input type="text" value={rep.position} onChange={(e) => {
                            const arr = [...form.authorizedRepresentatives];
                            arr[idx] = { ...arr[idx], position: e.target.value };
                            setForm({ ...form, authorizedRepresentatives: arr });
                          }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_position`)}`} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('repPhone')} *</label>
                          <div className="flex gap-2">
                            <PhoneCountryCodeSelect value={(rep as { phoneCountryCode?: string }).phoneCountryCode || '968'} onChange={(v) => {
                              const arr = [...form.authorizedRepresentatives];
                              arr[idx] = { ...arr[idx], phoneCountryCode: v };
                              setForm({ ...form, authorizedRepresentatives: arr });
                            }} locale={locale as 'ar' | 'en'} size="sm" />
                            <input type="tel" value={rep.phone} onChange={(e) => {
                              const arr = [...form.authorizedRepresentatives];
                              arr[idx] = { ...arr[idx], phone: e.target.value };
                              setForm({ ...form, authorizedRepresentatives: arr });
                            }} className={`admin-input flex-1 text-sm ${getFieldErrorClass(`rep_${idx}_phone`)}`} placeholder="91234567" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('nationality')} *</label>
                          <input list="nationalities-rep" value={rep.nationality || ''} onChange={(e) => {
                            const arr = [...form.authorizedRepresentatives];
                            arr[idx] = { ...arr[idx], nationality: e.target.value };
                            setForm({ ...form, authorizedRepresentatives: arr });
                          }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_nationality`)}`} placeholder={t('nationalityPlaceholder')} />
                          <datalist id="nationalities-rep">{getAllNationalityValues(locale).map((v) => <option key={v} value={v} />)}</datalist>
                        </div>
                        {isOmaniNationality(rep.nationality || '') ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repCivilId')} *</label>
                              <input type="text" value={rep.civilId || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], civilId: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                                triggerRepSearch(idx);
                              }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_civilId`)}`} />
                              {(rep as { contactId?: string }).contactId && (
                                <p className="text-xs text-emerald-600 mt-0.5">{locale === 'ar' ? 'مرتبط بجهة اتصال مسجلة' : 'Linked to existing contact'}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repCivilIdExpiry')} *</label>
                              <input type="date" value={rep.civilIdExpiry || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], civilIdExpiry: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                              }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_civilIdExpiry`)}`} />
                            </div>
                          </>
                        ) : rep.nationality?.trim() ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repCivilId')} *</label>
                              <input type="text" value={rep.civilId || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], civilId: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                                triggerRepSearch(idx);
                              }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_civilId`)}`} />
                              {(rep as { contactId?: string }).contactId && (
                                <p className="text-xs text-emerald-600 mt-0.5">{locale === 'ar' ? 'مرتبط بجهة اتصال مسجلة' : 'Linked to existing contact'}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repCivilIdExpiry')}</label>
                              <input type="date" value={rep.civilIdExpiry || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], civilIdExpiry: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                              }} className="admin-input w-full text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repPassport')} *</label>
                              <input type="text" value={rep.passportNumber || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], passportNumber: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                                triggerRepSearch(idx);
                              }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_passportNumber`)}`} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('repPassportExpiry')} *</label>
                              <input type="date" value={rep.passportExpiry || ''} onChange={(e) => {
                                const arr = [...form.authorizedRepresentatives];
                                arr[idx] = { ...arr[idx], passportExpiry: e.target.value };
                                setForm({ ...form, authorizedRepresentatives: arr });
                              }} className={`admin-input w-full text-sm ${getFieldErrorClass(`rep_${idx}_passportExpiry`)}`} />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('category')} *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContactCategory })} className="admin-select w-full">
                  {(Object.keys(CATEGORY_KEYS) as ContactCategory[]).map((cat) => (
                    <option key={cat} value={cat}>{t(CATEGORY_KEYS[cat] as 'categoryClient')}</option>
                  ))}
                </select>
              </div>
              <div>
                <TranslateField label={t('address') + ' (عربي)'} value={form.address?.fullAddress || ''} onChange={(v) => setForm({ ...form, address: { ...form.address, fullAddress: v } })} sourceValue={form.address?.fullAddressEn} onTranslateFromSource={(v) => setForm({ ...form, address: { ...form.address, fullAddress: v } })} translateFrom="en" locale={locale} />
                <TranslateField label={t('address') + ' (EN)'} value={form.address?.fullAddressEn || ''} onChange={(v) => setForm({ ...form, address: { ...form.address, fullAddressEn: v } })} sourceValue={form.address?.fullAddress} onTranslateFromSource={(v) => setForm({ ...form, address: { ...form.address, fullAddressEn: v } })} translateFrom="ar" locale={locale} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tags')}</label>
                <input type="text" value={form.tags?.join(', ') || ''} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} className="admin-input w-full" placeholder={t('tagsPlaceholder')} />
              </div>
              </div>
              </>
              )}

              {/* كشف تغيير الحالة + العقود والحجوزات - عند التعديل فقط */}
              {editingId && (() => {
                const contact = getContactById(editingId);
                if (!contact) return null;
                const history = contact.categoryChangeHistory || [];
                const linkedBookings = getContactLinkedBookings(contact);
                const linkedContracts = getContactLinkedContracts(contact);
                const linkedDocs = getContactLinkedBookingDocuments(contact);
                const statusKey = (s: string) => (s === 'ACTIVE' ? 'statusActive' : s === 'ENDED' ? 'statusEnded' : s === 'RENEWED' ? 'statusRenewed' : s === 'CANCELLED' ? 'statusCancelled' : 'statusDraft');
                const fmtDate = (d: string) => new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {isAuthorizedRepresentative(contact) && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <h4 className="text-sm font-bold text-amber-900 mb-2">{t('authorizedRepFor')}</h4>
                        <div className="space-y-1.5 text-sm text-gray-700">
                          {getCompaniesForRep(contact.id).length > 0 ? (
                            getCompaniesForRep(contact.id).map((co) => (
                              <p key={co.id}>
                                <button type="button" onClick={() => openEdit(getContactById(co.id)!)} className="font-medium text-[#8B6F47] hover:underline text-right">
                                  {(locale === 'en' && co.nameEn?.trim()) ? co.nameEn : co.nameAr}
                                  {co.position && ` (${co.position})`}
                                </button>
                              </p>
                            ))
                          ) : getLinkedCompanyName(contact, locale) ? (
                            <p><span className="font-medium text-[#8B6F47]">{getLinkedCompanyName(contact, locale)}</span></p>
                          ) : null}
                          {contact.linkedPropertyId != null && (
                            <p>
                              <span className="text-gray-600">{t('linkedPropertyFromCompany')}: </span>
                              <Link href={`/${locale}/admin/properties/${contact.linkedPropertyId}`} className="text-[#8B6F47] hover:underline font-medium">
                                {contact.linkedUnitDisplay || (locale === 'ar' ? 'عرض العقار' : 'View property')}
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-2">{t('categoryChangeHistory')}</h4>
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('categoryChangeHistoryEmpty')}</p>
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {history.map((h, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2 text-gray-700">
                              <span className="font-medium">{fmtDate(h.date)}</span>
                              <span>{locale === 'ar' ? '→' : '→'}</span>
                              <span>{t(CATEGORY_KEYS[h.from] as 'categoryClient')}</span>
                              <span>{locale === 'ar' ? 'إلى' : 'to'}</span>
                              <span className="font-semibold text-[#8B6F47]">{t(CATEGORY_KEYS[h.to] as 'categoryClient')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-2">{t('linkedContracts')}</h4>
                      {linkedBookings.length === 0 && linkedContracts.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('linkedContractsEmpty')}</p>
                      ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {linkedBookings.map((b) => (
                            <div key={b.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                              <div className="flex flex-wrap gap-2">
                                <span className="font-semibold text-gray-800">{t('bookingDate')}:</span>
                                <span>{fmtDate(b.date)}</span>
                                <span>|</span>
                                <span className="font-semibold">{t('propertyNumber')}:</span>
                                <Link href={`/${locale}/admin/properties/${b.propertyId}`} className="text-[#8B6F47] hover:underline">
                                  {locale === 'ar' ? b.propertyTitleAr : b.propertyTitleEn} {b.unitDisplay && `- ${b.unitDisplay}`}
                                </Link>
                              </div>
                              <div className="flex gap-4 mt-1 text-gray-600">
                                <span>{t('hasFinancialClaims')}: {b.hasFinancialClaims ? t('yes') : t('no')}</span>
                                <span className="px-2 py-0.5 rounded bg-gray-200 text-xs">{b.status}</span>
                              </div>
                              {(b.cardLast4 || b.cardholderName) && (
                                <div className="mt-2 pt-2 border-t border-gray-200 text-gray-600 text-xs">
                                  {locale === 'ar' ? 'دفع ببطاقة:' : 'Card payment:'}
                                  {b.cardLast4 && <span> ****{b.cardLast4}</span>}
                                  {b.cardExpiry && <span> {locale === 'ar' ? 'انتهاء' : 'exp'}: {b.cardExpiry}</span>}
                                  {b.cardholderName && <span> — {b.cardholderName}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                          {linkedDocs.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-bold text-gray-800 mb-2">{locale === 'ar' ? 'المستندات المرفوعة' : 'Uploaded Documents'}</h4>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {linkedDocs.filter((d) => d.fileUrl).map((d) => (
                                  <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-gray-100 text-sm">
                                    <span className="text-gray-700 truncate">{locale === 'ar' ? d.labelAr : d.labelEn}{d.unitDisplay ? ` - ${d.unitDisplay}` : ''}</span>
                                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] hover:underline shrink-0 text-xs font-medium">
                                      {d.fileName || (locale === 'ar' ? 'عرض' : 'View')}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {linkedContracts.map((c) => (
                            <div key={c.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                                <span>{t('bookingDate')}: {fmtDate(c.date)}</span>
                                <span>{t('propertyNumber')}: <Link href={`/${locale}/admin/properties/${c.propertyId}`} className="text-[#8B6F47] hover:underline">{locale === 'ar' ? c.propertyTitleAr : c.propertyTitleEn}</Link></span>
                                <span>{t('landlord')}: {c.landlordName}</span>
                                <span>{t('startDate')}: {fmtDate(c.startDate)}</span>
                                <span>{t('endDate')}: {fmtDate(c.endDate)}</span>
                                <span>{t('hasFinancialClaims')}: {c.hasFinancialClaims ? t('yes') : t('no')}</span>
                              </div>
                              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                                c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                c.status === 'ENDED' ? 'bg-gray-200 text-gray-700' :
                                c.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                              }`}>{t(statusKey(c.status))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]">
                  {editingId ? t('save') : t('add')}
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: تأكيد الإيقاف/الأرشفة */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('confirmArchive')}</h3>
            <p className="text-gray-600 mb-6">{t('confirmArchiveMsg')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-700">
                {t('archive')}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}
