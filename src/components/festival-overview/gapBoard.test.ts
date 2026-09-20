import { describe, it, expect } from 'vitest';
import type { Station, StationShift, ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { deriveGapBoard, formatDeadline } from './gapBoard';

// --- Minimal factories: nur die Felder, die die Lücken-Ableitung liest. ---

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
		start_date: '2026-07-25',
		start_time: '15:00:00',
		end_time: '19:00:00',
		required_people: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'm1',
		position: 1,
		created_at: '',
		updated_at: '',
		...over
	};
}

function stationHelper(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'sm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'm1',
		created_at: '',
		...over
	};
}

function material(over: Partial<FestivalMaterialWithStation> = {}): FestivalMaterialWithStation {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Becher',
		category: null,
		supplier: null,
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: 1.5,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

function day(
	over: Partial<ScheduleDayWithPhases> & {
		entries?: ScheduleDayWithPhases['phases'][number]['entries'];
	}
): ScheduleDayWithPhases {
	const { entries = [], ...rest } = over;
	return {
		id: 'd1',
		festival_id: 'f1',
		date: '2026-07-25',
		label: null,
		is_auto_generated: false,
		sort_order: 0,
		created_at: '',
		updated_at: '',
		phases: [
			{
				id: 'p1',
				schedule_day_id: 'd1',
				festival_id: 'f1',
				name: 'Phase',
				sort_order: 0,
				created_at: '',
				updated_at: '',
				entries
			}
		],
		...rest
	};
}

function task(over: Partial<ScheduleDayWithPhases['phases'][number]['entries'][number]> = {}) {
	return {
		id: 't1',
		schedule_phase_id: 'p1',
		festival_id: 'f1',
		title: 'Aufgabe',
		type: 'task' as const,
		start_time: null,
		end_time: null,
		responsible_helper_id: null,
		status: 'open' as const,
		description: null,
		sort_order: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

const EMPTY = {
	stations: [] as Station[],
	shifts: [] as StationShift[],
	assignments: [] as ShiftAssignmentWithHelper[],
	stationHelpers: [] as StationHelperWithDetails[],
	scheduleDays: [] as ScheduleDayWithPhases[],
	materials: [] as FestivalMaterialWithStation[]
};

describe('deriveGapBoard — Stationen mit Schichten', () => {
	it('meldet je unterbesetzter Schicht eine konkrete Lücke', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [station({ id: 's1', name: 'Kassa' })],
			shifts: [
				shift({ id: 'sh1', station_id: 's1', start_time: '15:00:00', end_time: '19:00:00', required_people: 2 }),
				shift({ id: 'sh2', station_id: 's1', start_time: '19:00:00', end_time: '23:00:00', required_people: 1 })
			],
			assignments: [assignment({ id: 'a1', station_shift_id: 'sh1' })]
		});

		expect(board.stationGaps).toHaveLength(1);
		const gap = board.stationGaps[0];
		expect(gap.stationName).toBe('Kassa');
		// sh1: 2 benötigt, 1 zugewiesen → 1 fehlt; sh2: 1 benötigt, 0 → 1 fehlt
		expect(gap.missing).toBe(2);
		expect(gap.shiftGaps.map((s) => s.missing)).toEqual([1, 1]);
	});

	it('listet nur unterbesetzte Schichten, voll besetzte fallen raus', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [station({ id: 's1', name: 'Bar' })],
			shifts: [
				shift({ id: 'sh1', station_id: 's1', required_people: 1 }),
				shift({ id: 'sh2', station_id: 's1', required_people: 1 })
			],
			assignments: [assignment({ id: 'a1', station_shift_id: 'sh2' })]
		});

		const gap = board.stationGaps[0];
		expect(gap.shiftGaps).toHaveLength(1);
		expect(gap.shiftGaps[0].shiftId).toBe('sh1');
	});

	it('lässt voll besetzte Stationen ganz weg', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [station({ id: 's1', name: 'Bar' })],
			shifts: [shift({ id: 'sh1', station_id: 's1', required_people: 1 })],
			assignments: [assignment({ id: 'a1', station_shift_id: 'sh1' })]
		});
		expect(board.stationGaps).toEqual([]);
	});
});

