import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Der Schichtplan liest und schreibt nach ADR 0005 ausschließlich Helfer.
 * Eingeklagt wird hier die Verknüpfungs-Form: jede Zuteilung zeigt über
 * `helper_id` auf `festival_helpers`, nirgends mehr über `member_id` auf den
 * globalen Bestand. Fällt eine Stelle zurück, zeigt der Schichtplan Namen aus
 * einem fremden Fest — oder gar keine.
 */

interface RecordedCall {
	table: string;
	op: 'select' | 'insert' | 'update' | 'delete';
	select?: string;
	payload?: any;
	filters: Array<[string, unknown]>;
	order: string[];
}

const mocks = vi.hoisted(() => ({
	calls: [] as RecordedCall[],
	/** Zeilen für ein `await` auf den Builder (Listen-Abfragen). */
	rows: {} as Record<string, unknown[]>,
	/** FIFO-Antworten für single()/maybeSingle() je Tabelle. */
	singles: {} as Record<string, unknown[]>
}));

vi.mock('@/integrations/supabase/client', () => {
	const build = (call: RecordedCall) => {
		const one = async () => {
			if (call.op === 'insert') {
				return { data: { id: 'neu-1', ...(call.payload as object) }, error: null };
			}
			const queue = mocks.singles[call.table] ?? [];
			return { data: queue.shift() ?? null, error: null };
		};

		const builder: Record<string, unknown> = {
			select: (select: string) => {
				call.select = select;
				return builder;
			},
			insert: (payload: unknown) => {
				call.op = 'insert';
				call.payload = payload;
				return builder;
			},
			update: (payload: unknown) => {
				call.op = 'update';
				call.payload = payload;
				return builder;
			},
			delete: () => {
				call.op = 'delete';
				return builder;
			},
			eq: (column: string, value: unknown) => {
				call.filters.push([column, value]);
				return builder;
			},
			order: (column: string) => {
				call.order.push(column);
				return builder;
			},
			single: one,
			maybeSingle: one,
			then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
				Promise.resolve({ data: mocks.rows[call.table] ?? [], error: null }).then(resolve, reject)
		};
		return builder;
	};

	return {
		supabase: {
			from: (table: string) => {
				const call: RecordedCall = { table, op: 'select', filters: [], order: [] };
				mocks.calls.push(call);
				return build(call);
			}
		}
	};
});

import {
	getStations,
	getStationHelpers,
	getShiftAssignments,
	assignHelperToStation,
	removeHelperFromStation,
	assignHelperToStationShift,
	removeHelperFromStationShift,
	createStationsBulk
} from '../shiftService';

const callsTo = (table: string) => mocks.calls.filter((c) => c.table === table);
const lastCallTo = (table: string) => callsTo(table)[callsTo(table).length - 1];

beforeEach(() => {
	mocks.calls = [];
	mocks.rows = {};
	mocks.singles = {};
});

describe('getStations', () => {
	it('holt den Verantwortlichen als Helfer des Fests', async () => {
		await getStations('fest-7');

		const select = lastCallTo('stations').select ?? '';
		expect(select).toContain('responsible_helper');
		expect(select).toContain('festival_helpers');
		expect(select).toContain('responsible_helper_id');
		expect(select).not.toContain('members');
	});
});

describe('createStationsBulk', () => {
	it('gibt die neuen Stationen mit ihrem Helfer-Verantwortlichen zurück', async () => {
		await createStationsBulk([]);

		const select = lastCallTo('stations').select ?? '';
		expect(select).toContain('festival_helpers');
		expect(select).not.toContain('members');
	});
});

describe('getStationHelpers', () => {
	it('holt die Stations-Helfer eines Fests samt Namen aus festival_helpers', async () => {
		await getStationHelpers('fest-7');

		const call = lastCallTo('station_members');
		expect(call.filters).toEqual([['festival_id', 'fest-7']]);
		expect(call.select).toContain('helper:festival_helpers');
		expect(call.select).not.toContain('member:members');
	});
});

describe('getShiftAssignments', () => {
	it('holt die Zuteilungen eines Fests samt Helfer-Namen', async () => {
		await getShiftAssignments('fest-7');

		const call = lastCallTo('shift_assignments');
		expect(call.filters).toEqual([['festival_id', 'fest-7']]);
		expect(call.select).toContain('helper:festival_helpers');
		expect(call.select).not.toContain('members');
	});
});

describe('assignHelperToStation', () => {
	it('schreibt den Helfer-Zeiger, nicht den Member-Zeiger', async () => {
		await assignHelperToStation('fest-7', 'st-1', 'h-9');

		expect(lastCallTo('station_members').payload).toEqual({
			festival_id: 'fest-7',
			station_id: 'st-1',
			helper_id: 'h-9'
		});
	});
});

describe('removeHelperFromStation', () => {
	it('löscht über station_id und helper_id', async () => {
		await removeHelperFromStation('st-1', 'h-9');

		const call = lastCallTo('station_members');
		expect(call.op).toBe('delete');
		expect(call.filters).toEqual([
			['station_id', 'st-1'],
			['helper_id', 'h-9']
		]);
	});
});

describe('assignHelperToStationShift', () => {
	beforeEach(() => {
		mocks.singles = { station_shifts: [{ station_id: 'st-1' }] };
	});

	it('legt die Zuteilung mit helper_id an', async () => {
		await assignHelperToStationShift('fest-7', 'sh-1', 'h-9', 2);

		const insert = callsTo('shift_assignments').find((c) => c.op === 'insert');
		expect(insert?.payload).toMatchObject({
			festival_id: 'fest-7',
			station_shift_id: 'sh-1',
			station_id: 'st-1',
			helper_id: 'h-9',
			position: 2
		});
	});

	it('prüft die Doppelzuteilung über helper_id', async () => {
		await assignHelperToStationShift('fest-7', 'sh-1', 'h-9', 1);

		const check = callsTo('shift_assignments')[0];
		expect(check.filters).toContainEqual(['helper_id', 'h-9']);
		expect(check.filters.map(([column]) => column)).not.toContain('member_id');
	});

	it('rückt einen schon zugeteilten Helfer nur auf die neue Position, statt ihn doppelt zu führen', async () => {
		mocks.singles = {
			station_shifts: [{ station_id: 'st-1' }],
			shift_assignments: [{ id: 'sa-1', helper_id: 'h-9' }]
		};

		await assignHelperToStationShift('fest-7', 'sh-1', 'h-9', 3);

		const update = callsTo('shift_assignments').find((c) => c.op === 'update');
		expect(update?.payload).toEqual({ position: 3 });
		expect(callsTo('shift_assignments').some((c) => c.op === 'insert')).toBe(false);
	});
});

describe('removeHelperFromStationShift', () => {
	it('löscht die Zuteilung des Helfers aus der Schicht', async () => {
		mocks.singles = { station_shifts: [{ station_id: 'st-1' }] };

		await removeHelperFromStationShift('fest-7', 'sh-1', 'h-9');

		const call = lastCallTo('shift_assignments');
		expect(call.op).toBe('delete');
		expect(call.filters).toContainEqual(['helper_id', 'h-9']);
		expect(call.filters).toContainEqual(['festival_id', 'fest-7']);
	});
});
