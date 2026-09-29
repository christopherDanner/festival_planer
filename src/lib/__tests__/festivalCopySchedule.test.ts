import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleDay, scheduleEntry, schedulePhase, scheduleTask } from './scheduleFactories';

/**
 * Ablaufplan-Übernahme im Kopierwerk (#127).
 *
 * „Feuerwehr-Abnahme, Fassanstich, Leergut-Rückgabe" sind jedes Jahr dieselben
 * Zeilen — der Ablaufplan trägt das Jahresgedächtnis des Fests. Er wandert
 * darum mit demselben Datums-Versatz mit wie die Schichten (#94): der
 * Aufbau-Donnerstag fällt wieder auf einen Donnerstag.
 *
 * Eingeklagt wird hier die ganze Kante: Tage, Phasen und Einträge im Zielfest,
 * Aufgaben offen, Verantwortliche nur mit übernommenen Helfern — und das
 * Quellfest unangetastet.
 */

/** Fest 2026: Fr 24.07. – So 26.07., davor der Aufbau-Donnerstag. */
const SOURCE_START = '2026-07-24';
/** Fest 2027: Fr 23.07. – So 25.07. Der Donnerstag davor ist der 22.07. */
const TARGET_START = '2027-07-23';

const imQuellfest = { festival_id: 'quelle', schedule_day_id: 'd-aufbau' };

/** Aufbau-Donnerstag: von Hand angelegt, zwei Phasen, zwei Aufgaben. */
const AUFBAU_TAG = scheduleDay({
	id: 'd-aufbau',
	festival_id: 'quelle',
	date: '2026-07-23',
	label: 'Aufbau',
	is_auto_generated: false,
	sort_order: 0,
	phases: [
		schedulePhase({ ...imQuellfest, id: 'ph-anlieferung', name: 'Anlieferung', sort_order: 0 }),
		schedulePhase({ ...imQuellfest, id: 'ph-abend', name: 'Abendrunde', sort_order: 1 })
	],
	entries: [
		scheduleTask({
			...imQuellfest,
			id: 'e-abnahme',
			schedule_phase_id: 'ph-anlieferung',
			title: 'Feuerwehr-Abnahme',
			start_time: '09:00:00',
			responsible_helper_id: 'h-alt-1',
			// Der Haken des Vorjahrs ist wertlos — er darf nicht mitkommen.
			status: 'done',
			description: 'Mit dem Kommandanten abstimmen'
		}),
		scheduleTask({
			...imQuellfest,
			id: 'e-leergut',
			title: 'Leergut-Rückgabe',
			status: 'done'
		})
	]
});

/** Festsamstag: automatisch erzeugt, ohne Phasen, ein Programmpunkt. Ein
Programmpunkt trägt keinen Status (ADR 0007). */
const FEST_SAMSTAG = scheduleDay({
	id: 'd-samstag',
	festival_id: 'quelle',
	date: '2026-07-25',
	label: 'Samstag',
	is_auto_generated: true,
	sort_order: 1,
	entries: [
		scheduleEntry({
			id: 'e-fassanstich',
			festival_id: 'quelle',
			schedule_day_id: 'd-samstag',
			title: 'Fassanstich',
			type: 'program',
			start_time: '11:00:00',
			end_time: '11:30:00'
		})
	]
});

type Row = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
	readFestivalIds: [] as string[],
	/** Der Ablaufplan des Quellfests; `beforeEach` setzt ihn auf die zwei Tage. */
	sourceDays: [] as Row[],
	days: [] as Row[],
	phases: [] as Row[],
	entries: [] as Row[]
}));

/**
 * Die Doubles geben die angelegten Zeilen **umgedreht** zurück. `INSERT …
 * RETURNING` sagt über die Reihenfolge nichts zu — hinge die Zuordnung an ihr,
 * landeten Einträge still am falschen Tag und in der falschen Phase.
 */
const created = (rows: Row[], prefix: string) =>
	[...rows].reverse().map((row, i) => ({ ...row, id: `${prefix}-neu-${i}` }));

