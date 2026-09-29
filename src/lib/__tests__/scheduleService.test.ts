import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Der Ablauf-Eintrag gehört dem Tag, die Phase ist optional (ADR 0007). Was hier
 * eingeklagt wird, ist genau der Formwechsel: die Einträge hängen in der Abfrage
 * am Tag statt unter den Phasen, und gereiht wird die Uhrzeit — nicht die Hand.
 */

interface OrderCall {
	column: string;
	options?: { referencedTable?: string; nullsFirst?: boolean; ascending?: boolean };
}

interface RecordedCall {
	table: string;
	op: 'select' | 'insert' | 'update' | 'delete';
	select?: string;
	payload?: unknown;
	filters: Array<[string, unknown]>;
	orders: OrderCall[];
}

const mocks = vi.hoisted(() => ({
	calls: [] as RecordedCall[],
	rows: [] as unknown[],
	error: null as null | { message: string }
}));

vi.mock('@/integrations/supabase/client', () => {
	const build = (call: RecordedCall) => {
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
			order: (column: string, options?: OrderCall['options']) => {
				call.orders.push({ column, options });
				return builder;
			},
			single: async () => ({ data: mocks.rows[0] ?? null, error: mocks.error }),
			then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
				Promise.resolve({ data: mocks.rows, error: mocks.error }).then(resolve, reject)
		};
		return builder;
	};

	return {
		supabase: {
			from: (table: string) => {
				const call: RecordedCall = { table, op: 'select', filters: [], orders: [] };
				mocks.calls.push(call);
				return build(call);
			}
		}
	};
});

import * as scheduleService from '../scheduleService';
import {
	createScheduleDaysBulk,
	createScheduleEntriesBulk,
	createSchedulePhasesBulk,
	getScheduleDays,
	shouldInitializeScheduleDays,
	type ScheduleDayWithEntries
} from '../scheduleService';

const lastCall = () => mocks.calls[mocks.calls.length - 1];
const entryOrders = () =>
	lastCall().orders.filter((o) => o.options?.referencedTable === 'entries');

beforeEach(() => {
	mocks.calls = [];
	mocks.rows = [];
	mocks.error = null;
});

describe('getScheduleDays — Einträge hängen am Tag', () => {
	it('liest die Einträge direkt am Tag, nicht über die Phasen', async () => {
		await getScheduleDays('fest-7');

		const select = lastCall().select ?? '';
		expect(lastCall().table).toBe('schedule_days');
		expect(lastCall().filters).toEqual([['festival_id', 'fest-7']]);
		expect(select).toContain('entries:schedule_entries');
		// Die Phasen kommen als flache Gruppen-Liste daneben — ohne ihre Einträge.
		expect(select).not.toMatch(/phases:schedule_phases\([^)]*entries/);
	});

	it('holt die Phasen als Gruppen-Metadaten mit', async () => {
		await getScheduleDays('fest-7');

		expect(lastCall().select ?? '').toContain('phases:schedule_phases');
	});

	it('nennt den Verantwortlichen beim Helfer, nicht beim Mitglied', async () => {
		await getScheduleDays('fest-7');

		const select = lastCall().select ?? '';
		expect(select).toContain('responsible_helper:festival_helpers');
		expect(select).not.toContain('responsible_member');
		expect(select).not.toContain('members(');
	});

	it('reiht die Einträge nach Startzeit, dann created_at — ohne Zeit ans Ende', async () => {
		await getScheduleDays('fest-7');

		expect(entryOrders().map((o) => o.column)).toEqual(['start_time', 'created_at']);
		expect(entryOrders()[0].options?.nullsFirst).toBe(false);
	});

	it('liest sort_order auf den Einträgen gar nicht mehr — auch nicht als Tiebreaker', async () => {
		await getScheduleDays('fest-7');

		expect(entryOrders().map((o) => o.column)).not.toContain('sort_order');
	});

	it('sortiert die Phasen weiter nach sort_order — eine Phase trägt keine Uhrzeit', async () => {
		await getScheduleDays('fest-7');

		const phaseOrders = lastCall().orders.filter((o) => o.options?.referencedTable === 'phases');
		expect(phaseOrders.map((o) => o.column)).toEqual(['sort_order']);
	});

	it('gibt die Tage in der neuen Form zurück', async () => {
		const day: ScheduleDayWithEntries = {
			id: 'd1',
			festival_id: 'fest-7',
			date: '2026-07-25',
			label: null,
			is_auto_generated: false,
			sort_order: 0,
			created_at: '',
			updated_at: '',
			phases: [],
			entries: []
		};
		mocks.rows = [day];

		await expect(getScheduleDays('fest-7')).resolves.toEqual([day]);
	});

	it('meldet einen Fehler, statt einen leeren Ablaufplan vorzutäuschen', async () => {
		mocks.error = { message: 'schedule_days kaputt' };

		await expect(getScheduleDays('fest-7')).rejects.toThrow('schedule_days kaputt');
	});
});

