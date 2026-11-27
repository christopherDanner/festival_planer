import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// Das Radix-Select ist in jsdom nicht bedienbar (es hängt an Pointer-Capture) —
// derselbe Ersatz wie in `TaskWorklist.test`: jeder Eintrag wird ein Knopf.
vi.mock('@/components/ui/select', async () => {
	const React = await import('react');
	const Pick = React.createContext<(value: string) => void>(() => {});
	type Kinder = { children?: React.ReactNode };

	return {
		Select: ({ onValueChange, children }: Kinder & { onValueChange: (v: string) => void }) =>
			React.createElement(Pick.Provider, { value: onValueChange }, children),
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

import type { Helper } from '@/lib/helperService';
import { entryPayload, type ScheduleEntryForm } from '@/lib/scheduleDialogForm';
import ScheduleEntryDialog from './ScheduleEntryDialog';

/**
 * Seam dieses Tests: der Eintrag-Dialog liefert sein Formular ab, die
 * Nutzlast baut `entryPayload` (#124). Eingeklagt wird hier, was #123 an ihm
 * braucht — der **Modus Programmpunkt**: der tagesbezogene Griff am Zettel legt
 * ohne Tagesauswahl an, und ein Programmpunkt trägt weder Status noch
 * Verantwortlichen (ADR 0007).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	Element.prototype.scrollIntoView ??= () => {};
});

const gemountet: Array<{ unmount: () => void }> = [];

afterEach(async () => {
	await act(async () => {
		gemountet.splice(0).forEach((root) => root.unmount());
	});
	document.body.innerHTML = '';
});

const TAGE = [
	{ id: 'fr', date: '2026-07-24', label: null },
	{ id: 'sa', date: '2026-07-25', label: null }
];

const HELFER = [{ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }] as Helper[];

type Props = React.ComponentProps<typeof ScheduleEntryDialog>;
type Prefill = Props['prefill'];

const mount = async (prefill: Partial<Prefill> = {}, over: Partial<Props> = {}) => {
	const onSave = vi.fn<(form: ScheduleEntryForm) => void>();
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	gemountet.push(root);
	await act(async () => {
		root.render(
			<ScheduleEntryDialog
				open
				onOpenChange={() => {}}
				entry={null}
				prefill={{ type: 'program', schedule_day_id: 'sa', ...prefill }}
				days={TAGE}
				helpers={HELFER}
				onSave={onSave}
				{...over}
			/>
		);
	});
	return { onSave };
};

const tippe = async (id: string, wert: string) => {
	const feld = document.querySelector(`#${id}`) as HTMLInputElement;
	await act(async () => {
		const setter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			'value'
		)?.set;
		setter?.call(feld, wert);
		feld.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

const klick = async (element: Element | null | undefined) => {
	await act(async () => {
		element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

const speichern = async () =>
	klick(
		[...document.querySelectorAll('button')].find((knopf) => knopf.textContent === 'Anlegen')
	);

describe('ScheduleEntryDialog — der tagesbezogene Griff', () => {
	it('fragt den Tag nicht, wo der Griff ihn schon kennt', async () => {
		await mount({ dayLocked: true });

		expect(document.querySelector('#entry-day')).toBeNull();
	});

	it('nennt ihn trotzdem — wo der Eintrag landet, darf nicht geraten werden', async () => {
		await mount({ dayLocked: true });

		expect(document.body.textContent).toContain('Samstag 25. Juli');
	});

	it('lässt wählen, wenn der mitgebrachte Tag gar nicht im Fest steht', async () => {
		await mount({ dayLocked: true, schedule_day_id: 'weg' });

		expect(document.querySelector('#entry-day')).not.toBeNull();
	});

	it('legt dann für genau diesen Tag an', async () => {
		const { onSave } = await mount({ dayLocked: true });

		await tippe('entry-title', 'Fassanstich');
		await speichern();

		expect(onSave.mock.calls[0][0].schedule_day_id).toBe('sa');
	});

	it('lässt den Tag wählen, wo der Griff ihn nicht kennt (Werkzeugleiste)', async () => {
		const { onSave } = await mount();

		expect(document.querySelector('#entry-day')).not.toBeNull();
		await tippe('entry-title', 'Fassanstich');
		await klick(document.querySelector('[data-wahl="fr"]'));
		await speichern();

		expect(onSave.mock.calls[0][0].schedule_day_id).toBe('fr');
	});
});

describe('ScheduleEntryDialog — Programmpunkt trägt weder Status noch Verantwortlichen', () => {
	it('bietet dem Programmpunkt kein Verantwortlichen-Feld an', async () => {
		await mount();

		expect(document.querySelector('#entry-responsible')).toBeNull();
	});

	it('speichert ihn ohne Status und ohne Verantwortlichen', async () => {
		const { onSave } = await mount();

		await tippe('entry-title', 'Frühschoppen');
		await speichern();

		const form = onSave.mock.calls[0][0];
		expect(form.type).toBe('program');
		expect(entryPayload(form, { festivalId: 'f1', status: null })).toMatchObject({
			status: null,
			responsible_helper_id: null
		});
	});

	it('lässt der Aufgabe beides', async () => {
		const { onSave } = await mount({ type: 'task' });

		expect(document.querySelector('#entry-responsible')).not.toBeNull();
		await tippe('entry-title', 'Zeltabbau');
		await klick(document.querySelector('[data-wahl="h1"]'));
		await speichern();

		const form = onSave.mock.calls[0][0];
		expect(form.type).toBe('task');
		expect(entryPayload(form, { festivalId: 'f1', status: null })).toMatchObject({
			status: 'open',
			responsible_helper_id: 'h1'
		});
	});
});
