import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ShiftRowMenu from './ShiftRowMenu';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `ShiftRowMenu` ist das ⋮ von Stationskopf und Schicht-Zeile — Entscheid 5 aus
   #68. Es trägt die zwei Einträge, die Plakat-Optik des Menüs und die
   Rückfrage vor dem Löschen. Den *Wortlaut* der Tragweite liefert
   `shiftDeletion` (eigener Test); hier zählt, dass ohne Rückfrage nichts
   gelöscht wird. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	// Radix positioniert Menü und Rückfrage über Floating UI; jsdom bringt
	// weder ResizeObserver noch Pointer-Capture mit.
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	Element.prototype.hasPointerCapture ??= () => false;
	Element.prototype.setPointerCapture ??= () => {};
	Element.prototype.releasePointerCapture ??= () => {};
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	document.body.innerHTML = '';
});

const TRAGWEITE = '„Ausschank" wird gelöscht — samt 3 Schichten und 7 Zuteilungen.';

const mount = async (over: Partial<React.ComponentProps<typeof ShiftRowMenu>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<ShiftRowMenu
				subject="Station"
				label="Menü der Station"
				deleteMessage={TRAGWEITE}
				onEdit={() => {}}
				onDelete={() => {}}
				{...over}
			/>
		);
	});
};

const knopfMit = (text: string) =>
	[...document.querySelectorAll('button, [role="menuitem"]')].find((el) =>
		(el.textContent ?? '').includes(text)
	);

const klick = async (el: Element | undefined) => {
	await act(async () => {
		el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

/** Das ⋮ mit der Tastatur öffnen — Radix reagiert auf Enter am Auslöser. */
const oeffneMenue = async () => {
	const trigger = document.querySelector('[aria-haspopup="menu"]');
	await act(async () => {
		trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	});
};

describe('ShiftRowMenu — die zwei Einträge', () => {
	it('liegt hinter einem beschrifteten ⋮ und zeigt vorher nichts', async () => {
		await mount();

		expect(document.querySelector('[aria-label="Menü der Station"]')).not.toBeNull();
		expect(document.body.textContent).not.toContain('löschen');
	});

	it('trägt „Station bearbeiten …" und „Station löschen"', async () => {
		await mount();
		await oeffneMenue();

		expect(document.body.textContent).toContain('Station bearbeiten …');
		expect(document.body.textContent).toContain('Station löschen');
	});

	it('spricht in der Schicht-Zeile von der Schicht', async () => {
		await mount({ subject: 'Schicht', label: 'Menü der Schicht 11–15' });
		await oeffneMenue();

		expect(document.body.textContent).toContain('Schicht bearbeiten …');
		expect(document.body.textContent).toContain('Schicht löschen');
	});

	it('führt das Bearbeiten unmittelbar aus', async () => {
		const onEdit = vi.fn();
		await mount({ onEdit });
		await oeffneMenue();
		await klick(knopfMit('Station bearbeiten'));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it('zeichnet das Löschen rot', async () => {
		await mount();
		await oeffneMenue();

		expect(knopfMit('Station löschen')?.className).toContain('text-rot');
	});

	it('trägt die Menü-Optik: 2px Tinte-Rahmen, Versatz-Schatten, keine runden Ecken', async () => {
		await mount();
		await oeffneMenue();
		const menu = document.querySelector('[role="menu"]');

		expect(menu?.className).toContain('border-2');
		expect(menu?.className).toContain('border-tinte');
		expect(menu?.className).toContain('shadow-versatz');
		expect(menu?.className).not.toContain('rounded');
	});
});

describe('ShiftRowMenu — die Rückfrage vor dem Löschen', () => {
	it('löscht nicht sofort, sondern fragt und benennt die Tragweite', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(knopfMit('Station löschen'));

		expect(onDelete).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('samt 3 Schichten und 7 Zuteilungen');
	});

	it('löscht erst, wenn die Rückfrage bejaht ist', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(knopfMit('Station löschen'));
		const rueckfrage = document.querySelector('[role="alertdialog"]');
		await klick(
			[...(rueckfrage?.querySelectorAll('button') ?? [])].find(
				(b) => b.textContent?.trim() === 'Löschen'
			)
		);

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('bietet neben dem Löschen immer einen Rückweg', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(knopfMit('Station löschen'));
		const rueckfrage = document.querySelector('[role="alertdialog"]');
		await klick(
			[...(rueckfrage?.querySelectorAll('button') ?? [])].find(
				(b) => b.textContent?.trim() === 'Abbrechen'
			)
		);

		expect(onDelete).not.toHaveBeenCalled();
		expect(document.querySelector('[role="alertdialog"]')).toBeNull();
	});
});