describe('Schreibwege', () => {
	it('kennt kein Umsortieren von Einträgen mehr — die Uhrzeit reiht', () => {
		expect(scheduleService).not.toHaveProperty('reorderScheduleEntries');
	});

	it('sortiert Phasen weiter von Hand um', () => {
		expect(scheduleService.reorderSchedulePhases).toBeTypeOf('function');
	});
});

/**
 * Die Ablaufplan-Übernahme (#127) schreibt Tage, Phasen und Einträge eines
 * ganzen Fests. Zeile für Zeile wären das so viele Abfragen wie Ablauf-Einträge;
 * darum je ein gebündelter Weg, wie ihn Stationen, Schichten und Material schon
 * haben.
 */
describe('Gebündeltes Anlegen für die Ablaufplan-Übernahme', () => {
	const day = { festival_id: 'ziel', date: '2027-07-22', label: 'Aufbau', is_auto_generated: false, sort_order: 0 };
	const phase = { festival_id: 'ziel', schedule_day_id: 'd-neu', name: 'Anlieferung', sort_order: 0 };
	const entry = {
		festival_id: 'ziel',
		schedule_day_id: 'd-neu',
		schedule_phase_id: null,
		title: 'Fassanstich',
		type: 'program' as const,
		start_time: '11:00',
		end_time: null,
		responsible_helper_id: null,
		status: null,
		description: null
	};

	it('legt die Tage in einem Zug an und gibt die neuen Zeilen zurück', async () => {
		mocks.rows = [{ id: 'd-neu', ...day }];

		await expect(createScheduleDaysBulk([day])).resolves.toEqual([{ id: 'd-neu', ...day }]);
		expect(lastCall().table).toBe('schedule_days');
		expect(lastCall().op).toBe('insert');
		expect(lastCall().payload).toEqual([day]);
	});

	it('legt die Phasen in einem Zug an', async () => {
		mocks.rows = [{ id: 'p-neu', ...phase }];

		await expect(createSchedulePhasesBulk([phase])).resolves.toEqual([{ id: 'p-neu', ...phase }]);
		expect(lastCall().table).toBe('schedule_phases');
		expect(lastCall().payload).toEqual([phase]);
	});

	it('legt die Einträge in einem Zug an', async () => {
		mocks.rows = [{ id: 'e-neu', ...entry }];

		await expect(createScheduleEntriesBulk([entry])).resolves.toEqual([{ id: 'e-neu', ...entry }]);
		expect(lastCall().table).toBe('schedule_entries');
		expect(lastCall().payload).toEqual([entry]);
	});

	// Ein Tag ohne Phasen und ein Fest ohne Einträge sind der Normalfall — ein
	// Insert über eine leere Liste wäre eine Abfrage ohne Wirkung.
	it('fragt gar nicht erst, wenn es nichts anzulegen gibt', async () => {
		await expect(createScheduleDaysBulk([])).resolves.toEqual([]);
		await expect(createSchedulePhasesBulk([])).resolves.toEqual([]);
		await expect(createScheduleEntriesBulk([])).resolves.toEqual([]);

		expect(mocks.calls).toEqual([]);
	});

	it('meldet einen Fehler, statt eine halbe Kopie vorzutäuschen', async () => {
		mocks.error = { message: 'schedule_entries kaputt' };

		await expect(createScheduleEntriesBulk([entry])).rejects.toThrow('schedule_entries kaputt');
	});
});

/**
 * Der Wächter vor der automatischen Tages-Erzeugung (#127): ein übernommener
 * Ablaufplan bringt seine Tage schon mit — sie ein zweites Mal zu erzeugen
 * stellte neben den Aufbau-Donnerstag einen leeren Festtag.
 */
describe('shouldInitializeScheduleDays', () => {
	const plan = (over: Parameters<typeof shouldInitializeScheduleDays>[0]) =>
		shouldInitializeScheduleDays(over);

	it('erzeugt die Festtage eines leeren Ablaufplans', () => {
		expect(plan({ days: [], isLoading: false, festivalStartDate: '2027-07-23' })).toBe(true);
	});

	it('hält sich zurück, sobald das Fest schon einen Tag hat', () => {
		expect(plan({ days: [{}], isLoading: false, festivalStartDate: '2027-07-23' })).toBe(false);
	});

	// Solange die Abfrage läuft, ist „keine Tage" keine Auskunft, sondern ein
	// leerer Zwischenstand — die Erzeugung liefe gegen den kopierten Plan.
	it('wartet, solange der Ablaufplan noch lädt', () => {
		expect(plan({ days: [], isLoading: true, festivalStartDate: '2027-07-23' })).toBe(false);
	});

	it('erzeugt ohne Fest-Datum nichts', () => {
		expect(plan({ days: [], isLoading: false, festivalStartDate: undefined })).toBe(false);
		expect(plan({ days: [], isLoading: false, festivalStartDate: '' })).toBe(false);
	});
});
