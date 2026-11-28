import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows
} from '@/lib/sponsoringTotals';
import type { SponsoringCategory, SponsoringWithDetails } from '@/lib/sponsorService';
import SponsoringCardList, { type SponsoringCardListProps } from './SponsoringCardList';
import {
	makeAssignment,
	makeCategory,
	makeSponsoring
} from '@/lib/__tests__/sponsoringFactories';

/**
 * Sponsoring am Handy (#155, Variante K5): Karte je Firma, die nur zeigt, was
 * die Firma hat; ein „+" je Firma öffnet *eine* Liste mit allem Hinzufügbaren;
 * eine Marke antippen öffnet ihren Zettel als Blatt von unten. Jede
 * Trefferfläche ist ≥ 40px hoch (Vision §6).
 */

const plakat = makeCategory('Plakat', 200);
const transparent = makeCategory('Transparent', 300);
const preisliste = [plakat, transparent];

const leer = makeSponsoring({ companyName: 'Autohaus Leer' });
const voll = makeSponsoring({
	companyName: 'Brauerei Voll',
	assignments: [
		makeAssignment({ category: plakat }),
		makeAssignment({ category: transparent, value: 350 })
	],
	freeAmount: 200,
	inKindDescription: 'Fass Bier',
	inKindValue: 120
});
const teil = makeSponsoring({
	companyName: 'Cafe Teil',
	assignments: [makeAssignment({ category: plakat })]
});

const noop = () => {};

const props = (
	sponsorings: SponsoringWithDetails[],
	over: Partial<SponsoringCardListProps> = {},
	categories: SponsoringCategory[] = preisliste
): SponsoringCardListProps => {
	const rows = buildSponsoringOverviewRows(sponsorings);
	return {
		categories,
		rows,
		footer: buildSponsoringOverviewFooter(rows, categories),
		totalRowCount: rows.length,
		searchTerm: '',
		onOpenNote: noop,
		onOpenSponsor: noop,
		onDelete: noop,
		onApply: noop,
		onRemove: noop,
		...over
	};
};

const render = (p: SponsoringCardListProps) => renderToStaticMarkup(<SponsoringCardList {...p} />);

