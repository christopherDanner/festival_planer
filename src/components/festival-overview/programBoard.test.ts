import { describe, it, expect } from 'vitest';
import { scheduleDay as day, scheduleEntry as entry } from '@/lib/__tests__/scheduleFactories';
import {
	formatProgramTime,
	programDayTitle,
	getProgramByDay,
	countProgramRows
} from './programBoard';

describe('formatProgramTime', () => {
	it('kürzt Sekunden auf HH:MM', () => {
		expect(formatProgramTime('18:00:00')).toBe('18:00');
	});
	it('lässt HH:MM unverändert', () => {
		expect(formatProgramTime('09:30')).toBe('09:30');
	});
	it('null → leerer String', () => {
		expect(formatProgramTime(null)).toBe('');
	});
});

describe('programDayTitle', () => {
	it('nutzt das Label, wenn gesetzt', () => {
		expect(programDayTitle('2026-07-24', 'Festtag 1')).toBe('Festtag 1');
	});
	it('fällt auf den langen Wochentag zurück', () => {
		expect(programDayTitle('2026-07-24', null)).toBe('Freitag');
	});
	it('ignoriert reines Whitespace-Label', () => {
		expect(programDayTitle('2026-07-24', '   ')).toBe('Freitag');
	});
});

describe('getProgramByDay', () => {
	it('behält nur Tage mit Programmpunkten', () => {
		const days = [
			day({ id: 'd1', entries: [entry({ id: 'a', type: 'program', title: 'Eröffnung' })] }),
			day({ id: 'd2', entries: [entry({ id: 'b', type: 'task', title: 'AKM melden' })] })
		];
		const result = getProgramByDay(days);
		expect(result.map((d) => d.dayId)).toEqual(['d1']);
		expect(result[0].rows.map((r) => r.title)).toEqual(['Eröffnung']);
	});

	it('übernimmt die Reihenfolge des Tages — gereiht hat schon der Service', () => {
		const days = [
			day({
				id: 'd1',
				entries: [
					entry({ id: 'c', type: 'program', title: 'Früh', start_time: '11:00:00' }),
					entry({ id: 'a', type: 'program', title: 'Später', start_time: '19:30:00' }),
					entry({ id: 'b', type: 'program', title: 'Ohne Zeit', start_time: null })
				]
			})
		];
		const rows = getProgramByDay(days)[0].rows;
		expect(rows.map((r) => r.title)).toEqual(['Früh', 'Später', 'Ohne Zeit']);
		expect(rows.map((r) => r.time)).toEqual(['11:00', '19:30', '']);
	});

	it('nimmt die Programmpunkte des Tages, auch ohne Phase', () => {
		const days = [
			day({
				id: 'd1',
				entries: [
					entry({ id: 'a', type: 'program', title: 'Vormittag', schedule_phase_id: null }),
					entry({ id: 'b', type: 'program', title: 'Nachmittag', schedule_phase_id: 'p1' })
				]
			})
		];
		expect(getProgramByDay(days)[0].rows.map((r) => r.title)).toEqual(['Vormittag', 'Nachmittag']);
	});

	it('leere Eingabe → leeres Array', () => {
		expect(getProgramByDay([])).toEqual([]);
	});
});

describe('countProgramRows', () => {
	it('summiert alle Zeilen über alle Tage', () => {
		const programDays = getProgramByDay([
			day({
				id: 'd1',
				entries: [entry({ id: 'a', type: 'program' }), entry({ id: 'b', type: 'program' })]
			}),
			day({ id: 'd2', date: '2026-07-25', entries: [entry({ id: 'c', type: 'program' })] })
		]);
		expect(countProgramRows(programDays)).toBe(3);
	});
});
