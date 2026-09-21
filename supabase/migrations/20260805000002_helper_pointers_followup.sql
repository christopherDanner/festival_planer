-- Nachzug am Helfer-Umbau (ADR 0005, Issue #98)
--
-- Der Schema-Slice (#97) hat die Helfer-Zeiger additiv angelegt, aber zwei
-- Stellen offen gelassen, an denen der umgeschaltete Code sonst gegen eine
-- Wand läuft. Weiter rein additiv: die alten member_id-Spalten bleiben
-- stehen, sie fallen erst im Aufräum-Slice (#99).

-- 1. station_members: die Zuteilung hängt jetzt allein am Helfer
--
-- member_id war NOT NULL — die Helferliste schreibt aber nur noch helper_id.
-- Und der Schutz gegen die doppelte Stations-Zuteilung hing an
-- UNIQUE(station_id, member_id); er bekommt sein Gegenstück auf helper_id,
-- sonst wäre er beim Umschalten still verloren.
ALTER TABLE station_members
  ALTER COLUMN member_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS station_members_station_id_helper_id_key
  ON station_members (station_id, helper_id);

-- 2. schedule_entries: der Ablaufplan war im Schema-Slice übersehen
--
-- responsible_member_id zeigt per Fremdschlüssel auf members; ohne eigene
-- Spalte könnte der Ablaufplan keinen Helfer als Verantwortlichen eintragen.
-- Löschregel wie bei stations.responsible_helper_id: der Verweis wird
-- vergessen, der Ablauf-Eintrag bleibt stehen.
ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS responsible_helper_id UUID
    REFERENCES festival_helpers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_entries_responsible_helper_id
  ON schedule_entries(responsible_helper_id);

-- Backfill über die Brücke source_member_id + festival_id, genau wie die
-- übrigen Zeiger in 20260804000001. Zeilen gelöschter Feste bleiben leer,
-- weil es dort keinen Helfer gibt.
UPDATE schedule_entries se
   SET responsible_helper_id = fh.id
  FROM festival_helpers fh
 WHERE fh.festival_id = se.festival_id
   AND fh.source_member_id = se.responsible_member_id
   AND se.responsible_helper_id IS NULL;
