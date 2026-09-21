/** Programm-Aufbereitung für das Festplakat (Dashboard-Mitte, DESIGN-VISION §5).
Reine Logik, ohne React — die Programmpunkte aus dem Ablauf werden nach Tag
gruppiert (Vorschau/Aushang). Gereiht sind sie schon: seit ADR 0007 sortiert der
Service nach Startzeit, hier wird die Reihenfolge nur noch übernommen. */

import type { ScheduleDayWithEntries } from '@/lib/scheduleService';

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

/** Tage mit Programmpunkten, in der Reihenfolge, die der Service geliefert hat. */
export function getProgramByDay(days: ScheduleDayWithEntries[]): ProgramDay[] {
	const result: ProgramDay[] = [];

	for (const day of days) {
		const programEntries = (day.entries ?? []).filter((entry) => entry.type === 'program');
		if (programEntries.length === 0) continue;

		const rows: ProgramRow[] = programEntries.map((entry) => ({
			id: entry.id,
			time: formatProgramTime(entry.start_time),
			title: entry.title
		}));

		result.push({ dayId: day.id, title: programDayTitle(day.date, day.label), rows });
	}

	return result;
}

/** Gesamtzahl der Programmpunkte über alle Tage (Fußzeile des Plakats). */
export function countProgramRows(programDays: ProgramDay[]): number {
	return programDays.reduce((sum, day) => sum + day.rows.length, 0);
}
