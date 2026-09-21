import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { autoAssignScope } from '@/lib/autoAssignScope';
import type { ShiftAssignment, Station, StationShift } from '@/lib/shiftService';
import AutoAssignDialog from './AutoAssignDialog';

/* Seam dieses Tests (aus den Abnahmekriterien von #108 abgeleitet, vor dem
   ersten Test festgehalten): `AutoAssignDialog` ist der Rahmen — er hält die
   Einstellung der zwei Regler und die **Rückfrage** vor dem Löschen. Die Optik
   prüft AutoAssignZettel.test.tsx, die Wortlaute autoAssignScope.test.ts; hier
   zählt nur, dass kein Lösch-Weg mehr ohne Rückfrage läuft. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const station = (over: Partial<Station> = {}): Station => ({
	id: 'st-1',
	festival_id: 'f1',
	name: 'Ausschank',
	required_people: 0,
	created_at: '',
	updated_at: '',
	...over
});

const shift = (id: string, stationId: string): StationShift =>
	({ id, festival_id: 'f1', station_id: stationId }) as StationShift;

const assignment = (id: string, stationId: string): ShiftAssignment =>
	({ id, festival_id: 'f1', station_id: stationId, helper_id: `h-${id}` }) as ShiftAssignment;

const SHIFTS = [shift('sh-1', 'st-1'), shift('sh-2', 'st-2')];
const ASSIGNMENTS = [
	assignment('a-1', 'st-1'),
	assignment('a-2', 'st-1'),
	assignment('a-3', 'st-2')
];

const mount = async (over: Partial<React.ComponentProps<typeof AutoAssignDialog>> = {}) => {
	const handlers = {
		onAssign: vi.fn(),
		onClear: vi.fn(),
		onOpenChange: vi.fn()
	};
	const host = document.createElement('div');
	document.body.appendChild(host);
	await act(async () => {
		createRoot(host).render(
			<AutoAssignDialog
				open
				scope={autoAssignScope(null, SHIFTS, ASSIGNMENTS)}
				isLoading={false}
				{...handlers}
				{...over}
			/>
		);
	});
	return handlers;
};

const click = (selector: string) =>
	act(async () => {
		document
			.querySelector<HTMLElement>(selector)
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});

/** React hört auf den nativen Setter, nicht auf `input.value = …`. */
const type = (selector: string, value: string) =>
	act(async () => {
		const input = document.querySelector<HTMLInputElement>(selector);
		if (!input) return;
		Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
			input,
			value
		);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('AutoAssignDialog — Rückfrage vor dem Löschen', () => {
	it('löscht auf den Knopf hin noch nichts, sondern fragt zurück', async () => {
		const { onClear } = await mount();

		await click('[data-auto="loeschen"]');

		expect(onClear).not.toHaveBeenCalled();
		expect(document.querySelector('[data-auto="loeschen-bestaetigen"]')).not.toBeNull();
	});

	it('nennt in der Rückfrage die Zahl der betroffenen Zuweisungen', async () => {
		await mount();

		await click('[data-auto="loeschen"]');

		expect(document.body.textContent).toContain('3 Zuweisungen');
	});

	it('nennt im eingeschränkten Lauf die Station und nur deren Zahl', async () => {
		await mount({ scope: autoAssignScope(station(), SHIFTS, ASSIGNMENTS) });

		await click('[data-auto="loeschen"]');

		expect(document.body.textContent).toContain('2 Zuweisungen');
		expect(document.body.textContent).toContain('Ausschank');
	});

	it('löscht erst, wenn die Rückfrage bejaht ist', async () => {
		const { onClear } = await mount();

		await click('[data-auto="loeschen"]');
		await click('[data-auto="loeschen-bestaetigen"]');

		expect(onClear).toHaveBeenCalledTimes(1);
		expect(onClear).toHaveBeenCalledWith(undefined);
	});

	it('gibt die Station mit, über die gefragt wurde — nicht die von irgendwann', async () => {
		const { onClear } = await mount({ scope: autoAssignScope(station(), SHIFTS, ASSIGNMENTS) });

		await click('[data-auto="loeschen"]');
		await click('[data-auto="loeschen-bestaetigen"]');

		expect(onClear).toHaveBeenCalledWith('st-1');
	});

	it('löscht nicht, wenn die Rückfrage abgebrochen wird', async () => {
		const { onClear } = await mount();

		await click('[data-auto="loeschen"]');
		await click('[data-auto="loeschen-abbrechen"]');

		expect(onClear).not.toHaveBeenCalled();
	});

	it('steht ungefragt nicht im Bild', async () => {
		await mount();

		expect(document.querySelector('[data-auto="loeschen-bestaetigen"]')).toBeNull();
	});
});

describe('AutoAssignDialog — der Umfang bleibt beim Zumachen stehen', () => {
	it('wechselt die Aufschrift nicht, während Radix noch ausblendet', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root = createRoot(host);
		const zettel = (open: boolean, scope = autoAssignScope(station(), SHIFTS, ASSIGNMENTS)) => (
			<AutoAssignDialog
				open={open}
				scope={scope}
				isLoading={false}
				onAssign={() => {}}
				onClear={() => {}}
				onOpenChange={() => {}}
			/>
		);

		await act(async () => root.render(zettel(true)));
		expect(document.body.textContent).toContain('nur Ausschank');

		// Die Ansicht setzt den Umfang beim Schließen sofort auf „ganzes Fest"
		// zurück — der Zettel hängt dann noch im Ausblenden.
		await act(async () => root.render(zettel(false, autoAssignScope(null, SHIFTS, ASSIGNMENTS))));
		expect(document.body.textContent).not.toContain('Alle Zuweisungen löschen');
	});
});

describe('AutoAssignDialog — Zuteilen', () => {
	it('gibt die Einstellung der Regler weiter', async () => {
		const { onAssign } = await mount();

		await type('#auto-max-shifts', '5');
		await click('[data-auto="zuteilen"]');

		expect(onAssign).toHaveBeenCalledWith({
			minShiftsPerHelper: 1,
			maxShiftsPerHelper: 5,
			respectPreferences: true
		});
	});

	it('macht sich nicht selbst zu — der Lauf läuft noch', async () => {
		// Sonst wäre „Zuteilen…" ein Zustand, den nie jemand zu sehen bekommt;
		// zugemacht wird, wenn die Mutation durch ist.
		const { onOpenChange } = await mount();

		await click('[data-auto="zuteilen"]');

		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('sagt an, dass es läuft, statt leer dazustehen', async () => {
		await mount({ isLoading: true });

		expect(document.querySelector('[data-auto="zuteilen"]')?.textContent).toBe('Zuteilen...');
	});

	it('bringt genau einen Schließen-Knopf mit — den im Plakat-Kopf', async () => {
		await mount();

		const schliessen = [...document.querySelectorAll('button')].filter((b) =>
			(b.textContent ?? '').includes('Schließen')
		);
		expect(schliessen).toHaveLength(1);
	});
});
