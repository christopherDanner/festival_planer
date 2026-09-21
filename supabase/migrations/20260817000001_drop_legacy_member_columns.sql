-- Aufräumen nach dem Helfer-Umbau (ADR 0005, Issue #99)
--
-- Gegenstück zum additiven Schema-Slice (#97) und seinem Nachzug (#98): der
-- Code liest und schreibt nur noch helper_id, also dürfen die alten Zeiger
-- weg.

-- 1. Erst die Nachzügler einsammeln, dann erst etwas wegwerfen
--
-- Der Fan-out (#97) lief additiv und *vor* dem Umschalten des Codes (#98).
-- Was der alte Codestand in dem Fenster dazwischen geschrieben hat, trägt
-- member_id und kein helper_id — und ist trotzdem echte Planung eines lebenden
-- Fests. Die Reihenfolge ist deshalb keine Geschmacksfrage: nach dem Drop von
-- member_id wäre die Spur dieser Zeilen weg und nicht mehr zu retten.

-- Der ganze Schritt steht in einem DO-Block: ab Schritt 2 gibt es member_id
-- und source_member_id nicht mehr, und ein zweiter Durchlauf der Migration
-- würde an genau diesen Namen scheitern, statt nichts zu tun. Dynamisches SQL
-- wird erst zur Laufzeit aufgelöst, der Wächter kommt also vorher dran.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'festival_helpers'
       AND column_name = 'source_member_id'
  ) THEN
    RETURN;
  END IF;

  -- 1a. Helfer, die es im Fest noch gar nicht gibt
  --
  -- Dieselbe Regel wie im Fan-out, nur für die Spuren, die #97 noch nicht
  -- sehen konnte. Gelöschte Feste bleiben wie dort außen vor.
  EXECUTE $sql$
    INSERT INTO festival_helpers (
      festival_id, first_name, last_name, email, phone, notes, source_member_id
    )
    SELECT t.festival_id, m.first_name, m.last_name, m.email, m.phone, m.notes, m.id
      FROM (
        SELECT festival_id, member_id
          FROM station_members WHERE helper_id IS NULL AND member_id IS NOT NULL
        UNION
        SELECT festival_id, member_id
          FROM shift_assignments WHERE helper_id IS NULL AND member_id IS NOT NULL
        UNION
        SELECT festival_id, responsible_member_id
          FROM stations WHERE responsible_helper_id IS NULL AND responsible_member_id IS NOT NULL
      ) t
      JOIN festivals f ON f.id = t.festival_id AND f.deleted_at IS NULL
      JOIN members m ON m.id = t.member_id
     WHERE NOT EXISTS (
       SELECT 1 FROM festival_helpers fh
        WHERE fh.festival_id = t.festival_id
          AND fh.source_member_id = t.member_id
     )
  $sql$;

  -- 1b. Zeiger nachziehen — wortgleich zu #97/#98, über dieselbe Brücke.
  EXECUTE $sql$
    UPDATE station_members sm
       SET helper_id = fh.id
      FROM festival_helpers fh
     WHERE fh.festival_id = sm.festival_id
       AND fh.source_member_id = sm.member_id
       AND sm.helper_id IS NULL
  $sql$;

  EXECUTE $sql$
    UPDATE shift_assignments sa
       SET helper_id = fh.id
      FROM festival_helpers fh
     WHERE fh.festival_id = sa.festival_id
       AND fh.source_member_id = sa.member_id
       AND sa.helper_id IS NULL
  $sql$;

  -- Der Verantwortliche ist der stille Fall: seine Spalte ist nullable, ein
  -- verlorener Verweis fiele also niemandem als Fehler auf.
  EXECUTE $sql$
    UPDATE stations s
       SET responsible_helper_id = fh.id
      FROM festival_helpers fh
     WHERE fh.festival_id = s.festival_id
       AND fh.source_member_id = s.responsible_member_id
       AND s.responsible_helper_id IS NULL
  $sql$;
END
$$;

-- 2. Alte member-Zeiger droppen
--
-- Damit fallen die letzten Fremdschlüssel des Schichtplans auf members;
-- schedule_entries.responsible_member_id bleibt stehen und fällt in seinem
-- eigenen Aufräum-Slice. Mit member_id fällt auch der alte
-- UNIQUE(station_id, member_id) — sein Gegenstück auf helper_id steht seit
-- 20260805000002.
ALTER TABLE station_members DROP COLUMN IF EXISTS member_id;
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS member_id;
ALTER TABLE stations DROP COLUMN IF EXISTS responsible_member_id;

-- shift_assignments.festival_member_id ist eine Leiche: in src/ nirgends
-- gelesen oder geschrieben. 20250219000001 wollte sie schon einmal loswerden,
-- in types.ts steht sie trotzdem — also hier noch einmal, mit IF EXISTS.
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS festival_member_id;

-- 3. helper_id wird Pflicht, wo die Zeile ohne Helfer sinnlos ist
--
-- Nach Schritt 1 bleibt ohne helper_id nur noch, was sich nicht retten ließ:
-- Zeilen gelöschter Feste (dort legt der Fan-out bewusst keine Helfer an, und
-- die App erreicht sie nicht mehr) und Zuteilungen, die schon vorher auf
-- niemanden zeigten. Seit dem Drop oben steht in ihnen überhaupt keine Person
-- mehr.
DELETE FROM station_members WHERE helper_id IS NULL;
DELETE FROM shift_assignments WHERE helper_id IS NULL;

ALTER TABLE station_members ALTER COLUMN helper_id SET NOT NULL;
ALTER TABLE shift_assignments ALTER COLUMN helper_id SET NOT NULL;

-- stations.responsible_helper_id bleibt bewusst nullable: eine Station muss
-- keinen Verantwortlichen haben.

-- 4. Die Wunsch-Tabelle entfällt
--
-- Die Wünsche leben seit #97 als station_preferences / shift_preferences auf
-- der Helfer-Zeile; sie brauchten nur deshalb eine eigene Tabelle, weil die
-- Person global war (ADR 0005).
DROP TABLE IF EXISTS festival_member_preferences;

-- 5. Die Migrations-Brücke abräumen
--
-- source_member_id hat den Fan-out und die Backfills aus #97/#98 getragen und
-- ist damit fertig.
ALTER TABLE festival_helpers DROP COLUMN IF EXISTS source_member_id;

-- 6. members bleibt absichtlich stehen
--
-- Kein Vergessen, sondern Entscheidung aus #62 / ADR 0005: die Tabelle ist der
-- tote Rückweg, falls beim Fan-out etwas übersehen wurde. Kein Code fasst sie
-- noch an, und ihre ebenfalls tote Spalte station_preferences stirbt mit ihr,
-- wann immer sie drankommt. Der Vermerk steht als Tabellenkommentar in der
-- Datenbank statt nur hier, weil dort nachsieht, wer die Tabelle später für
-- übriggeblieben hält.
COMMENT ON TABLE members IS
  'Tot seit dem Helfer-Umbau (ADR 0005): kein Code liest oder schreibt hier noch. '
  'Absichtlich stehen geblieben als Rückweg, falls der Fan-out nach festival_helpers '
  'etwas übersehen hat — nicht vergessen, nicht wiederbeleben.';

