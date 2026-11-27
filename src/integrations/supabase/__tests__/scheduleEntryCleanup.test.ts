// @vitest-environment node
//
// Der Prüfstand fährt ein echtes Postgres (PGlite) hoch; das braucht die
// Node-Umgebung, nicht jsdom.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';

import {
	SCHEDULE_ENTRY_CLEANUP_MIGRATION,
	applyMigration,
	createSponsoringSchemaDb
} from './schemaHarness';

/**
 * Aufräum-Slice des Ablaufplans (#128, ADR 0005 / ADR 0007).
 *
 * Der Eintrag zeigt auf den Helfer des Fests statt auf `members`, und die
 * Uhrzeit reiht statt einer Hand-Reihenfolge — die beiden alten Spalten fallen.
 * Phasen und Tage behalten ihre Reihenfolge, `members` bleibt als toter
 * Rückweg stehen.
 */

const LEGACY_POINTER = 'responsible_member_id';

let db: PGlite;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
	(await db.query<T>(sql, params)).rows[0];

const columnsOf = async (table: string): Promise<string[]> =>
	(
		await db.query<{ column_name: string }>(
			`SELECT column_name FROM information_schema.columns
			  WHERE table_schema = 'public' AND table_name = $1`,
			[table]
		)
	).rows.map((row) => row.column_name);

// Vor der Aufräum-Migration angehalten: der Bestand entsteht so, wie ihn der
// alte Codestand hinterlassen haben kann, und erst dann läuft sie. Die
// Migration droppt nur — den alten Zeiger liest sie nicht mehr. Der heutige
// Code schreibt responsible_member_id nie und löscht ihn also auch nie; ein
// noch gesetzter Member-Zeiger sagt nichts darüber, wen der Nutzer heute will.
let cleared: { entryId: string };
let program: { entryId: string };
let alreadySet: { entryId: string; helperId: string };

const seedFestival = async (name: string) => {
	const { id: festivalId } = await one<{ id: string }>(
		`INSERT INTO festivals (name, user_id) VALUES ($1, gen_random_uuid()) RETURNING id`,
		[name]
	);
	const { id: dayId } = await one<{ id: string }>(
		`INSERT INTO schedule_days (festival_id, date) VALUES ($1, '2026-07-24') RETURNING id`,
		[festivalId]
	);
	return { festivalId, dayId };
};

const member = async (firstName: string, lastName: string) =>
	(
		await one<{ id: string }>(
			`INSERT INTO members (first_name, last_name) VALUES ($1, $2) RETURNING id`,
			[firstName, lastName]
		)
	).id;

const helper = async (festivalId: string, firstName: string, lastName: string) =>
	(
		await one<{ id: string }>(
			`INSERT INTO festival_helpers (festival_id, first_name, last_name)
			 VALUES ($1, $2, $3) RETURNING id`,
			[festivalId, firstName, lastName]
		)
	).id;

const entry = async (
	festivalId: string,
	dayId: string,
	memberId: string | null,
	helperId: string | null = null,
	type: 'task' | 'program' = 'task'
) =>
	(
		await one<{ id: string }>(
			`INSERT INTO schedule_entries
			   (festival_id, schedule_day_id, title, type, ${LEGACY_POINTER}, responsible_helper_id)
			 VALUES ($1, $2, 'Bierwagen anschließen', $5, $3, $4) RETURNING id`,
			[festivalId, dayId, memberId, helperId, type]
		)
	).id;

const responsibleHelperOf = async (entryId: string) =>
	(
		await one<{ responsible_helper_id: string | null }>(
			`SELECT responsible_helper_id FROM schedule_entries WHERE id = $1`,
			[entryId]
		)
	).responsible_helper_id;

beforeAll(async () => {
	db = await createSponsoringSchemaDb({ stopBefore: SCHEDULE_ENTRY_CLEANUP_MIGRATION });

	// Aufgabe aus der Zeit vor 20260815: der alte Member-Zeiger steht noch, den
	// Helfer-Zeiger hat der Nutzer im Zettel geleert. Ein gleichnamiger Helfer
	// im Fest darf ihn nicht zurückbringen.
	{
		const { festivalId, dayId } = await seedFestival('Zeltfest 2026');
		const memberId = await member('Hans', 'Huber');
		await helper(festivalId, 'Hans', 'Huber');
		cleared = { entryId: await entry(festivalId, dayId, memberId) };
	}
	// Programmpunkt mit altem Member-Zeiger: trägt keinen Verantwortlichen
	// (ADR 0007), auch wenn der Name im Fest eindeutig ist.
	{
		const { festivalId, dayId } = await seedFestival('Sommerfest 2026');
		const memberId = await member('Eva', 'Ebner');
		await helper(festivalId, 'Eva', 'Ebner');
		program = { entryId: await entry(festivalId, dayId, memberId, null, 'program') };
	}
	// Schon umgestellt: der Helfer-Zeiger gilt, der alte wird nicht gelesen.
	{
		const { festivalId, dayId } = await seedFestival('Herbstfest 2026');
		const memberId = await member('Karl', 'Koller');
		await helper(festivalId, 'Karl', 'Koller');
		const otherHelperId = await helper(festivalId, 'Maria', 'Moser');
		alreadySet = {
			entryId: await entry(festivalId, dayId, memberId, otherHelperId),
			helperId: otherHelperId
		};
	}

	await applyMigration(db, SCHEDULE_ENTRY_CLEANUP_MIGRATION);
}, 60000);

afterAll(async () => {
	await db?.close();
});

describe('schedule_entries nach dem Aufräumen', () => {
	it('trägt keinen Zeiger auf members mehr', async () => {
		expect(await columnsOf('schedule_entries')).not.toContain(LEGACY_POINTER);
	});

	it('trägt keine Hand-Reihenfolge mehr — die Uhrzeit reiht', async () => {
		expect(await columnsOf('schedule_entries')).not.toContain('sort_order');
	});

	it('behält den Helfer-Zeiger, den Tag und die optionale Phase', async () => {
		expect(await columnsOf('schedule_entries')).toEqual(
			expect.arrayContaining(['responsible_helper_id', 'schedule_day_id', 'schedule_phase_id'])
		);
	});
});

describe('was stehen bleibt', () => {
	it('Phasen behalten ihre Reihenfolge — sie tragen keine Uhrzeit', async () => {
		expect(await columnsOf('schedule_phases')).toContain('sort_order');
	});

	it('Tage behalten ihre Reihenfolge', async () => {
		expect(await columnsOf('schedule_days')).toContain('sort_order');
	});

	it('members bleibt als toter Rückweg', async () => {
		expect(await columnsOf('members')).toContain('first_name');
	});
});

describe('Einträge mit altem Member-Zeiger', () => {
	it('eine Aufgabe mit geleertem Helfer-Zeiger bleibt leer, auch bei gleichnamigem Helfer', async () => {
		expect(await responsibleHelperOf(cleared.entryId)).toBeNull();
	});

	it('ein Programmpunkt bekommt keinen Verantwortlichen', async () => {
		expect(await responsibleHelperOf(program.entryId)).toBeNull();
	});

	it('behalten einen schon gesetzten Helfer-Zeiger', async () => {
		expect(await responsibleHelperOf(alreadySet.entryId)).toBe(alreadySet.helperId);
	});
});

describe('die Migration selbst', () => {
	it('läuft ein zweites Mal durch, ohne etwas zu tun', async () => {
		await expect(applyMigration(db, SCHEDULE_ENTRY_CLEANUP_MIGRATION)).resolves.toBeUndefined();
	});
});
