/**
 * جسر تكامل النظام القديم (legacy monolith) مع موقع bhd-om:
 * تسجيل دخول موحّد، مستخدمون من Prisma، دفتر عناوين من PostgreSQL.
 */
import type { User, UserRole } from '@prisma/client';
import type { Contact, ContactCategory } from '@/lib/data/addressBook';
import { getContactDisplayName } from '@/lib/data/addressBook';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@/lib/auth/adminPermissions';
import { findManyAddressBookContactsOrHeal } from '@/lib/server/addressBookDbCompat';
import { applyUserIdentityToContactJson } from '@/lib/server/applyUserIdentityToContactJson';
import { prisma } from '@/lib/prisma';

export const BHD_SITE_SSO_PASSWORD = '__BHD_SITE_SSO__';

export const LEGACY_PERMISSION_KEYS = [
  'manage_dashboard',
  'manage_properties',
  'manage_owners',
  'manage_contracts',
  'edit_saved_contracts',
  'view_address_book',
  'view_own_property',
  'view_own_contract',
  'request_maintenance',
  'import_export',
  'approve_edit_requests',
  'manage_users',
  'manage_accounting',
  'approve_accounting',
  'manage_coa',
  'manage_maintenance',
  'manage_tasks',
  'waive_cheque_penalty',
] as const;

export type LegacyPermissionKey = (typeof LEGACY_PERMISSION_KEYS)[number];

