import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Seams dieses Slices (#143) — aus den Abnahmekriterien abgeleitet:
 *
 *   1. `createSponsoring(..., notes, extras)` schreibt die *Sachleistung*
 *      (`in_kind_description` / `in_kind_value`) und den Quellfest-Zeiger
 *      (`copied_from_festival_id`); ohne `extras` bleiben alle drei NULL.
 *   2. `updateSponsoring(id, updates, assignments)` nimmt die Sachleistung in
 *      `updates` entgegen — inklusive Löschen (beide Spalten NULL) — und kennt
 *      den Quellfest-Zeiger bewusst nicht (den setzt nur die Übernahme).
 *   3. `getSponsorings(festivalId)` liest die neuen Spalten mit.
 *
 * Beobachtet wird an der Grenze zu Supabase (die abgeschickte Zeile), nicht an
 * Interna des Service.
 */

type Call = { table: string; op: string; payload: unknown };

const mocks = vi.hoisted(() => ({
	calls: [] as { table: string; op: string; payload: unknown }[],
	rows: [] as unknown[]
}));

vi.mock('@/integrations/supabase/client', () => {
	const builderFor = (table: string) => {
		const chain: Record<string, unknown> = {};
		const record = (op: string, payload: unknown) => {
			mocks.calls.push({ table, op, payload });
			return chain;
		};
		Object.assign(chain, {
			select: (columns?: string) => record('select', columns ?? '*'),
			insert: (payload: unknown) => record('insert', payload),
			update: (payload: unknown) => record('update', payload),
			delete: () => record('delete', null),
			eq: () => chain,
			order: () => chain,
			single: async () => ({ data: { id: 'new-sponsoring' }, error: null }),
			then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
				resolve({ data: mocks.rows, error: null })
		});
		return chain;
	};
	return { supabase: { from: (table: string) => builderFor(table) } };
});

import {
	createSponsoring,
	updateSponsoring,
	getSponsorings,
	type SponsoringWithDetails
} from '../sponsorService';

const callsFor = (table: string, op: string): Call[] =>
	mocks.calls.filter((c) => c.table === table && c.op === op);

const soleCall = (table: string, op: string): Call => {
	const found = callsFor(table, op);
	expect(found).toHaveLength(1);
	return found[0];
};

/**
 * Deckt eine Spaltenauswahl die Spalte ab? Heute wählt der Leseweg `*` und
 * deckt damit alles ab — die Prüfung greift erst, wenn jemand auf eine
 * ausdrückliche Spaltenliste umstellt und die neuen Spalten vergisst. Genau
 * dagegen steht sie hier.
 */
const selectionCovers = (selection: string, column: string): boolean =>
	selection.includes('*') || selection.includes(column);

beforeEach(() => {
	mocks.calls = [];
	mocks.rows = [];
});

describe('createSponsoring', () => {
	it('legt ein Sponsoring ohne Sachleistung und ohne Quellfest-Zeiger an', async () => {
		await createSponsoring('fest-1', 'firma-1', 200, []);

		expect(soleCall('sponsorings', 'insert').payload).toEqual({
			festival_id: 'fest-1',
			sponsor_id: 'firma-1',
			free_amount: 200,
			notes: null,
			in_kind_description: null,
			in_kind_value: null,
			copied_from_festival_id: null
		});
	});

	it('schreibt Beschreibung und Sachwert der Sachleistung', async () => {
		await createSponsoring('fest-1', 'firma-1', null, [], null, {
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80
		});

		expect(soleCall('sponsorings', 'insert').payload).toMatchObject({
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80
		});
	});

	it('stempelt bei der Sponsor-Übernahme das Quellfest', async () => {
		await createSponsoring('fest-2026', 'firma-1', 500, [], null, {
			copied_from_festival_id: 'fest-2025'
		});

		expect(soleCall('sponsorings', 'insert').payload).toMatchObject({
			festival_id: 'fest-2026',
			copied_from_festival_id: 'fest-2025'
		});
	});
});

describe('updateSponsoring', () => {
	it('schreibt die Sachleistung eines bestehenden Sponsorings', async () => {
		await updateSponsoring(
			'sponsoring-1',
			{ free_amount: null, in_kind_description: 'Geschenkkorb Tombola', in_kind_value: 80 },
			[]
		);

		expect(soleCall('sponsorings', 'update').payload).toMatchObject({
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80
		});
	});

	it('löscht die Sachleistung, indem beide Spalten auf NULL gehen', async () => {
		await updateSponsoring(
			'sponsoring-1',
			{ in_kind_description: null, in_kind_value: null },
			[]
		);

		expect(soleCall('sponsorings', 'update').payload).toMatchObject({
			in_kind_description: null,
			in_kind_value: null
		});
	});
});

describe('getSponsorings', () => {
	it('liest Sachleistung und Quellfest-Zeiger mit', async () => {
		const stored = {
			id: 'sponsoring-1',
			festival_id: 'fest-2026',
			sponsor_id: 'firma-1',
			free_amount: null,
			notes: null,
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80,
			copied_from_festival_id: 'fest-2025',
			created_at: '',
			updated_at: '',
			sponsor: null,
			assignments: []
		};
		mocks.rows = [stored];

		const result: SponsoringWithDetails[] = await getSponsorings('fest-2026');

		const selection = soleCall('sponsorings', 'select').payload as string;
		expect(selectionCovers(selection, 'in_kind_description')).toBe(true);
		expect(selectionCovers(selection, 'in_kind_value')).toBe(true);
		expect(selectionCovers(selection, 'copied_from_festival_id')).toBe(true);

		expect(result[0]).toMatchObject({
			in_kind_description: 'Geschenkkorb Tombola',
			in_kind_value: 80,
			copied_from_festival_id: 'fest-2025'
		});
	});
});
