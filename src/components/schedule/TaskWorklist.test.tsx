import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import {
	scheduleDay as day,
	schedulePhase as phase,
	scheduleTask as task
} from '@/lib/__tests__/scheduleFactories';
import { buildWorklist, type TaskFilter, type WorklistInput } from '@/lib/scheduleWorklist';

// Das Radix-Select ist in jsdom nicht bedienbar (es hängt an Pointer-Capture).
// Der Ersatz macht aus jedem Eintrag einen Knopf, der die Wahl meldet — geprüft
// wird, was die Werkliste mit der Wahl macht, nicht das Aufklappen.
vi.mock('@/components/ui/select', async () => {
	const React = await import('react');
	const Pick = React.createContext<(value: string) => void>(() => {});
	type Kinder = { children?: React.ReactNode };

	return {
		Select: ({ onValueChange, children }: Kinder & { onValueChange: (v: string) => void }) =>
			React.createElement(Pick.Provider, { value: onValueChange }, children),
		SelectTrigger: ({ children }: Kinder) => React.createElement('div', null, children),
		SelectValue: () => null,
		SelectContent: ({ children }: Kinder) => React.createElement('div', null, children),
		SelectItem: ({ value, children }: Kinder & { value: string }) => {
			const pick = React.useContext(Pick);
			return React.createElement(
				'button',
				{ type: 'button', 'data-verantwortlich': value, onClick: () => pick(value) },
				children
			);
		}
	};
});

import TaskWorklist from './TaskWorklist';

/**
 * Das linke Papier des Schreibtischs (#122): Kopf mit Filtern, Gliederung
 * Tag → Phase, Zeilen mit Haken, Uhrzeit und Verantwortlichem, Fußzeile.
 * Was gezählt und gruppiert wird, steht in `scheduleWorklist` — hier zählt,
 * was davon auf dem Papier landet.
 */

const noop = () => {};

const render = (input: WorklistInput, filter: TaskFilter = 'all') =>
	renderToStaticMarkup(
		<TaskWorklist
			worklist={buildWorklist({ ...input, filter })}
			filter={filter}
			onFilterChange={noop}
			responsibleId={input.responsibleId ?? null}
			onResponsibleChange={noop}
			onToggleTask={noop}
			onEditTask={noop}
			onDeleteTask={noop}
		/>
	);

/** Schlüssel und Verknüpfung, wie die Abfrage sie liefert. */
const wer = (id: string, first: string, last: string) => ({
	responsible_helper_id: id,
	responsible_helper: { id, first_name: first, last_name: last }
});

/** Ein Aufbautag mit Phase „Anlieferung": zwei offen, eine erledigt. */
const AUFBAU = day({
	id: 'do',
	date: '2026-07-23',
	label: 'Aufbau',
	phases: [phase({ id: 'p1', name: 'Anlieferung' })],
	entries: [
		task({
			id: 'zelt',
			schedule_phase_id: 'p1',
			title: 'Zelt-Anlieferung Fa. Huber',
			description: 'Zufahrt über Sportplatz freihalten',
			start_time: '08:00:00',
			...wer('h1', 'Franz', 'Hochauer')
		}),
		task({
			id: 'kuehlwagen',
			schedule_phase_id: 'p1',
			title: 'Kühlwagen stellen',
			start_time: '10:00:00',
			status: 'done'
		}),
		task({ id: 'inventur', title: 'Material-Inventur', start_time: null })
	]
});

