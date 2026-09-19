import { describe, expect, it } from 'vitest';

import { checkboxState, toggleAllIds, toggleId } from './selection';

describe('Ankreuzen in den Kopier-Schritten', () => {
	it('hakt einen Eintrag an und wieder ab', () => {
		expect([...toggleId(new Set(['a']), 'b')].sort()).toEqual(['a', 'b']);
		expect([...toggleId(new Set(['a', 'b']), 'a')]).toEqual(['b']);
	});

	it('räumt „Alle/Keine" nur bei vollständiger Auswahl leer', () => {
		expect([...toggleAllIds(['a', 'b'], new Set(['a', 'b']))]).toEqual([]);
		expect([...toggleAllIds(['a', 'b'], new Set(['a']))].sort()).toEqual(['a', 'b']);
		expect([...toggleAllIds(['a', 'b'], new Set())].sort()).toEqual(['a', 'b']);
	});

	it('kennt am Schalter den Zwischenzustand', () => {
		expect(checkboxState(['a', 'b'], new Set(['a', 'b']))).toBe(true);
		expect(checkboxState(['a', 'b'], new Set(['a']))).toBe('indeterminate');
		expect(checkboxState(['a', 'b'], new Set())).toBe(false);
	});

	// Ohne Einträge ist nichts gewählt — `every` über eine leere Liste wäre sonst
	// wahr und der Schalter stünde auf „alle".
	it('steht über einer leeren Liste aus', () => {
		expect(checkboxState([], new Set())).toBe(false);
	});
});
