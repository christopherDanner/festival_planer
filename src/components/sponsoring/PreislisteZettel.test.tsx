import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCategoryZettel, type CategoryZettel } from '@/lib/sponsoringPreisliste';
import { makeCategory } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
import PreislisteZettel from './PreislisteZettel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plakat = makeCategory('Werbeplakat', 200);

/** Zettel über dem Spaltenkopf einer Kategorie, die vier Firmen erben. */
const bestehend = (assigned = 6, inheriting = 4): CategoryZettel =>
	buildCategoryZettel(plakat, { assigned, inheriting });

/** Zettel hinter „+ KATEGORIE". */
const neu = (): CategoryZettel => buildCategoryZettel(null, { assigned: 0, inheriting: 0 });

const noop = () => {};

const markup = (zettel: CategoryZettel) =>
	renderToStaticMarkup(<PreislisteZettel zettel={zettel} onApply={noop} onDelete={noop} />);

afterEach(() => {
	vi.restoreAllMocks();
});

async function mount(
	zettel: CategoryZettel,
	handlers: Partial<{ onApply: (input: { name: string; value: string }) => void; onDelete: () => void }> = {}
) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<PreislisteZettel
				zettel={zettel}
				onApply={handlers.onApply ?? noop}
				onDelete={handlers.onDelete ?? noop}
			/>
		);
	});
	return {
		container,
		name: container.querySelector<HTMLInputElement>('[aria-label="Name"]')!,
		value: container.querySelector<HTMLInputElement>('[aria-label="Standardwert"]')!,
		button: (label: string) => buttonByLabel(container, label)
	};
}

describe('PreislisteZettel — Aufbau', () => {
	it('legt Name und Standardwert der Kategorie vor', () => {
		const html = markup(bestehend());

		expect(html).toContain('value="Werbeplakat"');
		expect(html).toContain('value="200"');
		expect(html).toContain('Übernehmen');
	});

	it('sagt am ruhenden Zettel nur, welcher Standardwert gilt', () => {
		const html = markup(bestehend());

		expect(html).toContain('Standardwert € 200');
		expect(html).not.toContain('ohne eigenen Wert');
	});

	it('führt Löschen als einzigen destruktiven Eintrag, optisch abgesetzt', () => {
		const html = markup(bestehend());

		expect(html).toContain('Kategorie löschen');
		expect(html).toContain('text-rot');
		// eigener Block unter den Knöpfen, nicht neben „Übernehmen" (#149)
		expect(html).toContain('border-t');
	});

	it('bietet beim Anlegen kein Löschen an', () => {
		expect(markup(neu())).not.toContain('Kategorie löschen');
	});
});

describe('PreislisteZettel — Bedienung', () => {
	it('beginnt im Namensfeld und selektiert es, damit Umbenennen ohne Löschen geht', async () => {
		const { name } = await mount(bestehend());

		expect(document.activeElement).toBe(name);
		expect(name.selectionEnd).toBe('Werbeplakat'.length);
	});

	it('übernimmt Name und Standardwert aus den Feldern', async () => {
		const onApply = vi.fn();
		const view = await mount(bestehend(), { onApply });

		await act(async () => {
			typeInto(view.value, '350');
		});
		await act(async () => {
			view.button('Übernehmen').click();
		});

		expect(onApply).toHaveBeenCalledWith({ name: 'Werbeplakat', value: '350' });
	});

	it('beziffert die Rückwirkung, sobald der Standardwert wandert', async () => {
		// Erst dann — beim bloßen Umbenennen passiert nichts, wovor zu warnen wäre.
		const view = await mount(bestehend());

		await act(async () => {
			typeInto(view.value, '350');
		});
		expect(view.container.textContent).toContain('Gilt für 4 Firmen ohne eigenen Wert.');

		await act(async () => {
			typeInto(view.value, '200');
		});
		expect(view.container.textContent).toContain('Standardwert € 200');
	});

	it('sperrt Übernehmen bei einem Tippfehler im Standardwert', async () => {
		const view = await mount(bestehend());

		await act(async () => {
			typeInto(view.value, '35O');
		});

		expect(view.button('Übernehmen').disabled).toBe(true);
	});

	it('legt eine Kategorie ohne Standardwert an', async () => {
		const onApply = vi.fn();
		const view = await mount(neu(), { onApply });

		expect(view.button('Übernehmen').disabled).toBe(true);
		await act(async () => {
			typeInto(view.name, 'Logo Speisekarte');
		});

		expect(view.button('Übernehmen').disabled).toBe(false);
		await act(async () => {
			view.button('Übernehmen').click();
		});

		expect(onApply).toHaveBeenCalledWith({ name: 'Logo Speisekarte', value: '' });
	});

	it('fragt vor dem Löschen mit der Zahl der Zuweisungen nach', async () => {
		const onDelete = vi.fn();
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const view = await mount(bestehend(), { onDelete });

		await act(async () => {
			view.button('Kategorie löschen').click();
		});

		expect(confirmSpy).toHaveBeenCalledWith(bestehend().deleteMessage);
		expect(confirmSpy.mock.calls[0][0]).toContain('6 Zuweisungen');
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('löscht nicht, wenn die Rückfrage verneint wird', async () => {
		const onDelete = vi.fn();
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const view = await mount(bestehend(), { onDelete });

		await act(async () => {
			view.button('Kategorie löschen').click();
		});

		expect(onDelete).not.toHaveBeenCalled();
	});
});
