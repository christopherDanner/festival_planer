import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Seams dieses Slices (#145) — aus den Abnahmekriterien abgeleitet:
 *
 *   1. `getPreviousSponsorings(festivalId)` → Sponsoring-Id des aktuellen Fests
 *      auf den *Vorjahresbeitrag* aus dem *Quellfest* (Betrag + welches Fest).
 *      Wer kein Quellfest hat, kommt nicht vor.
 *   2. `getPreviousFestivalTotal(festivalId)` → Geld-Gesamtsumme des vorigen
 *      Fests fürs Maßband, `null` beim allerersten Fest.
 *
 * Beobachtet wird am Rückgabewert und an der Grenze zu Supabase (welche Zeilen
 * abgefragt werden), nicht an Interna des Service.
 */

interface Filter {
	op: 'eq' | 'in' | 'lt' | 'is';
	column: string;
	value: unknown;
}

interface RecordedQuery {
	table: string;
	select: string;
	filters: Filter[];
	limit: number | null;
}

type Row = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
	queries: [] as RecordedQuery[],
	rows: {} as Record<string, Record<string, unknown>[]>,
	failing: null as string | null
}));

/**
 * Ein winziges PostgREST im Speicher: die Filter der Kette werden nicht nur
 * aufgezeichnet, sondern auch angewendet. Nur so prüft ein Test wirklich, dass
 * etwa das soft-gelöschte Fest aus dem Maßband fällt — eine Attrappe, die
 * einfach die hinterlegten Zeilen zurückgibt, würde das durchwinken.
 */
vi.mock('@/integrations/supabase/client', () => {
	const matches = (row: Row, filter: Filter): boolean => {
		const value = row[filter.column] ?? null;
		switch (filter.op) {
			case 'eq':
				return value === filter.value;
			case 'in':
				return (filter.value as unknown[]).includes(value);
			case 'lt':
				return value != null && (value as string) < (filter.value as string);
			case 'is':
				return value === filter.value;
		}
	};

	const builderFor = (table: string) => {
		const query: RecordedQuery = { table, select: '*', filters: [], limit: null };
		let comparator: ((a: Row, b: Row) => number) | null = null;

		const run = () => {
			if (mocks.failing === table) {
				return { data: null, error: { message: `${table} kaputt` } };
			}
			let rows = (mocks.rows[table] ?? []).filter((row) =>
				query.filters.every((filter) => matches(row, filter))
			);
			if (comparator) rows = [...rows].sort(comparator);
			if (query.limit != null) rows = rows.slice(0, query.limit);
			return { data: rows, error: null };
		};

		const chain: Record<string, unknown> = {
			select: (columns?: string) => {
				query.select = columns ?? '*';
				mocks.queries.push(query);
				return chain;
			},
			eq: (column: string, value: unknown) => {
				query.filters.push({ op: 'eq', column, value });
				return chain;
			},
			in: (column: string, value: unknown[]) => {
				query.filters.push({ op: 'in', column, value });
				return chain;
			},
			lt: (column: string, value: unknown) => {
				query.filters.push({ op: 'lt', column, value });
				return chain;
			},
			is: (column: string, value: unknown) => {
				query.filters.push({ op: 'is', column, value });
				return chain;
			},
			order: (column: string, options?: { ascending?: boolean }) => {
				const direction = options?.ascending === false ? -1 : 1;
				comparator = (a, b) =>
					direction * String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
				return chain;
			},
			limit: (count: number) => {
				query.limit = count;
				return chain;
			},
			maybeSingle: async () => {
				const { data, error } = run();
				return { data: data?.[0] ?? null, error };
			},
			then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => resolve(run())
		};
		return chain;
	};

	return { supabase: { from: (table: string) => builderFor(table) } };
});

import { getPreviousSponsorings, getPreviousFestivalTotal } from '../sponsorService';

const queriesFor = (table: string) => mocks.queries.filter((q) => q.table === table);

/** Eine Sponsoring-Zeile, so schmal wie die Geldregel und die Zuordnung sie brauchen. */
const sponsoringRow = (row: {
	id: string;
	festival_id: string;
	sponsor_id: string;
	free_amount?: number | null;
	assignments?: { value: number | null; category: { value: number | null } }[];
	copied_from_festival_id?: string | null;
}) => ({
	free_amount: null,
	assignments: [],
	copied_from_festival_id: null,
	...row
});

