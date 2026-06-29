/**
 * مفاتيح localStorage للنظام القديم — تُزامَن مع PostgreSQL على bhd-om.com
 * الترتيب: عقود → عقارات → مرفقات → نظام
 */

export const LEGACY_KV_CONTRACT_KEYS = [
  'bhd_contract_full',
  'bhd_tenancy_contract_drafts',
  'bhd_saved_contracts_by_unit',
  'bhd_contract_history_by_unit',
  'bhd_tenancy_draft_cancellations',
  'bhd_contract_cancellations',
  'bhd_contract_cancellation_requests',
  'bhd_contract_edit_requests',
  'bhd_contract_edit_grants',
  'bhd_contract_renewal_requests',
  'bhd_contract_renewal_grants',
  'bhd_contract_renewal_drafts',
  'bhd_contract_renewal_log',
  'bhd_tenancy_contract_seq',
] as const;

export const LEGACY_KV_PROPERTY_KEYS = [
  'bhd_buildings_list',
  'bhd_owners_list',
  'bhd_owner_building_map',
  'bhd_building_profiles',
  'bhd_owner_profiles',
  'bhd_managed_units',
  'bhd_unit_forced_vacant_keys',
  'bhd_unit_reservations',
  'bhd_reservation_cancellations',
  'bhd_eviction_requests',
  'bhd_use_empty_base_units',
  'bhd_reservation_form_flow_v1',
  'bhd_reservation_flow_mirror_v1',
] as const;

export const LEGACY_KV_ATTACHMENT_KEYS = ['bhd_file_registry'] as const;

export const LEGACY_KV_SYSTEM_KEYS = [
  'bhd_address_book',
  'bhd_addressbook_edit_requests',
  'bhd_addressbook_edit_grants',
  'bhd_users_registry',
  'bhd_auth_session',
  'bhd_theme_mode',
  'bhd_ui_last_mode',
  'bhd_password_reset_requests',
  'bhd_cleanup_keep_owner_addressbook_done',
  'bhd_system_activity_log',
  'bhd_accounting_registry',
  'bhd_maintenance_registry',
  'bhd_tasks_registry',
  'bhd_approval_workflows',
  'bhd_organization_settings',
  'bhd_business_doc_templates',
] as const;

export const LEGACY_KV_ALL_KEYS = [
  ...LEGACY_KV_CONTRACT_KEYS,
  ...LEGACY_KV_PROPERTY_KEYS,
  ...LEGACY_KV_ATTACHMENT_KEYS,
  ...LEGACY_KV_SYSTEM_KEYS,
] as const;

export type LegacyKvKey = (typeof LEGACY_KV_ALL_KEYS)[number];

export type LegacyKvCategory = 'contracts' | 'properties' | 'attachments' | 'system';

const CONTRACT_SET = new Set<string>(LEGACY_KV_CONTRACT_KEYS);
const PROPERTY_SET = new Set<string>(LEGACY_KV_PROPERTY_KEYS);
const ATTACHMENT_SET = new Set<string>(LEGACY_KV_ATTACHMENT_KEYS);

export function isLegacyKvKey(key: string): key is LegacyKvKey {
  return (LEGACY_KV_ALL_KEYS as readonly string[]).includes(key);
}

export function legacyKvCategory(key: string): LegacyKvCategory {
  if (CONTRACT_SET.has(key)) return 'contracts';
  if (PROPERTY_SET.has(key)) return 'properties';
  if (ATTACHMENT_SET.has(key)) return 'attachments';
  return 'system';
}

/** مفاتيح تبقى عند «تصفية كل البيانات» */
export const LEGACY_KV_KEEP_ON_FULL_WIPE = [
  'bhd_users_registry',
  'bhd_auth_session',
  'bhd_theme_mode',
] as const;

export function isLegacyKvKeepOnFullWipe(key: string): boolean {
  return (LEGACY_KV_KEEP_ON_FULL_WIPE as readonly string[]).includes(key);
}

/**
 * على bhd-om.com + Neon: PostgreSQL (LegacyAppKvStore) مصدر الحقيقة عند السحب.
 * يُستثنى دفتر العناوين — يُدار عبر AddressBookContact + bootstrap bridge.
 * يُستثنى مفاتيح الجلسة/المظهر فقط.
 */
export const LEGACY_KV_SITE_AUTHORITATIVE_KEYS = LEGACY_KV_ALL_KEYS.filter(
  (k) =>
    !(LEGACY_KV_KEEP_ON_FULL_WIPE as readonly string[]).includes(k) &&
    k !== 'bhd_address_book'
);
