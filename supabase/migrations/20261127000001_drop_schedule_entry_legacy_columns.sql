-- Aufräumen im Ablaufplan (Issue #128, ADR 0005 / ADR 0007)
--
-- Gegenstück zum additiven Schema-Slice 20260815000001: der Code liest und
-- schreibt nur noch responsible_helper_id und reiht Einträge nach Uhrzeit,
-- also dürfen die alten Spalten weg.
--
-- Voraussetzung: der Datenzugriff läuft auf der neuen Form und die Dialoge
-- schreiben responsible_helper_id. Vorher darf diese Migration nicht laufen.

-- 1. Nachzügler einsammeln, dann erst etwas wegwerfen
--
-- Der Backfill in 20260815000001 lief über die Migrations-Brücke
-- festival_helpers.source_member_id. Was der alte Codestand danach noch mit
-- responsible_member_id geschrieben hat, trägt keinen Helfer — und die Brücke
-- ist seit 20260817000001 weg. Übrig bleibt der Name: der Fan-out (#97) hat
-- Vor- und Nachname aus members übernommen. Genommen wird nur ein eindeutiger
-- Treffer im selben Fest; bei zwei Gleichnamigen bleibt die Spalte leer,
-- statt zu raten. Danach ist der Verweis verloren — die Person selbst steht
-- weiter in members (Schritt 3).
--
-- Im DO-Block mit dynamischem SQL, wie in 20260817000001: nach Schritt 2 gibt
-- es responsible_member_id nicht mehr, ein zweiter Durchlauf soll nichts tun
-- statt an dem Namen zu scheitern.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'schedule_entries'
       AND column_name = 'responsible_member_id'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $sql$
    UPDATE schedule_entries e
       SET responsible_helper_id = (
         SELECT fh.id
           FROM festival_helpers fh
          WHERE fh.festival_id = e.festival_id
            AND fh.first_name = m.first_name
            AND fh.last_name = m.last_name
       )
      FROM members m
     WHERE m.id = e.responsible_member_id
       AND e.responsible_helper_id IS NULL
       AND (
         SELECT count(*)
           FROM festival_helpers fh
          WHERE fh.festival_id = e.festival_id
            AND fh.first_name = m.first_name
            AND fh.last_name = m.last_name
       ) = 1
  $sql$;
END
$$;

-- 2. Die abgelösten Spalten droppen
--
-- Mit responsible_member_id fallen der letzte Fremdschlüssel auf members und
-- sein Index idx_schedule_entries_responsible_member_id. Auf
-- schedule_entries.sort_order lag nie ein Index.
ALTER TABLE schedule_entries DROP COLUMN IF EXISTS responsible_member_id;
ALTER TABLE schedule_entries DROP COLUMN IF EXISTS sort_order;

-- 3. Was bewusst stehen bleibt
--
-- * schedule_phases.sort_order — Phasen tragen keine Uhrzeit und behalten
--   ihre manuelle Reihenfolge (ADR 0007).
-- * schedule_days.sort_order — unberührt.
-- * members — der tote Rückweg aus #62/#99, siehe den Tabellenkommentar aus
--   20260817000001.
