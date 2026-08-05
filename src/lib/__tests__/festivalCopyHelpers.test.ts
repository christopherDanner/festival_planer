import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Kopierwerk unter fest-gebundenen Helfern (ADR 0005).
 *
 * Ein Helfer gehört dem Fest, in dem er steht — eine Zuteilung aus dem
 * Quellfest kann im Zielfest also nicht auf dieselbe Helfer-Zeile zeigen.
 * „Zuteilungen übernehmen" legt darum die betroffenen Helfer im Zielfest neu
 * an und schlüsselt die Zuteilungen darauf um. Ohne das zeigten die kopierten
 * Zuteilungen auf Helfer eines fremden Fests.
 *
 * Der eigene Schalter „Helfer übernehmen" samt umgeschlüsselter Wünsche bleibt
 * dem Kopierwerk-Slice; hier geht es nur darum, dass die heutige Übernahme
 * nicht in fremde Feste zeigt.
 */

const mocks = vi.hoisted(() => ({
	createdHelpers: [] as Array<{ festivalId: string; first_name: string; last_name: string }>,
	stationAssignments: [] as Array<{ festivalId: string; stationId: string; helperId: string }>,
	shiftAssignments: [] as Array<{ festivalId: string; stationShiftId: string; helperId: string }>,
	createdStations: [] as any[],
	nextHelperId: 0
}));

vi.mock('../shiftService', () => ({
	getStations: async () => [
		{
			id: 'st-alt',
			festival_id: 'quelle',
			name: 'Bar',
			required_people: 2,
			responsible_helper_id: 'h-alt-1'
		}
	],
	getStationShifts: async () => [
		{
			id: 'sh-alt',
			festival_id: 'quelle',
			station_id: 'st-alt',
			name: 'Abend',
			start_date: '2026-07-01',
			start_time: '18:00',
			end_time: '23:00',
			required_people: 2
		}
	],
	getStationHelpers: async () => [
		{ id: 'sm-1', festival_id: 'quelle', station_id: 'st-alt', helper_id: 'h-alt-1' }
	],
	getShiftAssignments: async () => [
		{ id: 'sa-1', station_shift_id: 'sh-alt', helper_id: 'h-alt-2', position: 1 }
	],
	createStationsBulk: async (stations: any[]) => {
		mocks.createdStations = stations;
		return stations.map((_s, i) => ({ id: `st-neu-${i}` }));
	},
	createStationShiftsBulk: async (shifts: any[]) => shifts.map((_s, i) => ({ id: `sh-neu-${i}` })),
	assignHelperToStation: async (festivalId: string, stationId: string, helperId: string) => {
		mocks.stationAssignments.push({ festivalId, stationId, helperId });
	},
	assignHelperToStationShift: async (
		festivalId: string,
		stationShiftId: string,
		helperId: string
	) => {
		mocks.shiftAssignments.push({ festivalId, stationShiftId, helperId });
	}
}));

vi.mock('../helperService', () => ({
	getHelpers: async (festivalId: string) =>
		festivalId === 'quelle'
			? [
					{ id: 'h-alt-1', festival_id: 'quelle', first_name: 'Hans', last_name: 'Huber' },
					{ id: 'h-alt-2', festival_id: 'quelle', first_name: 'Eva', last_name: 'Ebner' },
					{ id: 'h-alt-3', festival_id: 'quelle', first_name: 'Ohne', last_name: 'Zuteilung' }
				]
			: [],
	createHelper: async (festivalId: string, helper: { first_name: string; last_name: string }) => {
		mocks.createdHelpers.push({ festivalId, ...helper });
		mocks.nextHelperId += 1;
		return `h-neu-${mocks.nextHelperId}`;
	}
}));

vi.mock('../materialService', () => ({
	getMaterials: async () => [],
	createMaterialsBulk: async () => []
}));

import { copyFestivalData } from '../festivalCopyService';

const options = (copyAssignments: boolean) => ({
	stationIds: ['st-alt'],
	copyAssignments,
	materialIds: [],
	materialQuantitySource: 'ordered' as const,
	sourceFestivalStartDate: '2026-07-01',
	targetFestivalStartDate: '2027-07-01'
});

beforeEach(() => {
	mocks.createdHelpers = [];
	mocks.stationAssignments = [];
	mocks.shiftAssignments = [];
	mocks.createdStations = [];
	mocks.nextHelperId = 0;
});

describe('copyFestivalData mit Zuteilungen', () => {
	it('legt jeden gebrauchten Helfer im Zielfest an', async () => {
		await copyFestivalData('quelle', 'ziel', options(true));

		expect(mocks.createdHelpers).toEqual([
			{ festivalId: 'ziel', first_name: 'Hans', last_name: 'Huber' },
			{ festivalId: 'ziel', first_name: 'Eva', last_name: 'Ebner' }
		]);
	});

	it('schlüsselt Stations- und Schicht-Zuteilungen auf die neuen Helfer um', async () => {
		await copyFestivalData('quelle', 'ziel', options(true));

		expect(mocks.stationAssignments).toEqual([
			{ festivalId: 'ziel', stationId: 'st-neu-0', helperId: 'h-neu-1' }
		]);
		expect(mocks.shiftAssignments).toEqual([
			{ festivalId: 'ziel', stationShiftId: 'sh-neu-0', helperId: 'h-neu-2' }
		]);
	});

	it('setzt den Verantwortlichen der neuen Station auf den neuen Helfer', async () => {
		await copyFestivalData('quelle', 'ziel', options(true));

		expect(mocks.createdStations[0]).toMatchObject({ responsible_helper_id: 'h-neu-1' });
	});
});

describe('copyFestivalData ohne Zuteilungen', () => {
	it('kopiert dann auch keine Helfer und keinen Verantwortlichen', async () => {
		await copyFestivalData('quelle', 'ziel', options(false));

		expect(mocks.createdHelpers).toEqual([]);
		expect(mocks.stationAssignments).toEqual([]);
		expect(mocks.shiftAssignments).toEqual([]);
		expect(mocks.createdStations[0].responsible_helper_id).toBeUndefined();
	});
});
