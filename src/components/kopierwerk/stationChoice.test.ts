import { describe, expect, it } from 'vitest';

import type { Station, StationShift } from '@/lib/shiftService';
import { stationPreviewRows } from './stationChoice';

/** Fest 2026: Fr 24.07. – So 26.07.; Fest 2027 startet Fr 23.07. */
const SOURCE_START = '2026-07-24';
const TARGET_START = '2027-07-23';

const station = (over: Partial<Station> = {}): Station => ({
	id: 'st-1',
	festival_id: 'quelle',
	name: 'Ausschank',
	required_people: 14,
	description: 'Zelt Nord',
	created_at: '',
	updated_at: '',
	...over
});

const shift = (over: Partial<StationShift> = {}): StationShift => ({
	id: 'sh-1',
	festival_id: 'quelle',
	station_id: 'st-1',
	name: 'Frühschoppen',
	start_date: '2026-07-25',
	start_time: '11:00:00',
	end_time: '15:00:00',
	required_people: 4,
	created_at: '',
	updated_at: '',
	...over
});

const rows = (stations: Station[], shifts: StationShift[]) =>
	stationPreviewRows({
		stations,
		shifts,
		sourceStartDate: SOURCE_START,
		targetStartDate: TARGET_START
	});

describe('stationPreviewRows', () => {
	it('nennt je Station Beschreibung, Personenzahl und Schicht-Anzahl', () => {
		const [row] = rows([station()], [shift(), shift({ id: 'sh-2' })]);

		expect(row.name).toBe('Ausschank');
		expect(row.meta).toBe('Zelt Nord · 14 Pers. · 2 Schichten');
	});

	it('lässt die Beschreibung weg, wo keine steht', () => {
		const [row] = rows([station({ description: undefined })], []);

		expect(row.meta).toBe('14 Pers. · 0 Schichten');
	});

	it('hängt an jede Station nur ihre eigenen Schichten', () => {
		const [ausschank, kassa] = rows(
			[station(), station({ id: 'st-2', name: 'Kassa' })],
			[shift(), shift({ id: 'sh-2', station_id: 'st-2' })]
		);

		expect(ausschank.shifts.map((s) => s.id)).toEqual(['sh-1']);
		expect(kassa.shifts.map((s) => s.id)).toEqual(['sh-2']);
	});

	it('stellt je Schicht alten Termin, Name, Plätze und neuen Termin nebeneinander', () => {
		const [row] = rows([station()], [shift()]);

		expect(row.shifts[0]).toMatchObject({
			when: 'Sa 11–15',
			name: 'Frühschoppen',
			places: '4 Plätze',
			newWhen: 'Sa 24.07.2027'
		});
	});

	// Die Vorlage steht schon, während Schritt 1 noch leer ist — über den
	// Deep-Link `?vorlage=` sogar von Anfang an. Ohne Startdatum gibt es keinen
	// neuen Termin zu zeigen; gerechnet werden darf damit erst recht nicht.
	it('zeigt ohne Startdatum des neuen Fests nichts an', () => {
		expect(
			stationPreviewRows({
				stations: [station()],
				shifts: [shift()],
				sourceStartDate: SOURCE_START,
				targetStartDate: ''
			})
		).toEqual([]);
	});

	it('nennt eine Schicht über Mitternacht mit beiden Tagen', () => {
		const [row] = rows(
			[station()],
			[shift({ start_time: '23:00:00', end_date: '2026-07-26', end_time: '02:00:00' })]
		);

		expect(row.shifts[0].when).toBe('Sa 23–So 02');
		expect(row.shifts[0].newWhen).toBe('Sa/So 24.–25.07.2027');
	});
});

// Das Ankreuzen auf Stations-Ebene steht in `selection.ts` und wird dort
// geprüft — es ist dasselbe wie in Schritt 3 (#95).
