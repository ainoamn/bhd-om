/** Dashboard KV keys — keep in sync with legacyBridge BHD_DASH_KV_KEYS */
export const BHD_DASH_KV_KEYS = [
  'bhd_saved_contracts_by_unit',
  'bhd_managed_units',
  'bhd_buildings_list',
  'bhd_owners_list',
  'bhd_building_profiles',
  'bhd_owner_profiles',
  'bhd_unit_reservations',
  'bhd_accounting_registry',
  'bhd_tasks_registry',
  'bhd_maintenance_registry',
  'bhd_eviction_requests',
] as const;

export type LegacyKvStringMap = Record<string, string>;
