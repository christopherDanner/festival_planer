-- DELETE im gemeinsamen Arbeitsbereich öffnen (ADR 0002)
--
-- ADR 0001 / Migration 20260609000001 gateten DELETE auf den Ersteller:
--   * festivals, members            -> user_id = auth.uid()
--   * Kindtabellen (festival_id)    -> Ersteller des zugehörigen Fests (#21, Variante a)
--
-- Das blockiert die gemeinsame Planung: ein Kollaborator darf eine Position
-- bearbeiten, aber nicht löschen. Entscheidung (ADR 0002): Löschen wird im
-- geteilten Bestand für jeden authentifizierten Benutzer geöffnet — mit einer
-- einzigen Ausnahme:
--
--   * festivals  -> bleibt creator-only (ganzes Fest löschen = katastrophale
--                   Cascade über alle Kinddaten; bewusst geschützt).
--   * ALLE übrigen Tabellen -> DELETE für jeden authentifizierten Benutzer,
--                   dasselbe Prädikat wie SELECT/UPDATE (USING true).
--
-- Surgical & idempotent: nur DELETE-Policies werden ersetzt. SELECT/INSERT/
-- UPDATE — inkl. der anon-Policies für den öffentlichen Magic-Link-Flow
-- (magic_links, member_preferences) — bleiben unangetastet.

DO $$
DECLARE
  -- Alles außer dem Fest selbst.
  open_tables text[] := ARRAY[
    'members',
    'stations',
    'station_shifts',
    'station_members',
    'shift_assignments',
    'station_shift_assignments',
    'festival_member_preferences',
    'festival_materials',
    'schedule_days',
    'schedule_phases',
    'schedule_entries',
    'magic_links',
    'member_preferences'
  ];
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY open_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- Nur bestehende DELETE-Policies entfernen (SELECT/INSERT/UPDATE bleiben).
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND cmd = 'DELETE'
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "shared_delete" ON public.%I FOR DELETE TO authenticated USING (true)', t);
    END IF;
  END LOOP;

  -- festivals: DELETE bleibt bewusst creator-only (aus 20260609000001).
END $$;
