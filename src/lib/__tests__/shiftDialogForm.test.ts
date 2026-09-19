import { describe, expect, it } from 'vitest';

import { buildStationBoard } from '@/lib/shiftBoard';
import {
	canSaveShift,
	canSaveStation,
	crossesMidnight,
	emptyShiftForm,
	emptyStationForm,
	shiftFormFrom,
	shiftPayload,
	stationFormFrom,
	stationPayload,
	type ShiftForm
} from '@/lib/shiftDialogForm';
import type { Station, StationShift } from '@/lib/shiftService';

/* Seam dieses Tests (aus #106 abgeleitet, vor dem ersten Test festgehalten):
   `shiftDialogForm` hält die Regeln von Station- und Schicht-Dialog — was ein
   leeres Blatt zeigt, was ein bestehender Satz hineinträgt, wann gespeichert
   werden darf und was dabei abgegeben wird. Die Optik liegt in den beiden
   Zetteln, das Öffnen in den Dialog-Rahmen. */

function station(over: Partial<Station> = {}): Station {
	return {
		id: 's1',
		festival_id: 'f1',
		name: 'Ausschank',
		required_people: 3,
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
		name: 'Nachtschicht',
		start_date: '2026-07-25',
		start_time: '23:00',
		end_time: '02:00',
		required_people: 2,
		created_at: '',
		updated_at: '',
		...over
	};
}

const vollstaendig = (over: Partial<ShiftForm> = {}): ShiftForm => ({
	...emptyShiftForm(null),
	name: 'Frühschoppen',
	start_date: '2026-07-25',
	start_time: '11:00',
	end_time: '15:00',
	...over
});

describe('Station-Dialog — Felder und Abgabe', () => {
	it('beginnt leer, mit einer Person als Soll', () => {
		const form = emptyStationForm();

		expect(form.name).toBe('');
		expect(form.description).toBe('');
		expect(form.responsible_helper_id).toBe('');
		expect(form.required_people).toBe('1');
	});

	it('trägt eine bestehende Station vollständig hinein', () => {
		const form = stationFormFrom(
			station({ description: 'Zelt Nord', responsible_helper_id: 'h1' })
		);

		expect(form).toEqual({
			name: 'Ausschank',
			description: 'Zelt Nord',
			required_people: '3',
			responsible_helper_id: 'h1'
		});
	});

	it('verlangt einen Namen — alles andere ist optional', () => {
		expect(canSaveStation(emptyStationForm())).toBe(false);
		expect(canSaveStation({ ...emptyStationForm(), name: '   ' })).toBe(false);
		expect(canSaveStation({ ...emptyStationForm(), name: 'Kassa' })).toBe(true);
	});

	it('gibt den Ort als `description` ab — so heißt die Spalte', () => {
		const daten = stationPayload({ ...emptyStationForm(), name: 'Kassa', description: 'Eingang' });

		expect(daten.description).toBe('Eingang');
	});

	it('macht „kein Verantwortlicher" zu `null`, nicht zum leeren Text', () => {
		expect(stationPayload({ ...emptyStationForm(), name: 'Kassa' }).responsible_helper_id).toBeNull();
		expect(
			stationPayload({ ...emptyStationForm(), name: 'Kassa', responsible_helper_id: 'h1' })
				.responsible_helper_id
		).toBe('h1');
	});

	it('gibt das Soll als Zahl ab und fällt bei Unsinn auf eine Person zurück', () => {
		expect(stationPayload({ ...emptyStationForm(), name: 'Kassa', required_people: '4' }).required_people).toBe(4);
		expect(stationPayload({ ...emptyStationForm(), name: 'Kassa', required_people: '' }).required_people).toBe(1);
		expect(stationPayload({ ...emptyStationForm(), name: 'Kassa', required_people: '0' }).required_people).toBe(1);
	});
});

describe('Schicht-Dialog — Felder und Abgabe', () => {
	it('erbt das Soll der Station, damit eine Schicht nicht bei eins beginnt', () => {
		expect(emptyShiftForm(station()).required_people).toBe('3');
		expect(emptyShiftForm(null).required_people).toBe('1');
	});

	it('trägt eine bestehende Schicht vollständig hinein', () => {
		const form = shiftFormFrom(shift({ end_date: '2026-07-26' }));

		expect(form).toEqual({
			name: 'Nachtschicht',
			start_date: '2026-07-25',
			start_time: '23:00',
			end_date: '2026-07-26',
			end_time: '02:00',
			required_people: '2'
		});
	});

	it('verlangt Name, Startdatum, Start- und Endzeit', () => {
		expect(canSaveShift(vollstaendig())).toBe(true);
		for (const luecke of ['name', 'start_date', 'start_time', 'end_time'] as const) {
			expect(canSaveShift(vollstaendig({ [luecke]: '' }))).toBe(false);
		}
	});

	it('lässt das Enddatum weg — es ist nur für Mitternacht da', () => {
		expect(canSaveShift(vollstaendig({ end_date: '' }))).toBe(true);
		expect(shiftPayload(vollstaendig({ end_date: '' })).end_date).toBeNull();
	});

	it('weist ein Enddatum vor dem Startdatum ab', () => {
		expect(canSaveShift(vollstaendig({ end_date: '2026-07-24' }))).toBe(false);
		expect(canSaveShift(vollstaendig({ end_date: '2026-07-25' }))).toBe(true);
	});

	it('erkennt die Schicht über Mitternacht am abweichenden Enddatum', () => {
		expect(crossesMidnight(vollstaendig())).toBe(false);
		expect(crossesMidnight(vollstaendig({ end_date: '2026-07-25' }))).toBe(false);
		expect(crossesMidnight(vollstaendig({ end_date: '2026-07-26' }))).toBe(true);
	});
});

describe('Schicht über Mitternacht — vom Blatt bis in den Fokus-Kasten', () => {
	it('steht als „23–02 +1" beim Starttag', () => {
		const daten = shiftPayload(
			vollstaendig({
				name: '',
				start_time: '23:00',
				end_time: '02:00',
				start_date: '2026-07-25',
				end_date: '2026-07-26'
			})
		);
		const board = buildStationBoard(station(), [{ ...shift(), ...daten } as StationShift], [], []);

		expect(board.days).toHaveLength(1);
		expect(board.days[0].date).toBe('2026-07-25');
		expect(board.days[0].rows[0].time).toBe('23–02 +1');
	});

	it('bleibt ohne Enddatum eine Zeile desselben Tages', () => {
		const daten = shiftPayload(vollstaendig({ start_time: '11:00', end_time: '15:00' }));
		const board = buildStationBoard(station(), [{ ...shift(), ...daten } as StationShift], [], []);

		expect(board.days[0].rows[0].time).toBe('11–15');
	});
});
