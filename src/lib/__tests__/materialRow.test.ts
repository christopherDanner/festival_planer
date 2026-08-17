import { describe, it, expect } from 'vitest';
import { deltaCell, taxCell } from '../materialRow';

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

	it('stellt krumme Mengen mit Komma, statt Fließkomma-Reste zu zeigen', () => {
		// 0,3 − 0,1 ergibt binär 0.19999999999999998
		expect(deltaCell({ ...lose, ordered_quantity: 0.1, actual_quantity: 0.3 }).text).toBe('+0,2');
	});
});

describe('taxCell — die MwSt-Spalte (#114)', () => {
	it('schreibt den Steuersatz mit Prozentzeichen', () => {
		expect(taxCell({ tax_rate: 10 })).toEqual({ text: '10 %', muted: false });
		expect(taxCell({ tax_rate: 20 })).toEqual({ text: '20 %', muted: false });
	});

	it('nennt eine Position ohne Steuersatz gedämpft „keine" — dort sind Netto und Brutto gleich', () => {
		expect(taxCell({ tax_rate: null })).toEqual({ text: 'keine', muted: true });
	});
});
