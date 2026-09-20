import { describe, it, expect } from 'vitest';
import { formatAmount, formatEuro } from '../money';

describe('formatEuro', () => {
	it('rundet auf ganze Euro und gruppiert die Tausender', () => {
		expect(formatEuro(4399.6)).toBe('€ 4.400');
	});
});

describe('formatAmount', () => {
	it('stellt einen Betrag auf Cent mit Dezimalkomma', () => {
		expect(formatAmount(9.4)).toBe('9,40');
	});

	it('gruppiert die Tausender mit Punkt — dieselbe Schreibweise wie formatEuro', () => {
		expect(formatAmount(1234.5)).toBe('1.234,50');
	});

	it('trägt das Minus einer negativen Zahl', () => {
		expect(formatAmount(-12.3)).toBe('-12,30');
	});

	it('rundet auf Cent, statt die dritte Stelle zu zeigen', () => {
		expect(formatAmount(0.105)).toBe('0,11');
	});
});
