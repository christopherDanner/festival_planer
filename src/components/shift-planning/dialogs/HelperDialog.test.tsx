import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { helper, shift, station } from '@/lib/__tests__/shiftFixtures';
import HelperDialog from './HelperDialog';

/* Seam dieses Tests (aus den Abnahmekriterien von #107 abgeleitet, vor dem
   ersten Test festgehalten): `HelperDialog` ist der *Rahmen* des einen
   Helfer-Blatts — er hält den Formularzustand und gibt beim Speichern
   Stammdaten **und** Wünsche in einem Zug ab. Die Regeln stehen in
   `helperDialogForm`, Optik und Feldschnitt im `HelperZettel`. Hier zählt, dass
   Anlegen, Bearbeiten und Wünsche-Setzen über dasselbe Blatt laufen. */

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

const STATIONS = [station({ id: 's1', name: 'Ausschank' }), station({ id: 's2', name: 'Grill' })];

const SHIFTS = [
	shift({ id: 'sh1', station_id: 's1', name: 'Frühschoppen', start_time: '11:00', end_time: '15:00' }),
	shift({ id: 'sh2', station_id: 's1', name: 'Abend', start_time: '18:00', end_time: '23:00' }),
	shift({ id: 'sh3', station_id: 's2', name: 'Grillen', start_time: '12:00', end_time: '16:00' })
];

const FRANZ = helper({
	id: 'h1',
	first_name: 'Franz',
	last_name: 'Hochauer',
	email: 'franz@example.at',
	phone: '0660 1234567',
	notes: 'kann nur Samstag',
	station_preferences: ['s1'],
	shift_preferences: ['sh1']
});

const mount = async (node: React.ReactElement) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(node);
	});
};

const oeffne = (over: Partial<React.ComponentProps<typeof HelperDialog>> = {}) =>
	mount(
		<HelperDialog
			open
			onOpenChange={() => {}}
			stations={STATIONS}
			stationShifts={SHIFTS}
			onSave={() => {}}
			{...over}
		/>
	);

const speichern = () => document.querySelector<HTMLButtonElement>('[data-zettel="speichern"]');

