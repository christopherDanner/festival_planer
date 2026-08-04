// @vitest-environment node
//
// Seams under test (aus den Abnahmekriterien von #97 abgeleitet, vor dem
// ersten Test festgelegt):
//
// 1. Die Migrationsdatei supabase/migrations/20260804000001_create_festival_helpers.sql
//    als Ganzes — abgespielt auf einer Datenbank im Schemastand vor #97.
// 2. Beobachtet wird ausschließlich über SQL gegen das Ergebnis: das Schema
//    (information_schema, pg_policies) und die Daten. Keine Zerlegung des
//    SQL-Textes, kein Nachbau der Regel in TypeScript.
//
// Der Slice hat keine öffentliche Schnittstelle in src/ — die Datenbank *ist*
// die Schnittstelle, auf die der Code-Slice #98 danach zugreift.

import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { applyMigration, createTestDatabase } from './testDatabase';

const MIGRATION = '20260804000001_create_festival_helpers.sql';

type ColumnRow = {
	column_name: string;
	data_type: string;
	udt_name: string;
	is_nullable: string;
	column_default: string | null;
};

async function columnsOf(db: PGlite, table: string): Promise<Map<string, ColumnRow>> {
	const result = await db.query<ColumnRow>(
		`SELECT column_name, data_type, udt_name, is_nullable, column_default
		   FROM information_schema.columns
		  WHERE table_schema = 'public' AND table_name = $1`,
		[table]
	);
	return new Map(result.rows.map((row) => [row.column_name, row]));
}

async function insertFestival(db: PGlite, name: string, startDate: string): Promise<string> {
	const result = await db.query<{ id: string }>(
		`INSERT INTO festivals (name, type, start_date, visitor_count, user_id)
		 VALUES ($1, 'Zeltfest', $2, '500', gen_random_uuid()) RETURNING id`,
		[name, startDate]
	);
	return result.rows[0].id;
}

function isoDate(offsetDays: number): string {
	const day = new Date();
	day.setUTCDate(day.getUTCDate() + offsetDays);
	return day.toISOString().slice(0, 10);
}

type LegacyData = {
	festivals: Record<'past' | 'pastWithoutTrace' | 'planned' | 'deleted', string>;
	stations: Record<'bar' | 'grill', string>;
	shifts: Record<'barEvening', string>;
};

/**
 * Der Bestand, wie er vor dem Umbau aussieht: globale members, Fest-Bezug nur
 * über Zuteilungen, Stationsmitglieder, Verantwortliche und die Wunsch-Tabelle.
 * Deckt alle vier Spuren aus #97 plus Pool-, Lösch- und Dubletten-Fall ab.
 */
async function seedLegacyData(db: PGlite): Promise<LegacyData> {
	const memberId = async (firstName: string, lastName: string, isActive: boolean) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO members (first_name, last_name, email, phone, notes, is_active, station_preferences, user_id)
				 VALUES ($1, $2, $3, '0664 1234', 'Kommt mit dem Rad', $4, ARRAY['tote-legacy-spalte'], gen_random_uuid())
				 RETURNING id`,
				[firstName, lastName, `${firstName.toLowerCase()}@example.org`, isActive]
			)
		).rows[0].id;

	const anna = await memberId('Anna', 'Achter', true);
	const bert = await memberId('Bert', 'Bichler', true);
	const cilli = await memberId('Cilli', 'Cerny', true);
	const dora = await memberId('Dora', 'Dorfer', true);
	const emil = await memberId('Emil', 'Ebner', true);
	const franz = await memberId('Franz', 'Fuchs', false);
	await memberId('Gerda', 'Gruber', false);

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

	const past = await insertFestival(db, 'Zeltfest 2025', isoDate(-30));
	const pastWithoutTrace = await insertFestival(db, 'Kirtag 2024', isoDate(-60));
	const planned = await insertFestival(db, 'Zeltfest 2026', isoDate(30));
	const deleted = await insertFestival(db, 'Abgesagtes Fest', isoDate(30));
	await db.query(`UPDATE festivals SET deleted_at = now() WHERE id = $1`, [deleted]);

	const bar = await stationId(past, 'Bar', null);
	await stationId(past, 'Kassa', cilli);
	const barEvening = await shiftId(past, bar, 'Abendschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3), ($1, $2, $4)`, [
		past,
		bar,
		anna,
		bert
	]);
	await db.query(
		`INSERT INTO shift_assignments (festival_id, station_shift_id, station_id, member_id) VALUES ($1, $2, $3, $4)`,
		[past, barEvening, bar, anna]
	);
	await db.query(
		`INSERT INTO festival_member_preferences (festival_id, member_id, station_preferences, shift_preferences)
		 VALUES ($1, $2, ARRAY[$3::text], ARRAY[$4::text])`,
		[past, dora, bar, barEvening]
	);

	await stationId(pastWithoutTrace, 'Lager', null);

	const grill = await stationId(planned, 'Grill', null);
	await shiftId(planned, grill, 'Mittagsschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		planned,
		grill,
		franz
	]);
	await db.query(
		`INSERT INTO festival_member_preferences (festival_id, member_id, station_preferences, shift_preferences)
		 VALUES ($1, $2, ARRAY['keine-uuid', $3::text], ARRAY[]::text[])`,
		[planned, emil, grill]
	);

	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		deleted,
		await stationId(deleted, 'Zelt', null),
		anna
	]);

	return {
		festivals: { past, pastWithoutTrace, planned, deleted },
		stations: { bar, grill },
		shifts: { barEvening }
	};
}

