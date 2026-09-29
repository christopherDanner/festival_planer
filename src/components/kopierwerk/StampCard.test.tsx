import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import StampCard, { type StampCardStep } from './StampCard';
import { kopierwerkSteps, stampCardHeading, emptyFestivalDraft } from './kopierwerk';

const heading = stampCardHeading(
	{ ...emptyFestivalDraft('fest-2026'), name: 'Musikfest 2027', startDate: '2027-07-23', endDate: '2027-07-25' },
	'Musikfest Steinbach 2026'
);

const steps = kopierwerkSteps({
	current: 'stations',
	hasTemplate: true,
	scope: {
		stations: 4,
		shifts: 11,
		materials: 86,
		scheduleDays: 4,
		scheduleEntries: 17,
		sponsoringCategories: 6,
		sponsors: 9
	},
	festivalName: 'Musikfest Steinbach 2027'
});

const render = (steps: StampCardStep[], compact = false) =>
	renderToStaticMarkup(<StampCard steps={steps} heading={heading} compact={compact} />);

describe('Stempelkarte (≥900px)', () => {
	it('trägt den Karten-Kopf mit Festname, Zeitraum und Vorlage', () => {
		const html = render(steps);
		expect(html).toContain('Musikfest 2027');
		expect(html).toContain('Fr 23. – So 25. Juli 2027 · aus Vorlage Musikfest Steinbach 2026');
	});

	it('rendert einen Eintrag je Schritt der Liste, mit Untertitel-Zeile', () => {
		const html = render(steps);
		expect(html).toContain('Name &amp; Datum');
		expect(html).toContain('Stationen &amp; Schichten');
		expect(html).toContain('Material');
		expect(html).toContain('Ablaufplan');
		expect(html).toContain('Sponsoring');
		expect(html).toContain('4 Stationen · 11 Schichten');
		expect(html).toContain('86 Positionen · Mengenquelle');
		expect(html).toContain('4 Tage · 17 Einträge');
		expect(html).toContain('6 Kategorien · 9 Firmen');
	});

	it('markiert erledigt mit dem Häkchen, aktiv gelb und offen grau', () => {
		const html = render(steps);
		expect(html).toContain('✓');
		expect(html).toContain('bg-gelb');
		expect(html).toContain('bg-gruen');
		expect(html).toContain('text-tinte-soft');
		// Der erledigte Schritt zeigt keine Nummer mehr, der offene schon.
		expect(html).not.toContain('>1<');
		expect(html).toContain('>3<');
	});

	it('klebt an der Spalte, ohne waagrecht zu scrollen', () => {
		const html = render(steps);
		expect(html).toContain('sticky');
		expect(html).not.toContain('overflow-x-auto');
	});

	// Datengetrieben heißt: der Ablaufplan (#127) und das Sponsoring (#146) waren
	// je ein Eintrag mehr, keine Layout-Änderung — die Karte zählt die Liste, sie
	// kennt keine Schritte. Dieser Test hält fest, dass auch der nächste Eintrag
	// keiner wird, den sie kennen müsste.
	it('rendert einen Eintrag, von dem sie nichts weiß', () => {
		const html = render([
			...steps,
			{
				key: 'abrechnung',
				number: 6,
				title: 'Abrechnung',
				shortTitle: 'Abrechnung',
				subtitle: '12 Belege',
				state: 'open'
			}
		]);
		expect(html).toContain('Abrechnung');
		expect(html).toContain('12 Belege');
		expect(html).toContain('>6<');
	});

	it('zeigt ohne Vorlage nur Schritt 1', () => {
		const html = render(kopierwerkSteps({ current: 'basics', hasTemplate: false }));
		expect(html).toContain('Name &amp; Datum');
		expect(html).not.toContain('Stationen');
		expect(html).not.toContain('Material');
		expect(html).not.toContain('Sponsoring');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render(steps)).not.toMatch(/rounded-/);
	});
});

describe('Schritt-Leiste (<900px)', () => {
	it('wird zur klebenden, waagrecht scrollbaren Leiste statt zur Spalte', () => {
		const html = render(steps, true);
		expect(html).toContain('sticky');
		expect(html).toContain('overflow-x-auto');
	});

	it('kürzt die Titel und lässt den Karten-Kopf weg', () => {
		const html = render(steps, true);
		expect(html).toContain('Stationen');
		expect(html).not.toContain('Stationen &amp; Schichten');
		expect(html).not.toContain('Musikfest 2027');
		expect(html).not.toContain('aus Vorlage');
	});

	it('hinterlegt den aktiven Schritt gelb und hakt den erledigten ab', () => {
		const html = render(steps, true);
		expect(html).toContain('bg-gelb');
		expect(html).toContain('✓');
	});

	it('kommt ohne Rundungen aus', () => {
		expect(render(steps, true)).not.toMatch(/rounded-/);
	});
});