describe('TaskWorklist — der Kopf', () => {
	it('nennt das Papier beim Namen', () => {
		expect(render({ days: [AUFBAU] })).toContain('Aufgaben-Werkliste');
	});

	it('schreibt in die Segmente den Gesamtbestand', () => {
		const html = render({ days: [AUFBAU] }, 'open');

		expect(html).toContain('Alle (3)');
		expect(html).toContain('Offen (2)');
		expect(html).toContain('Erledigt (1)');
	});

	it('zeigt, welches Segment gedrückt ist', () => {
		const html = render({ days: [AUFBAU] }, 'open');
		const knopf = html.split('<button').find((teil) => teil.includes('Offen (2)'));

		expect(knopf).toContain('aria-checked="true"');
	});

	it('bietet die Verantwortlichen zur Wahl, „alle" zuerst', () => {
		const html = render({ days: [AUFBAU] });

		expect(html).toContain('Verantwortlich: alle');
		expect(html).toContain('Hochauer Franz');
		expect(html.indexOf('Verantwortlich: alle')).toBeLessThan(html.indexOf('Hochauer Franz'));
	});
});

describe('TaskWorklist — Gliederung Tag → Phase', () => {
	it('setzt den Tag als Zwischentitel samt Offen-Zähler', () => {
		const html = render({ days: [AUFBAU] });

		expect(html).toContain('Donnerstag 23. Juli · Aufbau');
		expect(html).toMatch(/text-rot[^>]*>2 offen</);
	});

	it('sagt „fertig", wo an einem Tag nichts mehr offen ist', () => {
		const html = render({
			days: [day({ date: '2026-07-23', entries: [task({ status: 'done' })] })]
		});

		expect(html).toMatch(/text-gruen[^>]*>fertig</);
	});

	it('setzt die Phase eine Stufe leiser darunter, mit erledigt von gesamt', () => {
		const html = render({ days: [AUFBAU] });

		expect(html).toContain('Anlieferung');
		expect(html).toContain('1/2');
	});

	it('stellt Einträge ohne Phase ohne Ersatztitel direkt unter den Tag', () => {
		const html = render({ days: [AUFBAU] });

		// „Material-Inventur" steht vor der Phase „Anlieferung" und trägt keinen
		// eigenen Zwischentitel.
		expect(html.indexOf('Material-Inventur')).toBeLessThan(html.indexOf('Anlieferung'));
		expect(html).not.toContain('Ohne Phase');
	});
});

describe('TaskWorklist — was eine Zeile zeigt', () => {
	it('trägt Uhrzeit, Titel, Beschreibung und Verantwortlichen', () => {
		const html = render({ days: [AUFBAU] });

		expect(html).toContain('08:00');
		expect(html).toContain('Zelt-Anlieferung Fa. Huber');
		expect(html).toContain('Zufahrt über Sportplatz freihalten');
		expect(html).toContain('Hochauer Franz');
	});

	it('nennt die Uhrzeit ohne Tageskürzel — der Tag steht schon darüber', () => {
		const html = render({ days: [AUFBAU] });

		expect(html).not.toContain('Do 08:00');
	});

	it('schreibt „ohne Zeit", wo keine erfasst ist', () => {
		expect(render({ days: [AUFBAU] })).toContain('ohne Zeit');
	});

	it('streicht die erledigte Zeile durch und lässt die offene stehen', () => {
		const html = render({ days: [AUFBAU] });
		/** Das Element, das den Titel trägt — von seinem `<span` bis zum Text.
		Gesucht wird `>Titel`, sonst träfe die Aufschrift des Hakens zuerst. */
		const vor = (titel: string) => {
			const text = html.indexOf(`>${titel}`);
			return html.slice(html.lastIndexOf('<span', text), text);
		};

		expect(vor('Kühlwagen stellen')).toContain('line-through');
		expect(vor('Zelt-Anlieferung Fa. Huber')).not.toContain('line-through');
	});

	it('gibt dem Haken ein Tippziel von 40px (DESIGN-VISION §6)', () => {
		expect(render({ days: [AUFBAU] })).toMatch(/h-10/);
	});
});

