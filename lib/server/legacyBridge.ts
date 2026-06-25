/**
 * جسر تكامل النظام القديم (legacy monolith) مع موقع bhd-om:
 * تسجيل دخول موحّد، مستخدمون من Prisma، دفتر عناوين من PostgreSQL.
 */
import type { User, UserRole } from '@prisma/client';
import type { Contact, ContactCategory } from '@/lib/data/addressBook';
import { getContactDisplayName } from '@/lib/data/addressBook';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@/lib/auth/adminPermissions';
import { findManyAddressBookContactsOrHeal } from '@/lib/server/addressBookDbCompat';
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

  if (isCompany) {
    const entry: LegacyBridgeAddressEntry = {
      type: 'company',
      name: contact.companyData?.companyNameAr || nameAr,
      nameEn: contact.companyData?.companyNameEn || nameEn,
      mobile: contact.phone || '',
      email: contact.email || '',
      commercialRegNo: contact.companyData?.commercialRegistrationNumber || '',
      commercialRegExpiry: contact.companyData?.commercialRegistrationExpiry || '',
      linkedUserId: linked,
      serialNumber: contact.serialNumber || '',
      siteContactId: contact.id,
      id: contact.id,
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
    email: contact.email || '',
    idNo: contact.civilId || contact.passportNumber || '',
    nationality: contact.nationality || '',
    linkedUserId: linked,
    serialNumber: contact.serialNumber || '',
    siteContactId: contact.id,
    id: contact.id,
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
    const data = row.data as unknown as Contact;
    if (!data || typeof data !== 'object' || !data.id) continue;
    if (data.archived) continue;
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

function buildBridgeBootScript(embeddedPayload: LegacyBridgePayload | null): string {
  const embeddedLiteral = embeddedPayload
    ? JSON.stringify(embeddedPayload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    : 'null';

  return `(function(){
function applyBridge(data){
  if(!data)return;
  window.__bhdSiteBridge=data;
  window.__bhdSiteBridgePayload=data;
  if(data.usersRegistry)localStorage.setItem('bhd_users_registry',JSON.stringify(data.usersRegistry));
  if(data.authSession)localStorage.setItem('bhd_auth_session',JSON.stringify(data.authSession));
  if(Array.isArray(data.addressBook)&&data.addressBook.length)localStorage.setItem('bhd_address_book',JSON.stringify(data.addressBook));
  localStorage.setItem('bhd_site_integrated','1');
  if(data.siteAdminUrls)window.__bhdSiteAdminUrls=data.siteAdminUrls;
}
window.__bhdReapplySiteBridge=function(){applyBridge(window.__bhdSiteBridgePayload);};
window.__bhdApplySiteBridge=function(d){if(d){window.__bhdSiteBridgePayload=d;applyBridge(d);}};
function fetchFullBridge(){
  return fetch('/api/admin/legacy-bridge/bootstrap',{credentials:'include',cache:'no-store'})
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){if(d)applyBridge(d);return d;})
    .catch(function(){});
}
window.addEventListener('message',function(ev){
  if(ev.origin!==location.origin)return;
  if(ev.data&&ev.data.type==='bhd-site-bridge'&&ev.data.payload)applyBridge(ev.data.payload);
});
try{
  var embedded=${embeddedLiteral};
  if(embedded){window.__bhdSiteBridgePayload=embedded;applyBridge(embedded);}
}catch(e){console.warn('[BHD] embedded site bridge failed',e);}
if(!window.__bhdSiteBridgePayload){fetchFullBridge();}
document.addEventListener('DOMContentLoaded',function(){
  fetchFullBridge();
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
  if(m==='addressbook'&&u.addressBook)addBanner('addressBookWorkspace','دفتر العناوين — الموقع الرئيسي هو المصدر',u.addressBook,'فتح دفتر العناوين في الموقع ←');
},{once:true});
})();`;
}

export function injectLegacySiteBridgeScript(html: string, embeddedPayload?: LegacyBridgePayload | null): string {
  if (html.includes('id="bhd-site-bridge-boot"')) return html;
  const tag = `<script id="bhd-site-bridge-boot">${buildBridgeBootScript(embeddedPayload ?? null)}</script>`;
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${tag}\n`);
}
