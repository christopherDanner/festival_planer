import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Station, StationShift } from '../shiftService';
import type { Helper } from '../helperService';

/**
 * Die Auto-Zuteilung teilt Helfer eines Fests ein. Der Unterschied zum alten
 * Stand ist die fehlende Aktiv-Prüfung: `is_active` ist mit ADR 0005 weg — wer
 * nicht mitmacht, steht gar nicht erst in der Helferliste. Bliebe die Prüfung
 * stehen, teilte die Auto-Zuteilung niemanden mehr ein, weil kein Helfer das
 * Feld noch trägt.
 */

const mocks = vi.hoisted(() => ({
	existing: [] as Array<{ station_shift_id: string; helper_id?: string }>,
	assigned: [] as Array<{ stationShiftId: string; helperId: string; position: number }>,
	failOn: null as string | null,
	deleted: null as { table: string; filters: Array<[string, string]> } | null,
	deleteError: null as { message: string } | null
}));

vi.mock('../shiftService', () => ({
	getShiftAssignments: async () => mocks.existing,
	assignHelperToStationShift: async (
		_festivalId: string,
		stationShiftId: string,
		helperId: string,
		position: number
	) => {
		if (mocks.failOn === helperId) throw new Error('Zuteilung abgelehnt');
		mocks.assigned.push({ stationShiftId, helperId, position });
		return {} as never;
	}
}));

/** Merkt sich, worauf ein DELETE eingeschränkt wurde — die Kette endet als
Thenable, genau wie der Supabase-Query-Builder. */
vi.mock('@/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			delete: () => {
				const filters: Array<[string, string]> = [];
				mocks.deleted = { table, filters };
				const chain = {
					eq(column: string, value: string) {
						filters.push([column, value]);
						return chain;
					},
					then<T>(
						onFulfilled: (value: { error: unknown }) => T,
						onRejected?: (reason: unknown) => T
					) {
						return Promise.resolve({ error: mocks.deleteError }).then(onFulfilled, onRejected);
					}
				};
				return chain;
			}
		})
	}
}));

import {
	clearAssignments,
	performAutomaticAssignment,
	type AutoAssignmentConfig
} from '../automaticAssignmentService';

const config = (overrides: Partial<AutoAssignmentConfig> = {}): AutoAssignmentConfig => ({
	minShiftsPerHelper: 1,
	maxShiftsPerHelper: 3,
	respectPreferences: true,
	...overrides
});

function makeHelper(id: string): Helper {
	return {
		id,
		festival_id: 'fest-7',
		first_name: 'Vor',
		last_name: id,
		station_preferences: [],
		shift_preferences: [],
		created_at: '',
		updated_at: ''
	};
}

const station = (id: string): Station =>
	({ id, festival_id: 'fest-7', name: id, required_people: 1 }) as Station;

const shift = (id: string, stationId: string, requiredPeople = 1): StationShift =>
	({ id, festival_id: 'fest-7', station_id: stationId, required_people: requiredPeople }) as StationShift;

beforeEach(() => {
	mocks.existing = [];
	mocks.assigned = [];
	mocks.failOn = null;
	mocks.deleted = null;
	mocks.deleteError = null;
});

describe('performAutomaticAssignment', () => {
	it('teilt die Helfer der Helferliste ein, ohne nach einem Aktiv-Marker zu fragen', async () => {
		const result = await performAutomaticAssignment(
			'fest-7',
			[shift('sh-1', 'st-1')],
			[station('st-1')],
			[makeHelper('h-1')],
			config()
		);

		expect(result.success).toBe(true);
		expect(result.assignmentsCreated).toBe(1);
		expect(mocks.assigned).toEqual([{ stationShiftId: 'sh-1', helperId: 'h-1', position: 1 }]);
	});

	it('bevorzugt den Helfer, der sich diese Station gewünscht hat', async () => {
		const result = await performAutomaticAssignment(
			'fest-7',
			[shift('sh-1', 'st-1')],
			[station('st-1')],
			[makeHelper('h-1'), makeHelper('h-2')],
			config(),
			{ 'h-2': ['st-1'] }
		);

		expect(result.assignmentsCreated).toBe(1);
		expect(mocks.assigned[0].helperId).toBe('h-2');
	});

	it('teilt keinen Helfer über die Obergrenze hinaus ein', async () => {
		const result = await performAutomaticAssignment(
			'fest-7',
			[shift('sh-1', 'st-1'), shift('sh-2', 'st-1')],
			[station('st-1')],
			[makeHelper('h-1')],
			config({ maxShiftsPerHelper: 1 })
		);

		expect(result.assignmentsCreated).toBe(1);
		expect(result.unfilledPositions).toHaveLength(1);
	});

	it('überspringt eine Schicht, in der der Helfer schon steht', async () => {
		mocks.existing = [{ station_shift_id: 'sh-1', helper_id: 'h-1' }];

		const result = await performAutomaticAssignment(
			'fest-7',
			[shift('sh-1', 'st-1', 2)],
			[station('st-1')],
			[makeHelper('h-1')],
			config()
		);

		expect(result.assignmentsCreated).toBe(0);
		expect(mocks.assigned).toEqual([]);
	});

	it('zählt die Schichten je Helfer, bestehende eingerechnet', async () => {
		mocks.existing = [{ station_shift_id: 'sh-0', helper_id: 'h-1' }];

		const result = await performAutomaticAssignment(
			'fest-7',
			[shift('sh-1', 'st-1')],
			[station('st-1')],
			[makeHelper('h-1')],
			config()
		);

		expect(result.helperStats).toEqual([{ helperId: 'h-1', assignedShifts: 2 }]);
	});
});

/* Seam dieses Blocks (aus den Abnahmekriterien von #108 abgeleitet, vor dem
   ersten Test festgehalten): `clearAssignments(festivalId, stationId?)` — ohne
   Station das ganze Fest, mit Station nur deren Zuweisungen. Der eingeschränkte
   Lösch-Knopf im Dialog darf sonst mehr mitnehmen, als er verspricht. */
describe('clearAssignments', () => {
	it('löscht ohne Station die Zuweisungen des ganzen Fests', async () => {
		expect(await clearAssignments('fest-7')).toBe(true);
		expect(mocks.deleted).toEqual({
			table: 'shift_assignments',
			filters: [['festival_id', 'fest-7']]
		});
	});

	it('löscht mit Station nur deren Zuweisungen', async () => {
		expect(await clearAssignments('fest-7', 'st-1')).toBe(true);
		expect(mocks.deleted).toEqual({
			table: 'shift_assignments',
			filters: [
				['festival_id', 'fest-7'],
				['station_id', 'st-1']
			]
		});
	});

	it('meldet den Fehlschlag, statt ihn zu verschlucken', async () => {
		mocks.deleteError = { message: 'abgelehnt' };

		expect(await clearAssignments('fest-7')).toBe(false);
	});
});
