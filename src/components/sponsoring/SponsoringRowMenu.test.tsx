import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import SponsoringRowMenu from './SponsoringRowMenu';

/* Seam dieses Tests (aus den Akzeptanzkriterien von #150, vor dem ersten Test
   festgehalten): `SponsoringRowMenu` ist das ⋮ einer Sponsoring-Zeile — genau
   drei Einträge (Notiz · Firmendaten · Entfernen), kein „Bearbeiten", und ein
   Entfernen, das erst nach einer Rückfrage ausgeführt wird. Was die Einträge
   öffnen, entscheidet der Aufrufer; hier zählt, dass es sie gibt. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	// Radix positioniert Menü und Rückfrage über Floating UI; jsdom bringt
	// scrollIntoView nicht mit (den ResizeObserver stellt `test-setup.ts`).
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	document.body.innerHTML = '';
});

const mount = async (over: Partial<React.ComponentProps<typeof SponsoringRowMenu>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<SponsoringRowMenu
				companyName="Taxi Brandl"
				onOpenNote={() => {}}
				onOpenSponsor={() => {}}
				onDelete={() => {}}
				{...over}
			/>
		);
	});
};

const eintraege = () => [...document.querySelectorAll('[role="menuitem"]')];

const eintrag = (text: string) =>
	eintraege().find((el) => (el.textContent ?? '').includes(text));

const klick = async (el: Element | undefined) => {
	await act(async () => {
		el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

/** Das ⋮ mit der Tastatur öffnen — Radix reagiert auf Enter am Auslöser. */
const oeffneMenue = async () => {
	await act(async () => {
		document
			.querySelector('[aria-haspopup="menu"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	});
};

const rueckfrageKnopf = (text: string) =>
	[...document.querySelectorAll('[role="alertdialog"] button')].find(
		(b) => b.textContent?.trim() === text
	);

describe('SponsoringRowMenu — die drei Einträge', () => {
	it('liegt hinter einem beschrifteten ⋮ und zeigt vorher nichts', async () => {
		await mount();

		expect(document.querySelector('[aria-label="Menü für Taxi Brandl"]')).not.toBeNull();
		expect(document.body.textContent).not.toContain('Firmendaten');
	});

	it('führt Notiz, Firmendaten und Entfernen — und sonst nichts', async () => {
		await mount();
		await oeffneMenue();

		expect(eintraege().map((el) => el.textContent)).toEqual([
			'Notiz …',
			'Firmendaten …',
			'Entfernen'
		]);
	});

	it('kennt kein „Bearbeiten" — es wäre der Rückfall in den Dialog (#150)', async () => {
		await mount();
		await oeffneMenue();

		expect(document.body.textContent).not.toContain('Bearbeiten');
	});

	it('öffnet die Notiz unmittelbar', async () => {
		const onOpenNote = vi.fn();
		await mount({ onOpenNote });
		await oeffneMenue();
		await klick(eintrag('Notiz'));

		expect(onOpenNote).toHaveBeenCalledTimes(1);
	});

	it('öffnet die Firmendaten unmittelbar', async () => {
		const onOpenSponsor = vi.fn();
		await mount({ onOpenSponsor });
		await oeffneMenue();
		await klick(eintrag('Firmendaten'));

		expect(onOpenSponsor).toHaveBeenCalledTimes(1);
	});

	it('setzt das Entfernen rot ab', async () => {
		await mount();
		await oeffneMenue();

		expect(eintrag('Entfernen')?.className).toContain('text-rot');
	});

	it('bietet ein 40px-Tippziel — am Handy dasselbe Menü (#150)', async () => {
		await mount();

		expect(document.querySelector('[aria-haspopup="menu"]')?.className).toContain(
			'max-[899px]:min-h-10'
		);
	});
});

describe('SponsoringRowMenu — die Rückfrage vor dem Entfernen', () => {
	it('entfernt nicht sofort, sondern sagt, dass die Firma bleibt', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('Entfernen'));

		expect(onDelete).not.toHaveBeenCalled();
		// Am ⋮ hängt die ganze Zusage, nicht ein einzelner Wert wie am Zettel —
		// und der globale Stammsatz bleibt (#150).
		expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
			'Firma bleibt im Sponsorenbestand'
		);
	});

	it('entfernt erst, wenn die Rückfrage bejaht ist', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('Entfernen'));
		await klick(rueckfrageKnopf('Löschen'));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('bietet neben dem Entfernen immer einen Rückweg', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('Entfernen'));
		await klick(rueckfrageKnopf('Abbrechen'));

		expect(onDelete).not.toHaveBeenCalled();
		expect(document.querySelector('[role="alertdialog"]')).toBeNull();
	});
});
