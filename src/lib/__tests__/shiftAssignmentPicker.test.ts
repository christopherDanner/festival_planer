import { describe, expect, it, vi } from 'vitest';

import { createAssignmentPicker } from '@/lib/shiftAssignmentPicker';
import type { AssignTarget } from '@/lib/shiftAssignment';
import { assignment, helper, shift, stationHelper } from './shiftFixtures';

/* Seam dieses Tests (aus den Abnahmekriterien von #104 abgeleitet, vor dem
   ersten Test festgehalten): `shiftAssignmentPicker` hält den Zustand der
   Zuteil-Geste — welche Marke gewählt ist, welches Ziel überfahren wird und
   welche Zeile gerade rot pulst. Store-Muster wie `materialCellEditor`
   (subscribe/getState), damit „Ziehen und Antippen führen zum selben Ergebnis"
   und „Ablehnung pulst, statt zu toasten" ohne Browser prüfbar sind. */

const FRANZ = helper({ id: 'h1', first_name: 'Franz', last_name: 'Hochauer' });
const MARIA = helper({ id: 'h2', first_name: 'Maria', last_name: 'Leitner' });

const SHIFT: AssignTarget = { kind: 'shift', shiftId: 'sh1' };
const STATION: AssignTarget = { kind: 'station', stationId: 's1' };

/** Eine Schicht mit zwei Plätzen, einer davon von Franz belegt. */
const source = () => ({
	stationShifts: [shift({ id: 'sh1', required_people: 2 })],
	assignments: [assignment({ id: 'a1', station_shift_id: 'sh1', helper_id: 'h1', position: 1 })],
	stationHelpers: [stationHelper({ station_id: 's1', helper_id: 'h9' })]
});

function picker(onAssign = vi.fn()) {
	return { onAssign, p: createAssignmentPicker({ onAssign, source, pulseMs: 500 }) };
}

// --- Die gewählte Marke ------------------------------------------------------

describe('Antippen-Paar — die gewählte Marke', () => {
	it('macht den Kasten scharf, sobald eine Marke gewählt ist', () => {
		const { p } = picker();

		p.pick(MARIA);

		expect(p.getState().picked).toEqual(MARIA);
		expect(p.getState().armed).toBe(true);
	});

	it('nimmt sich bei einem zweiten Antippen derselben Marke zurück', () => {
		const { p } = picker();

		p.pick(MARIA);
		p.pick(MARIA);

		expect(p.getState().picked).toBeNull();
		expect(p.getState().armed).toBe(false);
	});

	it('wechselt bei einer anderen Marke, statt zuzuklappen', () => {
		const { p } = picker();

		p.pick(MARIA);
		p.pick(FRANZ);

		expect(p.getState().picked).toEqual(FRANZ);
	});

	it('hebt die Auswahl mit „Abbrechen" auf', () => {
		const { p } = picker();

		p.pick(MARIA);
		p.cancel();

		expect(p.getState().picked).toBeNull();
	});

	it('meldet jeden Schritt an die Zuhörer', () => {
		const { p } = picker();
		const listener = vi.fn();
		p.subscribe(listener);

		p.pick(MARIA);
		p.cancel();

		expect(listener).toHaveBeenCalledTimes(2);
	});
});

// --- Beide Wege, ein Ergebnis ------------------------------------------------

describe('Ziehen und Antippen führen zum selben Ergebnis', () => {
	it('trägt die angetippte Marke auf dem nächsten freien Platz ein', () => {
		const { p, onAssign } = picker();

		p.pick(MARIA);
		p.assign(SHIFT);

		expect(onAssign).toHaveBeenCalledWith(SHIFT, MARIA, 2);
	});

	it('trägt die fallengelassene Marke genauso ein', () => {
		const { p, onAssign } = picker();

		p.dragStart(MARIA);
		p.assign(SHIFT);

		expect(onAssign).toHaveBeenCalledWith(SHIFT, MARIA, 2);
	});

	it('lässt die Auswahl nach dem Eintragen los', () => {
		const { p } = picker();

		p.pick(MARIA);
		p.assign(SHIFT);

		expect(p.getState().picked).toBeNull();
		expect(p.getState().armed).toBe(false);
	});

	it('gibt der Stationsmitgliedschaft keine Platznummer mit', () => {
		const { p, onAssign } = picker();

		p.pick(MARIA);
		p.assign(STATION);

		expect(onAssign).toHaveBeenCalledWith(STATION, MARIA, null);
	});

	it('tut nichts, solange keine Marke in der Hand ist', () => {
		const { p, onAssign } = picker();

		p.assign(SHIFT);

		expect(onAssign).not.toHaveBeenCalled();
	});
});

// --- Drag & Drop gehärtet ----------------------------------------------------

