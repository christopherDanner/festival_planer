import { describe, it, expect } from 'vitest';

import { scheduleDay as day, scheduleEntry as entry, scheduleTask as task } from './scheduleFactories';
import { buildProgramSheet } from '../scheduleProgramSheet';

/**
 * Seam dieses Tests (Fertig-wenn aus #123): `buildProgramSheet` beantwortet, was
 * auf dem **Programmzettel** steht — welche Tage, welche Punkte, in welcher
 * Reihenfolge und wie viele. Das Papier (`ProgramSheet`) zeichnet nur noch.
 */

describe('buildProgramSheet — was auf den Zettel kommt', () => {
	it('zeigt nur Programmpunkte — die Aufgabe steht auf dem anderen Papier', () => {
		const sheet = buildProgramSheet([
			day({ entries: [task({ id: 't1' }), entry({ id: 'p1', type: 'program' })] })
		]);

		expect(sheet.days[0].rows.map((row) => row.entry.id)).toEqual(['p1']);
	});

	it('lässt Tage ohne Programmpunkt weg — ein leerer Tag ist kein Aushang', () => {
		const sheet = buildProgramSheet([
			day({ id: 'leer', date: '2026-07-23' }),
			day({ id: 'programm', date: '2026-07-24', entries: [entry({ type: 'program' })] }),
			day({ id: 'nur-aufgaben', date: '2026-07-25', entries: [task()] })
		]);

		expect(sheet.days.map((sheetDay) => sheetDay.day.id)).toEqual(['programm']);
	});

	it('behält die Reihenfolge des Tages — die Uhrzeit reiht im Service (ADR 0007)', () => {
		const sheet = buildProgramSheet([
			day({
				entries: [
					entry({ id: 'früh', type: 'program', start_time: '11:00:00' }),
					entry({ id: 'spät', type: 'program', start_time: '19:30:00' }),
					entry({ id: 'ohne', type: 'program', start_time: null })
				]
			})
		]);

		expect(sheet.days[0].rows.map((row) => row.entry.id)).toEqual(['früh', 'spät', 'ohne']);
	});

	it('kürzt die Sekunden weg und lässt „ohne Zeit" leer', () => {
		const sheet = buildProgramSheet([
			day({
				entries: [
					entry({ id: 'mit', type: 'program', start_time: '18:00:00' }),
					entry({ id: 'ohne', type: 'program', start_time: null })
				]
			})
		]);

		expect(sheet.days[0].rows.map((row) => row.time)).toEqual(['18:00', null]);
	});

	it('nennt den Tag wie die Werkliste ihn nennt', () => {
		const sheet = buildProgramSheet([
			day({ date: '2026-07-24', label: 'Festtag 1', entries: [entry({ type: 'program' })] })
		]);

		expect(sheet.days[0].title).toBe('Freitag 24. Juli · Festtag 1');
	});

	it('zählt alle Punkte des Fests für die Fußzeile', () => {
		const sheet = buildProgramSheet([
			day({
				id: 'd1',
				entries: [
					entry({ id: 'a', type: 'program' }),
					entry({ id: 'b', type: 'program' }),
					task({ id: 't' })
				]
			}),
			day({ id: 'd2', date: '2026-07-26', entries: [entry({ id: 'c', type: 'program' })] })
		]);

		expect(sheet.count).toBe(3);
	});

	it('leeres Fest → leerer Zettel', () => {
		expect(buildProgramSheet([])).toEqual({ days: [], count: 0 });
	});
});
