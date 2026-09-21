import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { Helper } from '@/lib/helperService';
import type { Station, StationShift } from '@/lib/shiftService';
import StationDialog from './StationDialog';
import StationShiftDialog from './StationShiftDialog';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   Die beiden Dialoge sind die *Rahmen* — sie halten den Formularzustand und
   geben beim Speichern ab. Optik und Feldschnitt stehen in StationZettel /
   ShiftZettel, die Regeln in `shiftDialogForm`. Hier zählt nur, dass beides
   zusammen im geöffneten Dialog ankommt. */

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

const STATION = {
	id: 's1',
	festival_id: 'f1',
	name: 'Ausschank',
	required_people: 3,
	description: 'Zelt Nord',
	responsible_helper_id: 'h1'
} as Station;

const HELPERS = [{ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' }] as Helper[];

const SHIFT = {
	id: 'sh1',
	festival_id: 'f1',
	station_id: 's1',
	name: 'Nachtschicht',
	start_date: '2026-07-25',
	start_time: '23:00',
	end_date: '2026-07-26',
	end_time: '02:00',
	required_people: 2
} as StationShift;

const mount = async (node: React.ReactElement) => {
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(node);
	});
};

const speichern = () => document.querySelector<HTMLButtonElement>('[data-zettel="speichern"]');

const klickSpeichern = async () => {
	await act(async () => {
		speichern()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
};

const wert = (id: string) => document.querySelector<HTMLInputElement>(id)?.value;

describe('StationDialog', () => {
	it('trägt eine bestehende Station in den Zettel', async () => {
		await mount(
			<StationDialog open onOpenChange={() => {}} station={STATION} helpers={HELPERS} onSave={() => {}} />
		);

		expect(document.body.textContent).toContain('Station bearbeiten');
		expect(wert('#station-name')).toBe('Ausschank');
		expect(wert('#station-place')).toBe('Zelt Nord');
		expect(wert('#station-required')).toBe('3');
		expect(document.body.textContent).toContain('Hochauer Franz');
	});

	it('gibt beim Speichern die Felder der Station ab', async () => {
		const onSave = vi.fn();
		await mount(
			<StationDialog open onOpenChange={() => {}} station={STATION} helpers={HELPERS} onSave={onSave} />
		);
		await klickSpeichern();

		expect(onSave).toHaveBeenCalledWith({
			name: 'Ausschank',
			description: 'Zelt Nord',
			required_people: 3,
			responsible_helper_id: 'h1'
		});
	});

	it('öffnet für eine neue Station ein leeres Blatt mit gesperrtem Knopf', async () => {
		await mount(<StationDialog open onOpenChange={() => {}} helpers={HELPERS} onSave={() => {}} />);

		expect(document.body.textContent).toContain('Neue Station');
		expect(wert('#station-name')).toBe('');
		expect(speichern()?.disabled).toBe(true);
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', async () => {
		await mount(<StationDialog open onOpenChange={() => {}} helpers={HELPERS} onSave={() => {}} />);

		const schliessen = [...document.querySelectorAll('button')].filter((b) =>
			(b.textContent ?? '').includes('Schließen')
		);
		expect(schliessen).toHaveLength(1);
	});
});

describe('StationShiftDialog', () => {
	it('trägt eine bestehende Schicht in den Zettel — samt Enddatum', async () => {
		await mount(
			<StationShiftDialog
				open
				onOpenChange={() => {}}
				station={STATION}
				stationShift={SHIFT}
				onSave={() => {}}
			/>
		);

		expect(document.body.textContent).toContain('Schicht bearbeiten');
		expect(wert('#shift-start-date')).toBe('2026-07-25');
		expect(wert('#shift-end-date')).toBe('2026-07-26');
		expect(document.body.textContent).toContain('23–02 +1');
	});

	it('gibt das abweichende Enddatum weiter — daraus wird die Zeile beim Starttag', async () => {
		const onSave = vi.fn();
		await mount(
			<StationShiftDialog
				open
				onOpenChange={() => {}}
				station={STATION}
				stationShift={SHIFT}
				onSave={onSave}
			/>
		);
		await klickSpeichern();

		expect(onSave).toHaveBeenCalledWith({
			name: 'Nachtschicht',
			start_date: '2026-07-25',
			start_time: '23:00',
			end_date: '2026-07-26',
			end_time: '02:00',
			required_people: 2
		});
	});

	it('erbt bei einer neuen Schicht das Soll der Station', async () => {
		await mount(
			<StationShiftDialog open onOpenChange={() => {}} station={STATION} onSave={() => {}} />
		);

		expect(document.body.textContent).toContain('Neue Schicht für Ausschank');
		expect(wert('#shift-required')).toBe('3');
		expect(speichern()?.disabled).toBe(true);
	});
});