describe('Drag & Drop — der Cursor sagt die Wahrheit', () => {
	it('nimmt ein gültiges Ziel an und hebt es hervor', () => {
		const { p } = picker();

		p.dragStart(MARIA);

		expect(p.dragOver(SHIFT)).toBe(true);
		expect(p.getState().overKey).toBe('sh1');
	});

	it('lehnt die volle Schicht schon beim Überfahren ab', () => {
		const voll = createAssignmentPicker({
			onAssign: vi.fn(),
			source: () => ({ ...source(), stationShifts: [shift({ id: 'sh1', required_people: 1 })] })
		});
		voll.dragStart(MARIA);

		expect(voll.dragOver(SHIFT)).toBe(false);
		expect(voll.getState().overKey).toBeNull();
	});

	it('lehnt ab, wer schon in der Schicht steht — Ziehen kann gar nicht doppeln', () => {
		const { p } = picker();

		p.dragStart(FRANZ);

		expect(p.dragOver(SHIFT)).toBe(false);
	});

	it('hebt nichts hervor, solange niemand zieht', () => {
		const { p } = picker();

		p.pick(MARIA);

		expect(p.dragOver(SHIFT)).toBe(false);
		expect(p.getState().overKey).toBeNull();
	});

	it('nimmt die Hervorhebung zurück, sobald der Zeiger die Zeile verlässt', () => {
		const { p } = picker();

		p.dragStart(MARIA);
		p.dragOver(SHIFT);
		p.dragLeave(SHIFT);

		expect(p.getState().overKey).toBeNull();
	});

	it('lässt die Hervorhebung stehen, wenn eine andere Zeile verlassen wird', () => {
		const { p } = picker();

		p.dragStart(MARIA);
		p.dragOver(SHIFT);
		p.dragLeave(STATION);

		expect(p.getState().overKey).toBe('sh1');
	});

	it('räumt beim Loslassen auf, auch wenn außerhalb jedes Ziels losgelassen wurde', () => {
		const { p } = picker();

		p.dragStart(MARIA);
		p.dragOver(SHIFT);
		p.dragEnd();

		expect(p.getState().overKey).toBeNull();
		// Nichts hängt mehr am Zeiger: das nächste Überfahren nimmt nichts an.
		expect(p.dragOver(SHIFT)).toBe(false);
	});

	it('lässt eine gewählte Marke vom abgebrochenen Ziehen unberührt', () => {
		// Gewählt und gezogen sind zwei Gesten; ein abgebrochenes Ziehen darf die
		// Auswahl nicht mitnehmen.
		const { p } = picker();

		p.pick(MARIA);
		p.dragStart(MARIA);
		p.dragEnd();

		expect(p.getState().picked).toEqual(MARIA);
	});

	it('nimmt dem Kasten den scharfen Zustand, solange etwas am Zeiger hängt', () => {
		// Sonst wäre jede Zeile scharf und die gezielte Hervorhebung unsichtbar.
		const { p } = picker();

		p.pick(FRANZ);
		p.dragStart(MARIA);

		expect(p.getState().armed).toBe(false);
		expect(p.getState().overKey).toBeNull();
	});

	it('gibt den scharfen Zustand nach dem Loslassen wieder her', () => {
		const { p } = picker();

		p.pick(FRANZ);
		p.dragStart(MARIA);
		p.dragEnd();

		expect(p.getState().armed).toBe(true);
	});
});

// --- Ablehnung als Rot-Puls --------------------------------------------------

describe('Ablehnung — 0,5 s Rot-Puls am Ziel statt Toast', () => {
	it('schreibt nichts weg und merkt sich die volle Schicht', () => {
		const onAssign = vi.fn();
		const p = createAssignmentPicker({
			onAssign,
			source: () => ({ ...source(), stationShifts: [shift({ id: 'sh1', required_people: 1 })] }),
			pulseMs: 500
		});

		p.pick(MARIA);
		p.assign(SHIFT);

		expect(onAssign).not.toHaveBeenCalled();
		expect(p.getState().rejected).toMatchObject({ key: 'sh1', reason: 'full', kind: 'shift' });
	});

	it('pulst auch bei der Doppelzuweisung', () => {
		const { p, onAssign } = picker();

		p.pick(FRANZ);
		p.assign(SHIFT);

		expect(onAssign).not.toHaveBeenCalled();
		expect(p.getState().rejected).toMatchObject({ key: 'sh1', reason: 'duplicate' });
	});

	it('behält die Marke in der Hand — der nächste Platz soll ohne Suchen gehen', () => {
		const { p } = picker();

		p.pick(FRANZ);
		p.assign(SHIFT);

		expect(p.getState().picked).toEqual(FRANZ);
	});

	it('zählt bei derselben Zeile hoch, damit die Animation neu anspringt', () => {
		const { p } = picker();

		p.pick(FRANZ);
		p.assign(SHIFT);
		const erster = p.getState().rejected?.nonce;
		p.assign(SHIFT);

		expect(p.getState().rejected?.nonce).not.toBe(erster);
	});

	it('verklingt nach der Pulsdauer', async () => {
		vi.useFakeTimers();
		try {
			const { p } = picker();

			p.pick(FRANZ);
			p.assign(SHIFT);
			vi.advanceTimersByTime(500);

			expect(p.getState().rejected).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('lässt den zweiten Puls stehen, wenn der erste inzwischen verklingt', () => {
		vi.useFakeTimers();
		try {
			const { p } = picker();

			p.pick(FRANZ);
			p.assign(SHIFT);
			vi.advanceTimersByTime(400);
			p.assign(SHIFT);
			// Der Wecker des ersten Pulses läuft jetzt ab — er darf den zweiten nicht
			// mitnehmen.
			vi.advanceTimersByTime(200);

			expect(p.getState().rejected).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});
});