describe('deriveGapBoard — Stationen ohne Schichten (Direktbesetzung)', () => {
	it('rechnet Stations-Helfer gegen required_people', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [station({ id: 's1', name: 'Einlass', required_people: 3 })],
			stationHelpers: [stationHelper({ id: 'sm1', station_id: 's1' })]
		});
		expect(board.stationGaps).toHaveLength(1);
		expect(board.stationGaps[0].missing).toBe(2);
		expect(board.stationGaps[0].shiftGaps).toEqual([]);
	});

	it('voll direktbesetzte Station fällt raus', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [station({ id: 's1', required_people: 1 })],
			stationHelpers: [stationHelper({ id: 'sm1', station_id: 's1' })]
		});
		expect(board.stationGaps).toEqual([]);
	});
});

describe('deriveGapBoard — Sortierung nach Dringlichkeit', () => {
	it('sortiert nach fehlenden Personen absteigend, dann Name', () => {
		const board = deriveGapBoard({
			...EMPTY,
			stations: [
				station({ id: 's1', name: 'Bar', required_people: 1 }),
				station({ id: 's2', name: 'Kassa', required_people: 5 }),
				station({ id: 's3', name: 'Grill', required_people: 3 })
			]
		});
		expect(board.stationGaps.map((g) => g.stationName)).toEqual(['Kassa', 'Grill', 'Bar']);
	});
});

describe('deriveGapBoard — offene Aufgaben', () => {
	it('zählt offene Aufgaben und findet die früheste Frist (Tag + Startzeit)', () => {
		const board = deriveGapBoard({
			...EMPTY,
			scheduleDays: [
				day({
					id: 'd1',
					date: '2026-07-25',
					entries: [
						task({ id: 't1', status: 'open', start_time: '18:00:00' }),
						task({ id: 't2', status: 'open', start_time: '09:00:00' })
					]
				}),
				day({
					id: 'd2',
					date: '2026-07-26',
					entries: [task({ id: 't3', status: 'open', start_time: '08:00:00' })]
				})
			]
		});
		expect(board.openTasks?.count).toBe(3);
		// Frühester: Tag 25., 09:00 (nicht der frühere Uhrzeit-Wert am Folgetag).
		expect(board.openTasks?.deadline).toEqual({ date: '2026-07-25', time: '09:00:00' });
	});

	it('ignoriert erledigte Aufgaben und Programmpunkte', () => {
		const board = deriveGapBoard({
			...EMPTY,
			scheduleDays: [
				day({
					id: 'd1',
					entries: [
						task({ id: 't1', status: 'done' }),
						task({ id: 't2', type: 'program', status: null }),
						task({ id: 't3', status: 'open', start_time: '10:00:00' })
					]
				})
			]
		});
		expect(board.openTasks?.count).toBe(1);
	});

	it('Aufgaben ohne Startzeit landen hinter denen mit Zeit am selben Tag', () => {
		const board = deriveGapBoard({
			...EMPTY,
			scheduleDays: [
				day({
					id: 'd1',
					date: '2026-07-25',
					entries: [
						task({ id: 't1', status: 'open', start_time: null }),
						task({ id: 't2', status: 'open', start_time: '14:00:00' })
					]
				})
			]
		});
		expect(board.openTasks?.deadline.time).toBe('14:00:00');
	});

	it('keine offene Aufgabe → null', () => {
		const board = deriveGapBoard({ ...EMPTY, scheduleDays: [day({ entries: [] })] });
		expect(board.openTasks).toBeNull();
	});
});

describe('deriveGapBoard — Material ohne Preis', () => {
	it('zählt Positionen mit unit_price == null', () => {
		const board = deriveGapBoard({
			...EMPTY,
			materials: [
				material({ id: 'm1', unit_price: null }),
				material({ id: 'm2', unit_price: 0 }),
				material({ id: 'm3', unit_price: 2.5 })
			]
		});
		expect(board.materialsWithoutPrice).toBe(1);
	});
});

describe('deriveGapBoard — Leerzustand', () => {
	it('isEmpty, wenn nichts fehlt', () => {
		const board = deriveGapBoard(EMPTY);
		expect(board.isEmpty).toBe(true);
	});

	it('nicht leer, sobald irgendeine Lücke existiert', () => {
		const board = deriveGapBoard({ ...EMPTY, materials: [material({ unit_price: null })] });
		expect(board.isEmpty).toBe(false);
	});
});

describe('formatDeadline', () => {
	it('mit Zeit: „Sa 25.7., 09:00"', () => {
		expect(formatDeadline('2026-07-25', '09:00:00')).toBe('Sa 25.7., 09:00');
	});
	it('ohne Zeit: nur Tag', () => {
		expect(formatDeadline('2026-07-25', null)).toBe('Sa 25.7.');
	});
});
