-- Sachleistung, Quellfest-Zeiger und der RLS-Nachzug der Sponsoring-Tabellen
-- (Wayfinder #63, ADR 0008 / ADR 0002; Ticket #143). Rein additiv.
--
-- 1) Sachleistung (ADR 0008): was eine Firma NICHT in Geld gibt, z.B.
--    "Geschenkkorb Tombola (€ 80)". Zwei nullable Spalten am Sponsoring —
--    höchstens EINE Sachleistung je Sponsoring, dieselbe Körnung wie
--    free_amount. Kein eigener Typ, keine Kategorie-Variante: eine
--    Sponsoring-Kategorie ist eine Leistung, die der Verein anbietet, die
--    Sachleistung ist, was die Firma gibt. Der geschätzte Sachwert ist eine
--    zweite Zahl neben dem Geld und wird nie hineingerechnet.
--    Am Sponsoring, nicht am globalen Sponsor-Stammsatz (ADR 0011) — der
--    Tombolapreis ist eine Jahresentscheidung.
--
-- 2) Quellfest-Zeiger (ADR 0008): der Vorjahresbeitrag wird aus dem Quellfest
--    einer Sponsor-Übernahme GELESEN, nicht als Schnappschuss mitkopiert.

ALTER TABLE sponsorings ADD COLUMN IF NOT EXISTS in_kind_description TEXT;
ALTER TABLE sponsorings ADD COLUMN IF NOT EXISTS in_kind_value NUMERIC;

-- ON DELETE SET NULL, NICHT CASCADE. Hier denkt man später "CASCADE wie
-- überall" — falsch: festival_id CASCADE heißt "dieses Sponsoring gehört dem
-- Fest", copied_from_festival_id zeigt nur zurück, woher es übernommen wurde.
-- Wird das Vorjahresfest gelöscht, verliert das diesjährige Sponsoring seinen
-- Vorjahresbeitrag — mitgerissen werden darf es nicht.
-- Kein Index: nur punktuelle Lookups.
ALTER TABLE sponsorings ADD COLUMN IF NOT EXISTS copied_from_festival_id UUID
  REFERENCES festivals(id) ON DELETE SET NULL;

-- 3) RLS-Nachzug (ADR 0002, Blast-Radius) — kein neuer Entscheid.
--
-- 20260610000001_open_delete_within_festival.sql zählt 13 Tabellen auf und hat
-- sponsors, sponsorings und sponsoring_categories übersehen: sie entstanden
-- einen Tag früher (20260609000002-4) und tragen noch creator_delete /
-- festival_creator_delete. Heute kann eine Sponsoring-Kategorie nur der
-- Fest-Ersteller löschen und einen Sponsor nur, wer ihn angelegt hat — der
-- ADR-Text sagt "ALLE übrigen Tabellen" außer festivals selbst.
-- sponsoring_category_assignments trägt shared_delete bereits.
--
-- Chirurgisch & idempotent wie die Vorlage: nur DELETE-Policies werden
-- ersetzt, SELECT/INSERT/UPDATE bleiben unangetastet.

DO $$
DECLARE
  open_tables text[] := ARRAY[
    'sponsors',
    'sponsorings',
    'sponsoring_categories'
  ];
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY open_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
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
END $$;
