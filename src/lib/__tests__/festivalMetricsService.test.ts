import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedQuery {
	table: string;
	select: string;
	column: string;
	ids: string[];
	from: number;
}

const mocks = vi.hoisted(() => ({
	queries: [] as RecordedQuery[],
	rows: {} as Record<string, unknown[]>,
	failing: null as string | null,
	/** Zeilendeckel der REST-Schicht; null = die Antwort trägt alles. */
	rowCap: null as number | null
}));

/**
 * Steht für PostgREST: die Antwort trägt höchstens `rowCap` Zeilen, `count`
 * nennt trotzdem die wahre Gesamtzahl. Genau daran hängt das Nachblättern.
 */
vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: (select: string, options?: { count?: string }) => ({
				in: (column: string, ids: string[]) => ({
					range: (from: number, to: number) => {
						mocks.queries.push({ table, select, column, ids, from });
						if (mocks.failing === table) {
							return Promise.resolve({ data: null, error: { message: `${table} kaputt` } });
						}
						const all = mocks.rows[table] ?? [];
						const wanted = Math.min(to - from + 1, mocks.rowCap ?? Infinity);
						return Promise.resolve({
							data: all.slice(from, from + wanted),
							error: null,
							count: options?.count === 'exact' ? all.length : null
						});
					}
				})
			})
		})
	}
}));

import { getFestivalMetrics } from '../festivalMetricsService';

const countQueries = (table: string) => mocks.queries.filter((q) => q.table === table).length;

beforeEach(() => {
	mocks.queries = [];
	mocks.rows = {};
	mocks.failing = null;
	mocks.rowCap = null;
});

describe('getFestivalMetrics', () => {
	it('stellt je Kennzahl genau eine Abfrage für die ganze Wand', async () => {
		await getFestivalMetrics(['a', 'b', 'c']);

		expect(mocks.queries).toHaveLength(3);
		expect(mocks.queries.map((q) => q.table).sort()).toEqual([
			'festival_materials',
			'sponsorings',
			'station_shifts'
		]);
		for (const query of mocks.queries) {
			expect(query.column).toBe('festival_id');
			expect(query.ids).toEqual(['a', 'b', 'c']);
		}
	});

	it('gibt die Kennzahlen je Fest zurück', async () => {
		mocks.rows = {
			station_shifts: [{ festival_id: 'a' }, { festival_id: 'a' }],
			festival_materials: [{ festival_id: 'a' }, { festival_id: 'b' }],
			sponsorings: [
				{ festival_id: 'a', free_amount: 300, assignments: [] },
				{ festival_id: 'a', free_amount: null, assignments: [{ value: null, category: { value: 550 } }] }
			]
		};

		const metrics = await getFestivalMetrics(['a', 'b']);

		expect(metrics).toEqual({
			a: { shifts: 2, materials: 1, sponsoring: 850 },
			b: { shifts: 0, materials: 1, sponsoring: 0 }
		});
	});

	it('fragt ohne Feste gar nicht erst ab', async () => {
		expect(await getFestivalMetrics([])).toEqual({});
		expect(mocks.queries).toEqual([]);
	});

	it('meldet eine gescheiterte Abfrage, statt halbe Zahlen zu liefern', async () => {
		mocks.failing = 'sponsorings';

		await expect(getFestivalMetrics(['a'])).rejects.toThrow('sponsorings kaputt');
	});

	it('blättert über den Zeilendeckel hinaus, statt zu wenig zu zählen', async () => {
		// Fünf Schichten, aber die REST-Schicht gibt nur zwei Zeilen je Antwort
		// heraus — ohne Nachblättern stünde „2 Schichten" auf dem Plakat.
		mocks.rowCap = 2;
		mocks.rows = {
			station_shifts: [
				{ festival_id: 'a' },
				{ festival_id: 'a' },
				{ festival_id: 'a' },
				{ festival_id: 'b' },
				{ festival_id: 'b' }
			]
		};

		const metrics = await getFestivalMetrics(['a', 'b']);

		expect(metrics.a.shifts).toBe(3);
		expect(metrics.b.shifts).toBe(2);
		expect(countQueries('station_shifts')).toBe(3);
		// Die leeren Tabellen sind mit einer Antwort erledigt.
		expect(countQueries('festival_materials')).toBe(1);
	});

	it('fragt nur nach, solange es etwas nachzuholen gibt', async () => {
		mocks.rows = { station_shifts: [{ festival_id: 'a' }, { festival_id: 'a' }] };

		await getFestivalMetrics(['a']);

		expect(countQueries('station_shifts')).toBe(1);
		expect(mocks.queries.every((q) => q.from === 0)).toBe(true);
	});

	it('holt beim Sponsoring genau die Felder, die die Geldregel braucht', async () => {
		await getFestivalMetrics(['a']);

		const select = mocks.queries.find((q) => q.table === 'sponsorings')!.select;
		// Freibetrag, überschriebener Zuweisungs-Wert und Kategorie-Standardwert:
		// fehlt eines, rechnet das Plakat eine andere Summe als der Bereich.
		expect(select).toContain('free_amount');
		expect(select).toContain('assignments:sponsoring_category_assignments');
		expect(select).toContain('category:sponsoring_categories');
	});
});
