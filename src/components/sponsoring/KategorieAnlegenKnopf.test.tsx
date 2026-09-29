import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
import KategorieAnlegenKnopf from './KategorieAnlegenKnopf';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* Der Zettel hängt als Popover im Portal an `document.body`; jede Montage wird
danach abgeräumt, sonst findet der nächste Test einen alten. */
const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
});

async function mount(onCategoryApply = vi.fn()) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => {
		root.render(
			<KategorieAnlegenKnopf
				onCategoryApply={onCategoryApply}
				trigger={<button type="button">+ ERSTE KATEGORIE</button>}
			/>
		);
	});

	return {
		onCategoryApply,
		zettel: () => document.body.querySelector('form[aria-label^="Zettel"]'),
		field: (label: string) =>
			document.body.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!,
		press: async (label: string) => {
			const button = buttonByLabel(document.body, label);
			await act(async () => {
				button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
				button.click();
			});
		}
	};
}

describe('KategorieAnlegenKnopf', () => {
	it('trägt den übergebenen Knopf und hält den Zettel zunächst zu', async () => {
		const view = await mount();

		expect(buttonByLabel(document.body, '+ ERSTE KATEGORIE')).toBeTruthy();
		expect(view.zettel()).toBeNull();
	});

	it('öffnet den Zettel im Anlege-Modus: leer, ohne Löschen', async () => {
		const view = await mount();

		await view.press('+ ERSTE KATEGORIE');

		expect(view.field('Name').value).toBe('');
		expect(view.field('Standardwert').value).toBe('');
		expect(view.zettel()?.textContent).not.toContain('Kategorie löschen');
	});

	it('meldet den getippten Stand und schließt den Zettel', async () => {
		const view = await mount();

		await view.press('+ ERSTE KATEGORIE');
		await act(async () => {
			typeInto(view.field('Name'), 'Transparent');
			typeInto(view.field('Standardwert'), '300');
		});
		await view.press('Übernehmen');

		expect(view.onCategoryApply).toHaveBeenCalledWith({ name: 'Transparent', value: '300' });
		expect(view.zettel()).toBeNull();
	});
});
