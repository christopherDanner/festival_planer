-- Der Ablauf-Eintrag gehört dem Tag (ADR 0007, Issue #120)
--
-- Rein additiver Schritt: die neuen Spalten entstehen neben den alten,
-- niemand liest sie noch. Der Code schaltet im Code-Slice um, die alten
-- Spalten fallen erst im Aufräum-Slice.

-- 1. Eintrag an den Tag hängen
--
-- Bisher hing der Eintrag zwingend an einer Phase, die Phase am Tag. Der Tag
-- wird die einzige Pflichtebene; der Backfill holt ihn über die Phase.
ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS schedule_day_id UUID REFERENCES schedule_days(id) ON DELETE CASCADE;

UPDATE schedule_entries e
   SET schedule_day_id = p.schedule_day_id
  FROM schedule_phases p
 WHERE p.id = e.schedule_phase_id
   AND e.schedule_day_id IS NULL;

ALTER TABLE schedule_entries ALTER COLUMN schedule_day_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule_day_id ON schedule_entries(schedule_day_id);

-- 2. Phase optional machen
--
-- Man trägt sofort ein und gruppiert später. Der Fremdschlüssel bleibt
-- ON DELETE CASCADE: eine Phase zu löschen heißt „dieser Block fällt aus",
-- die Einträge gehen mit (bewusst beibehalten, ADR 0007).
ALTER TABLE schedule_entries ALTER COLUMN schedule_phase_id DROP NOT NULL;

-- 3. Verantwortlicher wird Helfer
--
-- Dieselbe Konsequenz aus ADR 0005 wie bei stations.responsible_helper_id:
-- der Verantwortliche gehört dem Fest, nicht der globalen members-Tabelle.
-- Löschregel wie dort — den Helfer entfernen vergisst nur den Verweis.
ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS responsible_helper_id UUID REFERENCES festival_helpers(id) ON DELETE SET NULL;

-- Backfill über die Migrations-Brücke aus #97, bei gleicher festival_id.
-- Ein Ablauf-Eintrag war beim Fan-out keine Spur: wo der Verantwortliche aus
-- keinem anderen Grund Helfer des Fests wurde — und in gelöschten Festen, die
-- gar keine Helfer haben — bleibt die Spalte leer.
UPDATE schedule_entries e
   SET responsible_helper_id = fh.id
  FROM festival_helpers fh
 WHERE fh.festival_id = e.festival_id
   AND fh.source_member_id = e.responsible_member_id
   AND e.responsible_helper_id IS NULL;

-- responsible_member_id bleibt in diesem Slice unangetastet und fällt erst im
-- Aufräum-Slice.
