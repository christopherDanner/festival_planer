import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonByLabel } from '@/lib/__tests__/domTesting';
import SponsoringAnleitung from './SponsoringAnleitung';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};

const render = (onTransfer = noop) =>
	renderToStaticMarkup(<SponsoringAnleitung onCategoryApply={noop} onTransfer={onTransfer} />);

const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
});

async function mount(handlers: { onCategoryApply?: () => void; onTransfer?: () => void } = {}) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => {
		root.render(
			<SponsoringAnleitung
				onCategoryApply={handlers.onCategoryApply ?? noop}
				onTransfer={handlers.onTransfer ?? noop}
			/>
		);
	});

	return {
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

describe('SponsoringAnleitung — L1: nichts da', () => {
	it('stempelt den Zustand, statt ein leeres Tabellengerippe zu zeigen', () => {
		expect(render()).toContain('NICHTS ERFASST');
	});

	it('nennt die Preisliste als ersten Schritt, nicht die fehlenden Sponsorings', () => {
		const html = render();
		expect(html).toContain('Zuerst die Preisliste');
		expect(html).not.toContain('Noch keine Sponsorings erfasst');
	});

	it('erklärt, dass Kategorien die Spalten dieser Tabelle werden', () => {
		const html = render();
		expect(html).toContain('Sponsoring-Kategorien');
		expect(html).toContain('Spalten dieser Tabelle');
	});

	it('bietet beide Wege an und sagt, welcher wann lohnt', () => {
		const html = render();
		expect(html).toContain('+ ERSTE KATEGORIE');
		expect(html).toContain('AUS EINEM FRÜHEREN FEST ÜBERNEHMEN');
		expect(html).toContain('Übernehmen');
		expect(html).toContain('ersten Fest');
	});

	it('kommt ohne Bildmaterial aus — Handschrift statt Illustration (ADR 0003)', () => {
		const html = render();
		expect(html).not.toContain('<img');
		expect(html).not.toContain('<svg');
	});

	it('öffnet über „+ ERSTE KATEGORIE" denselben Zettel wie „+ KATEGORIE"', async () => {
		const view = await mount();

		expect(view.zettel()).toBeNull();
		await view.press('+ ERSTE KATEGORIE');

		expect(view.zettel()?.getAttribute('aria-label')).toBe('Zettel Neue Kategorie');
	});

	it('führt „AUS EINEM FRÜHEREN FEST ÜBERNEHMEN" auf den bestehenden Übernahme-Weg', async () => {
		const onTransfer = vi.fn();
		const view = await mount({ onTransfer });

		await view.press('AUS EINEM FRÜHEREN FEST ÜBERNEHMEN');

		expect(onTransfer).toHaveBeenCalledTimes(1);
	});
});
