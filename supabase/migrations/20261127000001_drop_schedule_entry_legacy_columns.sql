-- Aufräumen im Ablaufplan (Issue #128, ADR 0005 / ADR 0007)
--
-- Gegenstück zum additiven Schema-Slice 20260815000001: der Code liest und
-- schreibt nur noch responsible_helper_id und reiht Einträge nach Uhrzeit,
-- also dürfen die alten Spalten weg.
--
-- Voraussetzung: der Datenzugriff läuft auf der neuen Form und die Dialoge
-- schreiben responsible_helper_id. Vorher darf diese Migration nicht laufen.

-- 1. Kein Rettungs-Backfill
--
-- Bewusst nicht: responsible_member_id wird ungelesen weggeworfen. Der heutige
-- Code schreibt den alten Zeiger nie und löscht ihn auch nie — er steht noch
-- an jedem Eintrag aus der Zeit vor 20260815, auch wo der Nutzer den
-- Verantwortlichen seither entfernt oder die Aufgabe zum Programmpunkt gemacht
-- hat (der trägt keinen Verantwortlichen, ADR 0007). Ein Abgleich über den
-- Namen könnte das von einem echten Nachzügler nicht unterscheiden. Preis:
-- Einträge, die der alte Codestand nach 20260815 noch nur mit
-- responsible_member_id geschrieben hat, verlieren ihren Verantwortlichen.
-- Die Person selbst steht weiter in members (Schritt 3).

-- 2. Die abgelösten Spalten droppen
--
-- IF EXISTS: ein zweiter Durchlauf tut nichts.
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
