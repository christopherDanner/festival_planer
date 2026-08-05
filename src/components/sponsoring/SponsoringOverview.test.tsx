import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsoringOverview, { type SponsoringOverviewProps } from './SponsoringOverview';
import {
	makeAssignment,
	makeCategory,
	makeSponsoring
} from '@/lib/__tests__/sponsoringFactories';
import { festivalSponsoringTotal } from '@/lib/sponsoringTotals';
import { formatEuro } from '@/lib/money';

const plakat = makeCategory('Plakat', 200);
const transparent = makeCategory('Transparent', 300);

/* Drei Firmen, € 1.700 Geld — genau eine trifft auf „bäckerei". */
const sponsorings = [
	makeSponsoring({
		companyName: 'Bäckerei Leitner',
		assignments: [makeAssignment({ category: plakat })],
		freeAmount: 100
	}),
	makeSponsoring({
		companyName: 'Brauerei Wieselburger',
		assignments: [makeAssignment({ category: transparent })],
		freeAmount: 500
	}),
	makeSponsoring({
		companyName: 'Raiffeisenbank Scheibbs',
		assignments: [makeAssignment({ category: plakat }), makeAssignment({ category: transparent })],
		freeAmount: 100
	})
];

const noop = () => {};

const render = (props: Partial<SponsoringOverviewProps> = {}) =>
	renderToStaticMarkup(
		<SponsoringOverview
			sponsorings={sponsorings}
			categories={[plakat, transparent]}
			searchTerm=""
			onSearchChange={noop}
			onCreate={noop}
			onTransfer={noop}
			onExportPdf={noop}
			onEdit={noop}
			onDelete={noop}
			{...props}
		/>
	);

describe('SponsoringOverview — Suche', () => {
	it('trägt das Suchfeld der Werkzeugleiste', () => {
		expect(render()).toContain('Firma suchen');
	});

	it('zählt an der Suche die sichtbaren Firmen', () => {
		expect(render({ searchTerm: 'bäckerei' })).toContain('1 von 3');
	});
});

describe('SponsoringOverview — ADR 0006: Kennzahl über alle, Fuß über die sichtbaren', () => {
	it('lässt Kennzahl und Maßband beim Tippen unverändert', () => {
		// Bereichskopf = Fest-Kennzahl über alle Sponsorings, egal was gefiltert ist
		expect(render()).toContain('€ 1.700');
		expect(render({ searchTerm: 'bäckerei' })).toContain('€ 1.700');
		expect(render({ searchTerm: 'gibtsnicht' })).toContain('€ 1.700');
	});

	it('nennt im Bereichskopf weiterhin alle Sponsoren', () => {
		expect(render({ searchTerm: 'bäckerei' })).toContain('3 Sponsoren');
	});

	it('zeigt dieselbe Zahl wie der Dashboard-Kasten — auch beim Tippen', () => {
		// Beide Wege gehen durch festivalSponsoringTotal über *alle* Sponsorings
		// (`numberBoxes.ts` für den Kasten, der Bereichskopf hier).
		const kennzahl = formatEuro(festivalSponsoringTotal(sponsorings));
		expect(render()).toContain(kennzahl);
		expect(render({ searchTerm: 'bäckerei' })).toContain(kennzahl);
	});

	it('rechnet den Fuß über die sichtbaren Zeilen und beschriftet den Filter', () => {
		const html = render({ searchTerm: 'bäckerei' });
		expect(html).toContain('Σ je Kategorie · 1 von 3 Firmen');
		// Karten-Fuß am Handy nach derselben Regel
		expect(html).toContain('Gesamtsumme · 1 von 3 Firmen');
	});

	it('lässt die Fuß-Beschriftung ungefiltert nackt', () => {
		const html = render();
		expect(html).toContain('Σ je Kategorie');
		expect(html).not.toContain('von 3 Firmen');
	});

	it('zeigt nur die Zeilen der Treffer', () => {
		const html = render({ searchTerm: 'bäckerei' });
		expect(html).toContain('Bäckerei Leitner');
		expect(html).not.toContain('Raiffeisenbank Scheibbs');
	});

	it('zeigt bei keinem Treffer die Hinweiszeile und keinen Fuß', () => {
		const html = render({ searchTerm: 'gibtsnicht' });
		expect(html).toContain('Keine Firma passt zu');
		expect(html).not.toContain('Σ je Kategorie');
		// auch der Karten-Fuß am Handy verschwindet („Gesamtsumme" allein steht
		// in der Unterzeile des Bereichs, der Fuß trüge die Filter-Beschriftung)
		expect(html).not.toContain('Gesamtsumme ·');
	});

	it('behält am leeren Fest denselben Satz, ob getippt wird oder nicht', () => {
		for (const searchTerm of ['', 'bau']) {
			const html = render({ sponsorings: [], searchTerm });
			expect(html).toContain('Noch keine Sponsorings erfasst');
			expect(html).not.toContain('Keine Firma passt zu');
		}
	});

	it('lässt bei jedem Filter alle Kategorie-Spalten stehen', () => {
		for (const searchTerm of ['', 'bäckerei', 'gibtsnicht']) {
			const html = render({ searchTerm });
			expect(html).toContain('Plakat');
			expect(html).toContain('Transparent');
		}
	});
});
