import { describe, it, expect } from 'vitest';
import {
	toBaseQuantity,
	fromBaseQuantity,
	formatPackaging,
	ceilToPackaging,
	formatRequiredPackaging
} from '../materialQuantity';

describe('toBaseQuantity', () => {
	it('returns null when stored is null', () => {
		expect(toBaseQuantity(null, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBeNull();
	});

	it('multiplies stored by amount_per_packaging when packaging is set', () => {
		expect(toBaseQuantity(5, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBe(250);
	});

	it('returns stored unchanged when material has no packaging_unit', () => {
		expect(toBaseQuantity(7, { packaging_unit: null, amount_per_packaging: null })).toBe(7);
	});

	it('returns stored unchanged when packaging is set but amount_per_packaging is missing', () => {
		expect(toBaseQuantity(5, { packaging_unit: 'Karton', amount_per_packaging: null })).toBe(5);
	});
});

describe('fromBaseQuantity', () => {
	it('divides input by amount_per_packaging when packaging is set', () => {
		expect(fromBaseQuantity(250, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBe(5);
	});

	it('returns input unchanged when material has no packaging_unit', () => {
		expect(fromBaseQuantity(250, { packaging_unit: null, amount_per_packaging: null })).toBe(250);
	});

	it('returns input unchanged when packaging is set but amount_per_packaging is missing', () => {
		expect(fromBaseQuantity(7, { packaging_unit: 'Karton', amount_per_packaging: null })).toBe(7);
	});

	it('keeps fractional packaging counts when input does not divide cleanly', () => {
		expect(fromBaseQuantity(99, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBeCloseTo(1.98);
	});
});

describe('ceilToPackaging', () => {
	it('rounds up to whole packaging count when fractional', () => {
		expect(ceilToPackaging(1.02, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBe(2);
	});

	it('keeps integer packaging counts unchanged', () => {
		expect(ceilToPackaging(5, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBe(5);
	});

	it('returns null when stored is null', () => {
		expect(ceilToPackaging(null, { packaging_unit: 'Fass', amount_per_packaging: 50 })).toBeNull();
	});

	it('returns value unchanged when material has no packaging', () => {
		expect(ceilToPackaging(7.5, { packaging_unit: null, amount_per_packaging: null })).toBe(7.5);
	});
});

describe('formatRequiredPackaging', () => {
	it('returns text when packaging count is fractional', () => {
		expect(
			formatRequiredPackaging(1.02, { packaging_unit: 'Fass', amount_per_packaging: 50 })
		).toBe('2 Fass');
	});

	it('returns text even when packaging count is integer', () => {
		expect(
			formatRequiredPackaging(10, { packaging_unit: 'Karton', amount_per_packaging: 20 })
		).toBe('10 Karton');
	});

	it('returns null when material has no packaging', () => {
		expect(
			formatRequiredPackaging(7.5, { packaging_unit: null, amount_per_packaging: null })
		).toBeNull();
	});

	it('returns null when stored is null', () => {
		expect(
			formatRequiredPackaging(null, { packaging_unit: 'Fass', amount_per_packaging: 50 })
		).toBeNull();
	});
});

describe('formatPackaging', () => {
	it('returns "X unit pro packaging" when both packaging and amount_per_packaging are set', () => {
		expect(
			formatPackaging({ unit: 'Liter', packaging_unit: 'Fass', amount_per_packaging: 50 })
		).toBe('50 Liter pro Fass');
	});

	it('returns just packaging_unit when amount_per_packaging is missing', () => {
		expect(
			formatPackaging({ unit: 'Stück', packaging_unit: 'Karton', amount_per_packaging: null })
		).toBe('Karton');
	});

	it('returns just unit when no packaging is set', () => {
		expect(
			formatPackaging({ unit: 'Stück', packaging_unit: null, amount_per_packaging: null })
		).toBe('Stück');
	});
});
