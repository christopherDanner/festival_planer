import { describe, it, expect } from 'vitest';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import {
	formatProgramTime,
	programDayTitle,
	getProgramByDay,
	countProgramRows
} from './programBoard';

// Minimal factory for a schedule entry — nur die Felder, die der Poster liest.
function entry(
	over: Partial<ScheduleDayWithPhases['phases'][number]['entries'][number]> = {}
): ScheduleDayWithPhases['phases'][number]['entries'][number] {
	return {
		id: 'e1',
		schedule_phase_id: 'p1',
		festival_id: 'f1',
		title: 'Eintrag',
		type: 'program',
		start_time: null,
		end_time: null,
		responsible_helper_id: null,
		status: null,
		description: null,
		sort_order: 0,
		created_at: '',
		updated_at: '',
		...over
	};
}

function day(
	over: Partial<ScheduleDayWithPhases> & { entries?: ScheduleDayWithPhases['phases'][number]['entries'] }
): ScheduleDayWithPhases {
	const { entries = [], ...rest } = over;
	return {
		id: 'd1',
		festival_id: 'f1',
		date: '2026-07-24',
		label: null,
		is_auto_generated: false,
		sort_order: 0,
		created_at: '',
		updated_at: '',
		phases: [
			{
				id: 'p1',
				schedule_day_id: 'd1',
				festival_id: 'f1',
				name: 'Phase',
				sort_order: 0,
				created_at: '',
				updated_at: '',
				entries
			}
		],
		...rest
	};
}

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

	it('sortiert Zeilen nach Startzeit, leere Zeiten ans Ende', () => {
		const days = [
			day({
				id: 'd1',
				entries: [
					entry({ id: 'a', type: 'program', title: 'Später', start_time: '19:30:00', sort_order: 0 }),
					entry({ id: 'b', type: 'program', title: 'Ohne Zeit', start_time: null, sort_order: 1 }),
					entry({ id: 'c', type: 'program', title: 'Früh', start_time: '11:00:00', sort_order: 2 })
				]
			})
		];
		const rows = getProgramByDay(days)[0].rows;
		expect(rows.map((r) => r.title)).toEqual(['Früh', 'Später', 'Ohne Zeit']);
		expect(rows.map((r) => r.time)).toEqual(['11:00', '19:30', '']);
	});

	it('mischt Programmpunkte aus mehreren Phasen eines Tages', () => {
		const d = day({ id: 'd1', entries: [] });
		d.phases = [
			{
				...d.phases[0],
				id: 'p1',
				entries: [entry({ id: 'a', type: 'program', title: 'Nachmittag', start_time: '15:00:00' })]
			},
			{
				...d.phases[0],
				id: 'p2',
				entries: [entry({ id: 'b', type: 'program', title: 'Vormittag', start_time: '10:00:00' })]
			}
		];
		const rows = getProgramByDay([d])[0].rows;
		expect(rows.map((r) => r.title)).toEqual(['Vormittag', 'Nachmittag']);
	});

	it('leere Eingabe → leeres Array', () => {
		expect(getProgramByDay([])).toEqual([]);
	});
});

describe('countProgramRows', () => {
	it('summiert alle Zeilen über alle Tage', () => {
		const programDays = getProgramByDay([
			day({ id: 'd1', entries: [entry({ id: 'a', type: 'program' }), entry({ id: 'b', type: 'program' })] }),
			day({ id: 'd2', date: '2026-07-25', entries: [entry({ id: 'c', type: 'program' })] })
		]);
		expect(countProgramRows(programDays)).toBe(3);
	});
});
