import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { makeSponsor } from '@/lib/__tests__/sponsoringFactories';
import { buttonByLabel, typeInto } from '@/lib/__tests__/domTesting';
import FirmenwahlDialog, { type FirmenwahlDialogProps } from './FirmenwahlDialog';

/* Seam dieses Tests (aus den Fertig-wenn-Punkten von #153, vor dem ersten Test
   festgehalten): `FirmenwahlDialog` ist das minimale „+ SPONSOR" — eine
   durchsuchbare Firmenliste und ein Weg zu „Neue Firma". Er bekommt die Firmen
   **schon ohne** die, die das Fest sponsern, und kennt keinen Datenzugriff:
   gewählt wird über `onChoose`, die neue Firma öffnet der Aufrufer über
   `onNewCompany` (das Firmendaten-Formular aus #150). Kategorien, Freibetrag
   und Notiz hat er nicht. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	Element.prototype.scrollIntoView ??= () => {};
});

const roots: Root[] = [];

afterEach(async () => {
	await act(async () => {
		roots.forEach((root) => root.unmount());
	});
	roots.length = 0;
	document.body.innerHTML = '';
});

const leitner = makeSponsor('Bäckerei Leitner');
const wieselburger = makeSponsor('Brauerei Wieselburger');
const raiffeisen = makeSponsor('Raiffeisenbank Scheibbs');

async function open(props: Partial<FirmenwahlDialogProps> = {}) {
	const onChoose = vi.fn();
	const onNewCompany = vi.fn();
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	await act(async () => {
		root.render(
			<FirmenwahlDialog
				open
				onOpenChange={() => {}}
				sponsors={[leitner, wieselburger, raiffeisen]}
				bestandLeer={false}
				onChoose={onChoose}
				onNewCompany={onNewCompany}
				{...props}
			/>
		);
	});
	const dialog = () => document.querySelector('[role="dialog"]')!;
	return {
		onChoose,
		onNewCompany,
		dialog,
		/** Die angebotenen Firmen, in der gezeigten Reihenfolge. */
		firmen: () =>
			[...dialog().querySelectorAll('[data-firma]')].map((el) => el.textContent?.trim() ?? ''),
		search: async (text: string) => {
			const field = dialog().querySelector<HTMLInputElement>('[aria-label="Firma suchen"]')!;
			await act(async () => {
				typeInto(field, text);
			});
		},
		press: async (label: string) => {
			const button = buttonByLabel(dialog(), label);
			await act(async () => {
				button.click();
			});
		}
	};
}

describe('FirmenwahlDialog — „+ SPONSOR" minimal (#153)', () => {
	it('bietet alle übergebenen Firmen an', async () => {
		const view = await open();
		expect(view.firmen()).toEqual([
			'Bäckerei Leitner',
			'Brauerei Wieselburger',
			'Raiffeisenbank Scheibbs'
		]);
	});

	it('filtert die Liste über das Suchfeld', async () => {
		// Nach fünf Festen sind es leicht 40 Firmen — ohne Suche ist die Liste
		// unbrauchbar (#153).
		const view = await open();
		await view.search('brau');
		expect(view.firmen()).toEqual(['Brauerei Wieselburger']);
	});

	it('sagt, wenn die Suche nichts trifft — und behält „Neue Firma"', async () => {
		const view = await open();
		await view.search('Fleischerei');
		expect(view.firmen()).toEqual([]);
		expect(view.dialog().textContent).toContain('Keine Firma passt zu „Fleischerei"');
		expect(() => buttonByLabel(view.dialog(), 'Neue Firma')).not.toThrow();
	});

	it('sagt, wenn schon alle Firmen dieses Fest sponsern', async () => {
		const view = await open({ sponsors: [], bestandLeer: false });
		expect(view.dialog().textContent).toContain('Alle Firmen sponsern dieses Fest schon');
		expect(view.dialog().textContent).not.toContain('Noch keine Firma erfasst');
	});

	it('sagt beim leeren Sponsorenbestand, dass es noch keine Firma gibt', async () => {
		// Erstes Fest, neue Installation: der Normalfall (#69 Punkt 12) — „Alle
		// Firmen sponsern schon" wäre hier falsch.
		const view = await open({ sponsors: [], bestandLeer: true });
		expect(view.dialog().textContent).toContain('Noch keine Firma erfasst');
		expect(view.dialog().textContent).not.toContain('Alle Firmen sponsern');
		expect(() => buttonByLabel(view.dialog(), 'Neue Firma')).not.toThrow();
	});

	it('zeigt beim Tastaturfokus einen 2px-Tinte-Rahmen auf den Firmen', async () => {
		// DESIGN-VISION §6: Fokus als 2px-Tinte-Outline mit Versatz — die Liste
		// wird nach dem Suchfeld per Tab bedient.
		const view = await open();
		for (const el of view.dialog().querySelectorAll('[data-firma]')) {
			const cls = el.className.split(/\s+/);
			expect(cls).toEqual(
				expect.arrayContaining([
					'focus-visible:outline',
					'focus-visible:outline-2',
					'focus-visible:outline-tinte'
				])
			);
			expect(cls.some((c) => /^focus-visible:-?outline-offset-\d/.test(c))).toBe(true);
			expect(cls).not.toContain('focus-visible:outline-none');
		}
	});

	it('wählt eine Firma mit einem Klick', async () => {
		const view = await open();
		await view.press('Brauerei Wieselburger');
		expect(view.onChoose).toHaveBeenCalledWith(wieselburger.id);
	});

	it('sperrt die Liste, solange angelegt wird', async () => {
		// Ein zweiter Klick legte sonst ein zweites Sponsoring an — das scheitert
		// am UNIQUE (festival_id, sponsor_id) mit einer Fehlermeldung.
		const view = await open({ saving: true });
		await view.press('Brauerei Wieselburger');
		expect(view.onChoose).not.toHaveBeenCalled();
	});

	it('öffnet über „Neue Firma" das Firmendaten-Formular des Aufrufers', async () => {
		const view = await open();
		await view.press('Neue Firma');
		expect(view.onNewCompany).toHaveBeenCalled();
		expect(view.onChoose).not.toHaveBeenCalled();
	});

	it('führt keine Kategorien, keinen Freibetrag und keine Notiz', async () => {
		// Das doppelte die Matrix — gefüllt wird dort, per Zettel (#153, ADR 0009).
		const view = await open();
		const dialog = view.dialog();
		expect(dialog.querySelector('[role="checkbox"]')).toBeNull();
		expect(dialog.querySelector('input[type="checkbox"]')).toBeNull();
		expect(dialog.textContent).not.toMatch(/Kategorie|Freibetrag|Notiz/);
	});
});
