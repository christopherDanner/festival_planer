import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Kopierwerk unter fest-gebundenen Helfern (ADR 0005).
 *
 * Ein Helfer gehört dem Fest, in dem er steht — eine Zuteilung aus dem
 * Quellfest kann im Zielfest also nicht auf dieselbe Helfer-Zeile zeigen.
 * Weil es keinen Bestand mehr gibt, ist die Fest-Kopie der einzige Weg,
 * letztjährige Helfer zu holen: „Helfer übernehmen" kopiert die **ganze**
 * Helferliste samt auf die neuen Stationen/Schichten umgeschlüsselter Wünsche,
 * „Zuteilungen übernehmen" setzt sie voraus (#100).
 */

const mocks = vi.hoisted(() => ({
	createdHelpers: [] as Array<{ festivalId: string; first_name: string; last_name: string }>,
	preferenceUpdates: [] as Array<{
		festivalId: string;
		helperId: string;
		stationPreferences: string[];
		shiftPreferences: string[];
	}>,
	stationAssignments: [] as Array<{ festivalId: string; stationId: string; helperId: string }>,
	shiftAssignments: [] as Array<{ festivalId: string; stationShiftId: string; helperId: string }>,
	createdStations: [] as any[],
	createdShifts: [] as any[],
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
		},
		// Nicht ausgewählte Station — was nur an ihr hängt, darf nicht mitkommen.
		{ id: 'st-bleibt', festival_id: 'quelle', name: 'Kassa', required_people: 1 }
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
		},
		{
			id: 'sh-bleibt',
			festival_id: 'quelle',
			station_id: 'st-bleibt',
			name: 'Kassa-Abend',
			start_date: '2026-07-01',
			start_time: '18:00',
			end_time: '23:00',
			required_people: 1
		}
	],
	getStationHelpers: async () => [
		{ id: 'sm-1', festival_id: 'quelle', station_id: 'st-alt', helper_id: 'h-alt-1' },
		{ id: 'sm-2', festival_id: 'quelle', station_id: 'st-bleibt', helper_id: 'h-alt-3' }
	],
	getShiftAssignments: async () => [
		{ id: 'sa-1', station_shift_id: 'sh-alt', helper_id: 'h-alt-2', position: 1 },
		{ id: 'sa-2', station_shift_id: 'sh-bleibt', helper_id: 'h-alt-4', position: 1 }
	],
	createStationsBulk: async (stations: any[]) => {
		mocks.createdStations = stations;
		return stations.map((_s, i) => ({ id: `st-neu-${i}` }));
	},
	createStationShiftsBulk: async (shifts: any[]) => {
		mocks.createdShifts = shifts;
		return shifts.map((_s, i) => ({ id: `sh-neu-${i}` }));
	},
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
					{
						id: 'h-alt-1',
						festival_id: 'quelle',
						first_name: 'Hans',
						last_name: 'Huber',
						// Wunsch auf die gewählte Station, dazu einer auf die abgewählte.
						station_preferences: ['st-alt', 'st-bleibt'],
						shift_preferences: ['sh-alt']
					},
					{
						id: 'h-alt-2',
						festival_id: 'quelle',
						first_name: 'Eva',
						last_name: 'Ebner',
						station_preferences: [],
						shift_preferences: []
					},
					{ id: 'h-alt-3', festival_id: 'quelle', first_name: 'Nur', last_name: 'Kassa' },
					{ id: 'h-alt-4', festival_id: 'quelle', first_name: 'Nur', last_name: 'Kassaschicht' },
					{
						id: 'h-alt-5',
						festival_id: 'quelle',
						first_name: 'Ohne',
						last_name: 'Zuteilung',
						// Nur Wünsche auf Abgewähltes — im Zielfest bleibt davon nichts.
						station_preferences: ['st-bleibt'],
						shift_preferences: ['sh-bleibt']
					}
				]
			: [],
	createHelper: async (festivalId: string, helper: { first_name: string; last_name: string }) => {
		mocks.createdHelpers.push({ festivalId, ...helper });
		mocks.nextHelperId += 1;
		return `h-neu-${mocks.nextHelperId}`;
	},
	updateHelperPreferences: async (
		festivalId: string,
		helperId: string,
		stationPreferences: string[],
		shiftPreferences: string[]
	) => {
		mocks.preferenceUpdates.push({ festivalId, helperId, stationPreferences, shiftPreferences });
	}
}));

vi.mock('../materialService', () => ({
	getMaterials: async () => [],
	createMaterialsBulk: async () => []
}));

import { copyFestivalData, type CopyFestivalOptions } from '../festivalCopyService';

const options = (over: Partial<CopyFestivalOptions> = {}): CopyFestivalOptions => ({
	stationIds: ['st-alt'],
	copyHelpers: false,
	copyAssignments: false,
	materialIds: [],
	materialQuantitySource: 'ordered',
	sourceFestivalStartDate: '2026-07-01',
	targetFestivalStartDate: '2027-07-01',
	...over
});

