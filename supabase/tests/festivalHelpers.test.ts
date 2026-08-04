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

async function migratedDatabase(): Promise<PGlite> {
	const db = await createTestDatabase();
	await applyMigration(db, MIGRATION);
	return db;
}

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
	festivals: Record<'vergangen' | 'vergangenLeer' | 'planung' | 'geloescht', string>;
	stations: Record<'bar' | 'kassa' | 'grill' | 'zelt', string>;
	shifts: Record<'barAbend' | 'grillMittag', string>;
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

	const vergangen = await insertFestival(db, 'Zeltfest 2025', isoDate(-30));
	const vergangenLeer = await insertFestival(db, 'Kirtag 2024', isoDate(-60));
	const planung = await insertFestival(db, 'Zeltfest 2026', isoDate(30));
	const geloescht = await insertFestival(db, 'Abgesagtes Fest', isoDate(30));
	await db.query(`UPDATE festivals SET deleted_at = now() WHERE id = $1`, [geloescht]);

	const bar = await stationId(vergangen, 'Bar', null);
	const kassa = await stationId(vergangen, 'Kassa', cilli);
	const barAbend = await shiftId(vergangen, bar, 'Abendschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3), ($1, $2, $4)`, [
		vergangen,
		bar,
		anna,
		bert
	]);
	await db.query(
		`INSERT INTO shift_assignments (festival_id, station_shift_id, station_id, member_id) VALUES ($1, $2, $3, $4)`,
		[vergangen, barAbend, bar, anna]
	);
	await db.query(
		`INSERT INTO festival_member_preferences (festival_id, member_id, station_preferences, shift_preferences)
		 VALUES ($1, $2, ARRAY[$3::text], ARRAY[$4::text])`,
		[vergangen, dora, bar, barAbend]
	);

	await stationId(vergangenLeer, 'Lager', null);

	const grill = await stationId(planung, 'Grill', null);
	const grillMittag = await shiftId(planung, grill, 'Mittagsschicht');
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		planung,
		grill,
		franz
	]);
	await db.query(
		`INSERT INTO festival_member_preferences (festival_id, member_id, station_preferences, shift_preferences)
		 VALUES ($1, $2, ARRAY['keine-uuid', $3::text], ARRAY[]::text[])`,
		[planung, emil, grill]
	);

	const zelt = await stationId(geloescht, 'Zelt', null);
	await db.query(`INSERT INTO station_members (festival_id, station_id, member_id) VALUES ($1, $2, $3)`, [
		geloescht,
		zelt,
		anna
	]);

	return {
		festivals: { vergangen, vergangenLeer, planung, geloescht },
		stations: { bar, kassa, grill, zelt },
		shifts: { barAbend, grillMittag }
	};
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

describe('festival_helpers', () => {
	let db: PGlite;

	beforeAll(async () => {
		db = await migratedDatabase();
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
		db = await createTestDatabase();
		legacy = await seedLegacyData(db);
		await applyMigration(db, MIGRATION);
	});

	it('gibt einem vergangenen Fest genau die Members mit echter Spur', async () => {
		expect(await helperNamesOf(db, legacy.festivals.vergangen)).toEqual(['Anna', 'Bert', 'Cilli', 'Dora']);
	});

	it('lässt ein vergangenes Fest ohne Spur leer', async () => {
		expect(await helperNamesOf(db, legacy.festivals.vergangenLeer)).toEqual([]);
	});

	it('gibt einem Fest in Planung den ganzen aktiven Pool, plus Spuren inaktiver Members', async () => {
		expect(await helperNamesOf(db, legacy.festivals.planung)).toEqual([
			'Anna',
			'Bert',
			'Cilli',
			'Dora',
			'Emil',
			'Franz'
		]);
	});

	it('überspringt gelöschte Feste', async () => {
		expect(await helperNamesOf(db, legacy.festivals.geloescht)).toEqual([]);
	});

	it('macht aus mehreren Spuren derselben Person eine Zeile', async () => {
		const annaRows = await db.query<{ count: number }>(
			`SELECT count(*)::int AS count FROM festival_helpers fh
			   JOIN members m ON m.id = fh.source_member_id
			  WHERE fh.festival_id = $1 AND m.first_name = 'Anna'`,
			[legacy.festivals.vergangen]
		);

		expect(annaRows.rows[0].count).toBe(1);
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
			[legacy.festivals.vergangen]
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
		expect(await preferencesOf(db, legacy.festivals.vergangen, 'Dora')).toEqual({
			station_preferences: [legacy.stations.bar],
			shift_preferences: [legacy.shifts.barAbend]
		});
	});

	it('trägt die Wünsche eines Fests nicht in ein anderes', async () => {
		expect(await preferencesOf(db, legacy.festivals.planung, 'Dora')).toEqual({
			station_preferences: [],
			shift_preferences: []
		});
	});

	it('übernimmt die tote Legacy-Spalte members.station_preferences nicht', async () => {
		expect(await preferencesOf(db, legacy.festivals.vergangen, 'Anna')).toEqual({
			station_preferences: [],
			shift_preferences: []
		});
	});

	it('lässt eine nicht als uuid lesbare Karteileiche im Wunsch fallen', async () => {
		expect(await preferencesOf(db, legacy.festivals.planung, 'Emil')).toEqual({
			station_preferences: [legacy.stations.grill],
			shift_preferences: []
		});
	});
});