vi.mock('../scheduleService', () => ({
	getScheduleDays: async (festivalId: string) => {
		mocks.readFestivalIds.push(festivalId);
		return mocks.sourceDays;
	},
	createScheduleDaysBulk: async (rows: Row[]) => {
		mocks.days = rows;
		return created(rows, 'd');
	},
	createSchedulePhasesBulk: async (rows: Row[]) => {
		mocks.phases = rows;
		return created(rows, 'ph');
	},
	createScheduleEntriesBulk: async (rows: Row[]) => {
		mocks.entries = rows;
		return created(rows, 'e');
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
	getHelpers: async (festivalId: string) =>
		festivalId === 'quelle'
			? [{ id: 'h-alt-1', festival_id: 'quelle', first_name: 'Hans', last_name: 'Huber' }]
			: [],
	createHelpersBulk: async () => ['h-neu-1'],
	updateHelperPreferences: async () => {}
}));

vi.mock('../materialService', () => ({
	getMaterials: async () => [],
	createMaterialsBulk: async () => []
}));

// Das Sponsoring hat seine eigene Suite (`festivalCopySponsoring`); hier steht
// es nur still, damit der Kopier-Service nicht am echten Supabase-Client hängt.
vi.mock('../sponsorService', () => ({
	getCategories: async () => [],
	getSponsoringSponsorIds: async () => [],
	createCategoriesBulk: async () => {},
	createBareSponsorings: async () => {}
}));

import { copyFestivalData, type CopyFestivalOptions } from '../festivalCopyService';

const options = (over: Partial<CopyFestivalOptions> = {}): CopyFestivalOptions => ({
	stationIds: [],
	copyHelpers: false,
	copyAssignments: false,
	copySchedule: true,
	materialIds: [],
	materialQuantitySource: 'ordered',
	copySponsoringCategories: false,
	copySponsorings: false,
	sourceFestivalStartDate: SOURCE_START,
	targetFestivalStartDate: TARGET_START,
	...over
});

/** Der neue Aufbau-Donnerstag; welche ID er trägt, sagt das Double um. */
const neuerTag = (date: string) => mocks.days.findIndex((d) => d.date === date);
const tagId = (date: string) => `d-neu-${mocks.days.length - 1 - neuerTag(date)}`;

beforeEach(() => {
	mocks.readFestivalIds = [];
	mocks.sourceDays = [AUFBAU_TAG, FEST_SAMSTAG] as unknown as Row[];
	mocks.days = [];
	mocks.phases = [];
	mocks.entries = [];
});

describe('„Ablaufplan übernehmen"', () => {
	// Derselbe Versatz wie bei den Schichten: der Aufbau-Donnerstag fällt wieder
	// auf einen Donnerstag, nicht auf denselben Kalendertag.
	it('versetzt die Tage auf den Wochentags-Abstand', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		expect(mocks.days).toEqual([
			{
				festival_id: 'ziel',
				date: '2027-07-22',
				label: 'Aufbau',
				is_auto_generated: false,
				sort_order: 0
			},
			{
				festival_id: 'ziel',
				date: '2027-07-24',
				label: 'Samstag',
				is_auto_generated: true,
				sort_order: 1
			}
		]);
	});

	it('hängt die Phasen an ihre neuen Tage und behält ihre Reihenfolge', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		expect(mocks.phases).toEqual([
			{
				festival_id: 'ziel',
				schedule_day_id: tagId('2027-07-22'),
				name: 'Anlieferung',
				sort_order: 0
			},
			{
				festival_id: 'ziel',
				schedule_day_id: tagId('2027-07-22'),
				name: 'Abendrunde',
				sort_order: 1
			}
		]);
	});

	it('bringt jede Aufgabe als offen herein — der Haken des Vorjahrs ist wertlos', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		const tasks = mocks.entries.filter((e) => e.type === 'task');
		expect(tasks).toHaveLength(2);
		expect(tasks.every((e) => e.status === 'open')).toBe(true);
	});

	it('lässt den Programmpunkt ohne Status — er trägt keinen', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		const programm = mocks.entries.find((e) => e.title === 'Fassanstich');
		expect(programm).toMatchObject({ type: 'program', status: null, start_time: '11:00:00' });
	});

	it('hängt jeden Eintrag an seinen Tag; ohne Phase bleibt er ohne', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		const abnahme = mocks.entries.find((e) => e.title === 'Feuerwehr-Abnahme');
		const leergut = mocks.entries.find((e) => e.title === 'Leergut-Rückgabe');
		const fassanstich = mocks.entries.find((e) => e.title === 'Fassanstich');

		// „Anlieferung" ist die erste angelegte Phase — das Double gibt sie als letzte zurück.
		expect(abnahme).toMatchObject({
			schedule_day_id: tagId('2027-07-22'),
			schedule_phase_id: `ph-neu-${mocks.phases.length - 1}`
		});
		expect(leergut).toMatchObject({
			schedule_day_id: tagId('2027-07-22'),
			schedule_phase_id: null
		});
		expect(fassanstich).toMatchObject({ schedule_day_id: tagId('2027-07-24') });
	});

	it('nimmt Titel, Zeiten und Beschreibung unverändert mit', async () => {
		await copyFestivalData('quelle', 'ziel', options());

		expect(mocks.entries.find((e) => e.title === 'Feuerwehr-Abnahme')).toMatchObject({
			start_time: '09:00:00',
			end_time: null,
			description: 'Mit dem Kommandanten abstimmen'
		});
	});
});

