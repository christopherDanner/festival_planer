-- Shared-workspace RLS (ADR 0001, issues #21 + #24)
--
-- Bisher war RLS pro Eigentümer modelliert: festivals.user_id = auth.uid(),
-- Kindtabellen prüften den Fest-Eigentümer. Das versteckt geteilte Daten,
-- sobald mehrere Logins existieren. Diese Migration stellt alle Tabellen auf
-- den gemeinsamen Arbeitsbereich um:
--
--   SELECT / INSERT / UPDATE : jeder authentifizierte Benutzer.
--   DELETE:
--     * festivals, members (haben user_id) -> nur Ersteller (user_id = auth.uid()).
--     * Kindtabellen (festival_id)         -> nur Ersteller des zugehörigen Fests
--                                             (#21, Variante a).
--
-- INSERT auf festivals/members verlangt weiterhin user_id = auth.uid()
-- (Ersteller-Nachweis fürs Löschen, kein Sichtbarkeits-Marker).
--
-- Der öffentliche, tokenbasierte Magic-Link-Flow für Mitglieder (ohne Login)
-- bleibt unberührt: magic_links bleibt mit Token lesbar, member_preferences
-- bleibt vom Mitglied befüllbar.
--
-- Idempotent und defensiv: jede Tabelle wird nur angefasst, wenn sie existiert,
-- und sämtliche bestehenden Policies (uneinheitlich benannt über die Historie)
-- werden vorher entfernt.

DO $$
DECLARE
  -- Kindtabellen mit festival_id (DELETE = Fest-Ersteller, #21 Variante a)
  child_tables text[] := ARRAY[
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
  -- Tabellen mit eigenem user_id (DELETE = Ersteller)
  owner_tables text[] := ARRAY['festivals', 'members'];
  t text;
  pol record;
BEGIN
  -- Eigentümer-Tabellen: gemeinsame SELECT/INSERT/UPDATE, DELETE nur Ersteller
  FOREACH t IN ARRAY owner_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "shared_select" ON public.%I FOR SELECT TO authenticated USING (true)', t);
      EXECUTE format(
        'CREATE POLICY "shared_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t);
      EXECUTE format(
        'CREATE POLICY "shared_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
      EXECUTE format(
        'CREATE POLICY "creator_delete" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);
    END IF;
  END LOOP;

  -- Kindtabellen: gemeinsame SELECT/INSERT/UPDATE, DELETE nur Fest-Ersteller
  FOREACH t IN ARRAY child_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY "shared_select" ON public.%I FOR SELECT TO authenticated USING (true)', t);
      EXECUTE format(
        'CREATE POLICY "shared_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
      EXECUTE format(
        'CREATE POLICY "shared_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
      EXECUTE format(
        'CREATE POLICY "festival_creator_delete" ON public.%I FOR DELETE TO authenticated '
        'USING (festival_id IN (SELECT id FROM public.festivals WHERE user_id = auth.uid()))', t);
    END IF;
  END LOOP;

  -- Member-facing Magic-Link-Flow (ohne Login, Rolle anon) bleibt funktionsfähig.
  IF to_regclass('public.magic_links') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "public_token_read" ON public.magic_links '
            'FOR SELECT TO anon USING (true)';
  END IF;

  IF to_regclass('public.member_preferences') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "member_public_select" ON public.member_preferences '
            'FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "member_public_insert" ON public.member_preferences '
            'FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "member_public_update" ON public.member_preferences '
            'FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;
