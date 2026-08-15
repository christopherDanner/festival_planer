import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import { buildZettel, type Zettel, type ZettelInput } from '@/lib/sponsoringZettel';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import SponsoringZettel from './SponsoringZettel';

const plakat = makeCategory('Plakat', 200);

/** Zettel über der leeren Plakat-Zelle einer Firma ohne Zusagen. */
function leererKategorieZettel(): Zettel {
	const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);
	return buildZettel(row, { kind: 'category', category: plakat });
}

/** Zettel über einer belegten Plakat-Zelle. */
function belegterKategorieZettel(value: number | null = null): Zettel {
	const [row] = buildSponsoringOverviewRows([
		makeSponsoring({
			companyName: 'Brauerei Wieselburger',
			assignments: [makeAssignment({ category: plakat, value })]
		})
	]);
	return buildZettel(row, { kind: 'category', category: plakat });
}

const noop = () => {};

/** Feldeingabe so setzen, dass React sie sieht (kontrollierte Eingabe). */
function typeInto(field: HTMLInputElement, text: string) {
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	setValue.call(field, text);
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

const markup = (zettel: Zettel) =>
	renderToStaticMarkup(
		<SponsoringZettel zettel={zettel} onApply={noop} onRemove={noop} onClose={noop} />
	);

interface MountResult {
	container: HTMLElement;
	amount: HTMLInputElement;
	button: (label: string) => HTMLButtonElement;
}

async function mount(zettel: Zettel, handlers: Partial<{
	onApply: (input: ZettelInput) => void;
	onRemove: () => void;
	onClose: () => void;
}> = {}): Promise<MountResult> {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<SponsoringZettel
				zettel={zettel}
				onApply={handlers.onApply ?? noop}
				onRemove={handlers.onRemove ?? noop}
				onClose={handlers.onClose ?? noop}
			/>
		);
	});
	return {
		container,
		amount: container.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!,
		button: (label) =>
			[...container.querySelectorAll('button')].find((b) => b.textContent === label)!
	};
}

describe('SponsoringZettel — Aufbau', () => {
	it('trägt Überschrift, vorbelegten Wert und die Herkunft des Werts', () => {
		const html = markup(leererKategorieZettel());

		expect(html).toContain('Plakat');
		expect(html).toContain('value="200"');
		expect(html).toContain('Standardwert € 200');
		expect(html).toContain('Übernehmen');
	});

	it('bietet über einer leeren Zelle kein Entfernen an', () => {
		expect(markup(leererKategorieZettel())).not.toContain('Entfernen');
	});

	it('bietet über einer belegten Zelle Entfernen an', () => {
		expect(markup(belegterKategorieZettel())).toContain('Entfernen');
	});

	it('führt bei der Sachleistung Bezeichnung und Schätzwert', () => {
		const [row] = buildSponsoringOverviewRows([
			makeSponsoring({
				companyName: 'Fleischerei Berger',
				inKindDescription: 'Geschenkkorb Tombola',
				inKindValue: 80
			})
		]);
		const html = markup(buildZettel(row, { kind: 'inKind' }));

		expect(html).toContain('value="Geschenkkorb Tombola"');
		expect(html).toContain('value="80"');
		expect(html).toContain('Zählt nie in die Geldsumme.');
	});

	it('setzt Platzhalter blass und in normaler Stärke, damit sie nicht wie Werte aussehen', () => {
		// Auflage aus dem Entscheid-Prototyp: ein Platzhalter in Wertschrift ließ
		// eine nicht zugewiesene Zelle wie eine zugewiesene aussehen (ADR 0009).
		const [row] = buildSponsoringOverviewRows([makeSponsoring({ companyName: 'Taxi Brandl' })]);
		const html = markup(buildZettel(row, { kind: 'inKind' }));

		expect(html).toContain('placeholder:font-normal');
		expect(html).toContain('placeholder:text-tinte-soft');
	});
});

describe('SponsoringZettel — Bedienung', () => {
	it('belegt das Wertfeld vor und selektiert es, damit Tippen es ersetzt', async () => {
		const { amount } = await mount(leererKategorieZettel());

		expect(document.activeElement).toBe(amount);
		expect(amount.selectionStart).toBe(0);
		expect(amount.selectionEnd).toBe('200'.length);
	});

	it('weist mit Übernehmen ohne Tippen den Standardwert zu', async () => {
		// Der Normalfall aus ADR 0009: 2 Klicks, 0 Tastenanschläge.
		const onApply = vi.fn();
		const { button } = await mount(leererKategorieZettel(), { onApply });

		await act(async () => {
			button('Übernehmen').click();
		});

		expect(onApply).toHaveBeenCalledWith({ value: '200', description: '' });
	});

	it('übernimmt einen abweichenden Wert aus dem Feld', async () => {
		const onApply = vi.fn();
		const { amount, button } = await mount(belegterKategorieZettel(350), { onApply });

		await act(async () => {
			typeInto(amount, '400');
		});
		await act(async () => {
			button('Übernehmen').click();
		});

		expect(onApply).toHaveBeenCalledWith({ value: '400', description: '' });
	});

	it('entfernt nur auf den benannten Knopf, nie als Nebeneffekt', async () => {
		const onRemove = vi.fn();
		const { container, button } = await mount(belegterKategorieZettel(), { onRemove });

		await act(async () => {
			container.querySelector('form')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onRemove).not.toHaveBeenCalled();

		await act(async () => {
			button('Entfernen').click();
		});
		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it('schließt mit Escape, ohne zu schreiben', async () => {
		const onApply = vi.fn();
		const onClose = vi.fn();
		const { container } = await mount(leererKategorieZettel(), { onApply, onClose });

		await act(async () => {
			container
				.querySelector('form')!
				.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onApply).not.toHaveBeenCalled();
	});
});
