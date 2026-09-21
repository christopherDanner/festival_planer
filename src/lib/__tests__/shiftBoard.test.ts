import { describe, it, expect } from 'vitest';
import type {
	Station,
	StationShift,
	ShiftAssignmentWithHelper,
	StationHelperWithDetails
} from '@/lib/shiftService';
import { deriveShiftsMetric } from '@/lib/staffing';
import {
	buildStationBoard,
	buildStationTabs,
	resolveFocusStationId,
	shiftTimeLabel
} from '@/lib/shiftBoard';

/** Die Ableitungen der Fokus-Werkbank (#102): der Ampel-Reiter-Streifen, der
Fokus-Kasten einer Station und die Zeit-Aufschrift einer Schicht. */

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 0,
		created_at: '2026-01-01T10:00:00Z',
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
		required_people: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function assignment(over: Partial<ShiftAssignmentWithHelper> = {}): ShiftAssignmentWithHelper {
	return {
		id: 'a1',
		festival_id: 'f1',
		station_shift_id: 'sh1',
		station_id: 's1',
		helper_id: 'h1',
		position: 1,
		created_at: '',
		updated_at: '',
		helper: { id: 'h1', first_name: 'Franz', last_name: 'Hochauer' },
		...over
	};
}

function stationHelper(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
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

// --- Zeit-Aufschrift ---------------------------------------------------------

describe('shiftTimeLabel', () => {
	it('nennt nur die Stunden — der Tag steht im Zwischentitel', () => {
		expect(shiftTimeLabel(shift({ start_time: '11:00:00', end_time: '15:00:00' }))).toBe('11–15');
	});

	it('behält halbe Stunden', () => {
		expect(shiftTimeLabel(shift({ start_time: '11:30', end_time: '15:45' }))).toBe('11:30–15:45');
	});

	it('macht die Schicht über Mitternacht am Chip explizit', () => {
		const label = shiftTimeLabel(
			shift({ start_date: '2026-07-25', end_date: '2026-07-26', start_time: '23:00', end_time: '02:00' })
		);
		expect(label).toBe('23–02 +1');
	});

	it('nimmt ein gesetztes, aber gleiches Enddatum nicht für Mitternacht', () => {
		const label = shiftTimeLabel(
			shift({ start_date: '2026-07-25', end_date: '2026-07-25', start_time: '11:00', end_time: '15:00' })
		);
		expect(label).toBe('11–15');
	});
});

// --- Ampel-Reiter ------------------------------------------------------------

describe('buildStationTabs', () => {
	it('trägt je Station Soll, Ist und Ampel-Farbe', () => {
		const stations = [station({ id: 's1' })];
		const shifts = [shift({ id: 'sh1', station_id: 's1', required_people: 4 })];
		const assignments = [assignment({ id: 'a1', station_shift_id: 'sh1' })];

		const [tab] = buildStationTabs(stations, shifts, assignments, []);
		expect(tab.station.id).toBe('s1');
		expect(tab.required).toBe(4);
		expect(tab.assigned).toBe(1);
		expect(tab.status).toBe('partial');
	});

	it('reiht nach Anlage-Reihenfolge, nicht nach Dringlichkeit oder Name', () => {
		// Absichtlich alphabetisch verkehrt und mit der leersten Station zuletzt:
		// sortierte man nach Name oder nach Lücke, spränge der Reiter weg.
		const stations = [
			station({ id: 's2', name: 'Zeltbar', created_at: '2026-01-02T00:00:00Z' }),
			station({ id: 's1', name: 'Ausschank', created_at: '2026-01-01T00:00:00Z' }),
			station({ id: 's3', name: 'Einlass', created_at: '2026-01-03T00:00:00Z', required_people: 3 })
		];

		expect(buildStationTabs(stations, [], [], []).map((t) => t.station.id)).toEqual([
			's1',
			's2',
			's3'
		]);
	});

	it('rechnet ohne Schichten über die Stations-Ebene', () => {
		const stations = [station({ id: 's1', required_people: 3 })];
		const helpers = [stationHelper({ id: 'm1', station_id: 's1' })];

		const [tab] = buildStationTabs(stations, [], [], helpers);
		expect(tab.required).toBe(3);
		expect(tab.assigned).toBe(1);
	});

	it('zeigt alle Stationen — der Streifen ist die einzige Gesamtübersicht', () => {
		const stations = Array.from({ length: 14 }, (_, i) =>
			station({ id: `s${i}`, name: `Station ${i}`, created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
		);

		expect(buildStationTabs(stations, [], [], [])).toHaveLength(14);
	});

	it('nennt zusammen dieselbe Besetzung wie der Dashboard-Kasten', () => {
		const stations = [
			station({ id: 's1' }),
			// zweite Station ohne Schichten, damit beide Zähl-Ebenen drinstecken
			station({ id: 's2', created_at: '2026-01-02T00:00:00Z', required_people: 3 })
		];
		const shifts = [
			shift({ id: 'sh1', station_id: 's1', required_people: 4 }),
			// überbesetzte Schicht: das Kappen muss auf beiden Seiten gleich laufen
			shift({ id: 'sh2', station_id: 's1', required_people: 1 })
		];
		const assignments = [
			assignment({ id: 'a1', station_shift_id: 'sh1' }),
			assignment({ id: 'a2', station_shift_id: 'sh2', helper_id: 'h2' }),
			assignment({ id: 'a3', station_shift_id: 'sh2', helper_id: 'h3' })
		];
		const helpers = [stationHelper({ id: 'm1', station_id: 's2' })];

		const tabs = buildStationTabs(stations, shifts, assignments, helpers);
		const metric = deriveShiftsMetric(stations, shifts, assignments, helpers);

		// Ohne eigenes Nachkappen: die Regel liegt in `staffing`, beide Seiten
		// lesen sie dort.
		expect(tabs.reduce((sum, t) => sum + t.required, 0)).toBe(metric.gesamt);
		expect(tabs.reduce((sum, t) => sum + t.assigned, 0)).toBe(metric.besetzt);
	});
});

// --- Fokus-Station -----------------------------------------------------------

describe('resolveFocusStationId', () => {
	const tabs = () =>
		buildStationTabs(
			[
				station({ id: 's1', created_at: '2026-01-01T00:00:00Z' }),
				station({ id: 's2', created_at: '2026-01-02T00:00:00Z' })
			],
			[],
			[],
			[]
		);

	it('nimmt beim ersten Rendern die erste Station', () => {
		expect(resolveFocusStationId(tabs(), null)).toBe('s1');
	});

	it('behält die gewählte Station', () => {
		expect(resolveFocusStationId(tabs(), 's2')).toBe('s2');
	});

	it('fällt auf die erste zurück, wenn die gewählte Station gelöscht wurde', () => {
		expect(resolveFocusStationId(tabs(), 'weg')).toBe('s1');
	});

	it('gibt ohne Stationen nichts zurück', () => {
		expect(resolveFocusStationId([], 's1')).toBeNull();
	});
});

// --- Fokus-Kasten: Station mit Schichten -------------------------------------

describe('buildStationBoard — Station mit Schichten', () => {
	const s = station({ id: 's1', name: 'Ausschank' });
	const shifts = [
		shift({ id: 'sh-sa2', start_date: '2026-07-25', start_time: '15:00', end_time: '19:00', required_people: 4 }),
		shift({
			id: 'sh-sa1',
			start_date: '2026-07-25',
			start_time: '11:00',
			end_time: '15:00',
			required_people: 2,
			name: 'Frühschoppen'
		}),
		shift({ id: 'sh-fr', start_date: '2026-07-24', start_time: '17:00', end_time: '21:00', required_people: 1 })
	];
	const assignments = [
		assignment({ id: 'a1', station_shift_id: 'sh-sa1', helper_id: 'h1', position: 1 }),
		assignment({
			id: 'a2',
			station_shift_id: 'sh-sa1',
			helper_id: 'h2',
			position: 2,
			helper: { id: 'h2', first_name: 'Maria', last_name: 'Leitner' }
		})
	];

	const board = () => buildStationBoard(s, shifts, assignments, []);

	it('gliedert nach Tagen, chronologisch', () => {
		expect(board().days.map((d) => d.date)).toEqual(['2026-07-24', '2026-07-25']);
	});

	it('schreibt den Tages-Zwischentitel aus', () => {
		expect(board().days[1].title).toBe('Samstag 25. Juli');
	});

	it('reiht die Schichten eines Tages nach Startzeit', () => {
		expect(board().days[1].rows.map((r) => r.id)).toEqual(['sh-sa1', 'sh-sa2']);
	});

	it('zählt je Tag Schichten und offene Plätze', () => {
		const [freitag, samstag] = board().days;
		expect(freitag.shiftCount).toBe(1);
		expect(freitag.open).toBe(1);
		expect(samstag.shiftCount).toBe(2);
		expect(samstag.open).toBe(4); // Frühschoppen voll, 15–19 leer
	});

	it('beschriftet die Schicht-Zeile mit Zeit, Name und Plätzen', () => {
		const row = board().days[1].rows[0];
		expect(row.time).toBe('11–15');
		expect(row.subtitle).toBe('Frühschoppen · 2 Plätze');
		expect(row.status).toBe('complete');
		expect(row.open).toBe(0);
	});

	it('lässt den Namen weg, wenn die Schicht keinen hat', () => {
		expect(board().days[1].rows[1].subtitle).toBe('4 Plätze');
	});

	it('legt das Platz-Raster über das Soll — belegt zuerst, dann frei', () => {
		const slots = board().days[1].rows[0].slots;
		expect(slots).toHaveLength(2);
		expect(slots[0]).toEqual({ position: 1, helperId: 'h1', name: 'Hochauer Franz' });
		expect(slots[1]).toEqual({ position: 2, helperId: 'h2', name: 'Leitner Maria' });

		const leer = board().days[1].rows[1].slots;
		expect(leer).toHaveLength(4);
		expect(leer.every((slot) => slot.helperId === null)).toBe(true);
		expect(leer[3].position).toBe(4);
	});

	it('lässt niemanden verschwinden, wenn mehr zugeteilt ist als Plätze da sind', () => {
		const zuviel = [
			...assignments,
			assignment({
				id: 'a3',
				station_shift_id: 'sh-sa1',
				helper_id: 'h3',
				position: 3,
				helper: { id: 'h3', first_name: 'Peter', last_name: 'Gruber' }
			})
		];
		const row = buildStationBoard(s, shifts, zuviel, []).days[1].rows[0];
		expect(row.slots).toHaveLength(3);
		expect(row.slots[2].name).toBe('Gruber Peter');
	});

	it('nennt Soll, Ist und offene Plätze der ganzen Station', () => {
		const b = board();
		expect(b.required).toBe(7);
		expect(b.assigned).toBe(2);
		expect(b.open).toBe(5);
		expect(b.hasShifts).toBe(true);
		expect(b.wholeFestRow).toBeNull();
	});

	it('führt die Stationsmitglieder ohne Schicht in der Fußzeile', () => {
		const b = buildStationBoard(s, shifts, assignments, [
			stationHelper({ id: 'm1', station_id: 's1' }),
			stationHelper({ id: 'm2', station_id: 's2', helper_id: 'h8' })
		]);
		expect(b.members).toEqual([{ id: 'm1', helperId: 'h9', name: 'Aigner Roman' }]);
	});

	it('zählt die Fußzeile nicht in die Ampel — sie hängt an den Schichten', () => {
		const mit = buildStationBoard(s, shifts, assignments, [stationHelper({ station_id: 's1' })]);
		expect(mit.assigned).toBe(2);
	});
});

// --- Fokus-Kasten: Station ohne Schichten ------------------------------------

describe('buildStationBoard — Station ohne Schichten', () => {
	const s = station({ id: 's1', name: 'Einlass', required_people: 3 });
	const members = [stationHelper({ id: 'm1', station_id: 's1' })];

	it('zeigt statt Schicht-Zeilen eine Pseudo-Zeile über das ganze Fest', () => {
		const b = buildStationBoard(s, [], [], members);
		expect(b.hasShifts).toBe(false);
		expect(b.days).toEqual([]);
		expect(b.wholeFestRow?.time).toBe('GANZES FEST');
		expect(b.wholeFestRow?.subtitle).toBe('Keine Schichten · 3 Plätze');
	});

	it('füllt das Platz-Raster aus den Stationsmitgliedern', () => {
		const slots = buildStationBoard(s, [], [], members).wholeFestRow!.slots;
		expect(slots).toHaveLength(3);
		expect(slots[0]).toEqual({ position: 1, helperId: 'h9', name: 'Aigner Roman' });
		expect(slots[1].helperId).toBeNull();
	});

	it('trägt denselben Status wie eine Schicht-Zeile', () => {
		const row = buildStationBoard(s, [], [], members).wholeFestRow!;
		expect(row.open).toBe(2);
		expect(row.status).toBe('partial');
	});

	it('lässt die Fußzeile weg — die Mitglieder stehen schon im Raster', () => {
		expect(buildStationBoard(s, [], [], members).members).toEqual([]);
	});

	it('rechnet Soll und Ist auf der Stations-Ebene', () => {
		const b = buildStationBoard(s, [], [], members);
		expect(b.required).toBe(3);
		expect(b.assigned).toBe(1);
		expect(b.open).toBe(2);
	});

	it('bleibt vollständig, wenn die Station noch kein Soll hat', () => {
		const b = buildStationBoard(station({ id: 's1', required_people: 0 }), [], [], []);
		expect(b.wholeFestRow?.slots).toEqual([]);
		expect(b.wholeFestRow?.subtitle).toBe('Keine Schichten · 0 Plätze');
	});
});
