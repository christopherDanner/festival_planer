// Schema-Prüfstand: fährt ein echtes Postgres (PGlite, WASM) hoch und spielt die
// Migrationen aus supabase/migrations/ ein. Damit lassen sich Regeln testen, die
// in der Datenbank stehen statt im TypeScript — Fremdschlüssel, ON DELETE,
// Constraints. Der Prüfstand läuft als Superuser; RLS ist damit umgangen, denn
// hier geht es um Integrität, nicht um Berechtigungen.
//
// Zwei Dinge muss der Prüfstand stellen, weil sie den verfolgten Migrationen
// vorausgehen (auf Supabase angelegt, nicht in diesem Repo):
//   * die Rollen und auth.uid() der Supabase-Plattform, auf die die RLS-Policies
//     verweisen,
//   * die Tabelle festivals — Stammtabelle aller fest-gebundenen Daten, aber von
//     keiner Migration im Repo erzeugt. Nur die Spalten, auf die die eingespielten
//     Migrationen zeigen (id als Ziel der Fremdschlüssel, user_id für die
//     Ersteller-Policies).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(HERE, '../../../../supabase/migrations');

/**
 * Erste Migration, die die Sponsoring-Tabellen anlegt. Ab hier wird alles
 * eingespielt — nicht eine Handpflegeliste, damit eine spätere Migration, die den
 * Fremdschlüssel wieder verbiegt, hier auffällt statt durchzurutschen. Der Preis:
 * eine spätere Migration, die eine hier nicht gestellte Tabelle anfasst, scheitert
 * im Prüfstand und will im PLATFORM_PRELUDE nachgetragen werden.
 */
const SPONSORING_SCHEMA_START = '20260609000002_create_sponsors.sql';

/** Die Migration, die den Fremdschlüssel auf ON DELETE RESTRICT zieht (#156). */
export const SPONSOR_RESTRICT_MIGRATION = '20260805000001_sponsor_delete_restrict.sql';

/** Die Migration, die die abgelösten Spalten aus schedule_entries räumt (#128). */
export const SCHEDULE_ENTRY_CLEANUP_MIGRATION = '20261127000001_drop_schedule_entry_legacy_columns.sql';

const PLATFORM_PRELUDE = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;

  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

  CREATE TABLE festivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    start_date DATE,
    deleted_at TIMESTAMPTZ,
    user_id UUID NOT NULL
  );

  -- Der Rest dieses Vorlaufs steht hier, weil die verfolgten Migrationen darauf
  -- zeigen, die anlegenden Migrationen aber vor SPONSORING_SCHEMA_START liegen
  -- (bzw. bei members: gar nicht in diesem Repo). Nur die Spalten, die die
  -- eingespielten Migrationen anfassen — allen voran der Helfer-Umbau
  -- (20260804000001, 20260805000002), der aus dem alten Bestand liest und die
  -- Zeiger umlegt.
  CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_id UUID
  );

  CREATE TABLE festival_member_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    station_preferences TEXT[] DEFAULT '{}',
    shift_preferences TEXT[] DEFAULT '{}',
    UNIQUE(festival_id, member_id)
  );

  CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL
  );

  CREATE TABLE station_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE
  );

  CREATE TABLE station_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    UNIQUE(station_id, member_id)
  );

  CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    station_shift_id UUID REFERENCES station_shifts(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    position INTEGER
  );

  -- Der Ablaufplan so, wie 20260315000001 ihn anlegt: der Eintrag hängt an der
  -- Phase, trägt den Member-Zeiger und eine Hand-Reihenfolge. Was danach kommt
  -- (Tag als Pflicht-Ebene, Helfer-Zeiger, Aufräumen), spielen die Migrationen
  -- selbst ein.
  CREATE TABLE schedule_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    label TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE schedule_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_day_id UUID NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_phase_id UUID NOT NULL REFERENCES schedule_phases(id) ON DELETE CASCADE,
    festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    title TEXT,
    responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_schedule_entries_responsible_member_id ON schedule_entries(responsible_member_id);
`;

/**
 * Migrationsdateien ab `from` (und vor `before`, falls gesetzt), in
 * Dateinamen-Reihenfolge (= Ausführungsreihenfolge).
 */
const migrationFiles = (from: string, before?: string): string[] =>
	fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((file) => file.endsWith('.sql') && file >= from && (!before || file < before))
		.sort();

/** Spielt eine Migrationsdatei so ein, wie sie auf der Platte liegt. */
export const applyMigration = async (db: PGlite, file: string): Promise<void> => {
	const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
	try {
		await db.exec(sql);
	} catch (error) {
		throw new Error(`Migration ${file} ist im Prüfstand gescheitert: ${(error as Error).message}`);
	}
};

/**
 * Frisches Postgres mit dem Sponsoring-Schema. Der Aufrufer schließt es mit
 * `db.close()`.
 *
 * `stopBefore` hält vor dieser Migration an — für Tests, die den Bestand
 * *vor* einer Migration anlegen und dann sehen wollen, was sie daraus macht.
 */
export const createSponsoringSchemaDb = async (
	options: { stopBefore?: string } = {}
): Promise<PGlite> => {
	const db = await PGlite.create();
	await db.exec(PLATFORM_PRELUDE);

	for (const file of migrationFiles(SPONSORING_SCHEMA_START, options.stopBefore)) {
		await applyMigration(db, file);
	}

	return db;
};

/** Ein Fest, ein Sponsor — die Kulisse für jeden Löschtest. */
export const seedFestivalAndSponsor = async (
	db: PGlite,
	companyName = 'Brauerei Schremser'
): Promise<{ festivalId: string; sponsorId: string }> => {
	const festival = await db.query<{ id: string }>(
		`INSERT INTO festivals (name, user_id) VALUES ('Zeltfest 2026', gen_random_uuid()) RETURNING id`
	);
	const sponsor = await db.query<{ id: string }>(
		`INSERT INTO sponsors (company_name, user_id) VALUES ($1, gen_random_uuid()) RETURNING id`,
		[companyName]
	);
	return { festivalId: festival.rows[0].id, sponsorId: sponsor.rows[0].id };
};