describe('Zuordnung ohne eindeutigen Schlüssel', () => {
	// Nur der Tag trägt einen Schlüssel, den die Datenbank eindeutig hält
	// (UNIQUE auf dem Datum). Zwei Phasen desselben Tages *könnten* gleich heißen
	// und gleich gereiht sein — dann darf die Kopie sie nicht zu einer verschmelzen
	// und ihre Einträge zusammenziehen.
	it('gibt zwei ununterscheidbaren Phasen trotzdem je eine eigene neue Phase', async () => {
		const zwilling = (id: string) =>
			schedulePhase({ ...imQuellfest, id, name: 'Anlieferung', sort_order: 0 });
		mocks.sourceDays = [
			scheduleDay({
				id: 'd-aufbau',
				festival_id: 'quelle',
				date: '2026-07-23',
				phases: [zwilling('ph-a'), zwilling('ph-b')],
				entries: [
					scheduleTask({ ...imQuellfest, id: 'e-a', schedule_phase_id: 'ph-a', title: 'A' }),
					scheduleTask({ ...imQuellfest, id: 'e-b', schedule_phase_id: 'ph-b', title: 'B' })
				]
			})
		] as unknown as Row[];

		await copyFestivalData('quelle', 'ziel', options());

		const phasen = mocks.entries.map((e) => e.schedule_phase_id);
		expect(phasen.every(Boolean)).toBe(true);
		expect(new Set(phasen).size).toBe(2);
	});
});

describe('Versatz bei abweichendem Start-Wochentag', () => {
	// `shiftFestivalDate` hält den **Tages**-Abstand zum Fest-Start — dieselbe
	// Rechnung wie bei den Schichten (#94), und das ist die Bedingung dafür, dass
	// die Vorschau nicht lügt. Starten Quell- und Zielfest an verschiedenen
	// Wochentagen, verschiebt sich der Wochentag darum mit; die Vorschau nennt ihn
	// je Tag, damit man genau das sieht.
	it('hält den Abstand zum Fest-Start, nicht den Wochentag', async () => {
		await copyFestivalData(
			'quelle',
			'ziel',
			// Zielfest startet an einem Samstag statt an einem Freitag.
			options({ targetFestivalStartDate: '2027-07-24' })
		);

		// Aufbau-Tag: ein Tag vor dem Start — aus Do wird Fr.
		expect(mocks.days[0]).toMatchObject({ date: '2027-07-23' });
		// Festsamstag: ein Tag nach dem Start — aus Sa wird So.
		expect(mocks.days[1]).toMatchObject({ date: '2027-07-25' });
	});
});

describe('Verantwortliche', () => {
	// Ein Helfer gehört dem Fest (ADR 0005) — ohne kopierte Helferliste gibt es
	// im Zielfest keine Zeile, auf die der Verantwortliche zeigen könnte.
	it('legt den ganzen Plan an, lässt die Verantwortlichen aber leer', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: false }));

		expect(mocks.days).toHaveLength(2);
		expect(mocks.phases).toHaveLength(2);
		expect(mocks.entries).toHaveLength(3);
		expect(mocks.entries.every((e) => e.responsible_helper_id === null)).toBe(true);
	});

	it('schlüsselt sie mit „Helfer übernehmen" auf die neue Helfer-Zeile um', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		expect(mocks.entries.find((e) => e.title === 'Feuerwehr-Abnahme')).toMatchObject({
			responsible_helper_id: 'h-neu-1'
		});
		// Wer schon im Quellfest keinen hatte, bekommt auch keinen.
		expect(mocks.entries.find((e) => e.title === 'Leergut-Rückgabe')).toMatchObject({
			responsible_helper_id: null
		});
	});
});

describe('ohne den Schalter', () => {
	it('lässt den Ablaufplan des Zielfests leer', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySchedule: false }));

		expect(mocks.days).toEqual([]);
		expect(mocks.phases).toEqual([]);
		expect(mocks.entries).toEqual([]);
	});

	it('liest den Ablaufplan des Quellfests gar nicht erst', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copySchedule: false }));

		expect(mocks.readFestivalIds).toEqual([]);
	});
});

describe('das Quellfest bleibt unangetastet', () => {
	// Eine Kopie, keine Verschiebung: geschrieben wird ausschließlich ins Zielfest.
	it('schreibt nichts ins Quellfest', async () => {
		await copyFestivalData('quelle', 'ziel', options({ copyHelpers: true }));

		const geschrieben = [...mocks.days, ...mocks.phases, ...mocks.entries];
		expect(geschrieben).not.toHaveLength(0);
		expect(geschrieben.every((row) => row.festival_id === 'ziel')).toBe(true);
		// Gelesen wird nur beim Quellfest — das Zielfest hat noch keinen Plan.
		expect(mocks.readFestivalIds).toEqual(['quelle']);
		// Keine ID des Quellfests reist mit: die Kopie hängt durchweg an neuen Zeilen.
		expect(JSON.stringify(geschrieben)).not.toMatch(/d-aufbau|d-samstag|ph-anlieferung|h-alt-1/);
	});
});
