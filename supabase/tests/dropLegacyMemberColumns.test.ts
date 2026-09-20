// @vitest-environment node
//
// Seams under test (aus den Abnahmekriterien von #99 abgeleitet, vor dem
// ersten Test festgelegt):
//
// 1. Die Migrationsdatei
//    supabase/migrations/20260817000001_drop_legacy_member_columns.sql als
//    Ganzes — abgespielt auf einer Datenbank im Schemastand davor, also
//    Basisschema + Ablaufplan-Tabellen (20260315000001) + festival_helpers
//    samt Fan-out (20260804000001) + Nachzug der Zeiger (20260805000002).
// 2. Beobachtet wird ausschließlich über SQL gegen das Ergebnis: das Schema
//    (information_schema, pg_indexes, pg_constraint) und die Daten. Keine
//    Zerlegung des SQL-Textes, kein Nachbau der Regel in TypeScript.
//
// Der Slice hat keine öffentliche Schnittstelle in src/ — die Datenbank *ist*
// die Schnittstelle. Was in src/integrations/supabase/types.ts steht, prüft
// der Typecheck.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { applyMigration, columnsOf, createTestDatabase, insertFestival } from './testDatabase';

// Jeder Test hier startet ein echtes Postgres (WASM) und spielt vier
// Migrationen ab. Das dauert Sekunden statt Millisekunden.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SCHEDULE_TABLES = '20260315000001_create_schedule_tables.sql';
const FESTIVAL_HELPERS = '20260804000001_create_festival_helpers.sql';
const HELPER_POINTERS = '20260805000002_helper_pointers_followup.sql';
const MIGRATION = '20260817000001_drop_legacy_member_columns.sql';

function isoDate(offsetDays: number): string {
	const day = new Date();
	day.setUTCDate(day.getUTCDate() + offsetDays);
	return day.toISOString().slice(0, 10);
}

type LegacyData = {
	festivals: Record<'past' | 'planned' | 'deleted', string>;
	stations: Record<'bar' | 'kassa' | 'zelt', string>;
	shifts: Record<'barEvening' | 'zeltNight', string>;
};

/**
 * Der Bestand, wie er nach dem additiven Umbau dasteht: alte member-Zeiger und
 * neue helper_id nebeneinander. Das gelöschte Fest ist der Härtefall — der
 * Fan-out hat dort keine Helfer angelegt, seine Zeilen tragen also kein
 * helper_id.
 */
