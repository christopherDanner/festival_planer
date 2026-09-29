/** Die Regeln des **Programmzettels**, des rechten Papiers am Schreibtisch
(#123, Variante C der DESIGN-VISION). Reines Logikmodul ohne React: welche Tage
und Punkte auf dem Aushang stehen und wie viele es sind.

Gereiht wird hier nichts — die Uhrzeit reiht im Service (ADR 0007), wie schon
bei der Aufgaben-Werkliste. Dieses Modul wählt aus und zählt. */

import { scheduleDayTitle } from '@/lib/scheduleWorklist';
import type { ScheduleDayWithEntries, ScheduleEntryWithHelper } from '@/lib/scheduleService';

/** Eine Zeile des Zettels: Uhrzeit, Titel, leise Beschreibung. */
export interface ProgramSheetRow {
	entry: ScheduleEntryWithHelper;
	/**
	 * „18:00" — **nur** die Uhrzeit, ohne Tageskürzel: der Tag steht als
	 * Zwischentitel darüber. `null` heißt „ohne Zeit".
	 */
	time: string | null;
}

/** Ein Tages-Zwischentitel samt seinen Punkten. */
export interface ProgramSheetDay {
	day: ScheduleDayWithEntries;
	/** „Freitag 24. Juli" — dieselbe Aufschrift wie in der Werkliste. */
	title: string;
	rows: ProgramSheetRow[];
}

/** Der Zettel, wie er am Bildschirm steht und gedruckt wird. */
export interface ProgramSheet {
	/** Nur Tage mit Programmpunkten — ein leerer Zwischentitel ist kein Aushang (#123). */
	days: ProgramSheetDay[];
	/** Die Zahl der Fußzeile: alle Punkte des Fests. */
	count: number;
}

/** Aufgaben bleiben draußen — sie stehen auf dem anderen Papier (ADR 0007). */
const isProgram = (entry: ScheduleEntryWithHelper): boolean => entry.type === 'program';

/**
 * „18:00:00" → „18:00", `null` bleibt `null`. Die Datenbank liefert die Sekunde
 * mit; auf einem Aushang hat sie nichts verloren (dieselbe Kürzung wie in der
 * Werkliste). Steht hier, weil das Festplakat dieselbe Uhrzeit zeigen muss.
 */
export function programTime(startTime: string | null): string | null {
	return startTime ? startTime.slice(0, 5) : null;
}

/**
 * Baut den Programmzettel: die Programmpunkte des Fests, nach Ablauf-Tag
 * gruppiert, in der Reihenfolge, die der Service geliefert hat.
 *
 * Der Tag heißt hier, wie er in der Werkliste daneben heißt — dasselbe Datum
 * zweimal verschieden zu benennen wäre auf einem Schreibtisch mit zwei Papieren
 * der Fehler, nicht die Sorgfalt.
 */
export function buildProgramSheet(days: ScheduleDayWithEntries[]): ProgramSheet {
	const sheetDays = days
		.map((day) => ({
			day,
			title: scheduleDayTitle(day),
			rows: day.entries
				.filter(isProgram)
				.map((entry) => ({ entry, time: programTime(entry.start_time) }))
		}))
		.filter((sheetDay) => sheetDay.rows.length > 0);

	return {
		days: sheetDays,
		count: sheetDays.reduce((sum, sheetDay) => sum + sheetDay.rows.length, 0)
	};
}
