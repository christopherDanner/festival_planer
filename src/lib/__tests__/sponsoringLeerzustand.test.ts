import { describe, it, expect } from 'vitest';
import {
	sponsoringHinweis,
	sponsoringLeerzustand,
	sponsoringStandLabel
} from '../sponsoringLeerzustand';

describe('sponsoringLeerzustand — zwei Achsen, drei leere Formen', () => {
	it('nennt das neue Fest ohne Kopierwerk „nichts" (L1)', () => {
		expect(sponsoringLeerzustand(0, 0)).toBe('nichts');
	});

	it('nennt die übernommene Preisliste ohne Firmen „ohneFirmen" (L2)', () => {
		expect(sponsoringLeerzustand(6, 0)).toBe('ohneFirmen');
	});

	it('nennt die übernommenen Firmen ohne Preisliste „ohnePreisliste" (L3)', () => {
		expect(sponsoringLeerzustand(0, 14)).toBe('ohnePreisliste');
	});

	it('schweigt, sobald beide Achsen stehen', () => {
		expect(sponsoringLeerzustand(6, 14)).toBeNull();
	});
});

describe('sponsoringStandLabel — erst was steht, dann was fehlt', () => {
	it('sagt am ganz leeren Fest, dass noch nichts erfasst ist', () => {
		expect(sponsoringStandLabel(0, 0)).toBe('Noch nichts erfasst');
	});

	it('zählt bei übernommener Preisliste die Kategorien und nennt die fehlende Firma', () => {
		expect(sponsoringStandLabel(6, 0)).toBe('6 Kategorien · noch keine Firma');
	});

	it('zählt bei übernommenen Firmen die Sponsoren und nennt die fehlende Preisliste', () => {
		expect(sponsoringStandLabel(0, 14)).toBe('14 Sponsoren · keine Kategorien');
	});

	it('nennt im vollen Zustand nur die Sponsoren — es fehlt nichts', () => {
		expect(sponsoringStandLabel(6, 14)).toBe('14 Sponsoren');
	});

	it('zählt im Singular', () => {
		expect(sponsoringStandLabel(1, 0)).toBe('1 Kategorie · noch keine Firma');
		expect(sponsoringStandLabel(0, 1)).toBe('1 Sponsor · keine Kategorien');
		expect(sponsoringStandLabel(1, 1)).toBe('1 Sponsor');
	});
});

describe('sponsoringHinweis — der Streifen an der Tabelle', () => {
	it('hängt bei übernommener Preisliste als nächster Schritt unter die Tabelle', () => {
		expect(sponsoringHinweis('ohneFirmen')).toEqual({
			lead: 'Preisliste steht.',
			text: 'Jetzt die Firmen dazu — einzeln oder aus einem früheren Fest.',
			actionLabel: 'SPONSOREN ÜBERNEHMEN',
			aboveTable: false
		});
	});

	it('stellt die Ursache über die Zeilen, die sie betrifft', () => {
		expect(sponsoringHinweis('ohnePreisliste')).toEqual({
			lead: 'Es fehlt die Preisliste.',
			text: 'Ohne Kategorien lässt sich keiner dieser Firmen etwas zuweisen.',
			actionLabel: 'KATEGORIEN ÜBERNEHMEN',
			aboveTable: true
		});
	});

	it('schweigt, wo es keinen Streifen gibt — L1 trägt die Anleitung, der volle Zustand nichts', () => {
		expect(sponsoringHinweis('nichts')).toBeNull();
		expect(sponsoringHinweis(null)).toBeNull();
	});
});
