import { describe, it, expect } from 'vitest';
import type { ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';
import { buildHelperRoster } from '@/lib/helperRoster';

/** Die Regeln der Helferliste (#103): Suche, Segment-Filter, die Zähler in den
Knöpfen und die Gruppierung nach Wunsch-Passung zur fokussierten Station. */

function helper(over: Partial<Helper> = {}): Helper {
	return {
		id: 'h1',
		festival_id: 'f1',
		first_name: 'Franz',
		last_name: 'Hochauer',
		station_preferences: [],
		shift_preferences: [],
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
		...over
	};
}

function stationHelper(over: Partial<StationHelperWithDetails> = {}): StationHelperWithDetails {
	return {
		id: 'sm1',
		festival_id: 'f1',
		station_id: 's1',
		helper_id: 'h1',
		created_at: '',
		...over
	};
}

const roster = (over: Partial<Parameters<typeof buildHelperRoster>[0]> = {}) =>
	buildHelperRoster({
		helpers: [],
		assignments: [],
		stationHelpers: [],
		focusStationId: null,
		search: '',
		filter: 'all',
		...over
	});

/** Alle Marken über alle Gruppen — die Liste, wie sie am Bildschirm steht. */
const chips = (over: Partial<Parameters<typeof buildHelperRoster>[0]> = {}) =>
	roster(over).groups.flatMap((g) => g.chips);

const names = (over: Partial<Parameters<typeof buildHelperRoster>[0]> = {}) =>
	chips(over).map((c) => c.name);

describe('buildHelperRoster — die Marke', () => {
	it('schreibt den Namen mit Nachname zuerst, wie überall sonst', () => {
		expect(names({ helpers: [helper()] })).toEqual(['Hochauer Franz']);
	});

	it('zählt an der Plakette nur die Schicht-Zuteilungen', () => {
		const [chip] = chips({
			helpers: [helper()],
			assignments: [
				assignment({ id: 'a1', station_shift_id: 'sh1' }),
				assignment({ id: 'a2', station_shift_id: 'sh2' })
			],
			// Die Stationsmitgliedschaft ist keine Schicht — sie zählt nicht mit.
			stationHelpers: [stationHelper()]
		});

		expect(chip.shiftCount).toBe(2);
	});

	it('trägt keine Plakette, solange niemand ihn eingeteilt hat', () => {
		expect(chips({ helpers: [helper()] })[0].shiftCount).toBe(0);
	});

	it('gilt als zugeteilt, wer bloß Stationsmitglied ist — weiter als die Ampel', () => {
		const [chip] = chips({ helpers: [helper()], stationHelpers: [stationHelper()] });

		expect(chip.shiftCount).toBe(0);
		expect(chip.assigned).toBe(true);
	});
});

describe('buildHelperRoster — Segment-Filter und seine Zähler', () => {
	const drei = [
		helper({ id: 'h1', last_name: 'Hochauer' }),
		helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria' }),
		helper({ id: 'h3', last_name: 'Gruber', first_name: 'Peter' })
	];
	const eineSchicht = [assignment({ helper_id: 'h1' })];
	const eineStation = [stationHelper({ helper_id: 'h2' })];

	it('zählt Alle, Frei und Zugeteilt', () => {
		const { counts } = roster({
			helpers: drei,
			assignments: eineSchicht,
			stationHelpers: eineStation
		});

		expect(counts).toEqual({ all: 3, free: 1, assigned: 2 });
	});

	it('zeigt unter „Frei" nur, wer nirgends steht', () => {
		expect(
			names({
				helpers: drei,
				assignments: eineSchicht,
				stationHelpers: eineStation,
				filter: 'free'
			})
		).toEqual(['Gruber Peter']);
	});

	it('zeigt unter „Zugeteilt" auch den bloßen Stationsmitglied', () => {
		expect(
			names({
				helpers: drei,
				assignments: eineSchicht,
				stationHelpers: eineStation,
				filter: 'assigned'
			}).sort()
		).toEqual(['Hochauer Franz', 'Leitner Maria']);
	});

	it('zählt nur, was die Suche übrig lässt — sonst verspricht der Knopf mehr, als er zeigt', () => {
		const { counts } = roster({
			helpers: drei,
			assignments: eineSchicht,
			stationHelpers: eineStation,
			search: 'a'
		});

		// „Hochauer Franz" und „Leitner Maria", beide zugeteilt; „Gruber Peter"
		// trägt kein a und fällt raus.
		expect(counts).toEqual({ all: 2, free: 0, assigned: 2 });
	});

	it('hält die Zahl im aktiven Knopf und die Zahl der Marken gleich', () => {
		const eingabe = {
			helpers: drei,
			assignments: eineSchicht,
			stationHelpers: eineStation,
			search: 'e'
		};

		for (const filter of ['all', 'free', 'assigned'] as const) {
			expect(chips({ ...eingabe, filter }).length).toBe(roster({ ...eingabe, filter }).counts[filter]);
		}
	});
});

describe('buildHelperRoster — die Suche', () => {
	const zwei = [
		helper({ id: 'h1', last_name: 'Hochauer', first_name: 'Franz' }),
		helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria' })
	];

	it('greift auf Nach- und Vornamen und achtet nicht auf Groß-/Kleinschreibung', () => {
		expect(names({ helpers: zwei, search: 'HOCH' })).toEqual(['Hochauer Franz']);
		expect(names({ helpers: zwei, search: 'maria' })).toEqual(['Leitner Maria']);
	});

	it('übergeht Leerraum an den Rändern', () => {
		expect(names({ helpers: zwei, search: '  leitner ' })).toEqual(['Leitner Maria']);
	});

	it('findet auch, wer den Vornamen zuerst tippt — die Marke heißt andersherum', () => {
		expect(names({ helpers: zwei, search: 'franz hochauer' })).toEqual(['Hochauer Franz']);
	});

	it('verlangt jedes getippte Wort, statt beim ersten Treffer aufzuhören', () => {
		expect(names({ helpers: zwei, search: 'franz leitner' })).toEqual([]);
	});
});

describe('buildHelperRoster — Gruppierung nach Wunsch-Passung', () => {
	const zwei = [
		helper({ id: 'h1', last_name: 'Hochauer', station_preferences: ['s1'] }),
		helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria' })
	];

	it('stellt die Wünschenden voran und nennt beide Gruppen mit ihrer Zahl', () => {
		const { groups } = roster({ helpers: zwei, focusStationId: 's1' });

		expect(groups.map((g) => g.id)).toEqual(['wish', 'rest']);
		expect(groups[0].title).toBe('Wünschen sich diese Station (1)');
		expect(groups[0].chips.map((c) => c.name)).toEqual(['Hochauer Franz']);
		expect(groups[1].title).toBe('Weitere (1)');
	});

	it('gruppiert beim Fokus-Wechsel neu', () => {
		const wunsch = (focusStationId: string) =>
			roster({
				helpers: [
					helper({ id: 'h1', last_name: 'Hochauer', station_preferences: ['s1'] }),
					helper({ id: 'h2', last_name: 'Leitner', first_name: 'Maria', station_preferences: ['s2'] })
				],
				focusStationId
			}).groups[0].chips.map((c) => c.name);

		expect(wunsch('s1')).toEqual(['Hochauer Franz']);
		expect(wunsch('s2')).toEqual(['Leitner Maria']);
	});

	it('teilt die Liste gar nicht, wenn sich niemand diese Station wünscht', () => {
		const { groups } = roster({ helpers: zwei, focusStationId: 's9' });

		expect(groups).toHaveLength(1);
		expect(groups[0].id).toBe('rest');
		// Ohne Wunsch-Gruppe gäbe es kein „weitere" — eine Aufschrift wäre Lärm.
		expect(groups[0].title).toBeNull();
		expect(groups[0].chips).toHaveLength(2);
	});

	it('teilt auch ohne Fokus-Station nicht — es gibt nichts zu passen', () => {
		expect(roster({ helpers: zwei }).groups.map((g) => g.title)).toEqual([null]);
	});

	it('lässt eine leer gefilterte Gruppe weg, statt sie mit (0) hinzuschreiben', () => {
		const { groups } = roster({
			helpers: zwei,
			focusStationId: 's1',
			// Nur der Wünschende bleibt übrig.
			search: 'hochauer'
		});

		expect(groups.map((g) => g.id)).toEqual(['wish']);
	});

	it('reiht innerhalb der Gruppe nach Namen', () => {
		expect(
			names({
				helpers: [
					helper({ id: 'h2', last_name: 'Ölzant' }),
					helper({ id: 'h3', last_name: 'Zauner' }),
					helper({ id: 'h1', last_name: 'Auer' })
				]
			})
		).toEqual(['Auer Franz', 'Ölzant Franz', 'Zauner Franz']);
	});
});

describe('buildHelperRoster — was die Liste im Ganzen weiß', () => {
	it('merkt sich, wie viele Helfer das Fest hat — auch wenn die Suche alles wegnimmt', () => {
		const ergebnis = roster({ helpers: [helper(), helper({ id: 'h2' })], search: 'xyz' });

		expect(ergebnis.total).toBe(2);
		expect(ergebnis.groups).toEqual([]);
		expect(ergebnis.counts.all).toBe(0);
	});

	it('kommt mit einem Fest ohne Helfer zurecht', () => {
		expect(roster()).toEqual({ total: 0, counts: { all: 0, free: 0, assigned: 0 }, groups: [] });
	});
});
