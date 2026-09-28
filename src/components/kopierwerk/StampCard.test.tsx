import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StampCard, { type StampCardStep } from './StampCard';
import { kopierwerkSteps, stampCardHeading, emptyFestivalDraft } from './kopierwerk';

const heading = stampCardHeading(
	{ ...emptyFestivalDraft('fest-2026'), name: 'Musikfest 2027', startDate: '2027-07-23', endDate: '2027-07-25' },
	'Musikfest Steinbach 2026'
);

const fourSteps = kopierwerkSteps({
	current: 'stations',
	hasTemplate: true,
	scope: { stations: 4, shifts: 11, materials: 86, scheduleDays: 4, scheduleEntries: 17 },
	festivalName: 'Musikfest Steinbach 2027'
});

const render = (steps: StampCardStep[], compact = false) =>
	renderToStaticMarkup(<StampCard steps={steps} heading={heading} compact={compact} />);

describe('Stempelkarte (≥900px)', () => {
	it('trägt den Karten-Kopf mit Festname, Zeitraum und Vorlage', () => {
		const html = render(fourSteps);
		expect(html).toContain('Musikfest 2027');
		expect(html).toContain('Fr 23. – So 25. Juli 2027 · aus Vorlage Musikfest Steinbach 2026');
	});

	it('rendert einen Eintrag je Schritt der Liste, mit Untertitel-Zeile', () => {
		const html = render(fourSteps);
		expect(html).toContain('Name &amp; Datum');
		expect(html).toContain('Stationen &amp; Schichten');
		expect(html).toContain('Material');
		expect(html).toContain('Ablaufplan');
		expect(html).toContain('4 Stationen · 11 Schichten');
		expect(html).toContain('86 Positionen · Mengenquelle');
		expect(html).toContain('4 Tage · 17 Einträge');
	});

	it('markiert erledigt mit dem Häkchen, aktiv gelb und offen grau', () => {
		const html = render(fourSteps);
		expect(html).toContain('✓');
		expect(html).toContain('bg-gelb');
		expect(html).toContain('bg-gruen');
		expect(html).toContain('text-tinte-soft');
		// Der erledigte Schritt zeigt keine Nummer mehr, der offene schon.
		expect(html).not.toContain('>1<');
		expect(html).toContain('>3<');
	});

	it('klebt an der Spalte, ohne waagrecht zu scrollen', () => {
		const html = render(fourSteps);
		expect(html).toContain('sticky');
		expect(html).not.toContain('overflow-x-auto');
	});

	// Datengetrieben heißt: Sponsoring als Schritt 5 (#63, seit #127 hinter dem
	// Ablaufplan) ist ein Eintrag mehr, keine Layout-Änderung — die Karte zählt
	// die Liste, sie kennt keine Schritte.
	it('rendert auch einen fünften Schritt, ohne davon zu wissen', () => {
		const html = render([
			...fourSteps,
			{
				key: 'sponsoring',
				number: 5,
				title: 'Sponsoring',
				shortTitle: 'Sponsoring',
				subtitle: '4 Kategorien · 14 Firmen',
				state: 'open'
			}
		]);
		expect(html).toContain('Sponsoring');
		expect(html).toContain('4 Kategorien · 14 Firmen');
		expect(html).toContain('>5<');
	});

	it('zeigt ohne Vorlage nur Schritt 1', () => {
		const html = render(kopierwerkSteps({ current: 'basics', hasTemplate: false }));
		expect(html).toContain('Name &amp; Datum');
		expect(html).not.toContain('Stationen');
		expect(html).not.toContain('Material');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render(fourSteps)).not.toMatch(/rounded-/);
	});
});

describe('Schritt-Leiste (<900px)', () => {
	it('wird zur klebenden, waagrecht scrollbaren Leiste statt zur Spalte', () => {
		const html = render(fourSteps, true);
		expect(html).toContain('sticky');
		expect(html).toContain('overflow-x-auto');
	});

	it('kürzt die Titel und lässt den Karten-Kopf weg', () => {
		const html = render(fourSteps, true);
		expect(html).toContain('Stationen');
		expect(html).not.toContain('Stationen &amp; Schichten');
		expect(html).not.toContain('Musikfest 2027');
		expect(html).not.toContain('aus Vorlage');
	});

	it('hinterlegt den aktiven Schritt gelb und hakt den erledigten ab', () => {
		const html = render(fourSteps, true);
		expect(html).toContain('bg-gelb');
		expect(html).toContain('✓');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render(fourSteps, true)).not.toMatch(/rounded-/);
	});
});