/** Bestand von vor dem Umbau, danach die echte Migration darüber. */
async function migratedDatabaseWithLegacyData(): Promise<{ db: PGlite; legacy: LegacyData }> {
	const db = await createTestDatabase();
	const legacy = await seedLegacyData(db);
	await applyMigration(db, MIGRATION);
	return { db, legacy };
}

/** Die Vornamen der Helfer eines Fests, über source_member_id zurückgeschlüsselt. */
async function helperNamesOf(db: PGlite, festivalId: string): Promise<string[]> {
	const result = await db.query<{ first_name: string }>(
		`SELECT m.first_name FROM festival_helpers fh
		   JOIN members m ON m.id = fh.source_member_id
		  WHERE fh.festival_id = $1 ORDER BY m.first_name`,
		[festivalId]
	);
	return result.rows.map((row) => row.first_name);
}

/** Die Helfer-Zeilen eines Fests, die aus einem bestimmten Member entstanden sind. */
async function helperIdsOf(db: PGlite, festivalId: string, firstName: string): Promise<string[]> {
	const result = await db.query<{ id: string }>(
		`SELECT fh.id FROM festival_helpers fh
		   JOIN members m ON m.id = fh.source_member_id
		  WHERE fh.festival_id = $1 AND m.first_name = $2`,
		[festivalId, firstName]
	);
	return result.rows.map((row) => row.id);
}

async function preferencesOf(
	db: PGlite,
	festivalId: string,
	firstName: string
): Promise<{ station_preferences: string[]; shift_preferences: string[] }> {
	const result = await db.query<{ station_preferences: string[]; shift_preferences: string[] }>(
		`SELECT fh.station_preferences, fh.shift_preferences FROM festival_helpers fh
		   JOIN members m ON m.id = fh.source_member_id
		  WHERE fh.festival_id = $1 AND m.first_name = $2`,
		[festivalId, firstName]
	);
	return result.rows[0];
}

/** Helfer-Zeilen und gesetzte Zeiger — das, was ein zweiter Durchlauf nicht ändern darf. */
async function countsOf(db: PGlite): Promise<{ helpers: number; pointers: number }> {
	const result = await db.query<{ helpers: number; pointers: number }>(
		`SELECT (SELECT count(*)::int FROM festival_helpers) AS helpers,
		        (SELECT count(*)::int FROM station_members WHERE helper_id IS NOT NULL)
		      + (SELECT count(*)::int FROM shift_assignments WHERE helper_id IS NOT NULL)
		      + (SELECT count(*)::int FROM stations WHERE responsible_helper_id IS NOT NULL) AS pointers`
	);
	return result.rows[0];
}

