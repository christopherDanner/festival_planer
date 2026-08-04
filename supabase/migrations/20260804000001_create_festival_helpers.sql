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

-- Fan-out der Bestandsdaten (Entscheidung in #62)
--
-- Heute sieht jedes Fest alle globalen members. Beim Aufteilen bekommt jedes
-- nicht gelöschte Fest
--   1. die Members mit echter Spur in diesem Fest (Zuteilung, Stationsmitglied,
--      Verantwortlicher, hinterlegter Wunsch) — auch vergangene Feste, damit
--      ihre Historie lesbar bleibt;
--   2. zusätzlich, wenn es noch in Planung ist, den kompletten aktiven Pool.
-- Gelöschte Feste (deleted_at) bleiben außen vor: sie sind in der App nicht
-- mehr erreichbar, und ein Rückweg existiert nicht.
WITH preference_values AS (
  -- Beide Wunsch-Arrays flach, damit der uuid-Filter nur einmal dasteht.
  SELECT p.festival_id, p.member_id, 'station' AS kind, w.value, w.pos
    FROM festival_member_preferences p
    CROSS JOIN LATERAL unnest(COALESCE(p.station_preferences, '{}')) WITH ORDINALITY AS w(value, pos)
  UNION ALL
  SELECT p.festival_id, p.member_id, 'shift' AS kind, w.value, w.pos
    FROM festival_member_preferences p
    CROSS JOIN LATERAL unnest(COALESCE(p.shift_preferences, '{}')) WITH ORDINALITY AS w(value, pos)
),
preferences AS (
  -- text[] -> uuid[]. Was nicht als uuid lesbar ist, fällt weg statt die
  -- Migration zu sprengen; unbekannte IDs im Wunsch sind laut ADR 0005 ohnehin
  -- nur Karteileichen.
  SELECT festival_id,
         member_id,
         COALESCE(array_agg(value::uuid ORDER BY pos) FILTER (WHERE kind = 'station'), '{}'::uuid[])
           AS station_preferences,
         COALESCE(array_agg(value::uuid ORDER BY pos) FILTER (WHERE kind = 'shift'), '{}'::uuid[])
           AS shift_preferences
    FROM preference_values
   WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   GROUP BY festival_id, member_id
),
traces AS (
  SELECT festival_id, member_id FROM shift_assignments WHERE member_id IS NOT NULL
  UNION
  SELECT festival_id, member_id FROM station_members
  UNION
  SELECT festival_id, responsible_member_id FROM stations WHERE responsible_member_id IS NOT NULL
  UNION
  SELECT festival_id, member_id FROM festival_member_preferences
  UNION
  SELECT f.id, m.id
    FROM festivals f
    JOIN members m ON m.is_active
   WHERE f.start_date >= CURRENT_DATE AND f.deleted_at IS NULL
)
INSERT INTO festival_helpers (
  festival_id, first_name, last_name, email, phone, notes,
  station_preferences, shift_preferences, source_member_id
)
SELECT t.festival_id,
       m.first_name,
       m.last_name,
       m.email,
       m.phone,
       m.notes,
       COALESCE(pref.station_preferences, '{}'::uuid[]),
       COALESCE(pref.shift_preferences, '{}'::uuid[]),
       m.id
  FROM traces t
  JOIN festivals f ON f.id = t.festival_id AND f.deleted_at IS NULL
  JOIN members m ON m.id = t.member_id
  LEFT JOIN preferences pref ON pref.festival_id = t.festival_id AND pref.member_id = t.member_id
  -- Zweiter Durchlauf legt nichts doppelt an; die Brücke source_member_id sagt,
  -- wer schon da ist.
 WHERE NOT EXISTS (
   SELECT 1 FROM festival_helpers fh
    WHERE fh.festival_id = t.festival_id
      AND fh.source_member_id = t.member_id
 );

-- Zeiger umlegen (additiv, nullable)
--
-- Die bestehenden Zeilen zeigen auf globale Member-IDs. Sie bekommen daneben
-- einen Weg zur fest-eigenen Helfer-Zeile; die alten member_id-Spalten bleiben
-- unverändert und werden weiter vom Code benutzt, bis #98 umschaltet.
-- Löschregeln wie bisher bei member_id: die Zuordnung geht mit, der
-- Verantwortliche-Verweis wird nur vergessen.
ALTER TABLE station_members
  ADD COLUMN IF NOT EXISTS helper_id UUID REFERENCES festival_helpers(id) ON DELETE CASCADE;
ALTER TABLE shift_assignments
  ADD COLUMN IF NOT EXISTS helper_id UUID REFERENCES festival_helpers(id) ON DELETE CASCADE;
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS responsible_helper_id UUID REFERENCES festival_helpers(id) ON DELETE SET NULL;

-- Backfill über die Brücke source_member_id + festival_id. Zeilen gelöschter
-- Feste bleiben leer, weil es dort keinen Helfer gibt.
UPDATE station_members sm
   SET helper_id = fh.id
  FROM festival_helpers fh
 WHERE fh.festival_id = sm.festival_id
   AND fh.source_member_id = sm.member_id
   AND sm.helper_id IS NULL;

UPDATE shift_assignments sa
   SET helper_id = fh.id
  FROM festival_helpers fh
 WHERE fh.festival_id = sa.festival_id
   AND fh.source_member_id = sa.member_id
   AND sa.helper_id IS NULL;

UPDATE stations s
   SET responsible_helper_id = fh.id
  FROM festival_helpers fh
 WHERE fh.festival_id = s.festival_id
   AND fh.source_member_id = s.responsible_member_id
   AND s.responsible_helper_id IS NULL;
