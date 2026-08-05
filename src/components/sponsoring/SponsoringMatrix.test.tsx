import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SponsoringCategory } from '@/lib/sponsorService';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows,
	type SponsoringOverviewRow
} from '@/lib/sponsoringTotals';
import SponsoringMatrix from './SponsoringMatrix';
import {
	makeAssignment,
	makeCategory,
	makeSponsoring
} from '@/lib/__tests__/sponsoringFactories';

const preisliste = (namesAndValues: [string, number][]): SponsoringCategory[] =>
	namesAndValues.map(([name, value]) => makeCategory(name, value));

function render(rows: SponsoringOverviewRow[], categories: SponsoringCategory[]) {
	return renderToStaticMarkup(
		<SponsoringMatrix
			categories={categories}
			rows={rows}
			footer={buildSponsoringOverviewFooter(rows, categories)}
			onDelete={() => {}}
		/>
	);
}

describe('SponsoringMatrix — Gerüst', () => {
	it('rahmt die Tabelle so, dass sie bei Überhang im eigenen Rahmen scrollt', () => {
		const html = render([], preisliste([['Plakat', 200]]));
		expect(html).toContain('overflow-x-auto');
	});

	it('passt bei 4 und 6 Kategorien in 1132 px und reißt erst bei 7 aus', () => {
		// gemessene Referenzbreite des Bereichs (#69)
		const inhaltsbreite = 1132;
		const mindestbreite = (anzahl: number) => {
			const html = render([], preisliste(Array.from({ length: anzahl }, (_, i) => [`K${i}`, 100])));
			return Number(html.match(/min-width:(\d+)px/)![1]);
		};

		expect(mindestbreite(4)).toBeLessThanOrEqual(inhaltsbreite);
		expect(mindestbreite(6)).toBeLessThanOrEqual(inhaltsbreite);
		expect(mindestbreite(7)).toBeGreaterThan(inhaltsbreite);
	});

	it('legt die Spaltenbreiten fest, statt sie vom Inhalt bestimmen zu lassen', () => {
		// table-layout: fixed ist die Voraussetzung für die feste Zeilenhöhe (#66/#69)
		const html = render([], preisliste([['Plakat', 200]]));
		expect(html).toContain('table-fixed');
	});

	it('klebt Firma links und Gesamt rechts, damit bei Überhang die Zeilensumme sichtbar bleibt', () => {
		const rows = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);
		const html = render(rows, preisliste([['Plakat', 200]]));
		expect(html).toContain('sticky left-0');
		// Gesamt klebt neben der ⋮-Spalte, nicht unter ihr
		expect(html).toContain('sticky right-11');
		expect(html).toContain('sticky right-0');
	});

	it('hält jede Zeile auf 43 px', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Taxi Brandl' }),
			makeSponsoring({ companyName: 'Bäckerei Leitner' })
		]);
		const html = render(rows, preisliste([['Plakat', 200]]));
		expect(html.match(/h-\[43px\]/g)).toHaveLength(2);
	});
});

describe('SponsoringMatrix — Spaltenköpfe', () => {
	it('trägt je Kategorie den Namen und darunter den Standardwert', () => {
		const html = render([], preisliste([['Transparent', 300]]));
		expect(html).toContain('Transparent');
		expect(html).toContain('€ 300');
	});

	it('lässt ein einzelnes langes Wort im Kopf trennen, statt die Zelle zu sprengen', () => {
		const html = render([], preisliste([['Transparent', 300]]));
		expect(html).toContain('hyphens-auto');
		expect(html).toContain('lang="de"');
	});

	it('nennt die übrigen Spalten', () => {
		const html = render([], preisliste([['Plakat', 200]]));
		expect(html).toContain('Firma');
		expect(html).toContain('Freibetrag');
		expect(html).toContain('Sachleistung');
		expect(html).toContain('Gesamt');
	});
});

