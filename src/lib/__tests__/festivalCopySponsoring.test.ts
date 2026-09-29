import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Seams dieses Slices (#146) — aus den Abnahmekriterien abgeleitet:
 *
 *   1. `copyFestivalData(..., { copySponsoringCategories })` legt die
 *      **vollständige** Preisliste des Quellfests im Zielfest an, mit Werten
 *      und auch die Kategorien, die niemand zugewiesen hatte.
 *   2. `copyFestivalData(..., { copySponsorings })` legt je Firma des
 *      Quellfests eine **nackte Verknüpfung** an: keine Zuweisung, kein
 *      Freibetrag, keine Sachleistung, keine Notiz — dafür das Quellfest in
 *      `copied_from_festival_id` (ADR 0008).
 *   3. Beide Schalter hängen nicht aneinander, und keiner fasst das Quellfest an.
 *
 * Beobachtet wird an der Grenze zum `sponsorService` — was an Schreibwegen
 * ankommt —, nicht an Interna des Kopier-Service.
 */

const mocks = vi.hoisted(() => ({
	/** Was `createCategoriesBulk` bekommen hat, ein Eintrag je Aufruf. */
	categoryWrites: [] as Array<{ festivalId: string; categories: unknown[] }>,
	/** Was `createBareSponsorings` bekommen hat, ein Eintrag je Aufruf. */
	sponsoringWrites: [] as Array<{
		festivalId: string;
		sponsorIds: string[];
		sourceFestivalId: string;
	}>,
	/** Gelesene Feste, in Aufrufreihenfolge — hier fällt ein Schreibzugriff aufs Quellfest auf. */
	reads: [] as string[]
}));

/** Die Preisliste des Quellfests: drei Kategorien, eine davon ohne Standardwert. */
const QUELL_KATEGORIEN = [
	{ id: 'kat-plakat', festival_id: 'quelle', name: 'Werbeplakat', value: 500 },
	{ id: 'kat-speisekarte', festival_id: 'quelle', name: 'Logo in Speisekarte', value: 150 },
	// Die hatte voriges Jahr niemand gekauft — sie muss trotzdem mitkommen.
	{ id: 'kat-social', festival_id: 'quelle', name: 'Social-Media-Beitrag', value: null }
];

vi.mock('../sponsorService', () => ({
	getCategories: async (festivalId: string) => {
		mocks.reads.push(festivalId);
		return festivalId === 'quelle' ? QUELL_KATEGORIEN : [];
	},
	getSponsoringSponsorIds: async (festivalId: string) => {
		mocks.reads.push(festivalId);
		return festivalId === 'quelle' ? ['firma-baeckerei', 'firma-bank'] : [];
	},
	createCategoriesBulk: async (festivalId: string, categories: unknown[]) => {
		mocks.categoryWrites.push({ festivalId, categories });
	},
	createBareSponsorings: async (
		festivalId: string,
		sponsorIds: string[],
		sourceFestivalId: string
	) => {
		mocks.sponsoringWrites.push({ festivalId, sponsorIds, sourceFestivalId });
	}
}));

vi.mock('../shiftService', () => ({
	getStations: async () => [],
	getStationShifts: async () => [],
	getStationHelpers: async () => [],
	getShiftAssignments: async () => [],
	createStationsBulk: async () => [],
	createStationShiftsBulk: async () => [],
	assignHelperToStation: async () => {},
	assignHelperToStationShift: async () => {}
}));
vi.mock('../helperService', () => ({
	getHelpers: async () => [],
	createHelpersBulk: async () => [],
	updateHelperPreferences: async () => {}
}));
vi.mock('../materialService', () => ({
	getMaterials: async () => [],
	createMaterialsBulk: async () => []
}));

import { copyFestivalData, type CopyFestivalOptions } from '../festivalCopyService';

const options = (over: Partial<CopyFestivalOptions> = {}): CopyFestivalOptions => ({
	stationIds: [],
	copyHelpers: false,
	copyAssignments: false,
	materialIds: [],
	materialQuantitySource: 'ordered',
	copySponsoringCategories: false,
	copySponsorings: false,
	sourceFestivalStartDate: '2026-07-24',
	targetFestivalStartDate: '2027-07-23',
	...over
});

beforeEach(() => {
	mocks.categoryWrites = [];
	mocks.sponsoringWrites = [];
	mocks.reads = [];
});

describe('„Sponsoring-Kategorien übernehmen"', () => {
	// Die Preisliste ist das Jahresgedächtnis des Bereichs — sie kommt
	// vollständig mit Werten (ADR 0008), auch die Kategorie ohne Abnehmer.
	it('legt die ganze Preisliste des Quellfests mit ihren Werten an', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySponsoringCategories: true }));

		expect(mocks.categoryWrites).toEqual([
			{
				festivalId: 'ziel',
				categories: [
					{ name: 'Werbeplakat', value: 500 },
					{ name: 'Logo in Speisekarte', value: 150 },
					{ name: 'Social-Media-Beitrag', value: null }
				]
			}
		]);
	});
});

