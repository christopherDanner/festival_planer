import { describe, expect, it } from 'vitest';

import { festCountdown, festCountdownCoarse, festYear, formatFestDateRange } from './festDates';

describe('festYear', () => {
	it('liest das Jahr tagesgenau und lokal, nicht als UTC', () => {
		expect(festYear('2026-01-01')).toBe(2026);
		expect(festYear('2025-12-31')).toBe(2025);
	});
});

describe('formatFestDateRange', () => {
	it('lässt den Monat am Start weg, wenn beide Tage im selben Monat liegen', () => {
		expect(formatFestDateRange('2026-07-24', '2026-07-26')).toBe('Fr 24. – So 26. Juli');
	});

	it('nennt beide Monate bei Monatswechsel', () => {
		expect(formatFestDateRange('2026-07-31', '2026-08-02')).toBe('Fr 31. Juli – So 2. August');
	});

	it('zeigt Eintages-Feste als einzelnen Tag', () => {
		expect(formatFestDateRange('2026-07-24', '2026-07-24')).toBe('Fr 24. Juli');
		expect(formatFestDateRange('2026-07-24', null)).toBe('Fr 24. Juli');
	});
});

describe('festCountdown', () => {
	const today = new Date('2026-07-20T15:30:00');

	it('zählt Tage bis zum Start', () => {
		expect(festCountdown('2026-07-24', '2026-07-26', today)).toBe('noch 4 Tage');
	});

	it('kennt morgen und heute', () => {
		expect(festCountdown('2026-07-21', null, today)).toBe('morgen!');
		expect(festCountdown('2026-07-20', null, today)).toBe('heute!');
	});

	it('meldet laufende und vergangene Feste', () => {
		expect(festCountdown('2026-07-18', '2026-07-21', today)).toBe('läuft gerade');
		expect(festCountdown('2026-07-10', '2026-07-12', today)).toBe('vorbei');
	});
});

describe('festCountdownCoarse', () => {
	const today = new Date('2026-07-20T15:30:00');

	it('rechnet weit entfernte Feste in Monate um', () => {
		expect(festCountdownCoarse('2026-10-24', today)).toBe('in 3 Monaten');
		expect(festCountdownCoarse('2026-12-04', today)).toBe('in 5 Monaten');
	});

	it('bleibt im ersten Monat bei Tagen', () => {
		expect(festCountdownCoarse('2026-08-10', today)).toBe('in 21 Tagen');
		expect(festCountdownCoarse('2026-07-21', today)).toBe('morgen!');
		expect(festCountdownCoarse('2026-07-20', today)).toBe('heute!');
	});

	it('wechselt monoton von Tagen auf Monate — nie zurück', () => {
		expect(festCountdownCoarse('2026-08-18', today)).toBe('in 29 Tagen');
		expect(festCountdownCoarse('2026-08-19', today)).toBe('in 1 Monat');
		expect(festCountdownCoarse('2026-08-29', today)).toBe('in 1 Monat');
		expect(festCountdownCoarse('2026-09-03', today)).toBe('in 2 Monaten');
	});
});