export type LegacyBridgeUser = {
  id: string;
  userNo: string;
  username: string;
  role: string;
  contactType: string;
  addressBookKey?: string;
  displayName: string;
  email: string;
  phone?: string;
  password: string;
  permissions: Record<string, boolean>;
  provisionedFromSite?: boolean;
  siteUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LegacyBridgeAddressEntry = Record<string, unknown>;

export type LegacyBridgePayload = {
  siteIntegrated: true;
  version: 1;
  syncedAt: string;
  authSession: { userId: string; loggedInAt: string; source: 'bhd-om' };
  usersRegistry: LegacyBridgeUser[];
  addressBook: LegacyBridgeAddressEntry[];
  flags: {
    usersSource: 'bhd-om';
    addressBookSource: 'bhd-om';
    preferSiteUserManagement: true;
    preferSiteAddressBook: true;
  };
  siteAdminUrls: {
    users: string;
    addressBook: string;
    legacyAddressBook: string;
    dashboard: string;
  };
  currentUser: LegacyBridgeUser;
};

const CATEGORY_TO_LEGACY_TYPE: Record<ContactCategory, string> = {
  CLIENT: 'client',
  TENANT: 'tenant',
  LANDLORD: 'owner',
  SUPPLIER: 'vendor',
  PARTNER: 'partner',
  GOVERNMENT: 'government',
  AUTHORIZED_REP: 'employee',
  OTHER: 'other',
};

function emptyLegacyPermissions(): Record<string, boolean> {
  return LEGACY_PERMISSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = false;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

function allLegacyPermissionsOn(): Record<string, boolean> {
  return LEGACY_PERMISSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

function parseAdminPermissions(raw: string | null | undefined): AdminPermission[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is AdminPermission => ADMIN_PERMISSIONS.includes(p as AdminPermission));
  } catch {
    return [];
  }
}

function mapAdminPermissionsToLegacy(adminPermissions: string | null | undefined): Record<string, boolean> {
  const perms = emptyLegacyPermissions();
  const parsed = parseAdminPermissions(adminPermissions ?? null);
  if (parsed.includes('FULL_ACCESS' as AdminPermission)) {
    return allLegacyPermissionsOn();
  }
  perms.manage_dashboard = true;
  perms.view_address_book = true;
  if (parsed.includes('MANAGE_USERS')) perms.manage_users = true;
  if (parsed.includes('MANAGE_PROPERTIES')) {
    perms.manage_properties = true;
    perms.manage_contracts = true;
    perms.edit_saved_contracts = true;
    perms.manage_owners = true;
  }
  if (parsed.includes('MANAGE_CONTACTS')) {
    perms.view_address_book = true;
  }
  if (parsed.includes('MANAGE_BOOKINGS')) {
    perms.manage_contracts = true;
  }
  if (parsed.includes('MANAGE_ACCOUNTING')) {
    perms.manage_accounting = true;
    perms.manage_coa = true;
  }
  if (parsed.includes('MANAGE_REPORTS')) perms.manage_accounting = true;
  if (parsed.includes('ARCHIVE_RESTORE')) perms.import_export = true;
  if (parsed.includes('MANAGE_SETTINGS')) {
    perms.manage_users = true;
    perms.import_export = true;
  }
  return perms;
}

function legacyPermissionsForSiteUser(user: Pick<User, 'role' | 'isSuperAdmin' | 'adminPermissions'>): Record<string, boolean> {
  if (user.role === 'ADMIN' && user.isSuperAdmin) {
    return allLegacyPermissionsOn();
  }
  if (user.role === 'ADMIN') {
    const mapped = mapAdminPermissionsToLegacy(user.adminPermissions);
    const anyOn = LEGACY_PERMISSION_KEYS.some((k) => mapped[k]);
    return anyOn ? mapped : allLegacyPermissionsOn();
  }
  if (user.role === 'COMPANY' || user.role === 'ORG_MANAGER') {
    const mapped = mapAdminPermissionsToLegacy(user.adminPermissions);
    mapped.manage_dashboard = true;
    mapped.manage_properties = true;
    mapped.manage_contracts = true;
    mapped.view_address_book = true;
    return mapped;
  }
  const perms = emptyLegacyPermissions();
  if (user.role === 'OWNER') {
    perms.view_own_property = true;
    perms.view_own_contract = true;
    perms.request_maintenance = true;
    perms.view_address_book = true;
  } else if (user.role === 'CLIENT') {
    perms.view_own_property = true;
    perms.view_own_contract = true;
    perms.request_maintenance = true;
  }
  return perms;
}

function siteRoleToLegacyRole(role: UserRole, isSuperAdmin: boolean, permissions: Record<string, boolean>): string {
  if (role === 'ADMIN' && (isSuperAdmin || permissions.manage_users)) {
    const allOn = LEGACY_PERMISSION_KEYS.every((k) => permissions[k]);
    if (allOn) return 'system_admin';
  }
  if (role === 'ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER') return 'system_user';
  if (role === 'OWNER') return 'owner_portal';
  if (role === 'CLIENT') return 'client_portal';
  return 'system_user';
}

function siteRoleToContactType(role: UserRole): string {
  if (role === 'OWNER') return 'owner';
  if (role === 'CLIENT') return 'client';
  if (role === 'COMPANY' || role === 'ORG_MANAGER') return 'employee';
  return 'employee';
}

function usernameFromUser(user: Pick<User, 'email' | 'name' | 'id'>): string {
  const email = user.email?.trim();
  if (email && email.includes('@')) return email.split('@')[0]!.toLowerCase();
  const slug = user.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return slug || `user-${user.id.slice(0, 8)}`;
}

export function mapSiteUserToLegacyUser(
  user: Pick<User, 'id' | 'serialNumber' | 'email' | 'name' | 'phone' | 'role' | 'isSuperAdmin' | 'adminPermissions' | 'createdAt' | 'updatedAt'>,
  addressBookKey?: string
): LegacyBridgeUser {
  const permissions = legacyPermissionsForSiteUser(user);
  const role = siteRoleToLegacyRole(user.role, user.isSuperAdmin, permissions);
  const now = new Date().toISOString();
  return {
    id: user.id,
    userNo: user.serialNumber?.trim() || `USR-SITE-${user.id.slice(0, 8)}`,
    username: usernameFromUser(user),
    role,
    contactType: siteRoleToContactType(user.role),
    addressBookKey,
    displayName: user.name?.trim() || user.email,
    email: user.email,
    phone: user.phone?.trim() || undefined,
    password: BHD_SITE_SSO_PASSWORD,
    permissions,
    provisionedFromSite: true,
    siteUserId: user.id,
    createdAt: user.createdAt?.toISOString?.() ?? now,
    updatedAt: user.updatedAt?.toISOString?.() ?? now,
  };
}

function contactToLegacyType(contact: Contact): string {
  if (contact.contactType === 'COMPANY') return 'company';
  return CATEGORY_TO_LEGACY_TYPE[contact.category] || 'tenant';
}

function buildLegacyAddressBookKey(entry: LegacyBridgeAddressEntry): string {
  const type = String(entry.type || '').toLowerCase();
  if (type === 'company') {
    return ['company', String(entry.commercialRegNo || '').toLowerCase(), String(entry.name || '').toLowerCase(), String(entry.mobile || '')].join('|');
  }
  return [type, String(entry.name || '').toLowerCase(), String(entry.mobile || ''), String(entry.idNo || '')].join('|');
}

export function mapSiteContactToLegacyEntry(
  contact: Contact,
  linkedUserId?: string | null
): LegacyBridgeAddressEntry {
  const isCompany = contact.contactType === 'COMPANY';
  const nameAr = getContactDisplayName(contact, 'ar');
  const nameEn = getContactDisplayName(contact, 'en');
  const linked = linkedUserId || contact.userId || contact.linkedUserId || '';
  const address = contact.address || {};
  const building =
    [address.building, address.street, address.area, address.governorate].filter(Boolean).join(' — ') || '';
  const unit = [address.floor, address.village, address.state].filter(Boolean).join(' / ') || '';

  if (isCompany) {
    const entry: LegacyBridgeAddressEntry = {
      type: 'company',
      name: contact.companyData?.companyNameAr || nameAr,
      nameEn: contact.companyData?.companyNameEn || nameEn,
      mobile: contact.phone || '',
      extraMobile: contact.phoneSecondary || '',
      email: contact.email || '',
      commercialRegNo: contact.companyData?.commercialRegistrationNumber || '',
      commercialRegExpiry: contact.companyData?.commercialRegistrationExpiry || '',
      linkedUserId: linked,
      userId: linked || undefined,
      serialNumber: contact.serialNumber || '',
      siteContactId: contact.id,
      id: contact.id,
      building,
      unit,
      siteManaged: true,
      source: 'bhd-om',
      signatories: (contact.companyData?.authorizedRepresentatives || []).map((rep) => ({
        signatoryName: rep.name || buildRepName(rep),
        signatoryNameEn: rep.nameEn || '',
        signatoryIdNo: rep.civilId || '',
        signatoryNationality: rep.nationality || '',
        signatoryMobile: rep.phone || '',
        signatoryPosition: rep.position || '',
      })),
    };
    entry.addressBookKey = buildLegacyAddressBookKey(entry);
    return entry;
  }

  const entry: LegacyBridgeAddressEntry = {
    type: contactToLegacyType(contact),
    name: nameAr,
    nameEn: nameEn,
    mobile: contact.phone || '',
    extraMobile: contact.phoneSecondary || '',
    email: contact.email || '',
    idNo: contact.civilId || contact.passportNumber || '',
    nationality: contact.nationality || '',
    idExpiryDate: contact.civilIdExpiry || '',
    passport: contact.passportNumber || '',
    passportExpiryDate: contact.passportExpiry || '',
    linkedUserId: linked,
    userId: linked || undefined,
    serialNumber: contact.serialNumber || '',
    siteContactId: contact.id,
    id: contact.id,
    building,
    unit,
    siteManaged: true,
    source: 'bhd-om',
  };
  entry.addressBookKey = buildLegacyAddressBookKey(entry);
  return entry;
}

function buildRepName(rep: { firstName?: string; secondName?: string; thirdName?: string; familyName?: string; name?: string }): string {
  const parts = [rep.firstName, rep.secondName, rep.thirdName, rep.familyName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return rep.name || '';
}

export async function buildLegacyBridgeMinimalPayload(
  authUserId: string,
  locale: 'ar' | 'en' = 'ar'
): Promise<LegacyBridgePayload | null> {
  const currentDbUser = await prisma.user.findUnique({
    where: { id: authUserId },
    select: {
      id: true,
      serialNumber: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isSuperAdmin: true,
      adminPermissions: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!currentDbUser) return null;

  const currentUser = mapSiteUserToLegacyUser(currentDbUser);
  const prefix = `/${locale}`;

  return {
    siteIntegrated: true,
    version: 1,
    syncedAt: new Date().toISOString(),
    authSession: {
      userId: currentUser.id,
      loggedInAt: new Date().toISOString(),
      source: 'bhd-om',
    },
    usersRegistry: [currentUser],
    addressBook: [],
    flags: {
      usersSource: 'bhd-om',
      addressBookSource: 'bhd-om',
      preferSiteUserManagement: true,
      preferSiteAddressBook: true,
    },
    siteAdminUrls: {
      users: `${prefix}/admin/users`,
      addressBook: `${prefix}/admin/address-book`,
      legacyAddressBook: '/api/admin/legacy-real-estate/bhd-real-estate.html?mode=addressbook',
      dashboard: `${prefix}/admin`,
    },
    currentUser,
  };
}

export async function buildLegacyBridgePayload(
  authUserId: string,
  locale: 'ar' | 'en' = 'ar'
): Promise<LegacyBridgePayload | null> {
  const currentDbUser = await prisma.user.findUnique({
    where: { id: authUserId },
    select: {
      id: true,
      serialNumber: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isSuperAdmin: true,
      adminPermissions: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!currentDbUser) return null;

  const [siteUsers, contactRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        id: true,
        serialNumber: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isSuperAdmin: true,
        adminPermissions: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    findManyAddressBookContactsOrHeal(prisma),
  ]);

  const addressBook: LegacyBridgeAddressEntry[] = [];
  const userIdToAddressBookKey = new Map<string, string>();

  for (const row of contactRows) {
    const raw = { ...((row.data as Record<string, unknown>) ?? {}) };
    const cid = String(row.contactId || '').trim();
    if (typeof raw.id !== 'string' || !String(raw.id).trim()) {
      raw.id = cid;
    }
    const data = raw as unknown as Contact;
    if (!data || typeof data !== 'object' || !data.id) continue;
    if (data.archived) continue;

    const fromLinked = typeof row.linkedUserId === 'string' ? row.linkedUserId.trim() : '';
    const fromJson = typeof raw.userId === 'string' ? String(raw.userId).trim() : '';
    const identityUid = fromLinked || fromJson;
    if (identityUid) {
      const dbUser = siteUsers.find((u) => u.id === identityUid);
      if (dbUser) {
        applyUserIdentityToContactJson(raw, dbUser);
      }
    }

    const entry = mapSiteContactToLegacyEntry(data, row.linkedUserId);
    addressBook.push(entry);
    const linked = String(entry.linkedUserId || '').trim();
    const abKey = String(entry.addressBookKey || buildLegacyAddressBookKey(entry));
    if (linked) userIdToAddressBookKey.set(linked, abKey);
  }

  const usersRegistry = siteUsers.map((u) =>
    mapSiteUserToLegacyUser(u, userIdToAddressBookKey.get(u.id))
  );

  const currentUser =
    usersRegistry.find((u) => u.id === authUserId) ?? mapSiteUserToLegacyUser(currentDbUser);

  const prefix = `/${locale}`;

  return {
    siteIntegrated: true,
    version: 1,
    syncedAt: new Date().toISOString(),
    authSession: {
      userId: currentUser.id,
      loggedInAt: new Date().toISOString(),
      source: 'bhd-om',
    },
    usersRegistry,
    addressBook,
    flags: {
      usersSource: 'bhd-om',
      addressBookSource: 'bhd-om',
      preferSiteUserManagement: true,
      preferSiteAddressBook: true,
    },
    siteAdminUrls: {
      users: `${prefix}/admin/users`,
      addressBook: `${prefix}/admin/address-book`,
      legacyAddressBook: '/api/admin/legacy-real-estate/bhd-real-estate.html?mode=addressbook',
      dashboard: `${prefix}/admin`,
    },
    currentUser,
  };
}

export function resolveLegacyBridgeLocale(req: { nextUrl: URL; headers: Headers }): 'ar' | 'en' {
  const q = req.nextUrl.searchParams.get('locale');
  if (q === 'en' || q === 'ar') return q;
  const accept = req.headers.get('accept-language') || '';
  if (accept.toLowerCase().startsWith('en')) return 'en';
  return 'ar';
}

function buildBridgeBootScript(): string {
  return `(function(){
function bridgeNeedsAddressBookFetch(payload){
  return !payload||!Array.isArray(payload.addressBook)||!payload.addressBook.length;
}
function reloadAddressBookFromBridge(){
  try{
    var raw=localStorage.getItem('bhd_address_book');
    if(!raw)return;
    var entries=JSON.parse(raw);
    if(!Array.isArray(entries))return;
    if(typeof addressBookEntries!=='undefined')addressBookEntries=entries;
    if(typeof renderAddressBookTable==='function'&&document.body&&document.body.classList.contains('mode-addressbook'))renderAddressBookTable();
    if(typeof renderAddressBookTenantSelect==='function')renderAddressBookTenantSelect();
    if(typeof updateReservationsWorkspaceUi==='function'&&document.body&&document.body.classList.contains('mode-reservations'))updateReservationsWorkspaceUi();
  }catch(e){console.warn('[BHD] reloadAddressBookFromBridge',e);}
}
window.__bhdSiteLocale=function(){
  try{if(typeof appUiLanguage==='string'&&appUiLanguage==='en')return'en';}catch(e){}
  return'ar';
};
window.__bhdWaUrl=function(phone){
  var d=String(phone||'').replace(/\\D/g,'');
  if(!d)return'';
  if(!d.startsWith('968'))d='968'+d.replace(/^0+/,'');
  return'https://wa.me/'+d;
};
window.__bhdScanUrl=function(userId){
  if(!userId)return'';
  return location.origin+'/'+window.__bhdSiteLocale()+'/scan/'+userId;
};
window.__bhdScanUrlForEntry=function(r){
  if(!r)return'';
  var userId=String(r.userId||r.linkedUserId||'').trim();
  if(userId)return window.__bhdScanUrl(userId);
  var siteId=String(r.siteContactId||r.id||'').trim();
  if(siteId&&(r.siteManaged||localStorage.getItem('bhd_site_integrated')==='1'))
    return location.origin+'/'+window.__bhdSiteLocale()+'/scan/contact/'+siteId;
  return'';
};
window.__bhdPrintSiteContact=function(siteContactId){
  if(!siteContactId){alert('لا يوجد معرف جهة اتصال على الموقع / No site contact id');return;}
  fetch('/api/admin/legacy-bridge/address-book/print?id='+encodeURIComponent(siteContactId),{credentials:'include',cache:'no-store'})
    .then(function(r){if(!r.ok)throw new Error('print failed');return r.text();})
    .then(function(html){var w=window.open('','_blank');if(w){w.document.write(html);w.document.close();}})
    .catch(function(){alert('تعذر طباعة التقرير من الموقع / Could not print from site');});
};
window.__bhdShowScanQrModalUrl=function(scanUrl){
  if(!scanUrl)return;
  var img='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(scanUrl);
  var ar=window.__bhdSiteLocale()==='ar';
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML='<div style="background:#fff;border-radius:16px;padding:20px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.25)"><p style="margin:0 0 12px;font-weight:700;color:#333">'+(ar?'مسح الباركود لعرض بيانات جهة الاتصال':'Scan to view contact data')+'</p><img src="'+img+'" alt="QR" style="width:220px;height:220px;display:block;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px"/><p style="margin:12px 0 0;font-size:11px;color:#6b7280;word-break:break-all" dir="ltr">'+scanUrl+'</p><button type="button" style="margin-top:14px;padding:8px 16px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-weight:700;cursor:pointer">'+(ar?'إغلاق':'Close')+'</button></div>';
  overlay.addEventListener('click',function(ev){if(ev.target===overlay||ev.target.tagName==='BUTTON')document.body.removeChild(overlay);});
  document.body.appendChild(overlay);
};
window.__bhdShowScanQrModal=function(userId){
  var url=userId?window.__bhdScanUrl(userId):'';
  if(url)window.__bhdShowScanQrModalUrl(url);
};
window.__bhdAbSerialCellHtml=function(r){
  if(!r)return'<span style="color:#888">—</span>';
  var serial=String(r.serialNumber||'').trim()||'—';
  var scanUrl=typeof window.__bhdScanUrlForEntry==='function'?window.__bhdScanUrlForEntry(r):'';
  var qr='';
  if(scanUrl){
    var img='https://api.qrserver.com/v1/create-qr-code/?size=40x40&data='+encodeURIComponent(scanUrl);
    qr='<button type="button" data-ab-action="qr" data-ab-scan-url="'+scanUrl.replace(/"/g,'&quot;')+'" title="QR" style="padding:0;border:none;background:transparent;cursor:pointer;line-height:0"><img src="'+img+'" alt="QR" width="32" height="32" style="display:block;border-radius:4px;border:1px solid #e5e7eb"/></button>';
  }
  return '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px"><span style="font-size:11px;font-weight:700;color:#8B0000;font-family:monospace;white-space:nowrap" dir="ltr">'+serial+'</span>'+qr+'</div>';
};
window.__bhdAbCommActionsHtml=function(r){
  if(!r)return'';
  var phone=String(r.mobile||'').trim();
  var email=String(r.email||'').trim();
  var userId=String(r.userId||r.linkedUserId||'').trim();
  var siteId=String(r.siteContactId||r.id||'').trim();
  var parts=[];
  if(phone){
    parts.push('<a href="tel:'+phone.replace(/"/g,'')+'" class="mini-btn" title="Call">📞</a>');
    var wa=window.__bhdWaUrl(phone);
    if(wa)parts.push('<a href="'+wa+'" target="_blank" rel="noopener" class="mini-btn" title="WhatsApp">💬</a>');
  }
  if(email)parts.push('<a href="mailto:'+encodeURIComponent(email)+'" class="mini-btn" title="Email">✉️</a>');
  if(siteId)parts.push('<button type="button" class="mini-btn" data-ab-action="print-site" data-ab-site-id="'+siteId.replace(/"/g,'')+'" title="Print">🖨️</button>');
  var scanUrl=typeof window.__bhdScanUrlForEntry==='function'?window.__bhdScanUrlForEntry(r):'';
  if(scanUrl)parts.push('<button type="button" class="mini-btn" data-ab-action="qr" data-ab-scan-url="'+scanUrl.replace(/"/g,'&quot;')+'" title="QR">▦</button>');
  if(!parts.length)return'';
  return'<div class="inline-actions ab-site-comm" style="margin-bottom:6px">'+parts.join('')+'</div>';
};
function abStr(v){return String(v||'').trim();}
function abAttachmentPresent(att){
  if(!att||typeof att!=='object')return false;
  if(abStr(att.dataUrl))return true;
  if(abStr(att.relativePath))return true;
  if(abStr(att.checkAttachmentRelativePath))return true;
  if(abStr(att.attachmentRelativePath))return true;
  if(abStr(att.fileId))return true;
  if(abStr(att.checkAttachmentFileId))return true;
  if(abStr(att.attachmentFileId))return true;
  return!!(att.storedOnDisk&&abStr(att.name));
}
function abEntryStableKey(r){
  if(!r)return'';
  var sid=abStr(r.siteContactId||r.id);
  if(sid)return'site:'+sid;
  var abk=abStr(r.addressBookKey);
  if(abk)return'abk:'+abk;
  var type=abStr(r.type).toLowerCase();
  if(type==='company')return['company',abStr(r.commercialRegNo).toLowerCase(),abStr(r.name).toLowerCase(),abStr(r.mobile)].join('|');
  return[type,abStr(r.name).toLowerCase(),abStr(r.mobile),abStr(r.idNo)].join('|');
}
function abMergeEntry(local,site){
  if(!local)return site||null;
  if(!site)return local;
  var out=Object.assign({},site,local);
  out.siteContactId=site.siteContactId||local.siteContactId;
  out.id=site.id||local.id;
  out.serialNumber=site.serialNumber||local.serialNumber;
  out.linkedUserId=site.linkedUserId||local.linkedUserId;
  out.userId=site.userId||local.userId;
  out.siteManaged=site.siteManaged!=null?site.siteManaged:local.siteManaged;
  out.source=site.source||local.source;
  out.addressBookKey=site.addressBookKey||local.addressBookKey;
  var scalars=['mobile','extraMobile','email','idNo','nationality','idExpiryDate','passport','passportExpiryDate','building','unit','birthDate','nameEn','commercialRegNo','commercialRegExpiry','commercialRegExpiryDate'];
  scalars.forEach(function(f){
    if(abStr(local[f]))out[f]=local[f];
    else if(abStr(site[f]))out[f]=site[f];
  });
  if(abStr(local.name))out.name=local.name;
  else if(abStr(site.name))out.name=site.name;
  ['idAttachment','passportAttachment','commercialRegAttachment','leaseContractAttachment'].forEach(function(f){
    out[f]=abAttachmentPresent(local[f])?local[f]:(site[f]||local[f]||null);
  });
  if(Array.isArray(local.signatories)&&local.signatories.length)out.signatories=local.signatories;
  else if(Array.isArray(site.signatories))out.signatories=site.signatories;
  if(local.updatedAt&&(!site.updatedAt||String(local.updatedAt)>String(site.updatedAt)))out.updatedAt=local.updatedAt;
  return out;
}
function abMergeAddressBooks(localArr,siteArr){
  localArr=Array.isArray(localArr)?localArr:[];
  siteArr=Array.isArray(siteArr)?siteArr:[];
  var localMap=new Map();
  localArr.forEach(function(r){var k=abEntryStableKey(r);if(k)localMap.set(k,r);});
  var used=new Set();
  var merged=siteArr.map(function(site){
    var key=abEntryStableKey(site);
    var local=key?localMap.get(key):null;
    if(!local&&abStr(site.name)){
      local=localArr.find(function(l){
        return abStr(l.type).toLowerCase()===abStr(site.type).toLowerCase()&&abStr(l.name).toLowerCase()===abStr(site.name).toLowerCase();
      })||null;
      if(local&&key)used.add(abEntryStableKey(local));
    }
    if(key)used.add(key);
    return abMergeEntry(local,site);
  });
  localArr.forEach(function(r){
    var key=abEntryStableKey(r);
    if(key&&!used.has(key))merged.push(r);
  });
  return merged;
}
function applyBridge(data){
  if(!data)return;
  var syncKey=String(data.syncedAt||'')+':'+(Array.isArray(data.addressBook)?data.addressBook.length:0);
  if(syncKey&&syncKey===window.__bhdLastBridgeSyncKey&&(Date.now()-(window.__bhdLastBridgeApplyAt||0))<2500)return;
  window.__bhdLastBridgeSyncKey=syncKey;
  window.__bhdLastBridgeApplyAt=Date.now();
  window.__bhdSiteBridge=data;
  window.__bhdSiteBridgePayload=data;
  try{
    localStorage.setItem('bhd_site_integrated','1');
    if(data.usersRegistry)localStorage.setItem('bhd_users_registry',JSON.stringify(data.usersRegistry));
    if(data.authSession)localStorage.setItem('bhd_auth_session',JSON.stringify(data.authSession));
    if(Array.isArray(data.addressBook)&&data.addressBook.length){
      var existing=[];
      try{existing=JSON.parse(localStorage.getItem('bhd_address_book')||'[]');}catch(e){existing=[];}
      if(!Array.isArray(existing))existing=[];
      var mergedAb=abMergeAddressBooks(existing,data.addressBook);
      localStorage.setItem('bhd_address_book',JSON.stringify(mergedAb));
    }
    if(data.siteAdminUrls)window.__bhdSiteAdminUrls=data.siteAdminUrls;
    window.dispatchEvent(new Event('bhd-site-bridge-applied'));
    reloadAddressBookFromBridge();
  }catch(e){console.warn('[BHD] applyBridge storage failed',e);}
}
window.__bhdReapplySiteBridge=function(){applyBridge(window.__bhdSiteBridgePayload);};
window.__bhdApplySiteBridge=function(d){if(d){window.__bhdSiteBridgePayload=d;applyBridge(d);}};
function refreshLegacyAuthUiFromBridge(){
  try{
    if(typeof syncAuthStateFromStorage==='function')syncAuthStateFromStorage();
    if(typeof updateAuthHeaderBar==='function')updateAuthHeaderBar();
    if(typeof getLoggedInUser==='function'&&getLoggedInUser())return true;
  }catch(e){}
  return false;
}
window.__bhdRefreshAddressBookFromSite=function(){
  return fetchFullBridge();
};
function fetchFullBridge(){
  return fetch('/api/admin/legacy-bridge/bootstrap',{credentials:'include',cache:'no-store'})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(d)applyBridge(d);
      return d;
    })
    .catch(function(){return null;});
}
function pollAuthUiRefresh(maxTries){
  var tries=0;
  (function tick(){
    if(refreshLegacyAuthUiFromBridge())return;
    if(++tries<maxTries)setTimeout(tick,200);
  })();
}
window.addEventListener('message',function(ev){
  if(ev.origin!==location.origin)return;
  if(ev.data&&ev.data.type==='bhd-site-bridge'&&ev.data.payload){
    applyBridge(ev.data.payload);
    pollAuthUiRefresh(15);
  }
});
window.addEventListener('bhd-site-bridge-applied',function(){
  setTimeout(function(){pollAuthUiRefresh(10);},0);
});
try{
  var dataEl=document.getElementById('bhd-site-bridge-data');
  if(dataEl&&dataEl.textContent){
    var embedded=JSON.parse(dataEl.textContent);
    if(embedded){window.__bhdSiteBridgePayload=embedded;applyBridge(embedded);}
  }
}catch(e){console.warn('[BHD] embedded site bridge parse failed',e);}
function localAddressBookLooksWarm(){
  try{
    var raw=localStorage.getItem('bhd_address_book');
    if(!raw||raw.length<3)return false;
    var arr=JSON.parse(raw);
    return Array.isArray(arr)&&arr.length>0;
  }catch(e){return false;}
}
function shouldSkipFullBridgeFetch(){
  if(!window.__bhdSiteBridgePayload)return!localAddressBookLooksWarm();
  if(bridgeNeedsAddressBookFetch(window.__bhdSiteBridgePayload))return!localAddressBookLooksWarm();
  return true;
}
var _bhdFullBridgePending=null;
function ensureFullAddressBookFromSite(){
  if(shouldSkipFullBridgeFetch())return Promise.resolve(window.__bhdSiteBridgePayload||null);
  if(_bhdFullBridgePending)return _bhdFullBridgePending;
  _bhdFullBridgePending=fetchFullBridge().then(function(d){
    pollAuthUiRefresh(20);
    return d;
  }).finally(function(){_bhdFullBridgePending=null;});
  return _bhdFullBridgePending;
}
if(!shouldSkipFullBridgeFetch()&&!window.__bhdSiteBridgePayload){ensureFullAddressBookFromSite();}
else if(!shouldSkipFullBridgeFetch()&&bridgeNeedsAddressBookFetch(window.__bhdSiteBridgePayload)){ensureFullAddressBookFromSite();}
document.addEventListener('DOMContentLoaded',function(){
  if(!shouldSkipFullBridgeFetch()&&(!window.__bhdSiteBridgePayload||bridgeNeedsAddressBookFetch(window.__bhdSiteBridgePayload))){
    ensureFullAddressBookFromSite();
  }else{
    pollAuthUiRefresh(25);
  }
  if(!window.__bhdSiteAdminUrls)return;
  var m=new URLSearchParams(location.search).get('mode');
  var u=window.__bhdSiteAdminUrls;
  function addBanner(hostId,title,url,label){
    setTimeout(function(){
      var h=document.getElementById(hostId);
      if(!h||h.querySelector('[data-bhd-site-banner]'))return;
      var b=document.createElement('div');
      b.setAttribute('data-bhd-site-banner','1');
      b.style.cssText='margin-bottom:12px;padding:12px;border:1px solid #c5a028;border-radius:10px;background:#fffdf5';
      b.innerHTML='<p style="margin:0 0 8px;font-weight:700">'+title+'</p><a href="'+url+'" target="_blank" rel="noopener" style="font-weight:700;color:#8B0000">'+label+'</a>';
      h.prepend(b);
    },900);
  }
  if(m==='users'&&u.users)addBanner('usersPanelHost','إدارة المستخدمين — الموقع الرئيسي هو المصدر',u.users,'فتح إدارة المستخدمين في الموقع ←');
  if(m==='addressbook'&&u.addressBook){
    addBanner('addressBookWorkspace','دفتر العناوين متزامن مع الموقع — الاتصال والباركود والطباعة متاحة هنا. للتعديل والإدارة الكاملة افتح الموقع.',u.addressBook,'إدارة دفتر العناوين في الموقع ←');
    if(u.legacyAddressBook){
      setTimeout(function(){
        var h=document.getElementById('addressBookWorkspace');
        if(!h||h.querySelector('[data-bhd-site-legacy-link]'))return;
        var a=document.createElement('p');
        a.setAttribute('data-bhd-site-legacy-link','1');
        a.style.cssText='margin:8px 0 0;font-size:12px;color:#5c6f7b';
        a.innerHTML='مصدر البيانات: PostgreSQL عبر الموقع. مسح الباركود يفتح <code dir="ltr">/'+window.__bhdSiteLocale()+'/scan/{userId}</code>';
        var banner=h.querySelector('[data-bhd-site-banner]');
        if(banner)banner.appendChild(a);
      },950);
    }
  }
},{once:true});
})();`;
}

export function injectLegacySiteBridgeScript(html: string, embeddedPayload?: LegacyBridgePayload | null): string {
  if (html.includes('id="bhd-site-bridge-boot"')) return html;

  const jsonBlock = embeddedPayload
    ? `<script id="bhd-site-bridge-data" type="application/json">${JSON.stringify(embeddedPayload).replace(/</g, '\\u003c')}</script>`
    : '';

  const tag = `${jsonBlock}\n<script id="bhd-site-bridge-boot">${buildBridgeBootScript()}</script>`;
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${tag}\n`);
}
