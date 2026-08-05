import { describe, it, expect } from 'vitest';
import {
	consumedValue,
	grossPrice,
	netPrice,
	orderedValue,
	rowTotal,
	sumTotals,
	withoutPrice
} from './materialCosts';
import type { FestivalMaterial } from './materialService';

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

describe('grossPrice', () => {
	it('rechnet den Nettopreis mit dem Steuersatz auf brutto hoch', () => {
		expect(grossPrice(material({ unit_price: 10, tax_rate: 20, price_is_net: true }))).toBe(12);
	});
});

describe('netPrice', () => {
	it('rechnet den Bruttopreis mit dem Steuersatz auf netto herunter', () => {
		expect(netPrice(material({ unit_price: 12, tax_rate: 20, price_is_net: false }))).toBe(10);
	});
});

describe('Rundung der abgeleiteten Preise', () => {
	it('rundet Netto- und Bruttopreis auf Cent', () => {
		expect(grossPrice(material({ unit_price: 1.665, tax_rate: 20, price_is_net: true }))).toBe(2);
		expect(netPrice(material({ unit_price: 10, tax_rate: 13, price_is_net: false }))).toBe(8.85);
	});
});

describe('Position ohne Steuersatz', () => {
	it('hat denselben Netto- und Bruttopreis (beide der erfasste Preis)', () => {
		const ohneMwSt = material({ unit_price: 7.5, tax_rate: null, price_is_net: true });
		expect(netPrice(ohneMwSt)).toBe(7.5);
		expect(grossPrice(ohneMwSt)).toBe(7.5);
	});
});

describe('rowTotal — Kosten einer Position', () => {
	it('rechnet Bruttopreis × Verbraucht-Menge, sobald sie erfasst ist', () => {
		const m = material({
			unit_price: 2,
			tax_rate: 20,
			price_is_net: true,
			ordered_quantity: 10,
			actual_quantity: 8
		});
		expect(rowTotal(m)).toBe(19.2); // 2 netto → 2,40 brutto × 8
	});

	it('rechnet mit der Bestellt-Menge, solange nichts nachgetragen ist', () => {
		const m = material({
			unit_price: 2.4,
			tax_rate: null,
			ordered_quantity: 10,
			actual_quantity: null
		});
		expect(rowTotal(m)).toBe(24);
	});
});

/** Drei Positionen, wie sie in einer Liste nebeneinander stehen: eine mit
Verbrauch und MwSt, eine nur bestellt, eine ohne Preis. */
const liste = [
	material({
		id: 'a',
		unit_price: 2,
		tax_rate: 20,
		price_is_net: true,
		ordered_quantity: 10,
		actual_quantity: 8
	}),
	material({ id: 'b', unit_price: 3, tax_rate: null, ordered_quantity: 5, actual_quantity: null }),
	material({ id: 'c', unit_price: null, ordered_quantity: 4, actual_quantity: 4 })
];

describe('orderedValue — Bestellwert', () => {
	it('summiert Bestellt-Menge × Bruttopreis über die bepreisten Positionen', () => {
		// a: 2,40 brutto × 10 = 24 | b: 3 × 5 = 15 | c: ohne Preis
		expect(orderedValue(liste)).toBe(39);
	});
});

describe('consumedValue — Verbrauchswert', () => {
	it('summiert nur Positionen mit erfasster Verbraucht-Menge', () => {
		// a: 2,40 brutto × 8 = 19,20 | b: nichts nachgetragen | c: ohne Preis
		expect(consumedValue(liste)).toBe(19.2);
	});
});

describe('sumTotals — Summe der Zeilenkosten', () => {
	it('summiert die Kosten der Zeilen, Positionen ohne Preis zählen nicht mit', () => {
		// a: 19,20 (verbraucht) | b: 15 (bestellt) | c: ohne Preis
		expect(sumTotals(liste)).toBe(34.2);
	});

	it('läuft nicht gegen die Zeilen auseinander (drei Positionen à 0,105 €)', () => {
		const cents = [
			material({ id: 'a', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'b', unit_price: 0.105, ordered_quantity: 1 }),
			material({ id: 'c', unit_price: 0.105, ordered_quantity: 1 })
		];
		const zeilen = cents.map((m) => rowTotal(m) ?? 0);
		expect(zeilen).toEqual([0.11, 0.11, 0.11]);
		expect(sumTotals(cents)).toBe(0.33);
	});
});

describe('Position ohne Preis', () => {
	it('hat keine Zeilenkosten und zählt als Preislücke', () => {
		expect(rowTotal(material({ unit_price: null, ordered_quantity: 4 }))).toBeNull();
		expect(withoutPrice(liste)).toBe(1);
	});

	it('verfälscht keine der drei Summen', () => {
		const bepreist = liste.filter((m) => m.unit_price != null);
		expect(orderedValue(liste)).toBe(orderedValue(bepreist));
		expect(consumedValue(liste)).toBe(consumedValue(bepreist));
		expect(sumTotals(liste)).toBe(sumTotals(bepreist));
	});
});

describe('Rundung skaliert nicht mit der Menge', () => {
	it('rechnet Summen aus dem exakten Bruttopreis, nicht aus dem angezeigten Cent-Preis', () => {
		// 0,99 netto + 20 % = 1,188 → die Zelle zeigt 1,19, die Rechnung des
		// Lieferanten lautet aber 99,00 netto + 20 % = 118,80.
		const m = material({
			unit_price: 0.99,
			tax_rate: 20,
			price_is_net: true,
			ordered_quantity: 100
		});
		expect(grossPrice(m)).toBe(1.19); // Anzeige: auf Cent
		expect(rowTotal(m)).toBe(118.8);
		expect(orderedValue([m])).toBe(118.8);
	});
});
