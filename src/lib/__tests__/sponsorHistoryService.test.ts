import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedQuery {
	table: string;
	select: string;
	from: number;
}

const mocks = vi.hoisted(() => ({
	queries: [] as RecordedQuery[],
	festivals: [] as unknown[],
	sponsorings: [] as unknown[],
	failing: null as string | null,
	/** Zeilendeckel der REST-Schicht; null = die Antwort trägt alles. */
	rowCap: null as number | null
}));

/**
 * Steht für die beiden Abfragen dieses Leswegs: die Festliste (gefiltert auf
 * nicht gelöschte Feste) und die Verknüpfungen. Bei den Verknüpfungen deckelt
 * PostgREST die Antwort, `count` nennt trotzdem die wahre Gesamtzahl — daran
 * hängt das Nachblättern.
 */
vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: (select: string, options?: { count?: string }) => {
				const fail = () => mocks.failing === table;
				return {
					// Festliste: .is('deleted_at', null).order('created_at', …)
					is: () => ({
						order: () => {
							mocks.queries.push({ table, select, from: 0 });
							return Promise.resolve(
								fail()
									? { data: null, error: { message: `${table} kaputt` } }
									: { data: mocks.festivals, error: null }
							);
						}
					}),
					// Verknüpfungen: .range(von, bis)
					range: (from: number, to: number) => {
						mocks.queries.push({ table, select, from });
						if (fail()) {
							return Promise.resolve({ data: null, error: { message: `${table} kaputt` } });
						}
						const wanted = Math.min(to - from + 1, mocks.rowCap ?? Infinity);
						return Promise.resolve({
							data: mocks.sponsorings.slice(from, from + wanted),
							error: null,
							count: options?.count === 'exact' ? mocks.sponsorings.length : null
						});
					}
				};
			}
		})
	}
}));

import { sponsorHistoryOf } from '../sponsorHistory';
import { getSponsorHistory } from '../sponsorHistoryService';

const HEUTE = new Date('2026-05-20T12:00:00');

const countQueries = (table: string) => mocks.queries.filter((q) => q.table === table).length;

beforeEach(() => {
	mocks.queries = [];
	mocks.festivals = [];
	mocks.sponsorings = [];
	mocks.failing = null;
	mocks.rowCap = null;
});

describe('getSponsorHistory', () => {
	it('liest den ganzen Bestand mit einer Abfrage, nicht einer je Firma', async () => {
		mocks.festivals = [{ id: 'f2026', start_date: '2026-07-24' }];
		mocks.sponsorings = [
			{ sponsor_id: 'a', festival_id: 'f2026' },
			{ sponsor_id: 'b', festival_id: 'f2026' },
			{ sponsor_id: 'c', festival_id: 'f2026' }
		];

		await getSponsorHistory(HEUTE);

		expect(countQueries('sponsorings')).toBe(1);
		expect(countQueries('festivals')).toBe(1);
	});

	it('holt von den Verknüpfungen nur Firma und Fest', async () => {
		await getSponsorHistory(HEUTE);

		const select = mocks.queries.find((q) => q.table === 'sponsorings')!.select;
		expect(select).toContain('sponsor_id');
		expect(select).toContain('festival_id');
		// Die Historie ist rein informativ — Beträge gehen sie nichts an.
		expect(select).not.toContain('free_amount');
	});

	it('gibt die Historie je Firma zurück', async () => {
		mocks.festivals = [
			{ id: 'f2023', start_date: '2023-07-22' },
			{ id: 'f2026', start_date: '2026-07-24' }
		];
		mocks.sponsorings = [
			{ sponsor_id: 'baumeister', festival_id: 'f2023' },
			{ sponsor_id: 'baumeister', festival_id: 'f2026' },
			{ sponsor_id: 'elektro', festival_id: 'f2023' }
		];

		const { history } = await getSponsorHistory(HEUTE);

		expect(sponsorHistoryOf(history, 'baumeister')).toMatchObject({
			lastYear: 2026,
			festivalCount: 2,
			sponsorsReferenceFestival: true
		});
		expect(sponsorHistoryOf(history, 'elektro')).toMatchObject({
			lastYear: 2023,
			festivalCount: 1,
			sponsorsReferenceFestival: false
		});
	});

	it('nennt das nächste Fest als Bezugsfest', async () => {
		mocks.festivals = [
			{ id: 'f2023', start_date: '2023-07-22' },
			{ id: 'f2027', start_date: '2027-07-23' },
			{ id: 'f2026', start_date: '2026-07-24' }
		];

		const { referenceFestival } = await getSponsorHistory(HEUTE);

		expect(referenceFestival?.id).toBe('f2026');
	});

	it('kennt zwischen zwei Festen kein Bezugsfest', async () => {
		mocks.festivals = [{ id: 'f2023', start_date: '2023-07-22' }];
		mocks.sponsorings = [{ sponsor_id: 'baumeister', festival_id: 'f2023' }];

		const { history, referenceFestival } = await getSponsorHistory(HEUTE);

		expect(referenceFestival).toBeNull();
		expect(sponsorHistoryOf(history, 'baumeister').sponsorsReferenceFestival).toBe(false);
	});

	it('zählt kein gelöschtes Fest mit — die Festliste liefert nur die sichtbaren', async () => {
		// `geloescht` steht nicht in der Festliste (deleted_at IS NULL, #8).
		mocks.festivals = [{ id: 'f2026', start_date: '2026-07-24' }];
		mocks.sponsorings = [
			{ sponsor_id: 'baumeister', festival_id: 'geloescht' },
			{ sponsor_id: 'baumeister', festival_id: 'f2026' }
		];

		const { history } = await getSponsorHistory(HEUTE);

		expect(sponsorHistoryOf(history, 'baumeister').festivalCount).toBe(1);
	});

	it('blättert über den Zeilendeckel hinaus, statt zu wenig zu zählen', async () => {
		mocks.rowCap = 2;
		mocks.festivals = [{ id: 'f2026', start_date: '2026-07-24' }];
		mocks.sponsorings = [
			{ sponsor_id: 'baumeister', festival_id: 'f2026' },
			{ sponsor_id: 'elektro', festival_id: 'f2026' },
			{ sponsor_id: 'zeltverleih', festival_id: 'f2026' },
			{ sponsor_id: 'druckerei', festival_id: 'f2026' },
			{ sponsor_id: 'gaertnerei', festival_id: 'f2026' }
		];

		const { history } = await getSponsorHistory(HEUTE);

		expect(Object.keys(history)).toHaveLength(5);
		expect(countQueries('sponsorings')).toBe(3);
	});

	it('meldet eine gescheiterte Abfrage, statt eine halbe Historie zu liefern', async () => {
		mocks.failing = 'sponsorings';

		await expect(getSponsorHistory(HEUTE)).rejects.toThrow('sponsorings kaputt');
	});
});
