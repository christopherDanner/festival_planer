/** Testfixtures für den Ablaufplan in der Form „Einträge am Tag" (ADR 0007).
Ein Tag trägt acht Felder plus zwei Listen, ein Eintrag zwölf — ein Test
interessiert höchstens drei davon. Hier steht der Rest einmal, statt in jeder
Testdatei noch einmal. */

import type {
	ScheduleDayWithEntries,
	ScheduleEntryWithHelper,
	SchedulePhase
} from '../scheduleService';

const stamps = { created_at: '', updated_at: '' };

export function schedulePhase(over: Partial<SchedulePhase> = {}): SchedulePhase {
	return {
		id: 'p1',
		schedule_day_id: 'd1',
		festival_id: 'f1',
		name: 'Phase',
		sort_order: 0,
		...stamps,
		...over
	};
}

/** Ein Eintrag am Tag — ohne Phase, weil das ab ADR 0007 der Normalfall ist. */
export function scheduleEntry(over: Partial<ScheduleEntryWithHelper> = {}): ScheduleEntryWithHelper {
	return {
		id: 'e1',
		schedule_day_id: 'd1',
		schedule_phase_id: null,
		festival_id: 'f1',
		title: 'Eintrag',
		type: 'program',
		start_time: null,
		end_time: null,
		responsible_helper_id: null,
		status: null,
		description: null,
		...stamps,
		...over
	};
}

/** Eine Aufgabe: trägt Status und Verantwortlichen, steht in der Werkliste. */
export function scheduleTask(over: Partial<ScheduleEntryWithHelper> = {}): ScheduleEntryWithHelper {
	return scheduleEntry({ id: 't1', title: 'Aufgabe', type: 'task', status: 'open', ...over });
}

export function scheduleDay(over: Partial<ScheduleDayWithEntries> = {}): ScheduleDayWithEntries {
	return {
		id: 'd1',
		festival_id: 'f1',
		date: '2026-07-25',
		label: null,
		is_auto_generated: false,
		sort_order: 0,
		phases: [],
		entries: [],
		...stamps,
		...over
	};
}
