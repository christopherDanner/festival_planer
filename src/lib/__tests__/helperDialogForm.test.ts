import { describe, expect, it } from 'vitest';

/* Seam dieses Tests (aus den Abnahmekriterien von #107 abgeleitet, vor dem
   ersten Test festgehalten): `helperDialogForm` hält die Regeln des **einen**
   Helfer-Blatts — was ein leeres Blatt zeigt, was ein bestehender Helfer
   hineinträgt, wann gespeichert werden darf, was dabei abgegeben wird und
   welche Wunsch-Marken der Zettel zeichnet. Reine Logik ohne React; die Optik
   steht im `HelperZettel`, das Öffnen im `HelperDialog`. */

import {
	buildWishBoard,
	canSaveHelper,
	emptyHelperForm,
	helperFormFrom,
	helperPayload,
	toggleShiftWish,
	toggleStationWish
} from '../helperDialogForm';
import { helper, shift, station } from './shiftFixtures';

const SOURCE = {
	stations: [station({ id: 's1', name: 'Ausschank' }), station({ id: 's2', name: 'Grill' })],
	stationShifts: [
		shift({ id: 'sh1', station_id: 's1', name: 'Frühschoppen', start_time: '11:00', end_time: '15:00' }),
		shift({ id: 'sh2', station_id: 's1', name: 'Abend', start_time: '18:00', end_time: '23:00' }),
		shift({ id: 'sh3', station_id: 's2', name: 'Grillen', start_time: '12:00', end_time: '16:00' })
	]
};

describe('emptyHelperForm', () => {
	it('öffnet ein leeres Blatt — auch die Wünsche fangen bei nichts an', () => {
		expect(emptyHelperForm()).toEqual({
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			notes: '',
			station_preferences: [],
			shift_preferences: []
		});
	});
});

describe('helperFormFrom', () => {
	it('trägt Stammdaten und Wünsche desselben Helfers auf ein Blatt', () => {
		const form = helperFormFrom(
			helper({
				first_name: 'Franz',
				last_name: 'Hochauer',
				email: 'franz@example.at',
				phone: '0660 1234567',
				notes: 'kann nur Samstag',
				station_preferences: ['s1'],
				shift_preferences: ['sh1']
			}),
			SOURCE
		);

		expect(form).toEqual({
			first_name: 'Franz',
			last_name: 'Hochauer',
			email: 'franz@example.at',
			phone: '0660 1234567',
			notes: 'kann nur Samstag',
			station_preferences: ['s1'],
			shift_preferences: ['sh1']
		});
	});

	it('macht aus fehlenden Feldern leere Felder statt „null"', () => {
		const form = helperFormFrom(helper({ email: null, phone: null, notes: null }), SOURCE);

		expect(form.email).toBe('');
		expect(form.phone).toBe('');
		expect(form.notes).toBe('');
	});

	// ADR 0005: Die Wunsch-Arrays haben keine Fremdschlüssel — eine gelöschte
	// Station bleibt als Karteileiche darin stehen. Sauber hält es ein Filtern
	// beim Lesen, und genau das ist „beim Anzeigen still übersprungen" (#107).
	it('überspringt die ID einer gelöschten Station still', () => {
		const form = helperFormFrom(
			helper({ station_preferences: ['s1', 's-weg'], shift_preferences: [] }),
			SOURCE
		);

		expect(form.station_preferences).toEqual(['s1']);
	});

	it('überspringt die ID einer gelöschten Schicht still', () => {
		const form = helperFormFrom(
			helper({ station_preferences: [], shift_preferences: ['sh-weg', 'sh2'] }),
			SOURCE
		);

		expect(form.shift_preferences).toEqual(['sh2']);
	});

	it('verträgt einen Helfer ganz ohne Wunsch-Arrays', () => {
		const roh = { ...helper(), station_preferences: undefined, shift_preferences: undefined };

		const form = helperFormFrom(roh as never, SOURCE);

		expect(form.station_preferences).toEqual([]);
		expect(form.shift_preferences).toEqual([]);
	});
});

describe('canSaveHelper', () => {
	it('verlangt Vor- und Nachnamen — ohne Namen ist es kein Helfer', () => {
		expect(canSaveHelper(emptyHelperForm())).toBe(false);
		expect(canSaveHelper({ ...emptyHelperForm(), first_name: 'Franz' })).toBe(false);
		expect(canSaveHelper({ ...emptyHelperForm(), last_name: 'Hochauer' })).toBe(false);
		expect(
			canSaveHelper({ ...emptyHelperForm(), first_name: 'Franz', last_name: 'Hochauer' })
		).toBe(true);
	});

	it('lässt sich von Leerzeichen nicht täuschen', () => {
		expect(canSaveHelper({ ...emptyHelperForm(), first_name: '  ', last_name: '  ' })).toBe(false);
	});
});

