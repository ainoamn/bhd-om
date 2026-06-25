-- جداول أساسية قابلة للتطوير لاحقاً (إضافة أعمدة عبر هجرات جديدة)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_no TEXT NOT NULL,
  floor TEXT,
  unit_type TEXT,
  status TEXT,
  serial_no TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(building_id, unit_no)
);

CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id);

CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar TEXT,
  name_en TEXT,
  civil_card TEXT,
  mobile TEXT,
  email TEXT,
  passport TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  agreement_no TEXT,
  contract_type TEXT,
  property_type TEXT,
  monthly_rent REAL,
  contract_months INTEGER,
  start_date TEXT,
  end_date TEXT,
  payment_method TEXT,
  deposit_amount REAL,
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_unit ON contracts(unit_id);

CREATE TABLE IF NOT EXISTS meters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
  electricity_account TEXT,
  water_account TEXT,
  electricity_reading TEXT,
  water_reading TEXT
);

CREATE TABLE IF NOT EXISTS file_entries (
  id TEXT PRIMARY KEY,
  building TEXT,
  unit TEXT,
  tenant TEXT,
  doc_type TEXT,
  file_name TEXT,
  file_path TEXT,
  source TEXT,
  notes TEXT,
  updated_at TEXT
);

-- تخزين مفتاح/قيمة لمزامنة الواجهة الحالية دون كسر التصميم (حتى اكتمال التطبيع)
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
