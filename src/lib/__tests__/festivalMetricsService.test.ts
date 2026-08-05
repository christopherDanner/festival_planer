import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedQuery {
	table: string;
	column: string;
	ids: string[];
}

const mocks = vi.hoisted(() => ({
	queries: [] as RecordedQuery[],
	rows: {} as Record<string, unknown[]>,
	failing: null as string | null
}));

vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: () => ({
				in: (column: string, ids: string[]) => {
					mocks.queries.push({ table, column, ids });
					return Promise.resolve(
						mocks.failing === table
							? { data: null, error: { message: `${table} kaputt` } }
							: { data: mocks.rows[table] ?? [], error: null }
					);
				}
			})
		})
	}
}));

import { getFestivalMetrics } from '../festivalMetricsService';

beforeEach(() => {
	mocks.queries = [];
	mocks.rows = {};
	mocks.failing = null;
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
});
