-- Globale, wiederverwendbare Sponsoren-Stammdaten (analog zu members, NICHT
-- fest-gebunden). Shared-workspace-RLS nach ADR 0001 / 20260609000001:
--   SELECT/INSERT/UPDATE: jeder authentifizierte Benutzer
--   INSERT verlangt user_id = auth.uid() (Ersteller-Nachweis fürs Löschen)
--   DELETE: nur Ersteller (user_id = auth.uid())

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_select" ON sponsors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_insert" ON sponsors
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "shared_update" ON sponsors
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "creator_delete" ON sponsors
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_sponsors_company_name ON sponsors(company_name);