const klick = async (selector: string) => {
	await act(async () => {
		document
			.querySelector<HTMLElement>(selector)
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

const wert = (id: string) => document.querySelector<HTMLInputElement>(id)?.value;

const marke = (selector: string) => document.querySelector<HTMLButtonElement>(selector);

describe('HelperDialog — ein Blatt für Stammdaten und Wünsche', () => {
	it('trägt die Stammdaten des Helfers ein', async () => {
		await oeffne({ helper: FRANZ });

		expect(document.body.textContent).toContain('Helfer bearbeiten');
		expect(wert('#helper-first-name')).toBe('Franz');
		expect(wert('#helper-last-name')).toBe('Hochauer');
		expect(wert('#helper-email')).toBe('franz@example.at');
		expect(wert('#helper-phone')).toBe('0660 1234567');
		expect(document.querySelector<HTMLTextAreaElement>('#helper-notes')?.value).toBe(
			'kann nur Samstag'
		);
	});

	it('stellt Stammdaten und Wünsche auf dasselbe Blatt', async () => {
		await oeffne({ helper: FRANZ });

		expect(wert('#helper-first-name')).toBe('Franz');
		expect(marke('[data-wish-station="s1"]')).not.toBeNull();
		// Genau ein Papier — zwei Dialoge wären der Zustand vor #107.
		expect(document.querySelectorAll('[data-zettel="speichern"]')).toHaveLength(1);
	});

	it('trennt die beiden Abschnitte mit einem Punktraster-Sektionstrenner', async () => {
		await oeffne({ helper: FRANZ });

		const trenner = document.querySelectorAll('.section-heading__rule');
		expect(trenner).toHaveLength(1);
		expect(trenner[0].parentElement?.textContent).toContain('Wünsche');
	});

	it('kennt weder Aktiv-Haken noch Benutzer-Feld (ADR 0005)', async () => {
		await oeffne({ helper: FRANZ });

		const text = document.body.textContent ?? '';
		expect(text).not.toContain('Aktiv');
		expect(text).not.toContain('Benutzer');
		expect(document.querySelector('input[type="checkbox"]')).toBeNull();
	});

	it('öffnet für einen neuen Helfer ein leeres Blatt mit gesperrtem Knopf', async () => {
		await oeffne();

		expect(document.body.textContent).toContain('Neuer Helfer');
		expect(wert('#helper-first-name')).toBe('');
		expect(speichern()?.disabled).toBe(true);
	});

	it('gibt Stammdaten und beide Wunsch-Arrays in einem Zug ab', async () => {
		const onSave = vi.fn();
		await oeffne({ helper: FRANZ, onSave });
		await klick('[data-zettel="speichern"]');

		expect(onSave).toHaveBeenCalledWith({
			first_name: 'Franz',
			last_name: 'Hochauer',
			email: 'franz@example.at',
			phone: '0660 1234567',
			notes: 'kann nur Samstag',
			station_preferences: ['s1'],
			shift_preferences: ['sh1']
		});
	});
});

describe('HelperDialog — die Wunsch-Marken', () => {
	it('zeigt jede Station als anklickbare Marke, nicht als Auswahlliste', async () => {
		await oeffne({ helper: FRANZ });

		expect(marke('[data-wish-station="s1"]')?.tagName).toBe('BUTTON');
		expect(marke('[data-wish-station="s2"]')?.tagName).toBe('BUTTON');
		expect(document.querySelector('select')).toBeNull();
	});

	it('zeigt die Schichten jeder Station als anklickbare Wertmarken', async () => {
		await oeffne({ helper: FRANZ });

		expect(marke('[data-wish-shift="sh1"]')?.tagName).toBe('BUTTON');
		expect(marke('[data-wish-shift="sh1"]')?.textContent).toContain('Frühschoppen');
		expect(marke('[data-wish-shift="sh1"]')?.textContent).toContain('11–15');
	});

	it('malt die gewählte Marke gelb', async () => {
		await oeffne({ helper: FRANZ });

		expect(marke('[data-wish-station="s1"]')?.outerHTML).toContain('bg-gelb');
		expect(marke('[data-wish-station="s2"]')?.outerHTML).not.toContain('bg-gelb');
		expect(marke('[data-wish-station="s1"]')?.getAttribute('aria-pressed')).toBe('true');
		expect(marke('[data-wish-station="s2"]')?.getAttribute('aria-pressed')).toBe('false');
	});

	it('nimmt einen neuen Stationswunsch auf und gibt ihn mit ab', async () => {
		const onSave = vi.fn();
		await oeffne({ helper: FRANZ, onSave });
		await klick('[data-wish-station="s2"]');
		await klick('[data-zettel="speichern"]');

		expect(onSave.mock.calls[0][0].station_preferences).toEqual(['s1', 's2']);
	});

	it('nimmt beim Abwählen der Station ihre Schichtwünsche mit', async () => {
		const onSave = vi.fn();
		await oeffne({ helper: FRANZ, onSave });
		await klick('[data-wish-station="s1"]');
		await klick('[data-zettel="speichern"]');

		expect(onSave.mock.calls[0][0]).toMatchObject({
			station_preferences: [],
			shift_preferences: []
		});
	});

	it('setzt mit der Schicht auch ihre Station', async () => {
		const onSave = vi.fn();
		await oeffne({ helper: FRANZ, onSave });
		await klick('[data-wish-shift="sh3"]');
		await klick('[data-zettel="speichern"]');

		expect(onSave.mock.calls[0][0]).toMatchObject({
			station_preferences: ['s1', 's2'],
			shift_preferences: ['sh1', 'sh3']
		});
	});

	// ADR 0005: Die Arrays haben keine Fremdschlüssel — eine gelöschte Station
	// bleibt als Karteileiche darin stehen.
	it('überspringt die ID einer gelöschten Station still', async () => {
		const onSave = vi.fn();
		await oeffne({
			helper: helper({ station_preferences: ['s1', 's-weg'], shift_preferences: ['sh-weg'] }),
			onSave
		});
		await klick('[data-zettel="speichern"]');

		expect(onSave.mock.calls[0][0]).toMatchObject({
			station_preferences: ['s1'],
			shift_preferences: []
		});
		expect(document.body.textContent).not.toContain('s-weg');
	});

	it('sagt es, wenn das Fest noch keine Station hat', async () => {
		await oeffne({ helper: FRANZ, stations: [], stationShifts: [] });

		expect(document.body.textContent).toContain('Noch keine Station');
	});
});
