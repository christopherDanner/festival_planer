import { describe, expect, it } from 'vitest';

import { shiftDeletionMessage, stationDeletionMessage } from '@/lib/shiftDeletion';
import { buildStationBoard } from '@/lib/shiftBoard';
import type {
	ShiftAssignmentWithHelper,
	Station,
	StationHelperWithDetails,
	StationShift
} from '@/lib/shiftService';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `shiftDeletion` formuliert die beiden Rückfragen der ⋮-Menüs. Die Zahlen
   kommen aus dem fertigen `StationBoard` bzw. der Zeile — aus genau dem, was
   der Fokus-Kasten zeigt, damit die Frage keine andere Zahl nennt als der
   Kasten daneben. Optik und Verdrahtung liegen in `ShiftRowMenu`. */

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function shift(over: Partial<StationShift> = {}): StationShift {
	return {
		id: 'sh1',
		festival_id: 'f1',
		station_id: 's1',
		name: '',
		start_date: '2026-07-25',
		start_time: '11:00',
		end_time: '15:00',
		required_people: 2,
		created_at: '',
		updated_at: '',
		...over
	};
}

let laufendeNummer = 0;
function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	laufendeNummer += 1;
	return {
		id: `a${laufendeNummer}`,
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: `h${laufendeNummer}`,
		position: laufendeNummer,
		created_at: '',
		updated_at: '',
		helper: { id: `h${laufendeNummer}`, first_name: 'Franz', last_name: 'Hochauer' },
		...over
	};
}

function member(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'h9',
		created_at: '',
		helper: { id: 'h9', first_name: 'Roman', last_name: 'Aigner' },
		...over
	};
}

const board = (
	shifts: StationShift[],
	assignments: ShiftAssignmentWithHelper[] = [],
	members: StationHelperWithDetails[] = []
) => buildStationBoard(station(), shifts, assignments, members);

describe('stationDeletionMessage — die Station reißt ihre Schichten mit', () => {
	it('nennt die Station, ihre Schichten und ihre Zuteilungen', () => {
		const text = stationDeletionMessage(
			board(
				[shift({ id: 'sh1' }), shift({ id: 'sh2', start_time: '15:00', end_time: '19:00' })],
				[assignment({ station_shift_id: 'sh1' }), assignment({ station_shift_id: 'sh2' })]
			)
		);

		expect(text).toContain('Ausschank');
		expect(text).toContain('2 Schichten');
		expect(text).toContain('2 Zuteilungen');
	});

	it('zählt die Stationsmitglieder ohne Schicht mit — sie gehen genauso mit', () => {
		const text = stationDeletionMessage(
			board([shift()], [assignment()], [member(), member({ id: 'm2', helper_id: 'h8' })])
		);

		expect(text).toContain('3 Zuteilungen');
	});

	it('zählt bei einer Station ohne Schichten deren Mitglieder als Zuteilungen', () => {
		const text = stationDeletionMessage(board([], [], [member()]));

		expect(text).toContain('1 Zuteilung');
		expect(text).not.toContain('Schicht');
	});

	it('setzt Schicht und Zuteilung in die Einzahl', () => {
		const text = stationDeletionMessage(board([shift()], [assignment()]));

		expect(text).toContain('1 Schicht ');
		expect(text).toContain('1 Zuteilung.');
	});

	it('verspricht bei einer leeren Station keinen Verlust', () => {
		const text = stationDeletionMessage(board([]));

		expect(text).toContain('Ausschank');
		expect(text).not.toMatch(/\d/);
	});

	it('warnt auch bei der leeren Station — dort ist der Satz alles, was bleibt', () => {
		expect(stationDeletionMessage(board([shift()]))).toContain('nicht rückgängig');
		expect(stationDeletionMessage(board([]))).toContain('nicht rückgängig');
	});
});

describe('shiftDeletionMessage — die Schicht nennt Tag, Zeit und Besetzung', () => {
	it('nennt Name, Tag, Zeit und die Zahl der Zuteilungen', () => {
		const text = shiftDeletionMessage(shift({ name: 'Frühschoppen' }), 2);

		expect(text).toContain('Frühschoppen');
		expect(text).toContain('Samstag 25. Juli');
		expect(text).toContain('11–15');
		expect(text).toContain('2 Zuteilungen');
		expect(text).toContain('nicht rückgängig');
	});

	it('kommt ohne Namen aus — die meisten Schichten tragen keinen', () => {
		const text = shiftDeletionMessage(shift(), 1);

		expect(text).toContain('Samstag 25. Juli');
		expect(text).toContain('1 Zuteilung.');
		expect(text).not.toContain('„"');
	});

	it('trägt das Mitternachts-Kürzel der Zeile', () => {
		const text = shiftDeletionMessage(
			shift({ start_time: '23:00', end_time: '02:00', end_date: '2026-07-26' }),
			0
		);

		expect(text).toContain('23–02 +1');
	});

	it('nennt eine unbesetzte Schicht unbesetzt, statt eine Null zu zeigen', () => {
		const text = shiftDeletionMessage(shift(), 0);

		expect(text).toContain('unbesetzt');
		expect(text).not.toContain('0 Zuteilungen');
		expect(text).toContain('nicht rückgängig');
	});
});