describe('SponsoringMatrix — Zellen', () => {
	it('zeigt eine zugewiesene Kategorie als Wertmarke und eine offene als gestricheltes Plus', () => {
		const plakat = makeCategory('Plakat', 200);
		const social = makeCategory('Social', 100);
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Elektro Pöchhacker', assignments: [makeAssignment({ category: plakat })] })
		]);
		const html = render(rows, [plakat, social]);

		expect(html).toContain('€ 200');
		expect(html).toContain('+');
		expect(html).toContain('border-dashed');
	});

	it('färbt einen vom Standardwert abweichenden Wert rot', () => {
		const plakat = makeCategory('Plakat', 200);
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Brauerei Wieselburger',
				assignments: [makeAssignment({ category: plakat, value: 350 })]
			})
		]);
		expect(render(rows, [plakat])).toContain('text-rot');
	});

	it('lässt einen Wert auf dem Standardwert schwarz-grün', () => {
		const plakat = makeCategory('Plakat', 200);
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Elektro Pöchhacker', assignments: [makeAssignment({ category: plakat })] })
		]);
		expect(render(rows, [plakat])).not.toContain('text-rot');
	});

	it('gibt dem Freibetrag die Tinte-Marke statt der grünen Wertmarke', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Gasthaus Zur Linde', freeAmount: 150 })
		]);
		const html = render(rows, preisliste([['Plakat', 200]]));
		expect(html).toContain('border-tinte bg-papier');
		expect(html).toContain('€ 150');
	});

	it('kürzt die Sachleistung und hängt den vollen Text als title an', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Fleischerei Berger',
				inKindDescription: 'Geschenkkorb Tombola',
				inKindValue: 80
			})
		]);
		const html = render(rows, preisliste([['Plakat', 200]]));

		expect(html).toContain('title="Geschenkkorb Tombola (€ 80)"');
		expect(html).toContain('text-ellipsis');
		expect(html).toContain('(€ 80)');
	});
});

describe('SponsoringMatrix — Gesamt-Spalte', () => {
	it('zeigt die Zeilensumme und darunter grau den Vorjahresbeitrag', () => {
		const uebernommen = makeSponsoring({ companyName: 'Sparkasse Purgstall', freeAmount: 500 });
		const rows = buildSponsoringOverviewRows([uebernommen], { [uebernommen.id]: 450 });
		const html = render(rows, preisliste([['Plakat', 200]]));

		expect(html).toContain('€ 500');
		expect(html).toContain('Vorjahr € 450');
		expect(html).toContain('text-tinte-soft');
	});

	it('lässt bei einem handeingetragenen Sponsoring die Vorjahr-Unterzeile weg', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({ companyName: 'Taxi Brandl', freeAmount: 150 })
		]);
		expect(render(rows, preisliste([['Plakat', 200]]))).not.toContain('Vorjahr');
	});
});

describe('SponsoringMatrix — Fuß', () => {
	it('summiert je Kategorie, die Freibeträge und das Geld — den Sachwert daneben', () => {
		const plakat = makeCategory('Plakat', 200);
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Autohaus Steiner',
				assignments: [makeAssignment({ category: plakat })],
				freeAmount: 100,
				inKindDescription: 'Brotkorb',
				inKindValue: 40
			}),
			makeSponsoring({
				companyName: 'Bäckerei Leitner',
				assignments: [makeAssignment({ category: plakat })],
				freeAmount: 50
			})
		]);
		const html = render(rows, [plakat]);

		expect(html).toContain('Σ je Kategorie');
		expect(html).toContain('€ 400'); // Σ Plakat
		expect(html).toContain('€ 150'); // Σ Freibeträge
		expect(html).toContain('+ € 40 Sachwert');
		expect(html).toContain('€ 550'); // Geld-Gesamtsumme
	});

	it('lässt die Sachleistung mit einer Zeilensumme unangetastet', () => {
		const rows = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Winzerhof Schmid',
				freeAmount: 150,
				inKindDescription: '6 Fl. Wein Tombola',
				inKindValue: 60
			})
		]);
		const footer = buildSponsoringOverviewFooter(rows, []);
		expect(footer.total).toBe(150);
		expect(render(rows, [])).toContain('+ € 60 Sachwert');
	});
});