describe('„Sponsoren übernehmen"', () => {
	// Nackte Verknüpfung: `sponsor_id` und das Quellfest, sonst nichts. Ohne
	// Beträge startet die Geld-Gesamtsumme des neuen Fests bei € 0.
	it('verknüpft jede Firma des Quellfests und hält das Quellfest fest', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySponsorings: true }));

		expect(mocks.sponsoringWrites).toEqual([
			{
				festivalId: 'ziel',
				sponsorIds: ['firma-baeckerei', 'firma-bank'],
				sourceFestivalId: 'quelle'
			}
		]);
	});

	// Der Schreibweg bekommt nur Firmen-Ids und das Quellfest — es gibt keine
	// Stelle, an der ein Betrag, eine Zuweisung oder eine Notiz mitkäme.
	it('reicht nichts weiter als Firma und Quellfest', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySponsorings: true }));

		expect(Object.keys(mocks.sponsoringWrites[0])).toEqual([
			'festivalId',
			'sponsorIds',
			'sourceFestivalId'
		]);
	});
});

describe('die zwei Schalter hängen nicht aneinander', () => {
	it('legt mit beiden die Preisliste und die Firmen an', async () => {
		await copyFestivalData(
			'quelle',
			'ziel',
			options({ copySponsoringCategories: true, copySponsorings: true })
		);

		expect(mocks.categoryWrites).toHaveLength(1);
		expect(mocks.sponsoringWrites).toHaveLength(1);
	});

	// Die Preisliste ist auch ohne Firmen nützlich — sie ist das Jahresgedächtnis.
	it('legt allein mit den Kategorien kein Sponsoring an', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySponsoringCategories: true }));

		expect(mocks.sponsoringWrites).toEqual([]);
	});

	// Eine nackte Verknüpfung trägt keine Zuweisung, sie braucht also auch keine
	// Kategorie im Zielfest.
	it('legt allein mit den Sponsoren keine Kategorie an', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySponsorings: true }));

		expect(mocks.categoryWrites).toEqual([]);
	});

	it('lässt das Sponsoring des Zielfests ohne beide Schalter leer', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		expect(mocks.categoryWrites).toEqual([]);
		expect(mocks.sponsoringWrites).toEqual([]);
		// Ohne Schalter wird das Quellfest gar nicht erst danach gefragt.
		expect(mocks.reads).toEqual([]);
	});
});

describe('das Quellfest bleibt unangetastet', () => {
	it('schreibt ausschließlich ins Zielfest', async () => {
		await copyFestivalData(
			'quelle',
			'ziel',
			options({ copySponsoringCategories: true, copySponsorings: true })
		);

		expect(mocks.categoryWrites.every((w) => w.festivalId === 'ziel')).toBe(true);
		expect(mocks.sponsoringWrites.every((w) => w.festivalId === 'ziel')).toBe(true);
		// Das Quellfest kommt nur als Herkunft vor, nie als Ziel eines Schreibwegs.
		expect(mocks.reads).toEqual(['quelle', 'quelle']);
	});
});
