import { describe, it, expect } from 'vitest';
import { deltaCell, packagingHint, taxLabel } from '../materialRow';

/** Ohne Gebinde: gespeicherte Menge = Basismenge. */
const lose = { packaging_unit: null, amount_per_packaging: null };
/** 4 Fass à 50 Liter — gespeichert wird in Fass, gezeigt wird in Litern. */
const fass = { packaging_unit: 'Fass', amount_per_packaging: 50 };

describe('deltaCell — Verbraucht − Bestellt (#114)', () => {
	it('nennt Mehrverbrauch mit Vorzeichen und rotem Ton', () => {
		expect(deltaCell({ ...lose, ordered_quantity: 30, actual_quantity: 35 })).toEqual({
			text: '+5',
			tone: 'over'
		});
	});

	it('nennt Minderverbrauch negativ und grün', () => {
		expect(deltaCell({ ...lose, ordered_quantity: 30, actual_quantity: 25 })).toEqual({
			text: '-5',
			tone: 'under'
		});
	});

	it('schreibt Punktlandung als ±0, neutral', () => {
		expect(deltaCell({ ...lose, ordered_quantity: 30, actual_quantity: 30 })).toEqual({
			text: '±0',
			tone: 'zero'
		});
	});

	it('bleibt ohne erfasste Verbraucht-Menge ein Strich', () => {
		expect(deltaCell({ ...lose, ordered_quantity: 30, actual_quantity: null })).toEqual({
			text: '–',
			tone: 'none'
		});
	});

	it('rechnet in Basismengen — 4 Fass bestellt, 3 verbraucht sind 50 Liter weniger', () => {
		expect(deltaCell({ ...fass, ordered_quantity: 4, actual_quantity: 3 })).toEqual({
			text: '-50',
			tone: 'under'
		});
	});

	it('stellt krumme Mengen auf zwei Stellen, statt Fließkomma-Reste zu zeigen', () => {
		// 0,3 − 0,1 ergibt binär 0.19999999999999998
		expect(deltaCell({ ...lose, ordered_quantity: 0.1, actual_quantity: 0.3 }).text).toBe('+0.2');
	});
});

describe('packagingHint — die Gebinde-Umrechnung unter der Menge (#114)', () => {
	it('sagt, wie viele Gebinde die Menge braucht', () => {
		expect(packagingHint(4, fass)).toBe('→ 4 × Fass');
	});

	it('rundet auf ganze Gebinde auf — ein angebrochenes Fass wird trotzdem geliefert', () => {
		expect(packagingHint(1.02, fass)).toBe('→ 2 × Fass');
	});

	it('schweigt bei loser Ware — dort gibt es nichts umzurechnen', () => {
		expect(packagingHint(7.5, lose)).toBeNull();
	});

	it('schweigt bei nicht erfasster Menge', () => {
		expect(packagingHint(null, fass)).toBeNull();
	});
});

describe('taxLabel — die MwSt-Spalte (#114)', () => {
	it('schreibt den Steuersatz mit Prozentzeichen', () => {
		expect(taxLabel({ tax_rate: 10 })).toBe('10 %');
		expect(taxLabel({ tax_rate: 20 })).toBe('20 %');
	});

	it('nennt eine Position ohne Steuersatz „keine" — dort sind Netto und Brutto gleich', () => {
		expect(taxLabel({ tax_rate: null })).toBe('keine');
	});
});
