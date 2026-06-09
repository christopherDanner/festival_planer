-- Sponsorings: verknüpft eine globale Firma (sponsors) mit einem Fest,
-- mit beliebig vielen zugewiesenen Sponsoring-Kategorien (Wert je Zuweisung
-- überschreibbar, NULL = Kategorie-Wert gilt) plus optional EINEM freien
-- Betrag. Kein Status-/Lebenszyklus-Feld (PRD #34).
-- Shared-workspace-RLS nach ADR 0001 / 20260609000001:
--   SELECT/INSERT/UPDATE: jeder authentifizierte Benutzer
--   DELETE sponsorings: nur Ersteller des zugehörigen Fests
--   DELETE assignments: jeder authentifizierte Benutzer — Zuweisungen sind
--   Wertobjekte des Sponsorings; sie zu ersetzen gehört zum gemeinsamen
--   Bearbeiten (UPDATE) des Sponsorings.

CREATE TABLE IF NOT EXISTS sponsorings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  free_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, sponsor_id)
);

ALTER TABLE sponsorings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_select" ON sponsorings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_insert" ON sponsorings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_update" ON sponsorings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "festival_creator_delete" ON sponsorings
  FOR DELETE TO authenticated
  USING (festival_id IN (SELECT id FROM festivals WHERE user_id = auth.uid()));

CREATE INDEX idx_sponsorings_festival_id ON sponsorings(festival_id);
CREATE INDEX idx_sponsorings_sponsor_id ON sponsorings(sponsor_id);

CREATE TABLE IF NOT EXISTS sponsoring_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsoring_id UUID NOT NULL REFERENCES sponsorings(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES sponsoring_categories(id) ON DELETE CASCADE,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sponsoring_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_select" ON sponsoring_category_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared_insert" ON sponsoring_category_assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared_update" ON sponsoring_category_assignments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared_delete" ON sponsoring_category_assignments
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_sponsoring_category_assignments_sponsoring_id
  ON sponsoring_category_assignments(sponsoring_id);
CREATE INDEX idx_sponsoring_category_assignments_category_id
  ON sponsoring_category_assignments(category_id);
