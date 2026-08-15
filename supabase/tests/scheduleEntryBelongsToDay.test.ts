// @vitest-environment node
//
// Seams under test (aus den Abnahmekriterien von #120 abgeleitet, vor dem
// ersten Test festgelegt):
//
// 1. Die Migrationsdatei
//    supabase/migrations/20260815000001_schedule_entry_belongs_to_day.sql als
//    Ganzes — abgespielt auf einer Datenbank im Schemastand davor, also
//    Basisschema + Ablaufplan-Tabellen (20260315000001) + festival_helpers
//    samt Fan-out (20260804000001).
// 2. Beobachtet wird ausschließlich über SQL gegen das Ergebnis: das Schema
//    (information_schema, pg_indexes, pg_constraint) und die Daten. Keine
//    Zerlegung des SQL-Textes, kein Nachbau der Regel in TypeScript.
//
// Der Slice hat keine öffentliche Schnittstelle in src/ — die Datenbank *ist*
// die Schnittstelle, auf die der Code-Slice danach zugreift. Was in
// src/integrations/supabase/types.ts steht, prüft der Typecheck.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { applyMigration, columnsOf, createTestDatabase } from './testDatabase';

// Jeder Test hier startet ein echtes Postgres (WASM) und spielt drei
// Migrationen ab. Das dauert Sekunden statt Millisekunden.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SCHEDULE_TABLES = '20260315000001_create_schedule_tables.sql';
const FESTIVAL_HELPERS = '20260804000001_create_festival_helpers.sql';
const MIGRATION = '20260815000001_schedule_entry_belongs_to_day.sql';

function isoDate(offsetDays: number): string {
	const day = new Date();
	day.setUTCDate(day.getUTCDate() + offsetDays);
	return day.toISOString().slice(0, 10);
}

type LegacyData = {
	festivals: Record<'past' | 'pastWithoutTrace' | 'planned' | 'deleted', string>;
	members: Record<'anna' | 'bert' | 'cilli', string>;
	days: Record<'aufbau' | 'festtag', string>;
	phases: Record<'anlieferung' | 'abendprogramm', string>;
};

/**
 * Der Bestand, wie er vor dem Umbau aussieht: jeder Ablauf-Eintrag hängt an
 * einer Phase, der Verantwortliche ist ein globaler Member. Gesät wird so,
 * dass der Fan-out aus #97 danach Helfer erzeugt — aber nicht überall, denn
 * ein Ablauf-Eintrag ist dort keine Spur.
 */
