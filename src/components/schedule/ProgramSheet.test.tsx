import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import {
	scheduleDay as day,
	scheduleEntry as entry,
	scheduleTask as task
} from '@/lib/__tests__/scheduleFactories';
import { buildProgramSheet } from '@/lib/scheduleProgramSheet';
import type { ScheduleDayWithEntries } from '@/lib/scheduleService';

import ProgramSheet from './ProgramSheet';

/**
 * Das rechte Papier des Schreibtischs (#123): der **Programmzettel** als Aushang
 * und zugleich der Ort, an dem Programmpunkte entstehen. Was auf dem Zettel
 * steht, entscheidet `buildProgramSheet` — hier zählt, was davon aufs Papier
 * kommt und was die Griffe melden.
 */

const noop = () => {};

const FEST: ScheduleDayWithEntries[] = [
	day({
		id: 'fr',
		date: '2026-07-24',
		entries: [
			entry({
				id: 'eroeffnung',
				type: 'program',
				title: 'Eröffnung + Fassanstich',
				description: 'mit Bürgermeister',
				start_time: '18:00:00'
			}),
			entry({ id: 'lauser', type: 'program', title: 'Die Lauser', start_time: '19:30:00' }),
			entry({ id: 'bar', type: 'program', title: 'Barbetrieb', start_time: null })
		]
	}),
	day({
		id: 'mo',
		date: '2026-07-27',
		label: 'Nachbereitung',
		entries: [task({ id: 'abbau', title: 'Zeltabbau' })]
	})
];

const render = (days: ScheduleDayWithEntries[] = FEST) =>
	renderToStaticMarkup(
		<ProgramSheet
			sheet={buildProgramSheet(days)}
			festivalName="Musikfest Steinbach 2026"
			onAddProgram={noop}
			onEditProgram={noop}
			onDeleteProgram={noop}
		/>
	);

describe('ProgramSheet — der Kopf', () => {
	it('trägt den Festnamen über "Programm"', () => {
		const html = render();

		expect(html).toContain('Musikfest Steinbach 2026');
		expect(html).toContain('>Programm<');
		expect(html.indexOf('Musikfest Steinbach 2026')).toBeLessThan(html.indexOf('>Programm<'));
	});

	it('setzt den Festnamen in Gelb auf die grüne Plakatfläche', () => {
		const html = render();
		const kopf = html.slice(0, html.indexOf('Musikfest Steinbach 2026'));

		expect(kopf).toContain('poster');
		expect(kopf).toContain('text-gelb');
	});
});

describe('ProgramSheet — was der Zettel zeigt', () => {
	it('gibt jedem Tag mit Punkten einen Zwischentitel', () => {
		expect(render()).toContain('Freitag 24. Juli');
	});

	it('lässt Tage ohne Programmpunkte weg', () => {
		const html = render();

		expect(html).not.toContain('Nachbereitung');
		expect(html).not.toContain('Zeltabbau');
	});

	it('schreibt Uhrzeit, Titel und die Beschreibung leise darunter', () => {
		const html = render();

		expect(html).toContain('18:00');
		expect(html).toContain('Eröffnung + Fassanstich');
		expect(html).toContain('mit Bürgermeister');
	});

	it('lässt die Zeitspalte leer, wo keine Zeit erfasst ist', () => {
		const html = render();
		const zeile = html.slice(html.indexOf('Barbetrieb') - 500, html.indexOf('Barbetrieb'));

		expect(zeile).not.toContain('ohne Zeit');
	});

	it('zeigt keinen Haken und keinen Verantwortlichen — der Zettel geht ans Publikum', () => {
		const html = render();

		expect(html).not.toContain('role="checkbox"');
		expect(html).not.toContain('name-chip');
	});

	it('nennt am Fuß den Zweck und die Zahl der Punkte', () => {
		const html = render();

		expect(html).toContain('Aushang');
		expect(html).toContain('3 Punkte');
	});

	it('zählt einen einzelnen Punkt im Singular', () => {
		const html = render([day({ entries: [entry({ type: 'program' })] })]);

		expect(html).toContain('1 Punkt<');
	});

	it('klebt am Desktop oben, am Handy nicht', () => {
		expect(render()).toContain('min-[900px]:sticky');
	});

	it('sagt es, solange das Fest noch kein Programm hat', () => {
		const html = render([day()]);

		expect(html).toContain('Noch kein Programmpunkt');
	});
});

