-- sponsorings.sponsor_id: ON DELETE CASCADE -> ON DELETE RESTRICT (ADR 0010, #156)
--
-- ACHTUNG, bevor hier jemand "CASCADE wie überall" wiederherstellt: das RESTRICT
-- ist Absicht. Gleiche Sorte Stelle wie copied_from_festival_id ("SET NULL, nicht
-- CASCADE").
--
-- Der Grund ist die Reichweite des alten Cascades: sponsors ist eine GLOBALE
-- Stammtabelle, sponsorings sind FEST-GEBUNDENE Daten. Eine Firma zu löschen riss
-- jedes Sponsoring dieser Firma in JEDEM Fest mit — auch in längst
-- abgeschlossenen — und änderte damit die Sponsoring-Gesamtsumme eines vergangenen
-- Fests rückwirkend, ohne dass dieses Fest geöffnet worden wäre. Auf sponsors gibt
-- es keinen Soft-Delete und kein Undo. Cascade nach unten innerhalb eines Fests ist
-- richtig (ADR 0002, Blast-Radius = das Fest); dieser Cascade ging quer darüber
-- hinaus. Die Regel gehört deshalb in die Datenbank und nicht bloß in den Dialog:
-- sie ist eine Integritätsregel über Feste hinweg, und die Zahl der Wege in dieses
-- DELETE wächst (sponsors trägt heute creator_delete, künftig shared_delete).
-- Begründung samt verworfener Alternativen in ADR 0010.
--
-- Was RESTRICT NICHT anfasst: ein Fest zu löschen entfernt seine Sponsorings
-- weiterhin über sponsorings.festival_id (eigener Fremdschlüssel, bleibt CASCADE);
-- sponsoring_category_assignments hängt am Sponsoring, nicht am Sponsor.
--
-- Für die Fehlerübersetzung in der Oberfläche (#159, noch offen — bis dahin zeigt
-- /sponsors die Postgres-Meldung): RESTRICT meldet SQLSTATE 23001
-- (restrict_violation), nicht 23503.
--
-- Der bestehende Fremdschlüssel wird über pg_constraint gesucht statt über seinen
-- Namen: der Vorgabename des inline REFERENCES aus 20260609000004 wäre
-- sponsorings_sponsor_id_fkey, aber ein geratener Name lässt DROP ... IF EXISTS
-- leer laufen und legt einen ZWEITEN Fremdschlüssel an — der alte CASCADE feuert
-- dann zuerst und löscht die Historie trotzdem, während die Migration erfolgreich
-- aussieht. Die Nachbedingung am Ende macht genau diesen Fall laut. Wiederholbar
-- ist die Migration dadurch ebenfalls.

DO $$
DECLARE
  sponsor_id_attnum smallint := (
    SELECT attnum FROM pg_attribute
    WHERE attrelid = 'public.sponsorings'::regclass AND attname = 'sponsor_id'
  );
  existing text;
  delete_actions text[];
BEGIN
  FOR existing IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.sponsorings'::regclass
      AND contype = 'f'
      AND confrelid = 'public.sponsors'::regclass
      AND conkey = ARRAY[sponsor_id_attnum]
  LOOP
    EXECUTE format('ALTER TABLE sponsorings DROP CONSTRAINT %I', existing);
  END LOOP;

  ALTER TABLE sponsorings
    ADD CONSTRAINT sponsorings_sponsor_id_fkey
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE RESTRICT;

  SELECT array_agg(confdeltype::text) INTO delete_actions
  FROM pg_constraint
  WHERE conrelid = 'public.sponsorings'::regclass
    AND contype = 'f'
    AND confrelid = 'public.sponsors'::regclass
    AND conkey = ARRAY[sponsor_id_attnum];

  IF delete_actions IS DISTINCT FROM ARRAY['r'] THEN
    RAISE EXCEPTION
      'sponsorings.sponsor_id: erwartet genau einen Fremdschlüssel auf sponsors mit ON DELETE RESTRICT, gefunden: %',
      delete_actions;
  END IF;
END $$;
