import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Pencil } from 'lucide-react';

import { ActionMenu } from './ActionMenu';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `ActionMenu` ist das ⋮ der Handschrift — die Einträge des Aufrufers, Menü-Optik
   und die Rückfrage vor dem Löschen. Den *Wortlaut* bringt der Aufrufer mit; hier
   zählt, dass ohne Rückfrage nichts gelöscht wird. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	// Radix positioniert Menü und Rückfrage über Floating UI; jsdom bringt
	// weder ResizeObserver noch scrollIntoView mit.
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	document.body.innerHTML = '';
});

const TRAGWEITE = '„Ausschank" wird gelöscht — samt 3 Schichten und 7 Zuteilungen.';

const mount = async (over: Partial<React.ComponentProps<typeof ActionMenu>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<ActionMenu
				menuLabel="Menü der Station"
				entries={[{ label: 'Station bearbeiten …', icon: Pencil, onSelect: () => {} }]}
				deleteLabel="Station löschen"
				confirmTitle="Station löschen"
				confirmMessage={TRAGWEITE}
				onDelete={() => {}}
				{...over}
			/>
		);
	});
};

const eintrag = (text: string) =>
	[...document.querySelectorAll('[role="menuitem"]')].find((el) =>
		(el.textContent ?? '').includes(text)
	);

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

describe('ActionMenu — die zwei Einträge', () => {
	it('liegt hinter einem beschrifteten ⋮ und zeigt vorher nichts', async () => {
		await mount();

		expect(document.querySelector('[aria-label="Menü der Station"]')).not.toBeNull();
		expect(document.body.textContent).not.toContain('löschen');
	});

	it('trägt die Beschriftungen des Aufrufers', async () => {
		await mount();
		await oeffneMenue();

		expect(document.body.textContent).toContain('Station bearbeiten …');
		expect(document.body.textContent).toContain('Station löschen');
	});

	it('führt einen Eintrag des Aufrufers unmittelbar aus', async () => {
		const onSelect = vi.fn();
		await mount({
			entries: [{ label: 'Station bearbeiten …', icon: Pencil, onSelect }]
		});
		await oeffneMenue();
		await klick(eintrag('bearbeiten'));

		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it('reiht mehrere Einträge in der Reihenfolge des Aufrufers, Löschen zuletzt', async () => {
		await mount({
			entries: [
				{ label: 'Notiz …', icon: Pencil, onSelect: () => {} },
				{ label: 'Firmendaten …', icon: Pencil, onSelect: () => {} }
			]
		});
		await oeffneMenue();

		expect([...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent)).toEqual(
			['Notiz …', 'Firmendaten …', 'Station löschen']
		);
	});

	it('zeichnet das Löschen rot', async () => {
		await mount();
		await oeffneMenue();

		expect(eintrag('löschen')?.className).toContain('text-rot');
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

	it('bietet ein 40px-Tippziel — es ist der einzige Weg zu beiden Griffen', async () => {
		await mount();

		expect(document.querySelector('[aria-haspopup="menu"]')?.className).toContain(
			'max-[899px]:min-h-10'
		);
	});

	it('steht auf der grünen Plakatfläche in Weiß', async () => {
		await mount({ tone: 'white' });

		expect(document.querySelector('[aria-haspopup="menu"]')?.className).toContain('text-white');
	});
});

describe('ActionMenu — die Rückfrage vor dem Löschen', () => {
	it('löscht nicht sofort, sondern fragt und benennt die Tragweite', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('löschen'));

		expect(onDelete).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('samt 3 Schichten und 7 Zuteilungen');
	});

	it('löscht erst, wenn die Rückfrage bejaht ist', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('löschen'));
		await klick(rueckfrageKnopf('Löschen'));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('bietet neben dem Löschen immer einen Rückweg', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('löschen'));
		await klick(rueckfrageKnopf('Abbrechen'));

		expect(onDelete).not.toHaveBeenCalled();
		expect(document.querySelector('[role="alertdialog"]')).toBeNull();
	});
});
