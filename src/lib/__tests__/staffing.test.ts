import { describe, it, expect } from 'vitest';
import type { Station, StationShift, ShiftAssignment, StationHelper } from '@/lib/shiftService';
import { deriveShiftsMetric, stationStaffing } from '@/lib/staffing';

/**
 * Die Zählregel des Fests, aus `festival-overview/numberBoxes.ts` hierher
 * gehoben (#102): Dashboard, KPI-Maßband der Werkbank, Ampel-Reiter und
 * Schicht-Status rechnen dieselbe Wahrheit. Die Fälle sind aus
 * `numberBoxes.test.ts` mitgezogen, nicht neu geschrieben.
 */

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Bar',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: 'Schicht',
		start_date: '2026-07-24',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignment> = {}): ShiftAssignment {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		position: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function stationHelper(over: Partial<StationHelper> = {}): StationHelper {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'p1',
		created_at: '',
		...over
	};
}

describe('stationStaffing', () => {
	it('rechnet mit Schichten über die Schicht-Solls und die Schicht-Zuteilungen', () => {
		const s = station({ id: 's1', required_people: 99 });
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 4 }),
			shift({ id: 'sh2', station_id: 's1', required_people: 2 })
		];
		const assignments = [
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh2' })
		];

		// required_people der Station zählt hier bewusst nicht mit.
		expect(stationStaffing(s, shifts, assignments, [])).toEqual({ required: 6, assigned: 2 });
	});

	it('rechnet ohne Schichten über required_people und die Stationsmitglieder', () => {
		const s = station({ id: 's1', required_people: 3 });
		const helpers = [
			stationHelper({ id: 'm1', station_id: 's1' }),
			stationHelper({ id: 'm2', station_id: 's1' }),
			stationHelper({ id: 'm3', station_id: 's2' })
		];

		expect(stationStaffing(s, [], [], helpers)).toEqual({ required: 3, assigned: 2 });
	});

	it('kappt die Überbesetzung je Schicht — ein Kopf zu viel füllt kein anderes Loch', () => {
		const s = station({ id: 's1' });
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 2 }),
			shift({ id: 'sh2', station_id: 's1', required_people: 2 })
		];
		const assignments = [
			// sh1 überbesetzt (3 auf 2), sh2 halb leer (1 auf 2)
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh1' }),
			assignment({ id: 'a3', station_shift_id: 'sh1' }),
			assignment({ id: 'a4', station_shift_id: 'sh2' })
		];

		// Roh gezählt wären es 4/4 — der Stationskopf meldete „voll besetzt",
		// während unter ihm ein roter freier Platz steht.
		expect(stationStaffing(s, shifts, assignments, [])).toEqual({ required: 4, assigned: 3 });
	});

	it('kappt sie auch auf der Stations-Ebene', () => {
		const s = station({ id: 's1', required_people: 1 });
		const helpers = [
			stationHelper({ id: 'm1', station_id: 's1' }),
			stationHelper({ id: 'm2', station_id: 's1', helper_id: 'p2' })
		];

		expect(stationStaffing(s, [], [], helpers)).toEqual({ required: 1, assigned: 1 });
	});

	it('zählt nur die eigenen Schichten und Zuteilungen', () => {
		const s = station({ id: 's1' });
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 2 }),
			shift({ id: 'sh2', station_id: 's2', required_people: 5 })
		];
		const assignments = [
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh2' })
		];

		expect(stationStaffing(s, shifts, assignments, [])).toEqual({ required: 2, assigned: 1 });
	});
});

describe('deriveShiftsMetric', () => {
	it('summiert Soll/Ist über Schichten (besetzt/gesamt, fehlen)', () => {
		const stations = [station({ id: 's1' })];
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 4 }),
			shift({ id: 'sh2', station_id: 's1', required_people: 2 })
		];
		const assignments = [
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh1' }),
			assignment({ id: 'a3', station_shift_id: 'sh2' })
		];
		const m = deriveShiftsMetric(stations, shifts, assignments, []);
		expect(m.gesamt).toBe(6);
		expect(m.besetzt).toBe(3);
		expect(m.fehlen).toBe(3);
		expect(m.status).toBe('partial');
		expect(m.isEmpty).toBe(false);
	});

	it('nutzt Stations-Ebene (required_people + StationHelpers), wenn keine Schichten', () => {
		const stations = [station({ id: 's1', required_people: 3 })];
		const stationHelpers = [
			stationHelper({ id: 'm1', station_id: 's1', helper_id: 'p1' }),
			stationHelper({ id: 'm2', station_id: 's1', helper_id: 'p2' })
		];
		const m = deriveShiftsMetric(stations, [], [], stationHelpers);
		expect(m.gesamt).toBe(3);
		expect(m.besetzt).toBe(2);
		expect(m.fehlen).toBe(1);
		expect(m.status).toBe('partial');
	});

	it('kappt Überbesetzung pro Station (besetzt nie > gesamt, fehlen bleibt korrekt)', () => {
		const stations = [station({ id: 's1' }), station({ id: 's2' })];
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 2 }),
			shift({ id: 'sh2', station_id: 's2', required_people: 4 })
		];
		const assignments = [
			// s1 überbesetzt (3 auf 2) — zählt nur als 2 besetzt
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh1' }),
			assignment({ id: 'a3', station_shift_id: 'sh1' }),
			// s2 gar nicht besetzt
		];
		const m = deriveShiftsMetric(stations, shifts, assignments, []);
		expect(m.gesamt).toBe(6);
		expect(m.besetzt).toBe(2);
		expect(m.fehlen).toBe(4);
	});

	it('voll besetzt → status complete, fehlen 0', () => {
		const stations = [station({ id: 's1' })];
		const shifts = [shift({ id: 'sh1', station_id: 's1', required_people: 2 })];
		const assignments = [
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh1' })
		];
		const m = deriveShiftsMetric(stations, shifts, assignments, []);
		expect(m.fehlen).toBe(0);
		expect(m.status).toBe('complete');
	});

	it('nichts besetzt → status empty', () => {
		const stations = [station({ id: 's1' })];
		const shifts = [shift({ id: 'sh1', station_id: 's1', required_people: 2 })];
		const m = deriveShiftsMetric(stations, shifts, [], []);
		expect(m.besetzt).toBe(0);
		expect(m.status).toBe('empty');
	});

	it('keine Stationen/Schichten → isEmpty (Leerzustand)', () => {
		const m = deriveShiftsMetric([], [], [], []);
		expect(m.gesamt).toBe(0);
		expect(m.besetzt).toBe(0);
		expect(m.fehlen).toBe(0);
		expect(m.isEmpty).toBe(true);
	});
});
