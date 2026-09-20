-- Aufräumen nach dem Helfer-Umbau (ADR 0005, Issue #99)
--
-- Gegenstück zum additiven Schema-Slice (#97) und seinem Nachzug (#98): der
-- Code liest und schreibt nur noch helper_id, also dürfen die alten Zeiger
-- weg.

-- 1. Alte member-Zeiger droppen
--
-- Mit stations.responsible_member_id und station_members.member_id fallen die
-- letzten Fremdschlüssel auf members; mit member_id fällt auch der alte
-- UNIQUE(station_id, member_id) — sein Gegenstück auf helper_id steht seit
-- 20260805000002.
ALTER TABLE station_members DROP COLUMN IF EXISTS member_id;
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS member_id;
ALTER TABLE stations DROP COLUMN IF EXISTS responsible_member_id;

-- shift_assignments.festival_member_id ist eine Leiche: im Schema vorhanden,
-- in src/ nirgends gelesen oder geschrieben, Rest einer früheren Migration.
ALTER TABLE shift_assignments DROP COLUMN IF EXISTS festival_member_id;

-- 2. helper_id wird Pflicht, wo die Zeile ohne Helfer sinnlos ist
--
-- Seit dem Drop oben steht in einer Zuteilung ohne helper_id überhaupt keine
-- Person mehr. Solche Zeilen gibt es genau in gelöschten Festen: der Fan-out
-- aus #97 hat sie übersprungen, weil es dort keine Helfer gibt, und die App
-- erreicht sie nicht mehr.
DELETE FROM station_members WHERE helper_id IS NULL;
DELETE FROM shift_assignments WHERE helper_id IS NULL;

ALTER TABLE station_members ALTER COLUMN helper_id SET NOT NULL;
ALTER TABLE shift_assignments ALTER COLUMN helper_id SET NOT NULL;

-- stations.responsible_helper_id bleibt bewusst nullable: eine Station muss
-- keinen Verantwortlichen haben.

-- 3. Die Wunsch-Tabelle entfällt
--
-- Die Wünsche leben seit #97 als station_preferences / shift_preferences auf
-- der Helfer-Zeile; sie brauchten nur deshalb eine eigene Tabelle, weil die
-- Person global war (ADR 0005).
DROP TABLE IF EXISTS festival_member_preferences;

-- 4. Die Migrations-Brücke abräumen
--
-- source_member_id hat den Fan-out und die Backfills aus #97/#98 getragen und
-- ist damit fertig.
ALTER TABLE festival_helpers DROP COLUMN IF EXISTS source_member_id;

-- 5. members bleibt absichtlich stehen
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

