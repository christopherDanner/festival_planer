import { describe, it, expect } from 'vitest';
import type { Station, StationShift, ShiftAssignment, StationMember } from '@/lib/shiftService';
import type { FestivalMaterial } from '@/lib/materialService';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import {
	deriveShiftsMetric,
	deriveMaterialOrdered,
	deriveMaterialConsumed,
	deriveSponsoringMetric,
	formatEuro,
	formatDeltaEuro
} from './numbersColumn';

// --- Fabriken (nur die Felder, die die Ableitungen lesen) --------------------

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

function stationMember(over: Partial<StationMember> = {}): StationMember {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		member_id: 'p1',
		created_at: '',
		...over
	};
}

function material(over: Partial<FestivalMaterial> = {}): FestivalMaterial {
	return {
		id: 'mat1',
		festival_id: 'f1',
		station_id: null,
		name: 'Bier',
		category: null,
		supplier: null,
		unit: 'Stk',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: false,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		...over
	};
}

function sponsoring(over: Partial<SponsoringWithDetails> = {}): SponsoringWithDetails {
	return {
		id: 'sp1',
		festival_id: 'f1',
		sponsor_id: 'sponsor1',
		free_amount: null,
		notes: null,
		created_at: '',
		updated_at: '',
		sponsor: { id: 'sponsor1', company_name: 'Raiffeisen' },
		assignments: [],
		...(over as SponsoringWithDetails)
	} as SponsoringWithDetails;
}

// --- Schichten besetzt -------------------------------------------------------

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

	it('nutzt Stations-Ebene (required_people + StationMembers), wenn keine Schichten', () => {
		const stations = [station({ id: 's1', required_people: 3 })];
		const stationMembers = [
			stationMember({ id: 'm1', station_id: 's1', member_id: 'p1' }),
			stationMember({ id: 'm2', station_id: 's1', member_id: 'p2' })
		];
		const m = deriveShiftsMetric(stations, [], [], stationMembers);
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

// --- Material bestellt -------------------------------------------------------

describe('deriveMaterialOrdered', () => {
	it('summiert € (ordered × unit_price), zählt Positionen und ohne-Preis', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 10, unit_price: 2 }), // 20
			material({ id: 'b', ordered_quantity: 5, unit_price: 3 }), // 15
			material({ id: 'c', ordered_quantity: 4, unit_price: null }) // ohne Preis
		];
		const m = deriveMaterialOrdered(materials);
		expect(m.total).toBe(35);
		expect(m.positions).toBe(3);
		expect(m.withoutPrice).toBe(1);
		expect(m.withPrice).toBe(2);
		expect(m.isEmpty).toBe(false);
	});

	it('keine Positionen → isEmpty, alles 0', () => {
		const m = deriveMaterialOrdered([]);
		expect(m.total).toBe(0);
		expect(m.positions).toBe(0);
		expect(m.withoutPrice).toBe(0);
		expect(m.isEmpty).toBe(true);
	});
});

// --- Verbraucht (Ist) --------------------------------------------------------

describe('deriveMaterialConsumed', () => {
	it('summiert Verbrauch €, bestellt €, Δ und erfasst-Zähler', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 10, actual_quantity: 8, unit_price: 2 }), // ord 20, ist 16
			material({ id: 'b', ordered_quantity: 5, actual_quantity: null, unit_price: 3 }), // ord 15, ist 0 (nicht erfasst)
			material({ id: 'c', ordered_quantity: 4, actual_quantity: 4, unit_price: null }) // kein Preis → 0/0
		];
		const m = deriveMaterialConsumed(materials);
		expect(m.ordered).toBe(35);
		expect(m.consumed).toBe(16);
		expect(m.delta).toBe(16 - 35); // −19, unter Plan
		expect(m.recorded).toBe(2); // a und c haben actual_quantity gesetzt
		expect(m.positions).toBe(3);
	});

	it('Verbrauch über Plan → positives Δ', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 2, actual_quantity: 5, unit_price: 10 }) // ord 20, ist 50
		];
		const m = deriveMaterialConsumed(materials);
		expect(m.delta).toBe(30);
	});

	it('keine Positionen → isEmpty', () => {
		const m = deriveMaterialConsumed([]);
		expect(m.isEmpty).toBe(true);
		expect(m.recorded).toBe(0);
	});
});

// --- Sponsoring --------------------------------------------------------------

describe('deriveSponsoringMetric', () => {
	it('nutzt festivalSponsoringTotal und zählt Sponsoren', () => {
		const sponsorings = [
			sponsoring({ id: 'x', free_amount: 1000 }),
			sponsoring({ id: 'y', free_amount: 500 })
		];
		const m = deriveSponsoringMetric(sponsorings);
		expect(m.total).toBe(1500);
		expect(m.count).toBe(2);
		expect(m.isEmpty).toBe(false);
	});

	it('keine Sponsoren → isEmpty', () => {
		const m = deriveSponsoringMetric([]);
		expect(m.total).toBe(0);
		expect(m.count).toBe(0);
		expect(m.isEmpty).toBe(true);
	});
});

// --- Formatierung ------------------------------------------------------------

describe('formatEuro', () => {
	it('rundet auf ganze Euro mit Tausenderpunkt', () => {
		expect(formatEuro(7431)).toBe('€ 7.431');
		expect(formatEuro(0)).toBe('€ 0');
		expect(formatEuro(6211.7)).toBe('€ 6.212');
	});
});

describe('formatDeltaEuro', () => {
	it('unter Plan → Minus + Ton under', () => {
		const d = formatDeltaEuro(-1219);
		expect(d.text).toBe('Δ − € 1.219');
		expect(d.tone).toBe('under');
	});
	it('über Plan → Plus + Ton over', () => {
		const d = formatDeltaEuro(500);
		expect(d.text).toBe('Δ + € 500');
		expect(d.tone).toBe('over');
	});
	it('exakt → neutral', () => {
		const d = formatDeltaEuro(0);
		expect(d.text).toBe('Δ € 0');
		expect(d.tone).toBe('equal');
	});
});
