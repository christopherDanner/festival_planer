import { describe, expect, it } from 'vitest';

import { autoAssignScope } from '../autoAssignScope';
import type { ShiftAssignment, Station, StationShift } from '../shiftService';

/* Seam dieses Tests (aus den Abnahmekriterien von #108 abgeleitet, vor dem
   ersten Test festgehalten): `autoAssignScope` beantwortet **eine** Frage —
   worüber läuft dieser Lauf der Auto-Zuteilung? Aus der Station (oder ihrem
   Fehlen) fallen Titel, Schicht-Array, Wortlaut des Lösch-Knopfs und die
   Rückfrage samt Zahl. Titel und Zahl stehen hier zusammen mit dem gefilterten
   Array, damit die Aufschrift nicht behaupten kann, was der Lauf nicht tut. */

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

const SHIFTS = [shift('sh-1', 'st-1'), shift('sh-2', 'st-1'), shift('sh-3', 'st-2')];
const ASSIGNMENTS = [
	assignment('a-1', 'st-1'),
	assignment('a-2', 'st-1'),
	assignment('a-3', 'st-2')
];

describe('autoAssignScope — ganzes Fest', () => {
	it('heißt schlicht Auto-Zuteilung', () => {
		expect(autoAssignScope(null, SHIFTS, ASSIGNMENTS).title).toBe('Auto-Zuteilung');
	});

	it('nimmt alle Schichten mit', () => {
		expect(autoAssignScope(null, SHIFTS, ASSIGNMENTS).shifts).toEqual(SHIFTS);
	});

	it('löscht über den Knopf „Alle Zuweisungen löschen" und zählt alle', () => {
		const scope = autoAssignScope(null, SHIFTS, ASSIGNMENTS);

		expect(scope.clearLabel).toBe('Alle Zuweisungen löschen');
		expect(scope.clearCount).toBe(3);
	});

	it('nennt in der Rückfrage die Zahl und das ganze Fest', () => {
		expect(autoAssignScope(null, SHIFTS, ASSIGNMENTS).clearQuestion).toContain('3 Zuweisungen');
		expect(autoAssignScope(null, SHIFTS, ASSIGNMENTS).clearQuestion).toContain('ganzen Fest');
	});
});

describe('autoAssignScope — nur eine Station', () => {
	it('schreibt die Station in den Titel', () => {
		expect(autoAssignScope(station(), SHIFTS, ASSIGNMENTS).title).toBe(
			'Auto-Zuteilung · nur Ausschank'
		);
	});

	it('reicht nur die Schichten dieser Station weiter', () => {
		// Einschränken heißt ein gefiltertes Array — der Service bleibt unberührt.
		expect(autoAssignScope(station(), SHIFTS, ASSIGNMENTS).shifts.map((s) => s.id)).toEqual([
			'sh-1',
			'sh-2'
		]);
	});

	it('löscht über den Knopf „Zuweisungen dieser Station löschen" und zählt nur ihre', () => {
		const scope = autoAssignScope(station(), SHIFTS, ASSIGNMENTS);

		expect(scope.clearLabel).toBe('Zuweisungen dieser Station löschen');
		expect(scope.clearCount).toBe(2);
	});

	it('nennt in der Rückfrage die Zahl und den Stationsnamen', () => {
		const scope = autoAssignScope(station(), SHIFTS, ASSIGNMENTS);

		expect(scope.clearQuestion).toContain('2 Zuweisungen');
		expect(scope.clearQuestion).toContain('Ausschank');
	});
});

describe('autoAssignScope — die Zahl in der Rückfrage', () => {
	it('sagt bei genau einer Zuweisung Einzahl', () => {
		const scope = autoAssignScope(station(), SHIFTS, [assignment('a-1', 'st-1')]);

		expect(scope.clearCount).toBe(1);
		expect(scope.clearQuestion).toContain('1 Zuweisung ');
	});

	it('zählt null, wo nichts zu löschen ist — der Knopf hat dann keine Arbeit', () => {
		expect(autoAssignScope(station({ id: 'st-9' }), SHIFTS, ASSIGNMENTS).clearCount).toBe(0);
	});

	it('zählt nur besetzte Plätze — eine Zeile ohne Helfer sieht niemand', () => {
		// Der Fokus-Kasten hält einen Platz am *Namen* für belegt, die
		// Auto-Zuteilung zählt über `helper_id`. Die Rückfrage verspricht
		// dieselbe Zahl, sonst nennt sie mehr, als auf dem Brett steht.
		const ohneHelfer = { id: 'a-9', festival_id: 'f1', station_id: 'st-1' } as ShiftAssignment;

		expect(autoAssignScope(null, SHIFTS, [...ASSIGNMENTS, ohneHelfer]).clearCount).toBe(3);
	});

	it('warnt, dass sich das nicht rückgängig machen lässt', () => {
		expect(autoAssignScope(null, SHIFTS, ASSIGNMENTS).clearQuestion).toContain(
			'nicht rückgängig'
		);
	});
});