describe('TaskWorklist — die Fußzeile', () => {
	const fest = {
		days: [
			day({ id: 'vor', date: '2026-07-23', entries: [task({ id: 'a' })] }),
			day({ id: 'fest', date: '2026-07-24', entries: [task({ id: 'b', status: 'done' })] }),
			day({
				id: 'nach',
				date: '2026-07-27',
				entries: [task({ id: 'c' }), task({ id: 'd' })]
			})
		],
		festivalStart: '2026-07-24',
		festivalEnd: '2026-07-26'
	};

	it('nennt die offenen Aufgaben vor dem Fest und in der Nachbereitung', () => {
		const html = render(fest);

		expect(html).toContain('1 offen');
		expect(html).toContain('vor dem Fest');
		expect(html).toContain('2 in der Nachbereitung');
	});

	it('nennt den Stand über alle Aufgaben', () => {
		expect(render(fest)).toContain('1 von 4 erledigt');
	});
});

describe('TaskWorklist — Bedienung', () => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

	beforeAll(() => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	/** Die Werkliste am lebenden Objekt; die Griffe sind Spione. */
	const mount = async () => {
		const spies = {
			onFilterChange: vi.fn(),
			onResponsibleChange: vi.fn(),
			onToggleTask: vi.fn(),
			onEditTask: vi.fn(),
			onDeleteTask: vi.fn()
		};
		const host = document.createElement('div');
		document.body.appendChild(host);
		await act(async () => {
			createRoot(host).render(
				<TaskWorklist
					worklist={buildWorklist({ days: [AUFBAU] })}
					filter="all"
					responsibleId={null}
					{...spies}
				/>
			);
		});
		return { host, spies };
	};

	const click = async (element: Element | null | undefined) => {
		await act(async () => {
			(element as HTMLElement).click();
		});
	};

	it('meldet das Abhaken einer Aufgabe', async () => {
		const { host, spies } = await mount();

		await click(host.querySelector('[aria-label="Zelt-Anlieferung Fa. Huber erledigt"]'));

		expect(spies.onToggleTask).toHaveBeenCalledTimes(1);
		expect(spies.onToggleTask.mock.calls[0][0].id).toBe('zelt');
	});

	it('zeigt am Haken, ob die Aufgabe erledigt ist', async () => {
		const { host } = await mount();
		const haken = (titel: string) =>
			host.querySelector(`[aria-label="${titel} erledigt"]`)?.getAttribute('aria-checked');

		expect(haken('Zelt-Anlieferung Fa. Huber')).toBe('false');
		expect(haken('Kühlwagen stellen')).toBe('true');
	});

	it('öffnet mit dem Klick auf die Zeile den Eintrag', async () => {
		const { host, spies } = await mount();
		const zeile = [...host.querySelectorAll('button')].find((b) =>
			b.textContent?.startsWith('Zelt-Anlieferung')
		);

		await click(zeile);

		expect(spies.onEditTask.mock.calls[0][0].id).toBe('zelt');
	});

	it('meldet den Druck auf ein Segment', async () => {
		const { host, spies } = await mount();

		await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Offen (2)'));

		expect(spies.onFilterChange).toHaveBeenCalledWith('open');
	});

	it('meldet die Wahl eines Verantwortlichen — und „alle" als niemand', async () => {
		const { host, spies } = await mount();
		const eintrag = (value: string) => host.querySelector(`[data-verantwortlich="${value}"]`);

		await click(eintrag('h1'));
		expect(spies.onResponsibleChange).toHaveBeenLastCalledWith('h1');

		await click(eintrag('__all__'));
		expect(spies.onResponsibleChange).toHaveBeenLastCalledWith(null);
	});
});

describe('TaskWorklist — Leerzustände', () => {
	it('sagt, wenn das Fest noch keine Aufgabe hat', () => {
		const html = render({ days: [day()] });

		expect(html).toContain('Noch keine Aufgabe');
	});

	it('unterscheidet davon die leere Filterung', () => {
		const html = render({ days: [AUFBAU], responsibleId: 'niemand' });

		expect(html).not.toContain('Noch keine Aufgabe');
		expect(html).toContain('Keine Aufgabe passt');
	});
});
