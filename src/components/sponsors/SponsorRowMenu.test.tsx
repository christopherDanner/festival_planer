import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import SponsorRowMenu from './SponsorRowMenu';

/* Seam dieses Tests (aus den Akzeptanzkriterien von #159, vor dem ersten Test
   festgehalten): `SponsorRowMenu` ist das ⋮ einer Firma im Sponsorenbestand —
   **Bearbeiten · Löschen**. Löschen ist nur frei, solange die Firma keine
   Historie hat (`festivalCount === 0`, ADR 0010); sonst steht es gesperrt da
   und nennt den Grund. Was Bearbeiten öffnet, entscheidet der Aufrufer. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	document.body.innerHTML = '';
});

const mount = async (over: Partial<React.ComponentProps<typeof SponsorRowMenu>> = {}) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<SponsorRowMenu
				companyName="Taxi Brandl"
				festivalCount={0}
				onEdit={() => {}}
				onDelete={() => {}}
				{...over}
			/>
		);
	});
};

const eintraege = () => [...document.querySelectorAll('[role="menuitem"]')];
const eintrag = (text: string) => eintraege().find((el) => (el.textContent ?? '').includes(text));

const klick = async (el: Element | undefined) => {
	await act(async () => {
		el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

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

describe('SponsorRowMenu — die zwei Einträge', () => {
	it('liegt hinter einem ⋮, das die Firma nennt', async () => {
		await mount();

		expect(document.querySelector('[aria-label="Menü für Taxi Brandl"]')).not.toBeNull();
	});

	it('trägt Bearbeiten und Löschen, sonst nichts', async () => {
		await mount();
		await oeffneMenue();

		expect(eintraege().map((el) => el.textContent)).toEqual(['Bearbeiten …', 'Löschen']);
	});

	it('öffnet mit Bearbeiten den Weg des Aufrufers', async () => {
		const onEdit = vi.fn();
		await mount({ onEdit });
		await oeffneMenue();
		await klick(eintrag('Bearbeiten'));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});
});

describe('SponsorRowMenu — Löschen nur ohne Historie (ADR 0010)', () => {
	it('löscht eine „NOCH NIE"-Firma nach der Rückfrage, die den Namen nennt', async () => {
		const onDelete = vi.fn();
		await mount({ onDelete });
		await oeffneMenue();
		await klick(eintrag('Löschen'));

		expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Taxi Brandl');
		expect(onDelete).not.toHaveBeenCalled();

		await klick(rueckfrageKnopf('Löschen'));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it('sperrt das Löschen einer Firma mit Historie und nennt den Grund', async () => {
		const onDelete = vi.fn();
		await mount({ festivalCount: 3, onDelete });
		await oeffneMenue();

		expect(eintrag('Löschen')?.getAttribute('data-disabled')).not.toBeNull();
		expect(eintrag('Löschen')?.textContent).toContain('hängt an 3 Festen');

		await klick(eintrag('Löschen'));
		expect(document.querySelector('[role="alertdialog"]')).toBeNull();
		expect(onDelete).not.toHaveBeenCalled();
	});
});
