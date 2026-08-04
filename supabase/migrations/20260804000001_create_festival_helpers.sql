-- Helfer gehören dem Fest (ADR 0005, Issue #97)
--
-- Erster, rein additiver Schritt: die neue Tabelle entsteht neben members,
-- niemand liest sie noch. Der Code schaltet in #98 um, die alten Spalten
-- fallen erst in #99.

CREATE TABLE IF NOT EXISTS festival_helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  -- Wünsche liegen auf der Helfer-Zeile, ohne Fremdschlüssel (ADR 0005):
  -- eine gelöschte Station bleibt als Karteileiche im Array, das Lesen filtert.
  station_preferences UUID[] NOT NULL DEFAULT '{}',
  shift_preferences UUID[] NOT NULL DEFAULT '{}',
  -- Temporäre Migrations-Brücke, fällt in #99 wieder weg.
  source_member_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Bewusst nicht dabei: is_active und user_id (Begründung in ADR 0005).

CREATE INDEX IF NOT EXISTS idx_festival_helpers_festival_id ON festival_helpers(festival_id);

-- RLS ohne Sonderregel: festival_helpers liegt innerhalb eines Fests, also
-- SELECT/INSERT/UPDATE/DELETE für jeden authentifizierten Benutzer
-- (ADR 0002, Muster aus 20260609000001 + 20260610000001).
ALTER TABLE festival_helpers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select" ON festival_helpers;
CREATE POLICY "shared_select" ON festival_helpers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert" ON festival_helpers;
CREATE POLICY "shared_insert" ON festival_helpers
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update" ON festival_helpers;
CREATE POLICY "shared_update" ON festival_helpers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete" ON festival_helpers;
CREATE POLICY "shared_delete" ON festival_helpers
  FOR DELETE TO authenticated USING (true);
