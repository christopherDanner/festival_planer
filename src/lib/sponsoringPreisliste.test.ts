import { describe, it, expect } from 'vitest';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import {
	buildCategoryZettel,
	canApplyCategoryZettel,
	categoryImpact,
	categoryZettelWrite
} from '@/lib/sponsoringPreisliste';

const plakat = makeCategory('Werbeplakat', 200);
const transparent = makeCategory('Transparent', 300);

describe('categoryImpact — die zwei Zahlen, die der Zettel beziffern muss', () => {
	it('zählt alle Zuweisungen der Kategorie — die reißt Löschen mit', () => {
		const sponsorings = [
			makeSponsoring({ assignments: [makeAssignment({ category: plakat })] }),
			makeSponsoring({ assignments: [makeAssignment({ category: plakat, value: 350 })] }),
			makeSponsoring({ assignments: [makeAssignment({ category: transparent })] })
		];

		expect(categoryImpact(sponsorings, plakat.id).assigned).toBe(2);
	});

	it('zählt davon nur die ohne eigenen Wert — die verschiebt ein neuer Standardwert', () => {
		const sponsorings = [
			makeSponsoring({ assignments: [makeAssignment({ category: plakat })] }),
			makeSponsoring({ assignments: [makeAssignment({ category: plakat })] }),
			makeSponsoring({ assignments: [makeAssignment({ category: plakat, value: 350 })] })
		];

		expect(categoryImpact(sponsorings, plakat.id)).toEqual({ assigned: 3, inheriting: 2 });
	});

	it('bleibt bei einer Kategorie, die niemand hat, bei null', () => {
		const sponsorings = [makeSponsoring({ assignments: [makeAssignment({ category: plakat })] })];

		expect(categoryImpact(sponsorings, transparent.id)).toEqual({ assigned: 0, inheriting: 0 });
	});
});

const impact = (assigned: number, inheriting: number) => ({ assigned, inheriting });

describe('buildCategoryZettel — was am Spaltenkopf steht', () => {
	it('legt Name und Standardwert der Kategorie zum Ändern vor', () => {
		const zettel = buildCategoryZettel(plakat, impact(0, 0));

		expect(zettel.title).toBe('Werbeplakat');
		expect(zettel.nameInput).toBe('Werbeplakat');
		expect(zettel.valueInput).toBe('200');
	});

	it('beziffert vor dem Ändern, wie viele Firmen den Standardwert erben', () => {
		// Ohne die Zahl verschiebt ein Tastendruck die Fest-Gesamtsumme um
		// Hunderte Euro, ohne dass eine Firma gefragt wurde (ADR 0009).
		expect(buildCategoryZettel(plakat, impact(6, 4)).hint).toBe(
			'Gilt für 4 Firmen ohne eigenen Wert.'
		);
		expect(buildCategoryZettel(plakat, impact(3, 1)).hint).toBe(
			'Gilt für 1 Firma ohne eigenen Wert.'
		);
	});

	it('sagt es auch, wenn ein neuer Standardwert niemanden verschiebt', () => {
		expect(buildCategoryZettel(plakat, impact(2, 0)).hint).toBe(
			'Keine Firma erbt diesen Wert.'
		);
	});

	it('beziffert im Löschen-Text die Zuweisungen, die die Cascade mitreißt', () => {
		expect(buildCategoryZettel(plakat, impact(6, 4)).deleteMessage).toContain('„Werbeplakat"');
		expect(buildCategoryZettel(plakat, impact(6, 4)).deleteMessage).toContain('6 Firmen');
		expect(buildCategoryZettel(plakat, impact(6, 4)).deleteMessage).toContain('6 Zuweisungen');
		expect(buildCategoryZettel(plakat, impact(1, 1)).deleteMessage).toContain('1 Firma ');
		expect(buildCategoryZettel(plakat, impact(1, 1)).deleteMessage).toContain('diese Zuweisung.');
	});

	it('warnt auch bei einer Kategorie, die niemand hat — die Spalte fällt trotzdem weg', () => {
		expect(buildCategoryZettel(plakat, impact(0, 0)).deleteMessage).toContain(
			'keiner Firma zugewiesen'
		);
	});

	it('lässt eine Kategorie ohne Standardwert leer, statt eine Null zu behaupten', () => {
		const ohneWert = makeCategory('Logo Speisekarte', null);

		expect(buildCategoryZettel(ohneWert, impact(0, 0)).valueInput).toBe('');
	});

	it('kommt beim Anlegen ohne Vorbelegung und ohne Löschen aus', () => {
		const zettel = buildCategoryZettel(null, impact(0, 0));

		expect(zettel.nameInput).toBe('');
		expect(zettel.valueInput).toBe('');
		expect(zettel.deleteMessage).toBeNull();
		expect(zettel.hint).toContain('Ohne Standardwert');
	});
});

describe('Übernehmen am Kategorie-Zettel', () => {
	it('sperrt, solange kein Name dasteht — eine namenlose Spalte sagt nichts', () => {
		expect(canApplyCategoryZettel({ name: '', value: '200' })).toBe(false);
		expect(canApplyCategoryZettel({ name: '   ', value: '200' })).toBe(false);
		expect(canApplyCategoryZettel({ name: 'Transparent', value: '' })).toBe(true);
	});

	it('schreibt den Namen ohne Füllzeichen und den Wert als Zahl', () => {
		expect(categoryZettelWrite({ name: '  Transparent  ', value: '300,50' })).toEqual({
			name: 'Transparent',
			value: 300.5
		});
	});

	it('nimmt ein leeres Wertfeld als „kein Standardwert" statt als Null-Euro-Leistung', () => {
		expect(categoryZettelWrite({ name: 'Logo Speisekarte', value: '' }).value).toBeNull();
	});
});