async function seedMigratedData(db: PGlite): Promise<LegacyData> {
	const memberId = async (firstName: string, lastName: string) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO members (first_name, last_name, is_active, user_id)
				 VALUES ($1, $2, true, gen_random_uuid()) RETURNING id`,
				[firstName, lastName]
			)
		).rows[0].id;

	const stationId = async (festivalId: string, name: string, responsibleMemberId: string | null) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO stations (festival_id, name, responsible_member_id) VALUES ($1, $2, $3) RETURNING id`,
				[festivalId, name, responsibleMemberId]
			)
		).rows[0].id;

	const shiftId = async (festivalId: string, stationId: string, name: string) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO station_shifts (festival_id, station_id, name, start_date, start_time, end_time)
				 VALUES ($1, $2, $3, CURRENT_DATE, '18:00', '22:00') RETURNING id`,
				[festivalId, stationId, name]
			)
		).rows[0].id;

	const anna = await memberId('Anna', 'Achter');
	const cilli = await memberId('Cilli', 'Cerny');

	const past = await insertFestival(db, 'Zeltfest 2025', isoDate(-30));
	const planned = await insertFestival(db, 'Zeltfest 2026', isoDate(30));
	const deleted = await insertFestival(db, 'Abgesagtes Fest', isoDate(30));
	await db.query(`UPDATE festivals SET deleted_at = now() WHERE id = $1`, [deleted]);

	const bar = await stationId(past, 'Bar', null);
	const kassa = await stationId(past, 'Kassa', cilli);
	const barEvening = await shiftId(past, bar, 'Abendschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		past,
		bar,
		anna
	]);
	await db.query(
		`INSERT INTO shift_assignments (festival_id, station_shift_id, station_id, member_id, position)
		 VALUES ($1, $2, $3, $4, 1)`,
		[past, barEvening, bar, anna]
	);
	await db.query(
		`INSERT INTO festival_member_preferences (festival_id, member_id, station_preferences, shift_preferences)
		 VALUES ($1, $2, ARRAY[$3::text], ARRAY[$4::text])`,
		[past, anna, bar, barEvening]
	);

	await stationId(planned, 'Grill', null);

	// Das gelöschte Fest: Zuteilungen ohne Gegenstück im neuen Modell.
	const zelt = await stationId(deleted, 'Zelt', null);
	const zeltNight = await shiftId(deleted, zelt, 'Nachtschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		deleted,
		zelt,
		anna
	]);
	await db.query(
		`INSERT INTO shift_assignments (festival_id, station_shift_id, station_id, member_id)
		 VALUES ($1, $2, $3, $4)`,
		[deleted, zeltNight, zelt, anna]
	);

	return {
		festivals: { past, planned, deleted },
		stations: { bar, kassa, zelt },
		shifts: { barEvening, zeltNight }
	};
}

/** Der additive Zwischenstand, danach die echte Aufräum-Migration darüber. */
async function cleanedUpDatabase(): Promise<{ db: PGlite; legacy: LegacyData }> {
	const db = await createTestDatabase();
	await applyMigration(db, SCHEDULE_TABLES);
	const legacy = await seedMigratedData(db);
	await applyMigration(db, FESTIVAL_HELPERS);
	await applyMigration(db, HELPER_POINTERS);
	await applyMigration(db, MIGRATION);
	return { db, legacy };
}

describe('Alte member-Zeiger', () => {
	let db: PGlite;

	beforeAll(async () => {
		({ db } = await cleanedUpDatabase());
	});

	it('sind aus station_members, shift_assignments und stations verschwunden', async () => {
		const stationMembers = await columnsOf(db, 'station_members');
		const shiftAssignments = await columnsOf(db, 'shift_assignments');
		const stations = await columnsOf(db, 'stations');

		expect(stationMembers.has('member_id')).toBe(false);
		expect(shiftAssignments.has('member_id')).toBe(false);
		expect(stations.has('responsible_member_id')).toBe(false);
	});

	it('lassen die Helfer-Zeiger an ihrer Stelle stehen', async () => {
		const stationMembers = await columnsOf(db, 'station_members');
		const shiftAssignments = await columnsOf(db, 'shift_assignments');
		const stations = await columnsOf(db, 'stations');

		expect(stationMembers.get('helper_id')).toMatchObject({ data_type: 'uuid' });
		expect(shiftAssignments.get('helper_id')).toMatchObject({ data_type: 'uuid' });
		expect(stations.get('responsible_helper_id')).toMatchObject({ data_type: 'uuid' });
	});

	it('nehmen die Leiche shift_assignments.festival_member_id gleich mit', async () => {
		const shiftAssignments = await columnsOf(db, 'shift_assignments');

		expect(shiftAssignments.has('festival_member_id')).toBe(false);
	});
});

describe('Zuteilung ohne Helfer', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await cleanedUpDatabase());
	});

	it('ist fortan verboten — helper_id trägt die Zuteilung allein', async () => {
		const stationMembers = await columnsOf(db, 'station_members');
		const shiftAssignments = await columnsOf(db, 'shift_assignments');

		expect(stationMembers.get('helper_id')).toMatchObject({ is_nullable: 'NO' });
		expect(shiftAssignments.get('helper_id')).toMatchObject({ is_nullable: 'NO' });
	});

	it('räumt die zurückgebliebenen Zeilen der gelöschten Feste weg', async () => {
		const rest = await db.query<{ station_members: number; shift_assignments: number }>(
			`SELECT (SELECT count(*)::int FROM station_members WHERE festival_id = $1) AS station_members,
			        (SELECT count(*)::int FROM shift_assignments WHERE festival_id = $1) AS shift_assignments`,
			[legacy.festivals.deleted]
		);

		expect(rest.rows[0]).toEqual({ station_members: 0, shift_assignments: 0 });
	});

	it('lässt die Zuteilungen eines lebenden Fests unangetastet', async () => {
		const kept = await db.query<{ station_members: number; shift_assignments: number }>(
			`SELECT (SELECT count(*)::int FROM station_members WHERE festival_id = $1) AS station_members,
			        (SELECT count(*)::int FROM shift_assignments WHERE festival_id = $1) AS shift_assignments`,
			[legacy.festivals.past]
		);

		expect(kept.rows[0]).toEqual({ station_members: 1, shift_assignments: 1 });
	});

	it('lässt eine Station ohne Verantwortlichen weiter zu', async () => {
		const stations = await columnsOf(db, 'stations');

		expect(stations.get('responsible_helper_id')).toMatchObject({ is_nullable: 'YES' });
	});
});

describe('Die Wunsch-Tabelle', () => {
	it('ist weg — die Wünsche stehen auf der Helfer-Zeile', async () => {
		const { db } = await cleanedUpDatabase();

		const tables = await db.query<{ table_name: string }>(
			`SELECT table_name FROM information_schema.tables
			  WHERE table_schema = 'public' AND table_name = 'festival_member_preferences'`
		);
		const helpers = await columnsOf(db, 'festival_helpers');

		expect(tables.rows).toEqual([]);
		expect(helpers.get('station_preferences')).toMatchObject({ udt_name: '_uuid', is_nullable: 'NO' });
		expect(helpers.get('shift_preferences')).toMatchObject({ udt_name: '_uuid', is_nullable: 'NO' });
	});
});

describe('Die Migrations-Brücke', () => {
	it('hat ihren Zweck erfüllt und fällt mit', async () => {
		const { db } = await cleanedUpDatabase();

		const helpers = await columnsOf(db, 'festival_helpers');

		expect(helpers.has('source_member_id')).toBe(false);
	});
});

describe('members', () => {
	let db: PGlite;

	beforeAll(async () => {
		({ db } = await cleanedUpDatabase());
	});

	it('bleibt als toter Rückweg stehen, samt seiner toten Wunsch-Spalte', async () => {
		const members = await columnsOf(db, 'members');

		expect(members.has('id')).toBe(true);
		expect(members.has('station_preferences')).toBe(true);
	});

	it('sagt selbst, dass es Absicht ist — sonst taucht die Tabelle als vergessen wieder auf', async () => {
		const comment = await db.query<{ description: string | null }>(
			`SELECT obj_description('public.members'::regclass, 'pg_class') AS description`
		);

		expect(comment.rows[0].description).toMatch(/ADR 0005/);
	});

	it('wird von keiner Tabelle mehr per Fremdschlüssel gehalten', async () => {
		const references = await db.query<{ table_name: string; column_name: string }>(
			`SELECT c.conrelid::regclass::text AS table_name, a.attname AS column_name
			   FROM pg_constraint c
			   JOIN unnest(c.conkey) AS k(attnum) ON true
			   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
			  WHERE c.contype = 'f' AND c.confrelid = 'public.members'::regclass`
		);

		// schedule_entries.responsible_member_id fällt in seinem eigenen
		// Aufräum-Slice; hier geht es nur um die Helfer-Zeiger.
		expect(references.rows).toEqual([{ table_name: 'schedule_entries', column_name: 'responsible_member_id' }]);
	});
});

describe('Der Schutz gegen die doppelte Stations-Zuteilung', () => {
	it('überlebt den Drop von member_id — er hängt am Helfer', async () => {
		const { db, legacy } = await cleanedUpDatabase();
		const helper = await db.query<{ id: string }>(
			`SELECT id FROM festival_helpers WHERE festival_id = $1 AND first_name = 'Anna'`,
			[legacy.festivals.past]
		);

		const zweitesMal = db.query(
			`INSERT INTO station_members (festival_id, station_id, helper_id) VALUES ($1, $2, $3)`,
			[legacy.festivals.past, legacy.stations.bar, helper.rows[0].id]
		);

		await expect(zweitesMal).rejects.toThrow(/station_members_station_id_helper_id_key/);
	});
});

describe('Zweiter Durchlauf', () => {
	it('läuft ohne zu werfen', async () => {
		const { db } = await cleanedUpDatabase();

		await expect(applyMigration(db, MIGRATION)).resolves.toBeUndefined();
	});
});