describe('festival_helpers', () => {
	let db: PGlite;

	beforeAll(async () => {
		db = await createTestDatabase();
		await applyMigration(db, MIGRATION);
	});

	it('trägt Name, Kontakt, Notizen und die beiden Wunsch-Arrays', async () => {
		const columns = await columnsOf(db, 'festival_helpers');

		expect(columns.get('id')).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
		expect(columns.get('id')?.column_default).toBe('gen_random_uuid()');
		expect(columns.get('festival_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
		expect(columns.get('first_name')).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
		expect(columns.get('last_name')).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
		expect(columns.get('email')).toMatchObject({ data_type: 'text', is_nullable: 'YES' });
		expect(columns.get('phone')).toMatchObject({ data_type: 'text', is_nullable: 'YES' });
		expect(columns.get('notes')).toMatchObject({ data_type: 'text', is_nullable: 'YES' });
		expect(columns.get('station_preferences')).toMatchObject({ udt_name: '_uuid', is_nullable: 'NO' });
		expect(columns.get('shift_preferences')).toMatchObject({ udt_name: '_uuid', is_nullable: 'NO' });
		expect(columns.get('source_member_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });
		expect(columns.get('created_at')).toMatchObject({ data_type: 'timestamp with time zone' });
		expect(columns.get('updated_at')).toMatchObject({ data_type: 'timestamp with time zone' });
	});

	it('lässt is_active und user_id bewusst weg (ADR 0005)', async () => {
		const columns = await columnsOf(db, 'festival_helpers');

		expect(columns.has('is_active')).toBe(false);
		expect(columns.has('user_id')).toBe(false);
	});

	it('führt Wünsche als uuid[] und startet leer', async () => {
		const festivalId = await insertFestival(db, 'Zeltfest 2026', '2026-08-01');

		const helper = await db.query<{ station_preferences: string[]; shift_preferences: string[] }>(
			`INSERT INTO festival_helpers (festival_id, first_name, last_name)
			 VALUES ($1, 'Anna', 'Achter')
			 RETURNING station_preferences, shift_preferences`,
			[festivalId]
		);

		expect(helper.rows[0]).toEqual({ station_preferences: [], shift_preferences: [] });
	});

	it('ist auf festival_id indiziert', async () => {
		const indexes = await db.query<{ indexdef: string }>(
			`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'festival_helpers'`
		);

		expect(indexes.rows.some((row) => /\(festival_id\)/.test(row.indexdef))).toBe(true);
	});

	it('verschwindet mit seinem Fest', async () => {
		const festivalId = await insertFestival(db, 'Kirtag 2026', '2026-09-01');
		await db.query(
			`INSERT INTO festival_helpers (festival_id, first_name, last_name) VALUES ($1, 'Bert', 'Bichler')`,
			[festivalId]
		);

		await db.query(`DELETE FROM festivals WHERE id = $1`, [festivalId]);

		const rest = await db.query(`SELECT id FROM festival_helpers WHERE festival_id = $1`, [festivalId]);
		expect(rest.rows).toEqual([]);
	});

	it('öffnet SELECT/INSERT/UPDATE/DELETE für jeden angemeldeten Benutzer (ADR 0002)', async () => {
		const policies = await db.query<{ cmd: string; qual: string | null; with_check: string | null; roles: string[] }>(
			`SELECT cmd, qual, with_check, roles::text[] FROM pg_policies
			  WHERE schemaname = 'public' AND tablename = 'festival_helpers'`
		);
		const byCommand = new Map(policies.rows.map((row) => [row.cmd, row]));

		expect([...byCommand.keys()].sort()).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE']);
		for (const row of policies.rows) {
			expect(row.roles).toEqual(['authenticated']);
			expect(row.qual ?? 'true').toBe('true');
			expect(row.with_check ?? 'true').toBe('true');
		}

		const rls = await db.query<{ relrowsecurity: boolean }>(
			`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.festival_helpers'::regclass`
		);
		expect(rls.rows[0].relrowsecurity).toBe(true);
	});
});

describe('Fan-out der Bestandsdaten', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await migratedDatabaseWithLegacyData());
	});

	it('gibt einem vergangenen Fest genau die Members mit echter Spur', async () => {
		expect(await helperNamesOf(db, legacy.festivals.past)).toEqual(['Anna', 'Bert', 'Cilli', 'Dora']);
	});

	it('lässt ein vergangenes Fest ohne Spur leer', async () => {
		expect(await helperNamesOf(db, legacy.festivals.pastWithoutTrace)).toEqual([]);
	});

	it('gibt einem Fest in Planung den ganzen aktiven Pool, plus Spuren inaktiver Members', async () => {
		expect(await helperNamesOf(db, legacy.festivals.planned)).toEqual([
			'Anna',
			'Bert',
			'Cilli',
			'Dora',
			'Emil',
			'Franz'
		]);
	});

	it('überspringt gelöschte Feste', async () => {
		expect(await helperNamesOf(db, legacy.festivals.deleted)).toEqual([]);
	});

	it('macht aus mehreren Spuren derselben Person eine Zeile', async () => {
		expect(await helperIdsOf(db, legacy.festivals.past, 'Anna')).toHaveLength(1);
	});

	it('übernimmt Name, Kontakt und Notizen des Members', async () => {
		const helper = await db.query<{
			first_name: string;
			last_name: string;
			email: string;
			phone: string;
			notes: string;
		}>(
			`SELECT first_name, last_name, email, phone, notes FROM festival_helpers
			  WHERE festival_id = $1 AND last_name = 'Bichler'`,
			[legacy.festivals.past]
		);

		expect(helper.rows[0]).toEqual({
			first_name: 'Bert',
			last_name: 'Bichler',
			email: 'bert@example.org',
			phone: '0664 1234',
			notes: 'Kommt mit dem Rad'
		});
	});

	it('übernimmt die Wünsche des Fests als uuid[]', async () => {
		expect(await preferencesOf(db, legacy.festivals.past, 'Dora')).toEqual({
			station_preferences: [legacy.stations.bar],
			shift_preferences: [legacy.shifts.barEvening]
		});
	});

	it('trägt die Wünsche eines Fests nicht in ein anderes', async () => {
		expect(await preferencesOf(db, legacy.festivals.planned, 'Dora')).toEqual({
			station_preferences: [],
			shift_preferences: []
		});
	});

	it('übernimmt die tote Legacy-Spalte members.station_preferences nicht', async () => {
		expect(await preferencesOf(db, legacy.festivals.past, 'Anna')).toEqual({
			station_preferences: [],
			shift_preferences: []
		});
	});

	it('lässt eine nicht als uuid lesbare Karteileiche im Wunsch fallen', async () => {
		expect(await preferencesOf(db, legacy.festivals.planned, 'Emil')).toEqual({
			station_preferences: [legacy.stations.grill],
			shift_preferences: []
		});
	});
});

