import { describe, expect, it } from 'vitest';

import {
	FESTIVAL_LIST_PATH,
	NEW_FESTIVAL_PATH,
	festivalWorkspacePath,
	newFestivalPath,
	templateIdFromSearch
} from '../festivalRoutes';

const searchOf = (path: string) => new URL(path, 'https://festmeister.test').searchParams;

describe('festivalRoutes', () => {
	it('führt ohne Vorlage auf die nackte Kopierwerk-Route', () => {
		expect(newFestivalPath()).toBe('/festivals/neu');
		expect(NEW_FESTIVAL_PATH).toBe('/festivals/neu');
	});

	it('hängt die Vorlage als Query-Parameter an — der Deep-Link von „ALS VORLAGE"', () => {
		expect(newFestivalPath('fest-2026')).toBe('/festivals/neu?vorlage=fest-2026');
	});

	it('liest die Vorlage aus dem Link, den es selbst schreibt', () => {
		expect(templateIdFromSearch(searchOf(newFestivalPath('fest-2026')))).toBe('fest-2026');
	});

	it('liest ohne Vorlage-Parameter einen leeren Vorlagen-Zeiger', () => {
		expect(templateIdFromSearch(searchOf(newFestivalPath()))).toBe('');
	});

	// Die Wand adressiert Feste über `?id=`; der Wizard navigierte früher über
	// `state: { festivalId }` — vereinheitlicht auf `?id=` (Spec #64).
	it('adressiert den Fest-Arbeitsbereich über ?id=', () => {
		expect(festivalWorkspacePath('fest-neu')).toBe('/festival-results?id=fest-neu');
	});

	it('kennt die Festliste als Zurück-Weg', () => {
		expect(FESTIVAL_LIST_PATH).toBe('/dashboard');
	});
});
