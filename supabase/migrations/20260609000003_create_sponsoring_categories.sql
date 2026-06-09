-- Pro Fest definierbare Sponsoring-Kategorien (Name + Wert), z.B.
-- "Werbeplakat 200", "Social-Media-Beitrag", "Logo in Speisekarte".
-- Kindtabelle von festivals (festival_id, ON DELETE CASCADE).
-- Shared-workspace-RLS nach ADR 0001 / 20260609000001:
--   SELECT/INSERT/UPDATE: jeder authentifizierte Benutzer
--   DELETE: nur Ersteller des zugehörigen Fests

CREATE TABLE IF NOT EXISTS sponsoring_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sponsoring_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_select" ON sponsoring_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_insert" ON sponsoring_categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_update" ON sponsoring_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "festival_creator_delete" ON sponsoring_categories
  FOR DELETE TO authenticated
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_sponsoring_categories_festival_id ON sponsoring_categories(festival_id);
