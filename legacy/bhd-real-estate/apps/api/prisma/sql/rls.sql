-- Row Level Security — يُطبَّق بعد prisma migrate
-- كل اتصال API يجب أن ينفّذ: SET app.current_company_id = '<uuid>';

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_current_company_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE POLICY buildings_company_isolation ON buildings
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY units_company_isolation ON units
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY parties_company_isolation ON parties
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY contracts_company_isolation ON contracts
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY audit_log_company_isolation ON audit_log
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY company_data_entries_isolation ON company_data_entries
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());

CREATE POLICY file_objects_company_isolation ON file_objects
  USING (company_id = app_current_company_id())
  WITH CHECK (company_id = app_current_company_id());