const festivalRow = (row: {
	id: string;
	name?: string | null;
	start_date: string;
	deleted_at?: string | null;
}) => ({ name: null, deleted_at: null, ...row });

beforeEach(() => {
	mocks.queries = [];
	mocks.rows = {};
	mocks.failing = null;
});

describe('getPreviousSponsorings', () => {
	it('liest den Vorjahresbeitrag aus genau dem Quellfest der Übernahme', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({
					id: 'spo-2026',
					festival_id: 'fest-2026',
					sponsor_id: 'brauerei',
					copied_from_festival_id: 'fest-2025'
				}),
				// Dieselbe Firma beim Quellfest: € 400 Kategorie + € 100 Freibetrag.
				sponsoringRow({
					id: 'spo-2025',
					festival_id: 'fest-2025',
					sponsor_id: 'brauerei',
					free_amount: 100,
					assignments: [{ value: null, category: { value: 400 } }]
				})
			],
			festivals: [festivalRow({ id: 'fest-2025', name: 'Dorffest 2025', start_date: '2025-07-01' })]
		};

		const previous = await getPreviousSponsorings('fest-2026');

		expect(previous['spo-2026']).toEqual({
			festivalId: 'fest-2025',
			festivalName: 'Dorffest 2025',
			total: 500
		});
	});

	it('lässt ein handeingetragenes Sponsoring ohne Vorjahresbeitrag', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({ id: 'spo-2026', festival_id: 'fest-2026', sponsor_id: 'taxi' }),
				// Dieselbe Firma war 2025 dabei — ohne Quellfest-Zeiger zählt das nicht.
				sponsoringRow({
					id: 'spo-2025',
					festival_id: 'fest-2025',
					sponsor_id: 'taxi',
					free_amount: 150
				})
			],
			festivals: [festivalRow({ id: 'fest-2025', name: 'Dorffest 2025', start_date: '2025-07-01' })]
		};

		const previous = await getPreviousSponsorings('fest-2026');

		expect(previous['spo-2026']).toBeUndefined();
		// Ohne einen einzigen Quellfest-Zeiger gibt es nichts nachzuschlagen.
		expect(queriesFor('festivals')).toHaveLength(0);
		expect(queriesFor('sponsorings')).toHaveLength(1);
	});

	it('liefert den Vorjahresbeitrag auch aus einem soft-gelöschten Quellfest', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({
					id: 'spo-2026',
					festival_id: 'fest-2026',
					sponsor_id: 'brauerei',
					copied_from_festival_id: 'fest-2025'
				}),
				sponsoringRow({
					id: 'spo-2025',
					festival_id: 'fest-2025',
					sponsor_id: 'brauerei',
					free_amount: 500
				})
			],
			festivals: [
				festivalRow({
					id: 'fest-2025',
					name: 'Dorffest 2025',
					start_date: '2025-07-01',
					deleted_at: '2026-01-09T10:00:00Z'
				})
			]
		};

		// Historische Information verschwindet nicht, nur weil das Fest im
		// Papierkorb liegt (ADR 0008).
		expect((await getPreviousSponsorings('fest-2026'))['spo-2026']).toEqual({
			festivalId: 'fest-2025',
			festivalName: 'Dorffest 2025',
			total: 500
		});
	});

	it('holt mehrere Quellfeste in einer Abfrage statt einer je Sponsoring', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({
					id: 'spo-a',
					festival_id: 'fest-2027',
					sponsor_id: 'brauerei',
					copied_from_festival_id: 'fest-2025'
				}),
				sponsoringRow({
					id: 'spo-b',
					festival_id: 'fest-2027',
					sponsor_id: 'taxi',
					copied_from_festival_id: 'fest-2026'
				}),
				sponsoringRow({
					id: 'spo-c',
					festival_id: 'fest-2027',
					sponsor_id: 'baecker',
					copied_from_festival_id: 'fest-2025'
				}),
				sponsoringRow({
					id: 'q-1',
					festival_id: 'fest-2025',
					sponsor_id: 'brauerei',
					free_amount: 500
				}),
				sponsoringRow({ id: 'q-2', festival_id: 'fest-2026', sponsor_id: 'taxi', free_amount: 150 }),
				sponsoringRow({ id: 'q-3', festival_id: 'fest-2025', sponsor_id: 'baecker', free_amount: 80 })
			],
			festivals: [
				festivalRow({ id: 'fest-2025', name: 'Dorffest 2025', start_date: '2025-07-01' }),
				festivalRow({ id: 'fest-2026', name: 'Dorffest 2026', start_date: '2026-07-01' })
			]
		};

		const previous = await getPreviousSponsorings('fest-2027');

		expect(previous['spo-a'].total).toBe(500);
		expect(previous['spo-a'].festivalName).toBe('Dorffest 2025');
		expect(previous['spo-b'].total).toBe(150);
		expect(previous['spo-b'].festivalName).toBe('Dorffest 2026');
		expect(previous['spo-c'].total).toBe(80);

		// Eigene Zeilen + Quellfest-Sponsorings = zwei Abfragen, egal wie viele
		// Sponsorings und Quellfeste im Spiel sind.
		expect(queriesFor('sponsorings')).toHaveLength(2);
		expect(queriesFor('festivals')).toHaveLength(1);
		expect(queriesFor('sponsorings')[1].filters).toContainEqual({
			op: 'in',
			column: 'festival_id',
			value: ['fest-2025', 'fest-2026']
		});
	});

	it('lässt den Vorjahresbeitrag leer, wenn die Firma beim Quellfest nicht erfasst war', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({
					id: 'spo-2026',
					festival_id: 'fest-2026',
					sponsor_id: 'brauerei',
					copied_from_festival_id: 'fest-2025'
				})
			],
			festivals: [festivalRow({ id: 'fest-2025', name: 'Dorffest 2025', start_date: '2025-07-01' })]
		};

		// Kein Eintrag statt € 0 — eine Null wäre eine Aussage, die niemand traf.
		expect((await getPreviousSponsorings('fest-2026'))['spo-2026']).toBeUndefined();
	});

	it('rechnet über die Felder der Geldregel, nicht über eine eigene Formel', async () => {
		mocks.rows = {
			sponsorings: [
				sponsoringRow({
					id: 'spo-2026',
					festival_id: 'fest-2026',
					sponsor_id: 'brauerei',
					copied_from_festival_id: 'fest-2025'
				})
			]
		};

		await getPreviousSponsorings('fest-2026');

		// Freibetrag, überschriebener Zuweisungs-Wert und Kategorie-Standardwert:
		// fehlt eines, weicht der Vorjahresbeitrag von der Summe ab, die das
		// Quellfest selbst zeigt.
		const select = queriesFor('sponsorings')[1].select;
		// Fest und Firma tragen die Zuordnung — der Cast auf die Zeilen-Form
		// behauptet beide Spalten, nur diese Zusicherung prüft sie.
		expect(select).toContain('festival_id');
		expect(select).toContain('sponsor_id');
		expect(select).toContain('free_amount');
		expect(select).toContain('assignments:sponsoring_category_assignments');
		expect(select).toContain('category:sponsoring_categories');
	});

	it('zieht mit, wenn das Quellfest nachträglich korrigiert wird', async () => {
		const zielfest = sponsoringRow({
			id: 'spo-2026',
			festival_id: 'fest-2026',
			sponsor_id: 'brauerei',
			copied_from_festival_id: 'fest-2025'
		});
		const quellfest = sponsoringRow({
			id: 'spo-2025',
			festival_id: 'fest-2025',
			sponsor_id: 'brauerei',
			free_amount: 500
		});
		mocks.rows = {
			sponsorings: [zielfest, quellfest],
			festivals: [festivalRow({ id: 'fest-2025', name: 'Dorffest 2025', start_date: '2025-07-01' })]
		};

		expect((await getPreviousSponsorings('fest-2026'))['spo-2026'].total).toBe(500);

		// Jemand korrigiert das Vorjahresfest nach. Ein mitkopierter Schnappschuss
		// stünde ab jetzt falsch da — der gelesene Wert zieht mit (ADR 0008).
		quellfest.free_amount = 620;

		expect((await getPreviousSponsorings('fest-2026'))['spo-2026'].total).toBe(620);
	});

	it('meldet eine gescheiterte Abfrage, statt stillschweigend nichts zu liefern', async () => {
		mocks.failing = 'sponsorings';

		await expect(getPreviousSponsorings('fest-2026')).rejects.toThrow('sponsorings kaputt');
	});
});

