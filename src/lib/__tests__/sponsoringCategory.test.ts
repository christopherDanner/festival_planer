import { describe, it, expect } from 'vitest';
import { parseCategoryValue } from '../sponsorService';

describe('parseCategoryValue', () => {
	it('parses a German decimal comma into a number', () => {
		expect(parseCategoryValue('200,50')).toBe(200.5);
	});

	it('parses plain integers and dot decimals', () => {
		expect(parseCategoryValue('200')).toBe(200);
		expect(parseCategoryValue('200.50')).toBe(200.5);
	});

	it('returns null for blank or non-numeric input', () => {
		expect(parseCategoryValue('')).toBeNull();
		expect(parseCategoryValue('   ')).toBeNull();
		expect(parseCategoryValue('abc')).toBeNull();
	});

	it('rejects negative values', () => {
		expect(parseCategoryValue('-5')).toBeNull();
	});
});
