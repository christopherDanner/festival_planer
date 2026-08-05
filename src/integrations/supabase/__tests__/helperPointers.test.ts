// @vitest-environment node
//
// Der Prüfstand fährt ein echtes Postgres (PGlite) hoch; das braucht die
// Node-Umgebung, nicht jsdom.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';

import { createSponsoringSchemaDb } from './schemaHarness';

/**
 * Was das `×` an der Helfer-Marke wirklich tut (ADR 0005, #98).
 *
 * Die Oberfläche verspricht: der Helfer ist samt seinen Zuteilungen aus dem
 * Fest weg. Erfüllen muss das die Datenbank — der Code ruft nur ein DELETE auf
 * `festival_helpers`. Umgekehrt darf dasselbe DELETE die Station und den
 * Ablauf-Eintrag nicht mitreißen; dort wird nur der Verweis vergessen. Beides
 * steht ausschließlich in den Fremdschlüsseln, also wird es hier an einem
 * echten Postgres geprüft.
 */

let db: PGlite;

const one = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
	(await db.query<T>(sql, params)).rows[0];

const count = async (sql: string, params: unknown[] = []): Promise<number> =>
	Number((await one<{ n: string }>(sql, params)).n);

beforeAll(async () => {
	db = await createSponsoringSchemaDb();
});

afterAll(async () => {
	await db?.close();
});

/** Fest, Station, Schicht, Ablauf-Eintrag und ein Helfer mit allen Zuteilungen. */
const seedFestivalWithHelper = async () => {
	const { id: festivalId } = await one<{ id: string }>(
		`INSERT INTO festivals (name, user_id) VALUES ('Zeltfest 2026', gen_random_uuid()) RETURNING id`
	);
	const { id: helperId } = await one<{ id: string }>(
		`INSERT INTO festival_helpers (festival_id, first_name, last_name)
		 VALUES ($1, 'Hans', 'Huber') RETURNING id`,
		[festivalId]
	);
	const { id: stationId } = await one<{ id: string }>(
		`INSERT INTO stations (festival_id, name, responsible_helper_id)
		 VALUES ($1, 'Bar', $2) RETURNING id`,
		[festivalId, helperId]
	);
	const { id: shiftId } = await one<{ id: string }>(
		`INSERT INTO station_shifts (festival_id, station_id) VALUES ($1, $2) RETURNING id`,
		[festivalId, stationId]
	);
	await db.query(
		`INSERT INTO station_members (festival_id, station_id, helper_id) VALUES ($1, $2, $3)`,
		[festivalId, stationId, helperId]
	);
	await db.query(
		`INSERT INTO shift_assignments (festival_id, station_shift_id, station_id, helper_id, position)
		 VALUES ($1, $2, $3, $4, 1)`,
		[festivalId, shiftId, stationId, helperId]
	);
	const { id: entryId } = await one<{ id: string }>(
		`INSERT INTO schedule_entries (festival_id, title, responsible_helper_id)
		 VALUES ($1, 'Bierwagen anschließen', $2) RETURNING id`,
		[festivalId, helperId]
	);

	return { festivalId, helperId, stationId, entryId };
};

describe('Helfer aus dem Fest entfernen', () => {
	it('nimmt seine Stations- und Schicht-Zuteilungen mit', async () => {
		const { helperId } = await seedFestivalWithHelper();

		await db.query(`DELETE FROM festival_helpers WHERE id = $1`, [helperId]);

		expect(
			await count(`SELECT count(*) AS n FROM station_members WHERE helper_id = $1`, [helperId])
		).toBe(0);
		expect(
			await count(`SELECT count(*) AS n FROM shift_assignments WHERE helper_id = $1`, [helperId])
		).toBe(0);
	});

	it('lässt Station und Ablauf-Eintrag stehen und vergisst nur den Verweis', async () => {
		const { helperId, stationId, entryId } = await seedFestivalWithHelper();

		await db.query(`DELETE FROM festival_helpers WHERE id = $1`, [helperId]);

		const station = await one<{ responsible_helper_id: string | null }>(
			`SELECT responsible_helper_id FROM stations WHERE id = $1`,
			[stationId]
		);
		expect(station).toBeDefined();
		expect(station.responsible_helper_id).toBeNull();

		const entry = await one<{ responsible_helper_id: string | null }>(
			`SELECT responsible_helper_id FROM schedule_entries WHERE id = $1`,
			[entryId]
		);
		expect(entry).toBeDefined();
		expect(entry.responsible_helper_id).toBeNull();
	});
});

describe('Stations-Zuteilung', () => {
	it('lässt sich allein am Helfer festmachen, ohne Member-Zeiger', async () => {
		const { festivalId, stationId } = await seedFestivalWithHelper();
		const { id: otherHelperId } = await one<{ id: string }>(
			`INSERT INTO festival_helpers (festival_id, first_name, last_name)
			 VALUES ($1, 'Eva', 'Ebner') RETURNING id`,
			[festivalId]
		);

		await db.query(
			`INSERT INTO station_members (festival_id, station_id, helper_id) VALUES ($1, $2, $3)`,
			[festivalId, stationId, otherHelperId]
		);

		expect(
			await count(`SELECT count(*) AS n FROM station_members WHERE station_id = $1`, [stationId])
		).toBe(2);
	});

	it('verbietet denselben Helfer zweimal an derselben Station', async () => {
		const { festivalId, stationId, helperId } = await seedFestivalWithHelper();

		await expect(
			db.query(
				`INSERT INTO station_members (festival_id, station_id, helper_id) VALUES ($1, $2, $3)`,
				[festivalId, stationId, helperId]
			)
		).rejects.toThrow();
	});
});