beforeEach(() => {
	mocks.createdHelpers = [];
	mocks.preferenceUpdates = [];
	mocks.stationAssignments = [];
	mocks.shiftAssignments = [];
	mocks.createdStations = [];
	mocks.createdShifts = [];
	mocks.nextHelperId = 0;
});

describe('„Helfer übernehmen"', () => {
	// Nicht nur die zugeteilten: wer denselben Stamm, aber einen frischen Plan
	// will, soll nicht jeden Namen neu tippen müssen (#100).
	it('kopiert die ganze Helferliste des Quellfests', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		expect(mocks.createdHelpers.map((h) => h.last_name)).toEqual([
			'Huber',
			'Ebner',
			'Kassa',
			'Kassaschicht',
			'Zuteilung'
		]);
		expect(mocks.createdHelpers.every((h) => h.festivalId === 'ziel')).toBe(true);
	});

	// „Präferenzen kommen mit" — über dieselben Maps, die Stationen und
	// Schichten ohnehin aufbauen.
	it('schlüsselt die Wünsche auf die neuen Stationen und Schichten um', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		expect(mocks.preferenceUpdates).toContainEqual({
			festivalId: 'ziel',
			helperId: 'h-neu-1',
			stationPreferences: ['st-neu-0'],
			shiftPreferences: ['sh-neu-0']
		});
	});

	// Was in Schritt 2 abgewählt wurde, gibt es im Zielfest nicht — sein Wunsch
	// wäre eine Karteileiche.
	it('lässt Wünsche auf abgewählte Stationen und Schichten still fallen', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		const ohneZuteilung = mocks.createdHelpers.findIndex((h) => h.last_name === 'Zuteilung');
		expect(
			mocks.preferenceUpdates.find((u) => u.helperId === `h-neu-${ohneZuteilung + 1}`)
		).toBeUndefined();
	});
});

describe('„Helfer übernehmen" + „Zuteilungen übernehmen"', () => {
	const beides = options({ copyHelpers: true, copyAssignments: true });

	it('schlüsselt Stations- und Schicht-Zuteilungen auf die neuen Helfer um', async () => {
		await copyFestivalData('quelle', 'ziel', beides);

		expect(mocks.stationAssignments).toEqual([
			{ festivalId: 'ziel', stationId: 'st-neu-0', helperId: 'h-neu-1' }
		]);
		expect(mocks.shiftAssignments).toEqual([
			{ festivalId: 'ziel', stationShiftId: 'sh-neu-0', helperId: 'h-neu-2' }
		]);
	});

	it('setzt den Verantwortlichen der neuen Station auf den neuen Helfer', async () => {
		await copyFestivalData('quelle', 'ziel', beides);

		expect(mocks.createdStations[0]).toMatchObject({ responsible_helper_id: 'h-neu-1' });
	});

	// Eine Kopie, keine Verschiebung: am Quellfest wird nichts angefasst.
	it('lässt die Helfer des Quellfests unverändert', async () => {
		await copyFestivalData('quelle', 'ziel', beides);

		expect(mocks.createdHelpers.some((h) => h.festivalId === 'quelle')).toBe(false);
		expect(mocks.preferenceUpdates.some((u) => u.festivalId === 'quelle')).toBe(false);
		expect(mocks.stationAssignments.some((a) => a.festivalId === 'quelle')).toBe(false);
		expect(mocks.shiftAssignments.some((a) => a.festivalId === 'quelle')).toBe(false);
	});
});

describe('nur „Helfer übernehmen"', () => {
	it('legt die Helferliste an, aber keine Zuteilung', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		expect(mocks.createdHelpers).toHaveLength(5);
		expect(mocks.stationAssignments).toEqual([]);
		expect(mocks.shiftAssignments).toEqual([]);
		expect(mocks.createdStations[0].responsible_helper_id).toBeUndefined();
	});
});

describe('ohne beide Schalter', () => {
	it('lässt die Helferliste des Zielfests leer', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		expect(mocks.createdHelpers).toEqual([]);
		expect(mocks.preferenceUpdates).toEqual([]);
		expect(mocks.stationAssignments).toEqual([]);
		expect(mocks.shiftAssignments).toEqual([]);
		expect(mocks.createdStations[0].responsible_helper_id).toBeUndefined();
	});

	it('kopiert Stationen und Schichten trotzdem vollständig', async () => {
		await copyFestivalData('quelle', 'ziel', options({ stationIds: ['st-alt', 'st-bleibt'] }));

		expect(mocks.createdStations.map((s) => s.name)).toEqual(['Bar', 'Kassa']);
		expect(mocks.createdShifts.map((s) => s.name)).toEqual(['Abend', 'Kassa-Abend']);
	});

	// „Zuteilungen übernehmen" ist ohne Helfer ungültig — die Oberfläche graut
	// den Schalter aus, der Service verlässt sich nicht darauf.
	it('kopiert auch dann nichts, wenn nur „Zuteilungen übernehmen" gesetzt ist', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyAssignments: true }));

		expect(mocks.createdHelpers).toEqual([]);
		expect(mocks.stationAssignments).toEqual([]);
		expect(mocks.shiftAssignments).toEqual([]);
	});
});