describe('getPreviousFestivalTotal', () => {
	it('summiert das Geld des vorigen Fests fürs Maßband', async () => {
		mocks.rows = {
			festivals: [
				festivalRow({ id: 'fest-2026', start_date: '2026-07-01' }),
				festivalRow({ id: 'fest-2025', start_date: '2025-07-01' }),
				festivalRow({ id: 'fest-2024', start_date: '2024-07-01' })
			],
			sponsorings: [
				sponsoringRow({
					id: 'a',
					festival_id: 'fest-2025',
					sponsor_id: 'brauerei',
					free_amount: 100,
					assignments: [{ value: null, category: { value: 400 } }]
				}),
				sponsoringRow({ id: 'b', festival_id: 'fest-2025', sponsor_id: 'taxi', free_amount: 150 }),
				// Das Fest davor und das eigene gehen die Zahl nichts an.
				sponsoringRow({ id: 'c', festival_id: 'fest-2024', sponsor_id: 'taxi', free_amount: 999 }),
				sponsoringRow({ id: 'd', festival_id: 'fest-2026', sponsor_id: 'taxi', free_amount: 999 })
			]
		};

		expect(await getPreviousFestivalTotal('fest-2026')).toBe(650);
	});

	it('liefert beim allerersten Fest null — kein Balken, nur die Zahl', async () => {
		mocks.rows = {
			festivals: [festivalRow({ id: 'fest-2026', start_date: '2026-07-01' })],
			sponsorings: []
		};

		expect(await getPreviousFestivalTotal('fest-2026')).toBeNull();
	});

	it('behandelt ein unbekanntes Fest wie das erste: keine Vergleichszahl', async () => {
		mocks.rows = { festivals: [], sponsorings: [] };

		// Ohne eigenes Startdatum gibt es nichts, wogegen sich vergleichen ließe.
		expect(await getPreviousFestivalTotal('gibt-es-nicht')).toBeNull();
		expect(queriesFor('sponsorings')).toHaveLength(0);
	});

	it('überspringt ein soft-gelöschtes Fest und nimmt das davor', async () => {
		mocks.rows = {
			festivals: [
				festivalRow({ id: 'fest-2026', start_date: '2026-07-01' }),
				festivalRow({ id: 'fest-2025', start_date: '2025-07-01', deleted_at: '2026-01-09T10:00:00Z' }),
				festivalRow({ id: 'fest-2024', start_date: '2024-07-01' })
			],
			sponsorings: [
				sponsoringRow({ id: 'a', festival_id: 'fest-2025', sponsor_id: 'taxi', free_amount: 999 }),
				sponsoringRow({ id: 'b', festival_id: 'fest-2024', sponsor_id: 'taxi', free_amount: 300 })
			]
		};

		// Fürs Maßband zählt ein gelöschtes Fest nicht — anders als beim
		// Vorjahresbeitrag, der historische Information bleibt.
		expect(await getPreviousFestivalTotal('fest-2026')).toBe(300);
	});

	it('unterscheidet „voriges Fest ohne Sponsoring" (0) von „kein voriges Fest" (null)', async () => {
		mocks.rows = {
			festivals: [
				festivalRow({ id: 'fest-2026', start_date: '2026-07-01' }),
				festivalRow({ id: 'fest-2025', start_date: '2025-07-01' })
			],
			sponsorings: []
		};

		expect(await getPreviousFestivalTotal('fest-2026')).toBe(0);
	});

	it('rechnet über die Felder der Geldregel, nicht über eine eigene Formel', async () => {
		mocks.rows = {
			festivals: [
				festivalRow({ id: 'fest-2026', start_date: '2026-07-01' }),
				festivalRow({ id: 'fest-2025', start_date: '2025-07-01' })
			],
			sponsorings: []
		};

		await getPreviousFestivalTotal('fest-2026');

		const select = queriesFor('sponsorings')[0].select;
		expect(select).toContain('free_amount');
		expect(select).toContain('assignments:sponsoring_category_assignments');
		expect(select).toContain('category:sponsoring_categories');
	});
});
