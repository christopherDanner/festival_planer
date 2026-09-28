import { describe, expect, it } from 'vitest';

import {
	scheduleScope,
	schedulePreviewRows,
	type SchedulePreviewInput
} from './scheduleChoice';
import {
	scheduleDay,
	scheduleEntry,
	schedulePhase,
	scheduleTask
} from '@/lib/__tests__/scheduleFactories';

/** Fest 2026: Fr 24.07. – So 26.07., davor der Aufbau-Donnerstag. */
const SOURCE_START = '2026-07-24';
/** Fest 2027: Fr 23.07. – So 25.07. Der Donnerstag davor ist der 22.07. */
const TARGET_START = '2027-07-23';

const aufbau = scheduleDay({
	id: 'd-aufbau',
	date: '2026-07-23',
	label: 'Aufbau',
	phases: [
		schedulePhase({ id: 'ph-1', schedule_day_id: 'd-aufbau', name: 'Anlieferung' }),
		schedulePhase({ id: 'ph-2', schedule_day_id: 'd-aufbau', name: 'Abendrunde', sort_order: 1 })
	],
	entries: [
		scheduleTask({ id: 't-1', schedule_day_id: 'd-aufbau', title: 'Feuerwehr-Abnahme' }),
		scheduleTask({ id: 't-2', schedule_day_id: 'd-aufbau', title: 'Zelt stellen' }),
		scheduleEntry({ id: 'e-1', schedule_day_id: 'd-aufbau', title: 'Fassanstich' })
	]
});

const samstag = scheduleDay({ id: 'd-samstag', date: '2026-07-25', label: 'Samstag' });

const rows = (over: Partial<SchedulePreviewInput> = {}) =>
	schedulePreviewRows({
		days: [aufbau, samstag],
		sourceStartDate: SOURCE_START,
		targetStartDate: TARGET_START,
		...over
	});

describe('schedulePreviewRows', () => {
	// Die Vorschau muss denselben Termin nennen, den `copyFestivalData` schreibt
	// (#94) — beide rechnen über `shiftFestivalDate`.
	it('stellt dem alten Termin den neuen gegenüber', () => {
		expect(rows().map((row) => [row.when, row.newWhen])).toEqual([
			['Do 23.07.2026', 'Do 22.07.2027'],
			['Sa 25.07.2026', 'Sa 24.07.2027']
		]);
	});

	it('trägt das freie Label des Tages', () => {
		expect(rows()[0].label).toBe('Aufbau');
		expect(rows({ days: [scheduleDay({ label: null })] })[0].label).toBe('');
	});

	// Der Schritt zeigt jeden Tag, bevor er übernommen wird — was an ihm hängt,
	// steht darum in der Zeile selbst statt hinter einem Aufklapper.
	it('beziffert Phasen, Aufgaben und Programmpunkte des Tages', () => {
		expect(rows()[0].meta).toBe('2 Phasen · 2 Aufgaben · 1 Programmpunkt');
	});

	it('lässt weg, wovon es nichts gibt', () => {
		expect(
			schedulePreviewRows({
				days: [scheduleDay({ entries: [scheduleTask()] })],
				sourceStartDate: SOURCE_START,
				targetStartDate: TARGET_START
			})[0].meta
		).toBe('1 Aufgabe');
	});

	// Ein automatisch erzeugter Festtag ohne Einträge ist der Normalfall; „0
	// Phasen · 0 Aufgaben" wäre Lärm.
	it('sagt es rund heraus, wenn an einem Tag nichts hängt', () => {
		expect(rows()[1].meta).toBe('ohne Einträge');
	});

	it('behält die Reihenfolge der Abfrage bei', () => {
		expect(rows().map((row) => row.id)).toEqual(['d-aufbau', 'd-samstag']);
	});

	// Über den Deep-Link `?vorlage=` steht die Vorlage schon, während Schritt 1
	// noch leer ist — ohne Startdatum liefe der Versatz auf ein ungültiges Datum.
	it('zeigt nichts, solange ein Startdatum fehlt', () => {
		expect(rows({ targetStartDate: '' })).toEqual([]);
		expect(rows({ sourceStartDate: '' })).toEqual([]);
	});
});

describe('scheduleScope', () => {
	it('zählt Tage und Einträge für die Untertitel-Zeile der Stempelkarte', () => {
		expect(scheduleScope([aufbau, samstag])).toEqual({ scheduleDays: 2, scheduleEntries: 3 });
	});

	it('zählt einen leeren Ablaufplan als nichts', () => {
		expect(scheduleScope([])).toEqual({ scheduleDays: 0, scheduleEntries: 0 });
	});
});