/** Eine Karte als Text — Auszeichnung weg, Leerraum zusammengezogen. */
function cardText(html: string, company: string): string {
	const doc = document.createElement('div');
	doc.innerHTML = html;
	const card = [...doc.querySelectorAll('[data-sponsoring-card]')].find((c) =>
		c.textContent?.includes(company)
	);
	if (!card) return '';
	// Jedes Textstück einzeln — Name, Summe und Marken stehen in eigenen Elementen.
	const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
	const parts: string[] = [];
	while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
	return parts.join(' ').replace(/\s+/g, ' ').replace(/\( /g, '(').trim();
}

/** Alle Knöpfe eines Markups samt ihrer Klassen. */
const buttons = (html: string) => html.match(/<button[^>]*>/g) ?? [];

describe('SponsoringCardList — die Karte zeigt nur Vorhandenes', () => {
	it('zeigt eine Firma ohne alles mit Name, € 0 und einem „+" — nichts sonst', () => {
		const html = render(props([leer]));

		expect(cardText(html, 'Autohaus Leer')).toBe('Autohaus Leer € 0 +');
		expect(html).toContain('aria-label="Hinzufügen bei Autohaus Leer"');
	});

	it('zeigt keine grauen Kategorie-Marken, keine leere Frei-Marke, keine leere Sachleistung', () => {
		const text = cardText(render(props([teil])), 'Cafe Teil');

		expect(text).toContain('Plakat');
		expect(text).not.toContain('Transparent');
		expect(text).not.toContain('Frei');
		expect(text).not.toContain('Sachleistung');
	});

	it('zeigt gewählte Kategorien, Freibetrag und Sachleistung als Marken', () => {
		const text = cardText(render(props([voll])), 'Brauerei Voll');

		expect(text).toContain('Plakat € 200');
		expect(text).toContain('Transparent € 350');
		expect(text).toContain('Frei € 200');
		expect(text).toContain('Fass Bier (€ 120)');
	});

	it('trägt die Zeilensumme in der Kopfzeile — Geld ohne Sachwert', () => {
		expect(cardText(render(props([voll])), 'Brauerei Voll')).toMatch(/^Brauerei Voll € 750/);
	});

	it('zeigt einer Firma mit allem kein „+" mehr', () => {
		expect(render(props([voll]))).not.toContain('Hinzufügen bei Brauerei Voll');
	});

	it('zeigt die graue Vorjahr-Zeile nur, wo es ein Vorjahr gibt', () => {
		const rows = buildSponsoringOverviewRows([leer, teil], { [teil.id]: 500 });
		const html = render({ ...props([leer, teil]), rows });

		expect(cardText(html, 'Cafe Teil')).toContain('Vorjahr € 500');
		expect(cardText(html, 'Autohaus Leer')).not.toContain('Vorjahr');
	});

	it('trägt das ⋮ der Zeile', () => {
		expect(render(props([leer]))).toContain('Menü für Autohaus Leer');
	});
});

describe('SponsoringCardList — Trefferflächen ≥ 40px (Vision §6, #155)', () => {
	it('macht Marken, „+" und ⋮ mindestens 40px hoch', () => {
		const html = render(props([voll, teil]));
		const all = buttons(html);

		expect(all.length).toBeGreaterThan(0);
		for (const button of all) {
			expect(button).toMatch(/\b(min-h-10|h-10)\b/);
		}
	});
});

describe('SponsoringCardList — Fuß und Leere', () => {
	it('summiert im Fuß die sichtbaren Karten und beschriftet den Filter', () => {
		const html = render({ ...props([voll]), totalRowCount: 3 });

		expect(html).toContain('Gesamtsumme · 1 von 3 Firmen');
		expect(html).toContain('€ 750');
	});

	it('zeigt ohne Karte den Hinweissatz und keinen Fuß', () => {
		const html = render({ ...props([]), searchTerm: 'xyz', totalRowCount: 2 });

		expect(html).toContain('Keine Firma passt zu „xyz&quot;');
		expect(html).not.toContain('Gesamtsumme');
	});
});

describe('SponsoringCardList — bedienen', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	let root: Root | null = null;
	let host: HTMLDivElement | null = null;

	beforeAll(() => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
		Element.prototype.scrollIntoView ??= () => {};
		window.matchMedia ??= ((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false
		})) as typeof window.matchMedia;
	});

	afterEach(async () => {
		if (root) await act(async () => root!.unmount());
		root = null;
		host?.remove();
		host = null;
		document.body.innerHTML = '';
	});

	const mount = async (p: SponsoringCardListProps) => {
		host = document.createElement('div');
		document.body.appendChild(host);
		root = createRoot(host);
		await act(async () => {
			root!.render(<SponsoringCardList {...p} />);
		});
	};

	const tippe = async (el: Element | null | undefined) => {
		if (!el) throw new Error('Nichts zum Antippen');
		await act(async () => {
			el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
	};

	const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`);
	const sheet = () => document.querySelector('[data-vaul-drawer]');
	const open = () => sheet()?.getAttribute('data-state') === 'open';
	const sheetText = () => (sheet()?.textContent ?? '').replace(/\s+/g, ' ');
	const sheetButtons = () => [...(sheet()?.querySelectorAll('button') ?? [])];
	const entry = (label: string) =>
		sheetButtons().find((b) => b.querySelector('[data-addable-label]')?.textContent === label);

	it('öffnet am „+" eine Liste mit offenen Kategorien, Freibetrag und Sachleistung', async () => {
		await mount(props([teil]));
		await tippe(byLabel('Hinzufügen bei Cafe Teil'));

		expect(open()).toBe(true);
		const text = sheetText();
		expect(text).toContain('Kategorien');
		expect(text).toContain('Transparent');
		expect(text).toContain('€ 300');
		expect(text).toContain('Sonstiges');
		expect(entry('Freibetrag')).toBeDefined();
		expect(entry('Sachleistung')).toBeDefined();
		// Plakat hat die Firma schon — es steht nicht zur Wahl.
		expect(entry('Plakat')).toBeUndefined();
	});

	it('macht jeden Eintrag im Blatt mindestens 40px hoch', async () => {
		await mount(props([leer]));
		await tippe(byLabel('Hinzufügen bei Autohaus Leer'));

		const entries = sheetButtons();
		expect(entries.length).toBeGreaterThan(0);
		for (const button of entries) {
			expect(button.className).toMatch(/\b(min-h-10|min-h-11|min-h-12|h-10)\b/);
		}
	});

	it('weist eine Kategorie beim Antippen sofort zum Standardwert zu und schließt', async () => {
		const onApply = vi.fn();
		await mount(props([leer], { onApply }));
		await tippe(byLabel('Hinzufügen bei Autohaus Leer'));
		await tippe(entry('Plakat'));

		expect(onApply).toHaveBeenCalledWith(leer.id, { kind: 'category', category: plakat }, { value: '200' });
		expect(open()).toBe(false);
	});

	it('legt einen Freibetrag über seinen Zettel an', async () => {
		const onApply = vi.fn();
		await mount(props([leer], { onApply }));
		await tippe(byLabel('Hinzufügen bei Autohaus Leer'));
		await tippe(entry('Freibetrag'));

		const field = document.querySelector<HTMLInputElement>('[aria-label="Betrag"]')!;
		await act(async () => typeInto(field, '150'));
		await tippe(buttonByLabel(document.body, 'Übernehmen'));

		expect(onApply).toHaveBeenCalledWith(
			leer.id,
			{ kind: 'freeAmount' },
			expect.objectContaining({ value: '150' })
		);
		expect(open()).toBe(false);
	});

	it('legt eine Sachleistung über ihren Zettel an', async () => {
		const onApply = vi.fn();
		await mount(props([leer], { onApply }));
		await tippe(byLabel('Hinzufügen bei Autohaus Leer'));
		await tippe(entry('Sachleistung'));

		await act(async () =>
			typeInto(document.querySelector<HTMLInputElement>('[aria-label="Bezeichnung"]')!, 'Tombolapreis')
		);
		await act(async () =>
			typeInto(document.querySelector<HTMLInputElement>('[aria-label="Schätzwert"]')!, '80')
		);
		await tippe(buttonByLabel(document.body, 'Übernehmen'));

		expect(onApply).toHaveBeenCalledWith(leer.id, { kind: 'inKind' }, { value: '80', description: 'Tombolapreis' });
	});

	it('öffnet beim Antippen einer Marke ihren Zettel mit Ändern und Entfernen', async () => {
		const onApply = vi.fn();
		const onRemove = vi.fn();
		await mount(props([voll], { onApply, onRemove }));
		await tippe(byLabel('Plakat bei Brauerei Voll'));

		expect(open()).toBe(true);
		expect(document.querySelector('form[aria-label="Zettel Plakat"]')).not.toBeNull();
		await tippe(buttonByLabel(document.body, 'Entfernen'));

		expect(onRemove).toHaveBeenCalledWith(voll.id, { kind: 'category', category: plakat });
		expect(open()).toBe(false);
	});

	it('ändert über den Zettel einer Marke den Wert', async () => {
		const onApply = vi.fn();
		await mount(props([voll], { onApply }));
		await tippe(byLabel('Freibetrag bei Brauerei Voll'));

		const field = document.querySelector<HTMLInputElement>('[aria-label="Betrag"]')!;
		expect(field.value).toBe('200');
		await act(async () => typeInto(field, '250'));
		await tippe(buttonByLabel(document.body, 'Übernehmen'));

		expect(onApply).toHaveBeenCalledWith(
			voll.id,
			{ kind: 'freeAmount' },
			expect.objectContaining({ value: '250' })
		);
	});

	it('macht Knöpfe und Felder des Zettels im Blatt mindestens 40px hoch', async () => {
		await mount(props([voll]));
		await tippe(byLabel('Sachleistung bei Brauerei Voll'));

		const form = document.querySelector('form[aria-label="Zettel Sachleistung"]')!;
		const controls = [...form.querySelectorAll('button, input')];
		expect(controls.length).toBeGreaterThan(0);
		for (const control of controls) {
			expect(control.className).toMatch(/\bmin-h-10\b/);
		}
	});
});
