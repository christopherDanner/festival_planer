import { describe, expect, it, vi } from 'vitest';

/**
 * Vorschau und Ergebnis dürfen nicht auseinanderlaufen (#94): was Schritt 2 des
 * Kopierwerks als neuen Termin anschreibt, muss dasselbe Datum sein, das
 * `copyFestivalData` in die Schicht schreibt. Darum steht hier beides
 * nebeneinander — der Kopier-Service gegen durchgerechnete Beispiele, und die
 * Beschriftung der Vorschau gegen genau die Daten, die er geschrieben hat.
 */

const mocks = vi.hoisted(() => ({
	createdShifts: [] as Array<{ start_date: string; end_date?: string }>
}));

/** Fest 2026: Fr 24.07. – So 26.07. Die Schichten liegen am Samstag. */
const SOURCE_START = '2026-07-24';
/** Fest 2027: Fr 23.07. – So 25.07. Der Samstag ist dort der 24.07. */
const TARGET_START = '2027-07-23';

const dayShift = {
	id: 'sh-tag',
	festival_id: 'quelle',
	station_id: 'st-1',
	name: 'Frühschoppen',
	start_date: '2026-07-25',
	start_time: '11:00:00',
	end_time: '15:00:00',
	required_people: 4
};

/** Barbetrieb über Mitternacht: beginnt Samstag, endet Sonntag. */
const midnightShift = {
	id: 'sh-nacht',
	festival_id: 'quelle',
	station_id: 'st-1',
	name: 'Barbetrieb',
	start_date: '2026-07-25',
	start_time: '23:00:00',
	end_date: '2026-07-26',
	end_time: '02:00:00',
	required_people: 2
};

vi.mock('../shiftService', () => ({
	getStations: async () => [
		{ id: 'st-1', festival_id: 'quelle', name: 'Ausschank', required_people: 14 }
	],
	getStationShifts: async () => [dayShift, midnightShift],
	getStationHelpers: async () => [],
	getShiftAssignments: async () => [],
	createStationsBulk: async () => [{ id: 'st-neu' }],
	createStationShiftsBulk: async (shifts: Array<{ start_date: string; end_date?: string }>) => {
		mocks.createdShifts = shifts;
		return shifts.map((_s, i) => ({ id: `sh-neu-${i}` }));
	},
	assignHelperToStation: async () => {},
	assignHelperToStationShift: async () => {}
}));

vi.mock('../helperService', () => ({ getHelpers: async () => [], createHelper: async () => 'h' }));
vi.mock('../materialService', () => ({ getMaterials: async () => [], createMaterialsBulk: async () => [] }));

import { copyFestivalData } from '../festivalCopyService';
import { copiedShiftDateLabel } from '../shiftDates';

const copy = async () => {
	await copyFestivalData('quelle', 'ziel', {
		stationIds: ['st-1'],
		copyAssignments: false,
		materialIds: [],
		materialQuantitySource: 'ordered',
		sourceFestivalStartDate: SOURCE_START,
		targetFestivalStartDate: TARGET_START
	});
	return mocks.createdShifts;
};

describe('Kopier-Service versetzt die Schicht-Termine', () => {
	it('schreibt den Samstag des Quellfests auf den Samstag des Zielfests', async () => {
		const [tag] = await copy();
		expect(tag.start_date).toBe('2027-07-24');
	});

	it('versetzt bei einer Schicht über Mitternacht auch den End-Tag', async () => {
		const [, nacht] = await copy();
		expect(nacht.start_date).toBe('2027-07-24');
		expect(nacht.end_date).toBe('2027-07-25');
	});
});

describe('Vorschau nennt genau den geschriebenen Termin', () => {
	it('bei einer Schicht innerhalb eines Tages', async () => {
		const [tag] = await copy();
		expect(copiedShiftDateLabel(dayShift, SOURCE_START, TARGET_START)).toBe('Sa 24.07.2027');
		expect(copiedShiftDateLabel(dayShift, SOURCE_START, TARGET_START)).toContain(
			`${tag.start_date.slice(8)}.${tag.start_date.slice(5, 7)}.${tag.start_date.slice(0, 4)}`
		);
	});

	it('bei einer Schicht über Mitternacht mit beiden Tagen', async () => {
		const [, nacht] = await copy();
		expect(copiedShiftDateLabel(midnightShift, SOURCE_START, TARGET_START)).toBe(
			'Sa/So 24.–25.07.2027'
		);
		expect(nacht.start_date).toBe('2027-07-24');
		expect(nacht.end_date).toBe('2027-07-25');
	});
});
