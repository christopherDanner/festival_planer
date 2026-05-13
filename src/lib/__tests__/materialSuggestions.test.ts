import { describe, it, expect } from 'vitest';
import { mergeSuggestions, canonicalizeValue } from '../materialSuggestions';

describe('mergeSuggestions', () => {
	it('returns defaults when festival has no values', () => {
		expect(mergeSuggestions(['Getränke', 'Lebensmittel'], [])).toEqual([
			'Getränke',
			'Lebensmittel'
		]);
	});

	it('appends festival-only values after defaults', () => {
		expect(mergeSuggestions(['Getränke'], ['Pyrotechnik', 'Sanitär'])).toEqual([
			'Getränke',
			'Pyrotechnik',
			'Sanitär'
		]);
	});

	it('drops festival values that already exist in defaults (case-insensitive), keeping default form', () => {
		expect(mergeSuggestions(['Getränke', 'Lebensmittel'], ['getränke', 'Pyrotechnik'])).toEqual([
			'Getränke',
			'Lebensmittel',
			'Pyrotechnik'
		]);
	});

	it('dedupes within festival values case-insensitively', () => {
		expect(mergeSuggestions([], ['Pyrotechnik', 'pyrotechnik', 'PYROTECHNIK'])).toEqual([
			'Pyrotechnik'
		]);
	});
});

describe('canonicalizeValue', () => {
	it('returns the existing canonical form when input matches case-insensitively', () => {
		expect(canonicalizeValue('getränke', ['Getränke', 'Lebensmittel'])).toBe('Getränke');
	});

	it('trims and returns the input when no case-insensitive match exists', () => {
		expect(canonicalizeValue('  Sanitär  ', ['Getränke'])).toBe('Sanitär');
	});

	it('matches case-insensitively even with surrounding whitespace', () => {
		expect(canonicalizeValue('  GETRÄNKE ', ['Getränke'])).toBe('Getränke');
	});
});
