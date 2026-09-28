import { describe, it, expect } from 'vitest';

import { schedulePhase as phase } from './scheduleFactories';
import { canMovePhase, movePhase } from '../schedulePhaseOrder';

/**
 * Seam dieses Tests (aus #124 „nach oben / nach unten" abgeleitet, vor dem
 * ersten Test festgehalten): `schedulePhaseOrder` beantwortet, ob eine Phase
 * sich noch verschieben lässt und welche `sort_order` danach gelten —
 * `reorderSchedulePhases` schreibt nur noch weg.
 *
 * Phasen tragen keine Uhrzeit, darum reiht sie die Hand (ADR 0007).
 */

const DREI = [
	phase({ id: 'p1', name: 'Anlieferung', sort_order: 0 }),
	phase({ id: 'p2', name: 'Aufbau', sort_order: 1 }),
	phase({ id: 'p3', name: 'Abbau', sort_order: 2 })
];

/** Die Reihe, wie sie nach dem Zug steht — Namen in der neuen Ordnung. */
const reihe = (phases: typeof DREI, order: { id: string; sort_order: number }[]) =>
	[...order]
		.sort((a, b) => a.sort_order - b.sort_order)
		.map(({ id }) => phases.find((p) => p.id === id)?.name);

describe('canMovePhase — wo die Reihe endet', () => {
	it('lässt die mittlere Phase in beide Richtungen', () => {
		expect(canMovePhase(DREI, 'p2', 'up')).toBe(true);
		expect(canMovePhase(DREI, 'p2', 'down')).toBe(true);
	});

	it('sperrt die erste nach oben und die letzte nach unten', () => {
		expect(canMovePhase(DREI, 'p1', 'up')).toBe(false);
		expect(canMovePhase(DREI, 'p3', 'down')).toBe(false);
	});

	it('kennt eine fremde Phase nicht', () => {
		expect(canMovePhase(DREI, 'weg', 'up')).toBe(false);
	});

	it('bewegt eine einzelne Phase nirgendwohin', () => {
		expect(canMovePhase([DREI[0]], 'p1', 'up')).toBe(false);
		expect(canMovePhase([DREI[0]], 'p1', 'down')).toBe(false);
	});
});

describe('movePhase — die neue Reihenfolge', () => {
	it('tauscht mit dem Nachbarn über der Phase', () => {
		expect(reihe(DREI, movePhase(DREI, 'p2', 'up'))).toEqual([
			'Aufbau',
			'Anlieferung',
			'Abbau'
		]);
	});

	it('tauscht mit dem Nachbarn unter der Phase', () => {
		expect(reihe(DREI, movePhase(DREI, 'p2', 'down'))).toEqual([
			'Anlieferung',
			'Abbau',
			'Aufbau'
		]);
	});

	it('nummeriert lückenlos von 0 durch — auch bei krummen Ausgangswerten', () => {
		const krumm = [
			phase({ id: 'p1', sort_order: 5 }),
			phase({ id: 'p2', sort_order: 5 }),
			phase({ id: 'p3', sort_order: 9 })
		];

		expect(movePhase(krumm, 'p3', 'up')).toEqual([
			{ id: 'p1', sort_order: 0 },
			{ id: 'p3', sort_order: 1 },
			{ id: 'p2', sort_order: 2 }
		]);
	});

	it('gibt am Rand der Reihe nichts zu schreiben', () => {
		expect(movePhase(DREI, 'p1', 'up')).toEqual([]);
		expect(movePhase(DREI, 'p3', 'down')).toEqual([]);
		expect(movePhase(DREI, 'weg', 'down')).toEqual([]);
	});
});
