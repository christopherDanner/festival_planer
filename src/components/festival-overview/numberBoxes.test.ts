import { describe, it, expect } from 'vitest';
import type { FestivalMaterial } from '@/lib/materialService';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import {
	deriveMaterialOrdered,
	deriveMaterialConsumed,
	deriveSponsoringMetric,
	formatDeltaEuro
} from './numberBoxes';
import { formatEuro } from '@/lib/money';

// --- Fabriken (nur die Felder, die die Ableitungen lesen) --------------------
// Die Fabriken der Besetzungs-Zählung sind mit `deriveShiftsMetric` nach
// `src/lib/__tests__/staffing.test.ts` gewandert (#102).

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
		in_kind_description: null,
		in_kind_value: null,
		copied_from_festival_id: null,
		created_at: '',
		updated_at: '',
		sponsor: { id: 'sponsor1', company_name: 'Raiffeisen' },
		assignments: [],
		...(over as SponsoringWithDetails)
	} as SponsoringWithDetails;
}

// --- Material bestellt -------------------------------------------------------

describe('deriveMaterialOrdered', () => {
	it('summiert Bestellt-Menge × Bruttopreis, zählt Positionen und ohne-Preis', () => {
		const materials = [
			// netto erfasst: 2 → 2,40 brutto × 10 = 24 (mit der alten Formel wären es 20)
			material({ id: 'a', ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true }),
			material({ id: 'b', ordered_quantity: 5, unit_price: 3 }), // 15
			material({ id: 'c', ordered_quantity: 4, unit_price: null }) // ohne Preis
		];
		const m = deriveMaterialOrdered(materials);
		expect(m.total).toBe(39);
		expect(m.positions).toBe(3);
		expect(m.withoutPrice).toBe(1);
		expect(m.withPrice).toBe(2);
		expect(m.isEmpty).toBe(false);
	});

	it('rechnet brutto — Nettopreis plus Steuersatz (ADR 0006)', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true })
		];
		expect(deriveMaterialOrdered(materials).total).toBe(24); // 2 netto → 2,40 brutto
	});

	it('lässt einen brutto erfassten Preis stehen — kein zweites Mal Steuer', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 10, unit_price: 2.4, tax_rate: 20, price_is_net: false })
		];
		expect(deriveMaterialOrdered(materials).total).toBe(24); // 2,40 ist schon brutto
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
			// netto erfasst: 2 → 2,40 brutto; ord 24, ist 19,20 (alte Formel: 20 / 16)
			material({
				id: 'a',
				ordered_quantity: 10,
				actual_quantity: 8,
				unit_price: 2,
				tax_rate: 20,
				price_is_net: true
			}),
			material({ id: 'b', ordered_quantity: 5, actual_quantity: null, unit_price: 3 }), // ord 15, ist 0 (nicht erfasst)
			material({ id: 'c', ordered_quantity: 4, actual_quantity: 4, unit_price: null }) // kein Preis → 0/0
		];
		const m = deriveMaterialConsumed(materials);
		expect(m.ordered).toBe(39);
		expect(m.consumed).toBe(19.2);
		expect(m.delta).toBe(-19.8); // unter Plan
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

	it('rechnet brutto — Nettopreis plus Steuersatz (ADR 0006)', () => {
		const materials = [
			material({
				id: 'a',
				ordered_quantity: 10,
				actual_quantity: 5,
				unit_price: 2,
				tax_rate: 20,
				price_is_net: true
			})
		];
		const m = deriveMaterialConsumed(materials); // 2,40 brutto → ord 24, ist 12
		expect(m.ordered).toBe(24);
		expect(m.consumed).toBe(12);
	});

	it('hält Δ auf Cent — keine Fließkomma-Reste', () => {
		const materials = [
			material({ id: 'a', ordered_quantity: 3, actual_quantity: 1, unit_price: 0.01 })
		];
		const m = deriveMaterialConsumed(materials); // ord 0,03, ist 0,01
		expect(m.delta).toBe(-0.02);
	});

	it('keine Positionen → isEmpty', () => {
		const m = deriveMaterialConsumed([]);
		expect(m.isEmpty).toBe(true);
		expect(m.recorded).toBe(0);
	});
});

// --- Dasselbe Fest, dieselbe Zahl wie der Material-Bereich -------------------

/** Fertig-Kriterium aus Issue #112: für dasselbe Fest nennen Dashboard und
Material-Bereich denselben Betrag. Die Gegenprobe steht in
`MaterialTable.test.tsx` („dieselbe Zahl wie das Dashboard") — dieselben vier
Positionen, dieselben 51 € als Literal, dort durch die gerenderte Tabelle
gelesen. Beide Seiten sind einzeln festgeschrieben, keine gegen die andere
gerechnet: bekäme eine wieder eine eigene Formel, fällt genau ihr Test.
Nichts ist nachgetragen, deshalb fällt die Zeilenkosten-Summe des Bereichs
hier mit dem Bestellwert zusammen — im gemischten Fall tut sie das laut
ADR 0006 bewusst nicht. */
const festPositionen = [
	// netto erfasst, 20 % → 2,40 × 10 = 24
	material({ id: 'a', ordered_quantity: 10, unit_price: 2, tax_rate: 20, price_is_net: true }),
	// brutto erfasst, 10 % → bleibt 3,30 × 5 = 16,50
	material({ id: 'b', ordered_quantity: 5, unit_price: 3.3, tax_rate: 10, price_is_net: false }),
	// ohne Steuersatz → 1,50 × 7 = 10,50
	material({ id: 'c', ordered_quantity: 7, unit_price: 1.5, tax_rate: null }),
	// ohne Preis → zählt nicht mit
	material({ id: 'd', ordered_quantity: 4, unit_price: null })
];

describe('Dashboard gegen Material-Bereich', () => {
	it('nennt den Bestellwert, den der Material-Bereich für dasselbe Fest zeigt', () => {
		expect(deriveMaterialOrdered(festPositionen).total).toBe(51);
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
