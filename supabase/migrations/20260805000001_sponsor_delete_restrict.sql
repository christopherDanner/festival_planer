-- sponsorings.sponsor_id: ON DELETE CASCADE -> ON DELETE RESTRICT (ADR 0010, #156)
--
-- ACHTUNG, bevor hier jemand "CASCADE wie überall" wiederherstellt: das RESTRICT
-- ist hier Absicht, nicht Schlamperei. Gleiche Sorte Stelle wie
-- copied_from_festival_id ("SET NULL, nicht CASCADE").
--
-- Warum: sponsors ist eine GLOBALE Stammtabelle, sponsorings sind FEST-GEBUNDENE
-- Daten. Der alte Cascade riss beim Löschen einer Firma jedes Sponsoring dieser
-- Firma in JEDEM Fest mit — auch in längst abgeschlossenen. Damit änderte sich die
-- Sponsoring-Gesamtsumme eines vergangenen Fests rückwirkend, ohne dass dieses
-- Fest überhaupt geöffnet worden wäre. Auf sponsors gibt es keinen Soft-Delete und
-- kein Undo. Ausgelöst wird das DELETE auf der Sponsoren-Stammdaten-Seite, wo eine
-- Firma als *Kontakt* gelöscht wird — dort denkt niemand an die Geldsumme von 2023.
--
-- Die Regel (ADR 0010): eine Firma ist nur löschbar, solange kein einziges
-- Sponsoring auf sie zeigt. Sie gehört in die Datenbank und nicht bloß in den
-- Dialog, weil sie eine Integritätsregel über Feste hinweg ist und weil die Zahl
-- der Wege in dieses DELETE wächst — sponsors trägt heute creator_delete, künftig
-- shared_delete (ADR 0002, Blast-Radius = das Fest; dieser Cascade ging darüber
-- hinaus). Die Sperre in der Oberfläche bleibt zusätzlich, damit die Regel erklärt
-- wird, statt in einen Datenbankfehler zu laufen: Gürtel und Hosenträger.
--
-- Was RESTRICT NICHT anfasst: ein Fest zu löschen entfernt seine Sponsorings
-- weiterhin über sponsorings.festival_id (eigener Fremdschlüssel, bleibt CASCADE);
-- sponsoring_category_assignments hängt am Sponsoring, nicht am Sponsor.
--
-- Für die Übersetzung des Fehlers in der Oberfläche: RESTRICT meldet SQLSTATE
-- 23001 (restrict_violation), nicht 23503, und nennt sponsorings_sponsor_id_fkey.
--
-- Der Constraint-Name ist der Postgres-Vorgabename aus dem inline REFERENCES in
-- 20260609000004_create_sponsorings.sql; DROP ... IF EXISTS hält die Migration
-- wiederholbar.

ALTER TABLE sponsorings DROP CONSTRAINT IF EXISTS sponsorings_sponsor_id_fkey;

ALTER TABLE sponsorings
  ADD CONSTRAINT sponsorings_sponsor_id_fkey
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE RESTRICT;
