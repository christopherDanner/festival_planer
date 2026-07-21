/** Programm-Aufbereitung für das Festplakat (Dashboard-Mitte, DESIGN-VISION §5).
Reine Logik, ohne React — die Programmpunkte aus dem Ablauf werden nach Tag
gruppiert und je Tag nach Startzeit sortiert (Vorschau/Aushang). */

import type { ScheduleDayWithPhases } from '@/lib/scheduleService';

export interface ProgramRow {
	id: string;
	/** „18:00" — Sekunden gekürzt; leer, wenn keine Startzeit gesetzt ist. */
	time: string;
	title: string;
}

export interface ProgramDay {
	dayId: string;
	/** Grüner Oswald-Zwischentitel: Label oder langer Wochentag. */
	title: string;
	rows: ProgramRow[];
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('de-AT', { weekday: 'long' });

/** „18:00:00" → „18:00"; null → "". */
export function formatProgramTime(time: string | null): string {
	if (!time) return '';
	return time.slice(0, 5);
}

/** Zwischentitel eines Tages: Label bevorzugt, sonst langer Wochentag. */
export function programDayTitle(date: string, label: string | null): string {
	const trimmed = label?.trim();
	if (trimmed) return trimmed;
	return WEEKDAY_FORMAT.format(new Date(`${date}T00:00:00`));
}

/** Tage mit Programmpunkten, je Tag nach Startzeit sortiert (leere Zeit ans Ende). */
export function getProgramByDay(days: ScheduleDayWithPhases[]): ProgramDay[] {
	const result: ProgramDay[] = [];

	for (const day of days) {
		const programEntries = (day.phases ?? []).flatMap((phase) =>
			(phase.entries ?? []).filter((entry) => entry.type === 'program')
		);
		if (programEntries.length === 0) continue;

		const rows: ProgramRow[] = programEntries
			.map((entry, index) => ({
				id: entry.id,
				time: formatProgramTime(entry.start_time),
				title: entry.title,
				_order: index
			}))
			.sort((a, b) => {
				// Leere Zeit immer ans Ende; sonst lexikografisch (HH:MM ist sortierbar).
				if (a.time && b.time) {
					if (a.time !== b.time) return a.time < b.time ? -1 : 1;
					return a._order - b._order;
				}
				if (!a.time && !b.time) return a._order - b._order;
				return a.time ? -1 : 1;
			})
			.map(({ id, time, title }) => ({ id, time, title }));

		result.push({ dayId: day.id, title: programDayTitle(day.date, day.label), rows });
	}

	return result;
}

/** Gesamtzahl der Programmpunkte über alle Tage (Fußzeile des Plakats). */
export function countProgramRows(programDays: ProgramDay[]): number {
	return programDays.reduce((sum, day) => sum + day.rows.length, 0);
}
