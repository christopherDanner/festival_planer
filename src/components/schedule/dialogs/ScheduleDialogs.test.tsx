import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { scheduleDay as day, schedulePhase as phase, scheduleTask } from '@/lib/__tests__/scheduleFactories';
import type { Helper } from '@/lib/helperService';

/* Seam dieses Tests (aus den Akzeptanzkriterien von #124 abgeleitet, vor dem
   ersten Test festgehalten): Die drei Dialoge sind die *Rahmen* — sie halten
   den Formularzustand und geben ihr Formular ab. Die Regeln stehen in
   `scheduleDialogForm` (dort geprüft), die Nutzlast baut `ScheduleView`. Hier
   zählt, was im geöffneten Blatt steht und was beim Speichern herauskommt:

   - „Eine Aufgabe lässt sich in drei Klicks anlegen, ohne vorher eine Phase zu
     erfinden."
   - „Art-Wechsel räumt Status und Verantwortlichen sauber ab." — sichtbar hier
     als das Feld, das verschwindet. */

// Das Radix-Select ist in jsdom nicht bedienbar (es hängt an Pointer-Capture).
// Der Ersatz macht aus jedem Eintrag einen Knopf, der die Wahl meldet.
vi.mock('@/components/ui/select', async () => {
	const React = await import('react');
	const Pick = React.createContext<(value: string) => void>(() => {});
	type Kinder = { children?: React.ReactNode };

	return {
		Select: ({ onValueChange, children }: Kinder & { onValueChange: (v: string) => void }) =>
			React.createElement(Pick.Provider, { value: onValueChange }, children),
		// Die `id` bleibt am Auslöser: das Label des Zettels zeigt darauf, und die
		// Tests fragen die Felder darüber ab.
		SelectTrigger: ({ id, children }: Kinder & { id?: string }) =>
			React.createElement('div', { id }, children),
		SelectValue: () => null,
		SelectContent: ({ children }: Kinder) => React.createElement('div', null, children),
		SelectItem: ({ value, children }: Kinder & { value: string }) => {
			const pick = React.useContext(Pick);
			return React.createElement(
				'button',
				{ type: 'button', 'data-wahl': value, onClick: () => pick(value) },
				children
			);
		}
	};
});

import ScheduleDayDialog from './ScheduleDayDialog';
import ScheduleEntryDialog from './ScheduleEntryDialog';
import SchedulePhaseDialog from './SchedulePhaseDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
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

const TAGE = [
	day({
		id: 'do',
		date: '2026-07-23',
		label: 'Aufbau',
		phases: [phase({ id: 'p1', schedule_day_id: 'do', name: 'Anlieferung' })]
	}),
	day({
		id: 'fr',
		date: '2026-07-24',
		label: null,
		phases: [phase({ id: 'p2', schedule_day_id: 'fr', name: 'Frühschoppen' })]
	})
];

const HELFER = [{ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }] as Helper[];

const mount = async (node: React.ReactElement) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(node);
	});
};

const speichern = () => document.querySelector<HTMLButtonElement>('[data-zettel="speichern"]');

const klick = async (el: Element | null | undefined) => {
	await act(async () => {
		(el as HTMLElement)?.click();
	});
};

const tippe = async (selektor: string, wert: string) => {
	const feld = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selektor);
	await act(async () => {
		// React hängt seinen Setter vor den des Elements; ohne ihn bleibt der
		// Zustand stehen.
		const proto = Object.getPrototypeOf(feld);
		Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(feld, wert);
		feld?.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const waehle = async (value: string) => klick(document.querySelector(`[data-wahl="${value}"]`));

const knopf = (text: string) =>
	[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

const wert = (selektor: string) =>
	document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selektor)?.value;

describe('ScheduleEntryDialog — eine Aufgabe in drei Klicks', () => {
	const NEU = { type: 'task' as const, schedule_day_id: 'do' };

	it('öffnet auf dem vorbelegten Tag, ohne Phase und mit gesperrtem Knopf', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);

		expect(document.body.textContent).toContain('Neuer Eintrag');
		expect(wert('#entry-title')).toBe('');
		expect(speichern()?.disabled).toBe(true);
	});

	it('gibt nach dem Titel ab — ohne dass eine Phase erfunden werden musste', async () => {
		const onSave = vi.fn();
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={onSave}
			/>
		);

		await tippe('#entry-title', 'Zelt stellen');
		expect(speichern()?.disabled).toBe(false);
		await klick(speichern());

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave.mock.calls[0][0]).toMatchObject({
			title: 'Zelt stellen',
			type: 'task',
			schedule_day_id: 'do',
			schedule_phase_id: ''
		});
	});

	it('stellt „Ohne Phase" an die Spitze und zeigt nur die Phasen des Tages', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);
		const text = document.body.textContent ?? '';

		expect(text.indexOf('Ohne Phase')).toBeLessThan(text.indexOf('Anlieferung'));
		expect(text).not.toContain('Frühschoppen');
	});

	it('lässt die Phase zurück, wenn der Eintrag auf einen anderen Tag zieht', async () => {
		const onSave = vi.fn();
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				entry={scheduleTask({ id: 't1', schedule_day_id: 'do', schedule_phase_id: 'p1' })}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={onSave}
			/>
		);

		await waehle('fr');
		await klick(speichern());

		expect(onSave.mock.calls[0][0]).toMatchObject({
			schedule_day_id: 'fr',
			schedule_phase_id: ''
		});
	});

	it('sperrt den Knopf, solange die Startzeit nicht vor der Endzeit liegt', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);

		await tippe('#entry-title', 'Fassanstich');
		await tippe('#entry-start', '18:00');
		await tippe('#entry-end', '17:00');

		expect(speichern()?.disabled).toBe(true);
		expect(document.body.textContent).toContain('Die Startzeit muss vor der Endzeit liegen.');
	});

	it('trägt einen bestehenden Eintrag ins Blatt — die Sekunde der Datenbank fällt weg', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				entry={scheduleTask({
					id: 't1',
					schedule_day_id: 'do',
					title: 'Zelt-Anlieferung',
					start_time: '08:00:00',
					end_time: '10:30:00',
					description: 'Zufahrt freihalten'
				})}
				prefill={NEU}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);

		expect(document.body.textContent).toContain('Eintrag bearbeiten');
		expect(wert('#entry-title')).toBe('Zelt-Anlieferung');
		expect(wert('#entry-start')).toBe('08:00');
		expect(wert('#entry-end')).toBe('10:30');
		expect(wert('#entry-description')).toBe('Zufahrt freihalten');
	});
});

