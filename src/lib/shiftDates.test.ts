import { describe, expect, it } from 'vitest';

import { copiedShiftDateLabel, formatShiftRange, shiftFestivalDate } from './shiftDates';

/** Nur die Termin-Felder — mehr braucht dieses Modul nicht. */
const shift = (over: Partial<Parameters<typeof formatShiftRange>[0]> = {}) => ({
	start_date: '2026-07-25',
	start_time: '15:00:00',
	end_time: '19:00:00',
	...over
});

describe('formatShiftRange', () => {
	it('kürzt volle Stunden: „Sa 15–19"', () => {
		expect(formatShiftRange(shift())).toBe('Sa 15–19');
	});

	it('behält Minuten, wenn nicht voll: „Sa 15:30–19"', () => {
		expect(formatShiftRange(shift({ start_time: '15:30:00' }))).toBe('Sa 15:30–19');
	});

	it('mehrtägig: zeigt den End-Wochentag', () => {
		expect(
			formatShiftRange(
				shift({ start_time: '22:00:00', end_date: '2026-07-26', end_time: '02:00:00' })
			)
		).toBe('Sa 22–So 02');
	});
});

describe('shiftFestivalDate', () => {
	// Durchgerechnetes Beispiel: Fest 2026 startet Fr 24.07., die Schicht liegt am
	// Samstag darauf (1 Tag Abstand). Das Fest 2027 startet Fr 23.07. — der
	// Samstag ist dort der 24.07.
	it('hält den Abstand zum Fest-Start und damit den Wochentag', () => {
		expect(shiftFestivalDate('2026-07-24', '2026-07-25', '2027-07-23')).toBe('2027-07-24');
	});
});

describe('copiedShiftDateLabel', () => {
	// Fest 2026 startet Fr 24.07., Fest 2027 Fr 23.07. — der Samstag wandert vom
	// 25.07.2026 auf den 24.07.2027.
	const versatz = ['2026-07-24', '2027-07-23'] as const;

	it('nennt bei einer Schicht innerhalb eines Tages Wochentag und Datum', () => {
		expect(copiedShiftDateLabel({ start_date: '2026-07-25' }, ...versatz)).toBe('Sa 24.07.2027');
	});

	it('nennt über Mitternacht beide Tage', () => {
		expect(
			copiedShiftDateLabel({ start_date: '2026-07-25', end_date: '2026-07-26' }, ...versatz)
		).toBe('Sa/So 24.–25.07.2027');
	});

	// Über den Monatswechsel steht der Monat zweimal, sonst läse sich „31.–01.08."
	// als Zeitraum innerhalb des Augusts.
	it('schreibt über einen Monatswechsel beide Monate aus', () => {
		expect(
			copiedShiftDateLabel(
				{ start_date: '2026-08-01', end_date: '2026-08-02' },
				'2026-08-01',
				'2027-07-31'
			)
		).toBe('Sa/So 31.07.–01.08.2027');
	});
});
