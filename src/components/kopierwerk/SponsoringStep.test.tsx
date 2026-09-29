import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import SponsoringStep, { type SponsoringStepProps } from './SponsoringStep';

const render = (over: Partial<SponsoringStepProps> = {}) =>
	renderToStaticMarkup(
		<SponsoringStep
			categoryCount={6}
			sponsorCount={9}
			copySponsoringCategories={false}
			copySponsorings={false}
			saving={false}
			onCopyCategoriesChange={() => {}}
			onCopySponsoringsChange={() => {}}
			onBack={() => {}}
			onSubmit={() => {}}
			{...over}
		/>
	);

/** Das Element mit dieser id aus dem Markup — Radix reicht die id an den Knopf durch. */
const tagWithId = (html: string, id: string) =>
	html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

describe('Kopfzeile der Werkbank', () => {
	it('nennt den Schritt', () => {
		expect(render()).toContain('Sponsoring');
	});
});

describe('„Sponsoring-Kategorien übernehmen"', () => {
	// Die Preisliste ist das Jahresgedächtnis des Bereichs — sie kommt
	// vollständig mit Werten (ADR 0008).
	it('beziffert die Preisliste und verspricht sie ganz', () => {
		const html = render();

		expect(html).toContain('Sponsoring-Kategorien übernehmen');
		expect(html).toContain('Alle 6 Kategorien');
		expect(html).toContain('mit ihren Werten');
	});

	it('beugt die Zahl bei einer einzigen Kategorie', () => {
		expect(render({ categoryCount: 1 })).toContain('Die 1 Kategorie');
	});

	// Ein Schalter, der nichts zu holen hätte, ist kein Angebot.
	it('entfällt, wenn die Vorlage keine Preisliste führt', () => {
		const html = render({ categoryCount: 0 });

		expect(html).not.toContain('Sponsoring-Kategorien übernehmen');
		expect(html).toContain('Sponsoren übernehmen');
	});

	it('hakt den Schalter ab, wenn er gesetzt ist', () => {
		expect(tagWithId(render({ copySponsoringCategories: true }), 'kategorien-uebernehmen')).toContain(
			'data-state="checked"'
		);
		expect(tagWithId(render(), 'kategorien-uebernehmen')).toContain('data-state="unchecked"');
	});
});

describe('„Sponsoren übernehmen"', () => {
	// Ohne den Hinweis liest sich die leere Summe wie ein Fehler.
	it('beziffert die Firmen und sagt, dass die Beträge bewusst leer bleiben', () => {
		const html = render();

		expect(html).toContain('Sponsoren übernehmen');
		expect(html).toContain('9 Firmen');
		expect(html).toContain('ohne Beträge');
		expect(html).toContain('beim Zusagen');
	});

	it('beugt die Zahl bei einer einzigen Firma', () => {
		expect(render({ sponsorCount: 1 })).toContain('1 Firma ');
	});

	it('entfällt, wenn die Vorlage keine Firma führt', () => {
		const html = render({ sponsorCount: 0 });

		expect(html).not.toContain('Sponsoren übernehmen');
		expect(html).toContain('Sponsoring-Kategorien übernehmen');
	});

	it('hakt den Schalter ab, wenn er gesetzt ist', () => {
		expect(tagWithId(render({ copySponsorings: true }), 'sponsoren-uebernehmen')).toContain(
			'data-state="checked"'
		);
	});
});

describe('die zwei Schalter hängen nicht aneinander', () => {
	// Nackte Verknüpfungen brauchen keine Kategorien, und die Preisliste ist
	// auch ohne Firmen nützlich (ADR 0008).
	it('lässt den einen bedienbar, während der andere aus ist', () => {
		const nurSponsoren = render({ copySponsorings: true });
		const nurKategorien = render({ copySponsoringCategories: true });

		expect(tagWithId(nurSponsoren, 'kategorien-uebernehmen')).not.toContain('data-disabled');
		expect(tagWithId(nurKategorien, 'sponsoren-uebernehmen')).not.toContain('data-disabled');
	});
});

describe('Leerzustand', () => {
	it('bleibt ohne Preisliste und ohne Firma überspringbar', () => {
		const html = render({ categoryCount: 0, sponsorCount: 0 });

		expect(html).toContain('KEIN SPONSORING');
		expect(html).toContain('FEST ANLEGEN');
		expect(html).not.toContain('disabled=""');
	});
});

describe('Fußzeile', () => {
	it('führt zurück zum Material und legt das Fest an', () => {
		const html = render();

		expect(html).toContain('← Material');
		expect(html).toContain('FEST ANLEGEN');
	});

	it('sperrt den Knopf, während das Fest entsteht', () => {
		expect(render({ saving: true })).toContain('disabled=""');
		expect(render()).not.toContain('disabled=""');
	});
});

describe('Handschrift', () => {
	it('kommt ohne Rundungen aus', () => {
		expect(render()).not.toMatch(/rounded-/);
	});

	// Tippziele ≥ 40px am Handy (DESIGN-VISION §6).
	it('hält die Tippziele am Handy auf 40px', () => {
		expect(render()).toContain('max-[899px]:min-h-10');
	});
});