describe('ScheduleEntryDialog — der Art-Wechsel', () => {
	it('zeigt den Verantwortlichen bei der Aufgabe', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={{ type: 'task', schedule_day_id: 'do' }}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);

		expect(document.querySelector('#entry-responsible')).not.toBeNull();
		expect(document.body.textContent).toContain('Hochauer Franz');
	});

	it('nimmt ihn beim Programmpunkt aus dem Blatt (ADR 0007)', async () => {
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={{ type: 'program', schedule_day_id: 'do' }}
				days={TAGE}
				helpers={HELFER}
				onSave={() => {}}
			/>
		);

		expect(document.querySelector('#entry-responsible')).toBeNull();
		expect(document.body.textContent).not.toContain('Hochauer Franz');
	});

	it('schaltet die Art über den Segment-Schalter, nicht über ein Select', async () => {
		const onSave = vi.fn();
		await mount(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				prefill={{ type: 'task', schedule_day_id: 'do' }}
				days={TAGE}
				helpers={HELFER}
				onSave={onSave}
			/>
		);

		expect(document.querySelector('[aria-label="Art"]')?.getAttribute('role')).toBe('radiogroup');

		await tippe('#entry-title', 'Fassanstich');
		await klick(knopf('Programmpunkt'));

		expect(document.querySelector('#entry-responsible')).toBeNull();

		await klick(speichern());
		expect(onSave.mock.calls[0][0].type).toBe('program');
	});
});

describe('ScheduleDayDialog — Datum und Label', () => {
	it('öffnet leer mit gesperrtem Knopf', async () => {
		await mount(<ScheduleDayDialog open onOpenChange={() => {}} onSave={() => {}} />);

		expect(document.body.textContent).toContain('Neuer Ablauf-Tag');
		expect(wert('#day-date')).toBe('');
		expect(speichern()?.disabled).toBe(true);
	});

	it('trägt einen bestehenden Tag hinein und gibt ihn ab', async () => {
		const onSave = vi.fn();
		await mount(
			<ScheduleDayDialog
				open
				onOpenChange={() => {}}
				day={{ date: '2026-07-22', label: 'Aufbau' }}
				onSave={onSave}
			/>
		);

		expect(document.body.textContent).toContain('Tag bearbeiten');
		expect(wert('#day-date')).toBe('2026-07-22');
		expect(wert('#day-label')).toBe('Aufbau');

		await klick(speichern());
		expect(onSave).toHaveBeenCalledWith({ date: '2026-07-22', label: 'Aufbau' });
	});

	it('nimmt ein Datum weit vor dem Fest — die Festtage entstehen automatisch, der Rest von Hand', async () => {
		const onSave = vi.fn();
		await mount(<ScheduleDayDialog open onOpenChange={() => {}} onSave={onSave} />);

		await tippe('#day-date', '2026-06-01');
		expect(speichern()?.disabled).toBe(false);

		await klick(speichern());
		expect(onSave).toHaveBeenCalledWith({ date: '2026-06-01', label: '' });
	});
});

describe('SchedulePhaseDialog — nur ein Name', () => {
	it('verlangt den Namen und nennt den Tag, dem die Phase gehört', async () => {
		await mount(
			<SchedulePhaseDialog
				open
				onOpenChange={() => {}}
				dayTitle="Donnerstag 23. Juli · Aufbau"
				onSave={() => {}}
			/>
		);

		expect(document.body.textContent).toContain('Neue Phase');
		expect(document.body.textContent).toContain('Donnerstag 23. Juli · Aufbau');
		expect(speichern()?.disabled).toBe(true);
	});

	it('trägt nur den Namen — keine Uhrzeit, keine Reihenfolge', async () => {
		const onSave = vi.fn();
		await mount(
			<SchedulePhaseDialog
				open
				onOpenChange={() => {}}
				phase={{ name: 'Anlieferung' }}
				onSave={onSave}
			/>
		);

		expect(document.body.textContent).toContain('Phase umbenennen');
		expect(document.querySelectorAll('input')).toHaveLength(1);

		await tippe('#phase-name', 'Abendprogramm');
		await klick(speichern());

		expect(onSave).toHaveBeenCalledWith({ name: 'Abendprogramm' });
	});
});