async function seedLegacyData(db: PGlite): Promise<LegacyData> {
	const insertFestival = async (name: string, startDate: string) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO festivals (name, type, start_date, visitor_count, user_id)
				 VALUES ($1, 'Zeltfest', $2, '500', gen_random_uuid()) RETURNING id`,
				[name, startDate]
			)
		).rows[0].id;

	const insertMember = async (firstName: string, lastName: string, isActive: boolean) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO members (first_name, last_name, is_active, user_id)
				 VALUES ($1, $2, $3, gen_random_uuid()) RETURNING id`,
				[firstName, lastName, isActive]
			)
		).rows[0].id;

	const insertDay = async (festivalId: string, date: string, label: string) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO schedule_days (festival_id, date, label) VALUES ($1, $2, $3) RETURNING id`,
				[festivalId, date, label]
			)
		).rows[0].id;

	const insertPhase = async (festivalId: string, dayId: string, name: string) =>
		(
			await db.query<{ id: string }>(
				`INSERT INTO schedule_phases (festival_id, schedule_day_id, name) VALUES ($1, $2, $3) RETURNING id`,
				[festivalId, dayId, name]
			)
		).rows[0].id;

	const past = await insertFestival('Zeltfest 2025', isoDate(-30));
	const pastWithoutTrace = await insertFestival('Kirtag 2024', isoDate(-60));
	const planned = await insertFestival('Zeltfest 2026', isoDate(30));
	const deleted = await insertFestival('Abgesagtes Fest', isoDate(30));
	await db.query(`UPDATE festivals SET deleted_at = now() WHERE id = $1`, [deleted]);

	const anna = await insertMember('Anna', 'Achter', true);
	const bert = await insertMember('Bert', 'Bichler', true);
	const cilli = await insertMember('Cilli', 'Cerny', false);

	// Anna hinterlässt im vergangenen Fest eine echte Spur (#97 kennt vier;
	// der Ablauf-Eintrag gehört nicht dazu) und wird dort damit zum Helfer.
	await db.query(`INSERT INTO stations (festival_id, name, responsible_member_id) VALUES ($1, 'Bar', $2)`, [past, anna]);
	// Das Fest ohne Spur bleibt ohne Helfer, obwohl unten ein Eintrag dort
	// einen Verantwortlichen trägt.
	await db.query(`INSERT INTO stations (festival_id, name) VALUES ($1, 'Lager')`, [pastWithoutTrace]);

	const aufbau = await insertDay(past, isoDate(-31), 'Aufbau');
	const festtag = await insertDay(past, isoDate(-30), 'Samstag');
	const anlieferung = await insertPhase(past, aufbau, 'Anlieferung');
	const abendprogramm = await insertPhase(past, festtag, 'Abendprogramm');

	await db.query(
		`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type, start_time, responsible_member_id, status)
		 VALUES ($1, $2, 'Zelt aufstellen', 'task', '08:00', $3, 'open')`,
		[anlieferung, past, anna]
	);
	await db.query(
		`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type, start_time)
		 VALUES ($1, $2, 'Frühschoppen', 'program', '10:00')`,
		[abendprogramm, past]
	);

	const kirtagPhase = await insertPhase(
		pastWithoutTrace,
		await insertDay(pastWithoutTrace, isoDate(-60), 'Kirtag'),
		'Vormittag'
	);
	await db.query(
		`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type, responsible_member_id)
		 VALUES ($1, $2, 'Bänke schleppen', 'task', $3)`,
		[kirtagPhase, pastWithoutTrace, bert]
	);

	const plannedPhase = await insertPhase(planned, await insertDay(planned, isoDate(30), 'Freitag'), 'Aufbau');
	// Bert steckt im aktiven Pool und wird Helfer des geplanten Fests, Cilli
	// nicht — sie ist inaktiv und hat dort keine Spur.
	await db.query(
		`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type, responsible_member_id)
		 VALUES ($1, $2, 'Strom legen', 'task', $3), ($1, $2, 'Kassa richten', 'task', $4)`,
		[plannedPhase, planned, bert, cilli]
	);

	const deletedPhase = await insertPhase(deleted, await insertDay(deleted, isoDate(30), 'Freitag'), 'Aufbau');
	await db.query(
		`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type, responsible_member_id)
		 VALUES ($1, $2, 'Absagen', 'task', $3)`,
		[deletedPhase, deleted, anna]
	);

	return {
		festivals: { past, pastWithoutTrace, planned, deleted },
		members: { anna, bert, cilli },
		days: { aufbau, festtag },
		phases: { anlieferung, abendprogramm }
	};
}

/** Der Stand direkt vor diesem Slice: Ablaufplan-Tabellen, Bestand, Helfer. */
async function databaseBeforeMigration(): Promise<{ db: PGlite; legacy: LegacyData }> {
	const db = await createTestDatabase();
	await applyMigration(db, SCHEDULE_TABLES);
	const legacy = await seedLegacyData(db);
	await applyMigration(db, FESTIVAL_HELPERS);
	return { db, legacy };
}

/** Bestand von vor dem Umbau, danach die echte Migration darüber. */
async function migratedDatabaseWithLegacyData(): Promise<{ db: PGlite; legacy: LegacyData }> {
	const { db, legacy } = await databaseBeforeMigration();
	await applyMigration(db, MIGRATION);
	return { db, legacy };
}

async function policiesOn(db: PGlite, table: string): Promise<unknown[]> {
	const result = await db.query(
		`SELECT policyname, cmd, roles::text[] AS roles, qual, with_check FROM pg_policies
		  WHERE schemaname = 'public' AND tablename = $1 ORDER BY policyname, cmd`,
		[table]
	);
	return result.rows;
}

type EntryRow = {
	schedule_day_id: string | null;
	schedule_phase_id: string | null;
	responsible_member_id: string | null;
	responsible_helper_id: string | null;
};

/** Die ganze Zeile — welche Spalten sie trägt, ist genau die Frage. */
async function entryByTitle(db: PGlite, title: string): Promise<EntryRow> {
	const result = await db.query<EntryRow>(`SELECT * FROM schedule_entries WHERE title = $1`, [title]);
	return result.rows[0];
}

describe('Ablauf-Eintrag gehört dem Tag', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await migratedDatabaseWithLegacyData());
	});

	it('trägt schedule_day_id als Pflichtspalte', async () => {
		const columns = await columnsOf(db, 'schedule_entries');

		expect(columns.get('schedule_day_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
	});

	it('hängt jeden bestehenden Eintrag an den Tag seiner Phase', async () => {
		expect((await entryByTitle(db, 'Zelt aufstellen')).schedule_day_id).toBe(legacy.days.aufbau);
		expect((await entryByTitle(db, 'Frühschoppen')).schedule_day_id).toBe(legacy.days.festtag);
	});

	it('lässt keinen Eintrag ohne Tag zurück', async () => {
		const gaps = await db.query<{ count: number }>(
			`SELECT count(*)::int AS count FROM schedule_entries WHERE schedule_day_id IS NULL`
		);

		expect(gaps.rows[0].count).toBe(0);
	});

	it('ist auf schedule_day_id indiziert', async () => {
		const indexes = await db.query<{ indexdef: string }>(
			`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'schedule_entries'`
		);

		expect(indexes.rows.some((row) => /\(schedule_day_id\)/.test(row.indexdef))).toBe(true);
	});

	it('nimmt beim Löschen eines Tages seine Einträge mit', async () => {
		const { db: fresh, legacy: freshLegacy } = await migratedDatabaseWithLegacyData();
		// Ohne Phase, damit wirklich die Kante zum Tag räumt und nicht die Phase.
		await fresh.query(
			`INSERT INTO schedule_entries (schedule_day_id, festival_id, title, type)
			 VALUES ($1, $2, 'Container holen', 'task')`,
			[freshLegacy.days.aufbau, freshLegacy.festivals.past]
		);

		await fresh.query(`DELETE FROM schedule_days WHERE id = $1`, [freshLegacy.days.aufbau]);

		const rest = await fresh.query(`SELECT id FROM schedule_entries WHERE schedule_day_id = $1`, [
			freshLegacy.days.aufbau
		]);
		expect(rest.rows).toEqual([]);
	});
});

describe('Phase ist optional', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await migratedDatabaseWithLegacyData());
	});

	it('macht schedule_phase_id nullable', async () => {
		const columns = await columnsOf(db, 'schedule_entries');

		expect(columns.get('schedule_phase_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });
	});

	it('nimmt einen Eintrag ohne Phase an', async () => {
		const inserted = await db.query<{ schedule_phase_id: string | null }>(
			`INSERT INTO schedule_entries (schedule_day_id, festival_id, title, type)
			 VALUES ($1, $2, 'Zapfanlage anschließen', 'task')
			 RETURNING schedule_phase_id`,
			[legacy.days.festtag, legacy.festivals.past]
		);

		expect(inserted.rows[0].schedule_phase_id).toBeNull();
	});

	it('verlangt weiterhin einen Tag', async () => {
		await expect(
			db.query(
				`INSERT INTO schedule_entries (schedule_phase_id, festival_id, title, type)
				 VALUES ($1, $2, 'Ohne Tag', 'task')`,
				[legacy.phases.anlieferung, legacy.festivals.past]
			)
		).rejects.toThrow(/schedule_day_id/);
	});

	it('nimmt beim Löschen einer Phase ihre Einträge weiter mit (ADR 0007)', async () => {
		const { db: fresh, legacy: freshLegacy } = await migratedDatabaseWithLegacyData();

		await fresh.query(`DELETE FROM schedule_phases WHERE id = $1`, [freshLegacy.phases.anlieferung]);

		const rest = await fresh.query(`SELECT id FROM schedule_entries WHERE title = 'Zelt aufstellen'`);
		expect(rest.rows).toEqual([]);
	});
});

describe('Verantwortlicher ist ein Helfer', () => {
	let db: PGlite;
	let legacy: LegacyData;

	beforeAll(async () => {
		({ db, legacy } = await migratedDatabaseWithLegacyData());
	});

	/** Fest und Herkunfts-Member der Helfer-Zeile, auf die ein Eintrag zeigt. */
	async function helperBehind(title: string): Promise<{ festival_id: string; source_member_id: string } | undefined> {
		const result = await db.query<{ festival_id: string; source_member_id: string }>(
			`SELECT fh.festival_id, fh.source_member_id FROM schedule_entries e
			   JOIN festival_helpers fh ON fh.id = e.responsible_helper_id
			  WHERE e.title = $1`,
			[title]
		);
		return result.rows[0];
	}

	it('trägt responsible_helper_id als optionale Spalte', async () => {
		const columns = await columnsOf(db, 'schedule_entries');

		expect(columns.get('responsible_helper_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });
	});

	it('zeigt auf den Helfer desselben Fests', async () => {
		expect(await helperBehind('Zelt aufstellen')).toEqual({
			festival_id: legacy.festivals.past,
			source_member_id: legacy.members.anna
		});
		expect(await helperBehind('Strom legen')).toEqual({
			festival_id: legacy.festivals.planned,
			source_member_id: legacy.members.bert
		});
	});

	it('lässt einen Eintrag ohne Verantwortlichen leer', async () => {
		expect((await entryByTitle(db, 'Frühschoppen')).responsible_helper_id).toBeNull();
	});

	it('lässt leer, wo der Verantwortliche kein Helfer des Fests geworden ist', async () => {
		// Bert hat im Kirtag 2024 keine Spur außer diesem Eintrag — ein
		// Ablauf-Eintrag zählt beim Fan-out aus #97 nicht als Spur.
		expect((await entryByTitle(db, 'Bänke schleppen')).responsible_helper_id).toBeNull();
		// Cilli ist inaktiv und damit nicht im Pool des geplanten Fests.
		expect((await entryByTitle(db, 'Kassa richten')).responsible_helper_id).toBeNull();
		// Gelöschte Feste haben gar keine Helfer.
		expect((await entryByTitle(db, 'Absagen')).responsible_helper_id).toBeNull();
	});

	it('lässt responsible_member_id unangetastet', async () => {
		const columns = await columnsOf(db, 'schedule_entries');
		expect(columns.get('responsible_member_id')).toMatchObject({ data_type: 'uuid', is_nullable: 'YES' });

		expect((await entryByTitle(db, 'Zelt aufstellen')).responsible_member_id).toBe(legacy.members.anna);
		expect((await entryByTitle(db, 'Bänke schleppen')).responsible_member_id).toBe(legacy.members.bert);
	});

	it('behält die Löschregel „nur vergessen" (ON DELETE SET NULL)', async () => {
		const rule = await db.query<{ confdeltype: string }>(
			`SELECT c.confdeltype FROM pg_constraint c
			   JOIN unnest(c.conkey) AS k(attnum) ON true
			   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
			  WHERE c.contype = 'f'
			    AND c.conrelid = 'public.schedule_entries'::regclass
			    AND a.attname = 'responsible_helper_id'`
		);

		expect(rule.rows[0].confdeltype).toBe('n');
	});

	it('vergisst beim Entfernen eines Helfers nur den Verweis', async () => {
		const { db: fresh, legacy: freshLegacy } = await migratedDatabaseWithLegacyData();
		await fresh.query(
			`DELETE FROM festival_helpers WHERE festival_id = $1 AND source_member_id = $2`,
			[freshLegacy.festivals.past, freshLegacy.members.anna]
		);

		const entry = await entryByTitle(fresh, 'Zelt aufstellen');

		expect(entry.responsible_helper_id).toBeNull();
		expect(entry.responsible_member_id).toBe(freshLegacy.members.anna);
	});
});

describe('Rein additiv', () => {
	it('lässt die alten Spalten stehen', async () => {
		const { db } = await migratedDatabaseWithLegacyData();
		const columns = await columnsOf(db, 'schedule_entries');

		expect(columns.has('responsible_member_id')).toBe(true);
		// sort_order entfällt laut ADR 0007, aber erst im Aufräum-Slice.
		expect(columns.has('sort_order')).toBe(true);
	});

	// schedule_entries liegt innerhalb eines Fests und hat seine Regel schon
	// (ADR 0002) — diese Migration fasst sie nicht an. Geprüft wird der
	// Unterschied, nicht der Wortlaut: welche Policies auf der Tabelle liegen,
	// hängt an Migrationen, die das Fixture gar nicht abspielt.
	it('lässt die RLS-Regeln von schedule_entries, wie sie sind (ADR 0002)', async () => {
		const { db } = await databaseBeforeMigration();
		const before = await policiesOn(db, 'schedule_entries');

		await applyMigration(db, MIGRATION);

		expect(before.length).toBeGreaterThan(0);
		expect(await policiesOn(db, 'schedule_entries')).toEqual(before);
	});
});

describe('Zweiter Durchlauf', () => {
	it('ändert nichts und wirft nicht', async () => {
		const { db } = await migratedDatabaseWithLegacyData();
		const before = await db.query(
			`SELECT id, schedule_day_id, schedule_phase_id, responsible_member_id, responsible_helper_id
			   FROM schedule_entries ORDER BY id`
		);

		await applyMigration(db, MIGRATION);

		const after = await db.query(
			`SELECT id, schedule_day_id, schedule_phase_id, responsible_member_id, responsible_helper_id
			   FROM schedule_entries ORDER BY id`
		);
		expect(before.rows.length).toBeGreaterThan(0);
		expect(after.rows).toEqual(before.rows);
	});
});