describe('helperPayload', () => {
	it('gibt Stammdaten und beide Wunsch-Arrays in einem Zug ab', () => {
		const form = {
			first_name: 'Franz',
			last_name: 'Hochauer',
			email: 'franz@example.at',
			phone: '0660 1234567',
			notes: 'kann nur Samstag',
			station_preferences: ['s1'],
			shift_preferences: ['sh1']
		};

		expect(helperPayload(form)).toEqual(form);
	});

	// Getrimmt werden nur die beiden Namen — sie tragen die Marke der
	// Helferliste. Der Rest bleibt, wie er getippt wurde (wie `stationPayload`).
	it('trimmt die Namen, nicht die freien Felder', () => {
		const payload = helperPayload({
			...emptyHelperForm(),
			first_name: ' Franz ',
			last_name: ' Hochauer ',
			notes: '  kann nur Samstag  '
		});

		expect(payload.first_name).toBe('Franz');
		expect(payload.last_name).toBe('Hochauer');
		expect(payload.notes).toBe('  kann nur Samstag  ');
	});

	// Die Zeile gibt es nicht mehr (ADR 0005) — ein Blatt, das sie mitschickte,
	// schriebe in Spalten, die das Schema nicht hat.
	it('schreibt weder is_active noch user_id', () => {
		const payload = helperPayload(emptyHelperForm());

		expect(payload).not.toHaveProperty('is_active');
		expect(payload).not.toHaveProperty('user_id');
	});
});

describe('toggleStationWish', () => {
	const leer = { station_preferences: [], shift_preferences: [] };

	it('setzt eine Wunsch-Station', () => {
		expect(toggleStationWish(leer, 's1', SOURCE.stationShifts)).toEqual({
			station_preferences: ['s1'],
			shift_preferences: []
		});
	});

	it('nimmt sie beim zweiten Klick zurück', () => {
		const wishes = { station_preferences: ['s1', 's2'], shift_preferences: [] };

		expect(toggleStationWish(wishes, 's1', SOURCE.stationShifts).station_preferences).toEqual(['s2']);
	});

	// Ein Schichtwunsch an einer Station, die man gar nicht will, wäre ein
	// Widerspruch auf demselben Blatt.
	it('nimmt die Schichtwünsche dieser Station mit', () => {
		const wishes = { station_preferences: ['s1'], shift_preferences: ['sh1', 'sh2', 'sh3'] };

		expect(toggleStationWish(wishes, 's1', SOURCE.stationShifts)).toEqual({
			station_preferences: [],
			shift_preferences: ['sh3']
		});
	});
});

describe('toggleShiftWish', () => {
	it('setzt eine Wunsch-Schicht und ihre Station gleich mit', () => {
		const leer = { station_preferences: [], shift_preferences: [] };

		expect(toggleShiftWish(leer, 'sh1', SOURCE.stationShifts)).toEqual({
			station_preferences: ['s1'],
			shift_preferences: ['sh1']
		});
	});

	it('lässt die Station stehen, wenn sie schon gewünscht ist', () => {
		const wishes = { station_preferences: ['s1'], shift_preferences: [] };

		expect(toggleShiftWish(wishes, 'sh2', SOURCE.stationShifts).station_preferences).toEqual(['s1']);
	});

	it('nimmt beim Abwählen nur die Schicht weg, nicht die Station', () => {
		const wishes = { station_preferences: ['s1'], shift_preferences: ['sh1', 'sh2'] };

		expect(toggleShiftWish(wishes, 'sh1', SOURCE.stationShifts)).toEqual({
			station_preferences: ['s1'],
			shift_preferences: ['sh2']
		});
	});
});

describe('buildWishBoard', () => {
	it('zeichnet jede Station des Fests als Marke, auch die ohne Schichten', () => {
		const board = buildWishBoard(
			{ station_preferences: [], shift_preferences: [] },
			{ stations: [station({ id: 's3', name: 'Kassa' })], stationShifts: [] }
		);

		expect(board.map((s) => s.name)).toEqual(['Kassa']);
		expect(board[0].shifts).toEqual([]);
	});

	it('merkt sich je Marke, ob sie gewählt ist', () => {
		const board = buildWishBoard(
			{ station_preferences: ['s2'], shift_preferences: ['sh1'] },
			SOURCE
		);

		expect(board.map((s) => [s.name, s.selected])).toEqual([
			['Ausschank', false],
			['Grill', true]
		]);
		expect(board[0].shifts.map((s) => [s.id, s.selected])).toEqual([
			['sh1', true],
			['sh2', false]
		]);
	});

	it('beschriftet eine Wunsch-Schicht mit Tag, Namen und Zeit', () => {
		const board = buildWishBoard({ station_preferences: [], shift_preferences: [] }, SOURCE);

		expect(board[0].shifts[0].label).toBe('Sa 25. Juli · Frühschoppen');
		expect(board[0].shifts[0].time).toBe('11–15');
	});

	it('lässt bei einer namenlosen Schicht den Namensteil weg', () => {
		const board = buildWishBoard(
			{ station_preferences: [], shift_preferences: [] },
			{ stations: [station()], stationShifts: [shift({ name: '' })] }
		);

		expect(board[0].shifts[0].label).toBe('Sa 25. Juli');
	});

	// Die Schicht über Mitternacht steht beim Starttag und trägt ihr zweites
	// Datum selbst — dieselbe Aufschrift wie im Fokus-Kasten (`shiftTimeLabel`).
	it('nennt die Schicht über Mitternacht wie der Fokus-Kasten', () => {
		const board = buildWishBoard(
			{ station_preferences: [], shift_preferences: [] },
			{
				stations: [station()],
				stationShifts: [
					shift({ start_time: '23:00', end_time: '02:00', end_date: '2026-07-26' })
				]
			}
		);

		expect(board[0].shifts[0].time).toBe('23–02 +1');
	});
});
