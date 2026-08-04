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
