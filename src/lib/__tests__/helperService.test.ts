import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Der Helfer gehört dem Fest (ADR 0005). Was hier eingeklagt wird, ist genau
 * der Unterschied zum alten globalen `members`-Bestand: jede Abfrage nennt ein
 * Fest, und die Wünsche stehen auf der Helfer-Zeile statt in einer eigenen
 * Tabelle.
 */

interface RecordedCall {
	table: string;
	op: 'select' | 'insert' | 'update' | 'delete';
	select?: string;
	payload?: unknown;
	filters: Array<[string, unknown]>;
	order?: string;
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
			order: (column: string) => {
				call.order = column;
				return builder;
			},
			single: async () => ({ data: mocks.rows[0] ?? null, error: mocks.error }),
			maybeSingle: async () => ({ data: mocks.rows[0] ?? null, error: mocks.error }),
			then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
				Promise.resolve({ data: mocks.rows, error: mocks.error }).then(resolve, reject)
		};
		return builder;
	};

	return {
		supabase: {
			from: (table: string) => {
				const call: RecordedCall = { table, op: 'select', filters: [] };
				mocks.calls.push(call);
				return build(call);
			}
		}
	};
});

import {
	getHelpers,
	createHelper,
	updateHelper,
	deleteHelper,
	updateHelperPreferences,
	derivePreferenceMaps,
	removeHelperMessage,
	type Helper
} from '../helperService';

const lastCall = () => mocks.calls[mocks.calls.length - 1];

function makeHelper(overrides: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Hans',
		last_name: 'Huber',
		station_preferences: [],
		shift_preferences: [],
		created_at: '',
		updated_at: '',
		...overrides
	};
}

beforeEach(() => {
	mocks.calls = [];
	mocks.rows = [];
	mocks.error = null;
});

describe('getHelpers', () => {
	it('holt nur die Helfer eines Fests, nach Nachnamen sortiert', async () => {
		mocks.rows = [makeHelper()];

		const helpers = await getHelpers('fest-7');

		expect(helpers).toHaveLength(1);
		expect(lastCall().table).toBe('festival_helpers');
		expect(lastCall().filters).toEqual([['festival_id', 'fest-7']]);
		expect(lastCall().order).toBe('last_name');
	});

	it('liest die Wünsche mit, weil sie auf der Helfer-Zeile stehen', async () => {
		await getHelpers('fest-7');

		// '*' oder ausgeschriebene Spalten — beides trägt die Wunsch-Arrays mit.
		const select = lastCall().select ?? '';
		expect(select === '*' || select.includes('station_preferences')).toBe(true);
	});

	it('meldet einen Fehler, statt eine leere Helferliste vorzutäuschen', async () => {
		mocks.error = { message: 'festival_helpers kaputt' };

		await expect(getHelpers('fest-7')).rejects.toThrow('festival_helpers kaputt');
	});
});

describe('createHelper', () => {
	it('bindet den neuen Helfer an das Fest', async () => {
		mocks.rows = [{ id: 'neu-1' }];

		const id = await createHelper('fest-7', {
			first_name: 'Hans',
			last_name: 'Huber',
			phone: '',
			email: '',
			notes: ''
		});

		expect(id).toBe('neu-1');
		expect(lastCall().table).toBe('festival_helpers');
		expect(lastCall().payload).toMatchObject({ festival_id: 'fest-7', last_name: 'Huber' });
	});

	it('stempelt weder Benutzer noch Aktiv-Marker — beide sind mit ADR 0005 weg', async () => {
		mocks.rows = [{ id: 'neu-1' }];

		await createHelper('fest-7', {
			first_name: 'Hans',
			last_name: 'Huber',
			phone: '',
			email: '',
			notes: ''
		});

		expect(lastCall().payload).not.toHaveProperty('user_id');
		expect(lastCall().payload).not.toHaveProperty('is_active');
	});
});

// Jeder Schreibweg nennt das Fest mit: die Helfer-ID allein wäre im
// gemeinsamen Arbeitsbereich (ADR 0001/0002, RLS offen) der einzige Schutz
// davor, mit einer veralteten ID in ein fremdes Fest zu schreiben.
describe('updateHelper', () => {
	it('ändert genau die eine Helfer-Zeile dieses Fests', async () => {
		await updateHelper('fest-7', 'h1', { notes: 'kann nur Samstag' });

		expect(lastCall().table).toBe('festival_helpers');
		expect(lastCall().op).toBe('update');
		expect(lastCall().filters).toEqual([
			['id', 'h1'],
			['festival_id', 'fest-7']
		]);
	});
});

describe('deleteHelper', () => {
	it('entfernt den Helfer aus genau diesem Fest', async () => {
		await deleteHelper('fest-7', 'h1');

		expect(lastCall().table).toBe('festival_helpers');
		expect(lastCall().op).toBe('delete');
		expect(lastCall().filters).toEqual([
			['id', 'h1'],
			['festival_id', 'fest-7']
		]);
	});
});

describe('updateHelperPreferences', () => {
	it('schreibt beide Wunsch-Arrays mit einem Update auf die Helfer-Zeile', async () => {
		await updateHelperPreferences('fest-7', 'h1', ['st-1'], ['sh-1', 'sh-2']);

		expect(mocks.calls).toHaveLength(1);
		expect(lastCall().table).toBe('festival_helpers');
		expect(lastCall().op).toBe('update');
		expect(lastCall().payload).toMatchObject({
			station_preferences: ['st-1'],
			shift_preferences: ['sh-1', 'sh-2']
		});
		expect(lastCall().filters).toEqual([
			['id', 'h1'],
			['festival_id', 'fest-7']
		]);
	});

	it('fasst festival_member_preferences nicht mehr an', async () => {
		await updateHelperPreferences('fest-7', 'h1', [], []);

		expect(mocks.calls.map((c) => c.table)).not.toContain('festival_member_preferences');
	});
});

describe('derivePreferenceMaps', () => {
	it('legt die Wünsche der Helfer-Zeilen als Maps je Helfer aus', () => {
		const helpers = [
			makeHelper({ id: 'h1', station_preferences: ['st-1'], shift_preferences: ['sh-1'] }),
			makeHelper({ id: 'h2', station_preferences: [], shift_preferences: [] })
		];

		expect(derivePreferenceMaps(helpers)).toEqual({
			stationPreferences: { h1: ['st-1'], h2: [] },
			shiftPreferences: { h1: ['sh-1'], h2: [] }
		});
	});

	it('verträgt fehlende Arrays, ohne über undefined zu stolpern', () => {
		const helpers = [
			{ ...makeHelper({ id: 'h3' }), station_preferences: undefined, shift_preferences: undefined }
		] as unknown as Helper[];

		expect(derivePreferenceMaps(helpers)).toEqual({
			stationPreferences: { h3: [] },
			shiftPreferences: { h3: [] }
		});
	});
});

describe('removeHelperMessage', () => {
	it('benennt die Folge: der Helfer ist samt Zuteilungen aus dem Fest weg', () => {
		const message = removeHelperMessage(makeHelper({ first_name: 'Hans', last_name: 'Huber' }));

		expect(message).toContain('Huber');
		expect(message).toContain('Hans');
		expect(message).toMatch(/Zuteilungen/);
		expect(message).toMatch(/Fest/);
	});
});