describe('ProgramSheet — Bedienung', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	beforeAll(() => {
		// Radix positioniert Menü und Rückfrage über Floating UI; jsdom bringt
		// weder ResizeObserver noch scrollIntoView mit (wie in `ActionMenu.test`).
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
		Element.prototype.scrollIntoView ??= () => {};
	});

	/** Die Wurzeln werden abgehängt, nicht bloß der Rumpf geleert: das ⋮-Menü
	rendert in ein Portal am `document.body` und überlebte das Leeren sonst. */
	const gemountet: Array<{ unmount: () => void }> = [];

	afterEach(async () => {
		await act(async () => {
			gemountet.splice(0).forEach((root) => root.unmount());
		});
		document.body.innerHTML = '';
	});

	const mount = async (days: ScheduleDayWithEntries[] = FEST) => {
		const spies = {
			onAddProgram: vi.fn(),
			onEditProgram: vi.fn(),
			onDeleteProgram: vi.fn()
		};
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root = createRoot(host);
		gemountet.push(root);
		await act(async () => {
			root.render(
				<ProgramSheet
					sheet={buildProgramSheet(days)}
					festivalName="Musikfest Steinbach 2026"
					{...spies}
				/>
			);
		});
		return { host, spies };
	};

	const click = async (element: Element | null | undefined) => {
		await act(async () => {
			element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
	};

	/**
	 * Das ⋮ eines Punkts aufklappen — gesucht über den Titel in seiner
	 * Aufschrift, geöffnet mit Enter: Radix hängt den Zeiger an Pointer-Capture,
	 * das jsdom nicht kennt (dieselbe Tür wie in `ActionMenu.test`).
	 */
	const oeffneMenue = async (host: ParentNode, titel: string) => {
		const ausloeser = [...host.querySelectorAll('button')].find((knopf) =>
			knopf.getAttribute('aria-label')?.includes(titel)
		);
		await act(async () => {
			ausloeser?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
	};

	const menueEintrag = (wortlaut: string) =>
		[...document.querySelectorAll('[role="menuitem"]')].find((eintrag) =>
			eintrag.textContent?.includes(wortlaut)
		);

	it('öffnet mit dem Klick auf die Zeile den Eintrag', async () => {
		const { host, spies } = await mount();
		const zeile = [...host.querySelectorAll('button')].find((knopf) =>
			knopf.textContent?.includes('Eröffnung + Fassanstich')
		);

		await click(zeile);

		expect(spies.onEditProgram.mock.calls[0][0].id).toBe('eroeffnung');
	});

	it('legt je Tag einen Punkt für genau diesen Tag an', async () => {
		const { host, spies } = await mount();

		await click(host.querySelector('[data-tag-anlegen="fr"]'));

		expect(spies.onAddProgram).toHaveBeenCalledWith('fr');
	});

	it('führt über das ⋮ zum Bearbeiten desselben Punkts', async () => {
		const { host, spies } = await mount();

		await oeffneMenue(host, 'Die Lauser');
		await click(menueEintrag('Bearbeiten'));

		expect(spies.onEditProgram.mock.calls[0][0].id).toBe('lauser');
	});

	it('löscht erst nach der Rückfrage', async () => {
		const { host, spies } = await mount();

		await oeffneMenue(host, 'Die Lauser');
		await click(menueEintrag('löschen'));
		expect(spies.onDeleteProgram).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('vom Programmzettel entfernt');

		await click(
			[...document.querySelectorAll('[role="alertdialog"] button')].find(
				(knopf) => knopf.textContent?.trim() === 'Löschen'
			)
		);

		expect(spies.onDeleteProgram.mock.calls[0][0].id).toBe('lauser');
	});
});
