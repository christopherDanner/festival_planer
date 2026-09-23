import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const overview = (props: Partial<SponsoringOverviewProps> = {}) => (
	<SponsoringOverview
		sponsorings={sponsorings}
		categories={[plakat, transparent]}
		searchTerm=""
		categoryImpacts={{}}
		onSearchChange={noop}
		onCreate={noop}
		onTransfer={noop}
		onExportPdf={noop}
		onDelete={noop}
		onApply={noop}
		onRemove={noop}
		onCategoryApply={noop}
		onCategoryDelete={noop}
		{...props}
	/>
);

const render = (props: Partial<SponsoringOverviewProps> = {}) =>
	renderToStaticMarkup(overview(props));

/* Der Zettel hängt als Popover im Portal an `document.body`; jede Montage wird
danach abgeräumt, sonst findet der nächste Test einen alten. */
const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
});

async function mount(props: Partial<SponsoringOverviewProps> = {}) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => {
		root.render(overview(props));
	});
	return {
		container,
		field: (label: string) =>
			document.body.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!,
		zettel: () => document.body.querySelector('form[aria-label^="Zettel"]'),
		press: async (label: string) => {
			const button = buttonByLabel(document.body, label);
			await act(async () => {
				button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
				button.click();
			});
		}
	};
}

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

describe('SponsoringOverview — „+ KATEGORIE" legt die Preisliste an', () => {
	it('trägt den Knopf in der Werkzeugleiste', () => {
		expect(render()).toContain('aria-label="Kategorie anlegen"');
	});

	it('öffnet denselben Zettel im Anlege-Modus: leer, ohne Löschen', async () => {
		const view = await mount();

		await view.press('Kategorie');

		expect(view.field('Name').value).toBe('');
		expect(view.field('Standardwert').value).toBe('');
		expect(view.zettel()?.textContent).not.toContain('Kategorie löschen');
	});

	it('legt über Übernehmen eine Kategorie ohne Standardwert an', async () => {
		const onCategoryApply = vi.fn();
		const view = await mount({ onCategoryApply });

		await view.press('Kategorie');
		await act(async () => {
			typeInto(view.field('Name'), 'Logo Speisekarte');
		});
		await view.press('Übernehmen');

		expect(onCategoryApply).toHaveBeenCalledWith(null, { name: 'Logo Speisekarte', value: '' });
		expect(view.zettel()).toBeNull();
	});
});
