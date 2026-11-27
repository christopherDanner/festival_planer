import { describe, expect, it } from 'vitest';

import { checkAssignment, nextFreePosition, rejectText, targetKey } from '@/lib/shiftAssignment';
import { assignment, shift, stationHelper } from './shiftFixtures';

/* Seam dieses Tests (aus den Abnahmekriterien von #104 abgeleitet, vor dem
   ersten Test festgehalten): `shiftAssignment` ist die **eine** Regel des
   Zuteilens — Platzvergabe und die beiden fachlichen Ablehnungen. Ziehen und
   Antippen führen nur dann „zum selben Ergebnis", wenn beide Wege dieselbe
   Funktion fragen; heute steht die Regel zweimal in `ShiftPlanningView`. */

describe('nextFreePosition — die kleinste freie Platznummer', () => {
	it('beginnt bei einer leeren Schicht mit 1', () => {
		expect(nextFreePosition([])).toBe(1);
	});

	it('füllt die Lücke, die ein Entfernen hinterlassen hat', () => {
		// Platz 2 ist frei geworden — der nächste setzt sich dorthin, nicht auf 4.
		expect(nextFreePosition([{ position: 1 }, { position: 3 }])).toBe(2);
	});

	it('hängt hinten an, solange die Nummern lückenlos sind', () => {
		expect(nextFreePosition([{ position: 2 }, { position: 1 }])).toBe(3);
	});
});

// --- Die beiden fachlichen Ablehnungen ---------------------------------------

describe('checkAssignment — eine Schicht', () => {
	const SOURCE = {
		stationShifts: [shift({ id: 'sh1', required_people: 2 })],
		assignments: [assignment({ id: 'a1', station_shift_id: 'sh1', helper_id: 'h1', position: 1 })],
		stationHelpers: []
	};
	const target = { kind: 'shift', shiftId: 'sh1' } as const;

	it('nimmt einen neuen Helfer auf dem nächsten freien Platz an', () => {
		expect(checkAssignment(target, 'h2', SOURCE)).toEqual({ outcome: 'ok', position: 2 });
	});

	it('lehnt die volle Schicht ab', () => {
		const voll = {
			...SOURCE,
			stationShifts: [shift({ id: 'sh1', required_people: 1 })]
		};

		expect(checkAssignment(target, 'h2', voll)).toEqual({ outcome: 'rejected', reason: 'full' });
	});

	it('lehnt ab, wer schon in dieser Schicht steht', () => {
		expect(checkAssignment(target, 'h1', SOURCE)).toEqual({ outcome: 'rejected', reason: 'duplicate' });
	});

	it('nennt die Doppelung auch dann, wenn die Schicht ohnehin voll wäre', () => {
		// Beide Gründe treffen zu; der genauere gewinnt — „schon drin" erklärt dem
		// Bediener, warum *dieser* Helfer nicht geht, „voll" nur die Schicht.
		const voll = { ...SOURCE, stationShifts: [shift({ id: 'sh1', required_people: 1 })] };

		expect(checkAssignment(target, 'h1', voll)).toEqual({ outcome: 'rejected', reason: 'duplicate' });
	});

	it('kennt eine Schicht nicht, die es nicht gibt', () => {
		expect(checkAssignment({ kind: 'shift', shiftId: 'weg' }, 'h2', SOURCE)).toEqual({
			outcome: 'rejected',
			reason: 'gone'
		});
	});
});

describe('checkAssignment — die Stationsmitglieder', () => {
	const SOURCE = {
		stationShifts: [],
		assignments: [],
		stationHelpers: [stationHelper({ station_id: 's1', helper_id: 'h9' })]
	};
	const target = { kind: 'station', stationId: 's1' } as const;

	it('nimmt an, ohne eine Platznummer zu vergeben', () => {
		// `station_helpers` führt keine Positionen — die Mitgliedschaft ist keine
		// Platzbelegung, sondern eine Liste.
		expect(checkAssignment(target, 'h1', SOURCE)).toEqual({ outcome: 'ok', position: null });
	});

	it('lehnt ab, wer schon in dieser Station steht', () => {
		expect(checkAssignment(target, 'h9', SOURCE)).toEqual({ outcome: 'rejected', reason: 'duplicate' });
	});

	it('zählt nur die Mitglieder dieser Station', () => {
		expect(checkAssignment({ kind: 'station', stationId: 's2' }, 'h9', SOURCE)).toEqual({
			outcome: 'ok',
			position: null
		});
	});
});

// --- Schlüssel und Wortlaut --------------------------------------------------

describe('targetKey — Ziel und Zeile tragen dieselbe Kennung', () => {
	it('nennt die Schicht bei ihrer Id', () => {
		expect(targetKey({ kind: 'shift', shiftId: 'sh1' })).toBe('sh1');
	});

	it('stellt der Station ihr Präfix voran, damit sie nie mit einer Schicht kollidiert', () => {
		expect(targetKey({ kind: 'station', stationId: 's1' })).toBe('station:s1');
	});
});

describe('rejectText — was ein Screenreader vom Rot-Puls hat', () => {
	it('nennt die volle Schicht beim Namen', () => {
		expect(rejectText('full', 'shift')).toBe('Diese Schicht ist bereits vollständig besetzt.');
	});

	it('unterscheidet die Doppelung in der Schicht von der in der Station', () => {
		expect(rejectText('duplicate', 'shift')).toContain('Schicht');
		expect(rejectText('duplicate', 'station')).toContain('Station');
	});
});