describe('Zeiger auf die neue Helfer-Zeile', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await migratedDatabaseWithLegacyData());
	});

	it('ergänzt die drei Spalten nullable und additiv', async () => {
		const stationMembers = await columnsOf(db, 'station_members');
		const shiftAssignments = await columnsOf(db, 'shift_assignments');
		const stations = await columnsOf(db, 'stations');

		expect(stationMembers.get('helper_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });
		expect(shiftAssignments.get('helper_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });
		expect(stations.get('responsible_helper_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });

		// Die alten Spalten bleiben in diesem Slice unverändert stehen.
		expect(stationMembers.get('member_id')).toMatchObject({ is_nullable: 'NO' });
		expect(shiftAssignments.get('member_id')).toMatchObject({ is_nullable: 'YES' });
		expect(stations.has('responsible_member_id')).toBe(true);
	});

	it('räumt beim Entfernen eines Helfers auf wie beim Member', async () => {
		const rules = await db.query<{ table_name: string; column_name: string; confdeltype: string }>(
			`SELECT c.conrelid::regclass::text AS table_name,
			        a.attname AS column_name,
			        c.confdeltype
			   FROM pg_constraint c
			   JOIN unnest(c.conkey) AS k(attnum) ON true
			   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
			  WHERE c.contype = 'f' AND c.confrelid = 'public.festival_helpers'::regclass`
		);
		const byColumn = new Map(rules.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.confdeltype]));

		expect(byColumn.get('station_members.helper_id')).toBe('c');
		expect(byColumn.get('shift_assignments.helper_id')).toBe('c');
		expect(byColumn.get('stations.responsible_helper_id')).toBe('n');
	});

	it('zeigt auf den Helfer desselben Fests', async () => {
		const pairs = await db.query<{ table_name: string; matches: boolean }>(
			`SELECT 'station_members' AS table_name,
			        bool_and(fh.festival_id = sm.festival_id AND fh.source_member_id = sm.member_id) AS matches
			   FROM station_members sm JOIN festival_helpers fh ON fh.id = sm.helper_id
			 UNION ALL
			 SELECT 'shift_assignments',
			        bool_and(fh.festival_id = sa.festival_id AND fh.source_member_id = sa.member_id)
			   FROM shift_assignments sa JOIN festival_helpers fh ON fh.id = sa.helper_id
			 UNION ALL
			 SELECT 'stations',
			        bool_and(fh.festival_id = s.festival_id AND fh.source_member_id = s.responsible_member_id)
			   FROM stations s JOIN festival_helpers fh ON fh.id = s.responsible_helper_id`
		);

		expect(pairs.rows).toEqual([
			{ table_name: 'station_members', matches: true },
			{ table_name: 'shift_assignments', matches: true },
			{ table_name: 'stations', matches: true }
		]);
	});

	it('lässt keine Zeile eines lebenden Fests ohne helper_id zurück', async () => {
		const gaps = await db.query<{ table_name: string; count: number }>(
			`SELECT 'station_members' AS table_name, count(*)::int AS count
			   FROM station_members sm JOIN festivals f ON f.id = sm.festival_id
			  WHERE f.deleted_at IS NULL AND sm.member_id IS NOT NULL AND sm.helper_id IS NULL
			 UNION ALL
			 SELECT 'shift_assignments', count(*)::int
			   FROM shift_assignments sa JOIN festivals f ON f.id = sa.festival_id
			  WHERE f.deleted_at IS NULL AND sa.member_id IS NOT NULL AND sa.helper_id IS NULL
			 UNION ALL
			 SELECT 'stations', count(*)::int
			   FROM stations s JOIN festivals f ON f.id = s.festival_id
			  WHERE f.deleted_at IS NULL AND s.responsible_member_id IS NOT NULL AND s.responsible_helper_id IS NULL`
		);

		expect(gaps.rows).toEqual([
			{ table_name: 'station_members', count: 0 },
			{ table_name: 'shift_assignments', count: 0 },
			{ table_name: 'stations', count: 0 }
		]);
	});

	it('lässt die Zeilen gelöschter Feste leer — dort gibt es keinen Helfer', async () => {
		const rows = await db.query<{ helper_id: string | null }>(
			`SELECT helper_id FROM station_members WHERE festival_id = $1`,
			[legacy.festivals.deleted]
		);

		expect(rows.rows).toEqual([{ helper_id: null }]);
	});
});

describe('Entfernen eines Helfers', () => {
	it('nimmt Zuteilungen und Stationsmitgliedschaft mit', async () => {
		const { db, legacy } = await migratedDatabaseWithLegacyData();
		const [annaId] = await helperIdsOf(db, legacy.festivals.past, 'Anna');

		await db.query(`DELETE FROM festival_helpers WHERE id = $1`, [annaId]);

		const rest = await db.query<{ station_members: number; shift_assignments: number }>(
			`SELECT (SELECT count(*)::int FROM station_members WHERE helper_id = $1) AS station_members,
			        (SELECT count(*)::int FROM shift_assignments WHERE helper_id = $1) AS shift_assignments`,
			[annaId]
		);

		expect(rest.rows[0]).toEqual({ station_members: 0, shift_assignments: 0 });
	});

	it('vergisst beim Verantwortlichen nur den Verweis', async () => {
		const { db, legacy } = await migratedDatabaseWithLegacyData();
		const [cilliId] = await helperIdsOf(db, legacy.festivals.past, 'Cilli');

		await db.query(`DELETE FROM festival_helpers WHERE id = $1`, [cilliId]);

		const station = await db.query<{ responsible_helper_id: string | null; responsible_member_id: string | null }>(
			`SELECT responsible_helper_id, responsible_member_id FROM stations WHERE name = 'Kassa'`
		);

		expect(station.rows[0].responsible_helper_id).toBeNull();
		expect(station.rows[0].responsible_member_id).not.toBeNull();
	});
});

describe('Zweiter Durchlauf', () => {
	it('legt nichts doppelt an und wirft nicht', async () => {
		const { db } = await migratedDatabaseWithLegacyData();
		const afterFirstRun = await countsOf(db);

		await applyMigration(db, MIGRATION);

		expect(afterFirstRun.helpers).toBeGreaterThan(0);
		expect(await countsOf(db)).toEqual(afterFirstRun);
	});
});

describe('Grenze der Planung', () => {
	it('zählt ein heute beginnendes Fest noch zur Planung', async () => {
		const db = await createTestDatabase();
		await seedLegacyData(db);
		const startingToday = await insertFestival(db, 'Heute los', isoDate(0));

		await applyMigration(db, MIGRATION);

		expect(await helperNamesOf(db, startingToday)).toEqual(['Anna', 'Bert', 'Cilli', 'Dora', 'Emil']);
	});
});
