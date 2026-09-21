import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import { buildZettel, type Zettel, type ZettelInput } from '@/lib/sponsoringZettel';
import { makeAssignment, makeCategory, makeSponsoring } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
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

/** Zettel über der Sachleistungs-Zelle. */
function sachleistungsZettel(erfasst: boolean): Zettel {
	const [row] = buildSponsoringOverviewRows([
		makeSponsoring({
			companyName: 'Fleischerei Berger',
			inKindDescription: erfasst ? 'Geschenkkorb Tombola' : null,
			inKindValue: erfasst ? 80 : null
		})
	]);
	return buildZettel(row, { kind: 'inKind' });
}

const noop = () => {};

const markup = (zettel: Zettel) =>
	renderToStaticMarkup(<SponsoringZettel zettel={zettel} onApply={noop} onRemove={noop} />);

async function mount(
	zettel: Zettel,
	handlers: Partial<{ onApply: (input: ZettelInput) => void; onRemove: () => void }> = {}
) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<SponsoringZettel
				zettel={zettel}
				onApply={handlers.onApply ?? noop}
				onRemove={handlers.onRemove ?? noop}
			/>
		);
	});
	return {
		container,
		amount: container.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!,
		description: container.querySelector<HTMLInputElement>('[aria-label="Bezeichnung"]'),
		button: (label: string) => buttonByLabel(container, label)
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

	it('unterscheidet die leere von der belegten Zelle, obwohl beide „200" zeigen', () => {
		// Auflage aus ADR 0009: leer und belegt dürfen im Zettel-Zustand nicht
		// verwechselbar sein. Beide zeigen den Standardwert im Feld — den
		// Unterschied macht die Zustandszeile (und der Entfernen-Knopf).
		expect(markup(leererKategorieZettel())).toContain('noch nicht zugewiesen');
		expect(markup(belegterKategorieZettel())).not.toContain('noch nicht zugewiesen');
	});

	it('bietet über einer leeren Zelle kein Entfernen an', () => {
		expect(markup(leererKategorieZettel())).not.toContain('Entfernen');
	});

	it('bietet über einer belegten Zelle Entfernen an', () => {
		expect(markup(belegterKategorieZettel())).toContain('Entfernen');
	});

	it('führt bei der Sachleistung Bezeichnung und Schätzwert', () => {
		const html = markup(sachleistungsZettel(true));

		expect(html).toContain('value="Geschenkkorb Tombola"');
		expect(html).toContain('value="80"');
		expect(html).toContain('Zählt nie in die Geldsumme.');
	});

	it('setzt Platzhalter blass und in normaler Stärke, damit sie nicht wie Werte aussehen', () => {
		// Auflage aus dem Entscheid-Prototyp: ein Platzhalter in Wertschrift ließ
		// eine nicht zugewiesene Zelle wie eine zugewiesene aussehen (ADR 0009).
		const html = markup(sachleistungsZettel(false));

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

	it('beginnt bei der Sachleistung in der Bezeichnung, weil ohne sie nichts geht', async () => {
		const { description } = await mount(sachleistungsZettel(true));

		expect(document.activeElement).toBe(description);
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

	it('sperrt Übernehmen, solange die Sachleistung keine Bezeichnung hat', async () => {
		// Ohne Bezeichnung gäbe es nichts zu speichern; ein stiller Klick ins
		// Leere wäre schlimmer als ein gesperrter Knopf.
		const onApply = vi.fn();
		const view = await mount(sachleistungsZettel(false), { onApply });

		expect(view.button('Übernehmen').disabled).toBe(true);

		await act(async () => {
			typeInto(view.description!, 'Brotkorb');
		});

		expect(view.button('Übernehmen').disabled).toBe(false);
	});

	it('löscht eine erfasste Sachleistung nicht dadurch, dass die Bezeichnung geleert wird', async () => {
		const onApply = vi.fn();
		const view = await mount(sachleistungsZettel(true), { onApply });

		await act(async () => {
			typeInto(view.description!, '');
		});

		expect(view.button('Übernehmen').disabled).toBe(true);
		expect(view.button('Entfernen').disabled).toBe(false);
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
});
