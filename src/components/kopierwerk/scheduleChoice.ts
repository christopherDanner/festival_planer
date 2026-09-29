import type { ScheduleDayWithEntries } from '@/lib/scheduleService';
import { formatDayLabel, shiftFestivalDate } from '@/lib/shiftDates';

import { plural } from './plural';

/**
 * Schritt 4 des Kopierwerks (#127) als reine Logik: welche Zeilen die Werkbank
 * zeigt.
 *
 * Übernommen wird der **ganze** Plan, nicht der einzelne Tag — der Wert liegt in
 * der Vollständigkeit der Liste, ausgemistet wird danach im Bereich. Die Zeilen
 * sind darum reine Vorschau ohne Häkchen: sie beantworten „was kommt mit und auf
 * welchen Tag rückt es", bevor der eine Schalter fällt.
 */

/** Ein Ablauf-Tag als Zeile der Werkbank — read-only, ohne eigene Auswahl. */
export interface SchedulePreviewRow {
	id: string;
	/** Alter Termin, z. B. „Do 23.07.2026". */
	when: string;
	/** Neuer Termin, z. B. „Do 22.07.2027" — den Pfeil setzt die Zeile. */
	newWhen: string;
	/** Freies Label des Tages („Aufbau"); leer, wenn er keins trägt. */
	label: string;
	/** „2 Phasen · 2 Aufgaben · 1 Programmpunkt" */
	meta: string;
}

export interface SchedulePreviewInput {
	days: ScheduleDayWithEntries[];
	/** Start des Quellfests — der Bezugspunkt des Versatzes. */
	sourceStartDate: string;
	/** Start des geplanten Fests. */
	targetStartDate: string;
}

/** Was an einem Tag hängt; leere Angaben fallen weg, sonst stünde überall „0". */
function dayMeta(day: ScheduleDayWithEntries): string {
	const tasks = day.entries.filter((entry) => entry.type === 'task').length;
	const programs = day.entries.length - tasks;
	const parts = [
		day.phases.length && plural(day.phases.length, 'Phase', 'Phasen'),
		tasks && plural(tasks, 'Aufgabe', 'Aufgaben'),
		programs && plural(programs, 'Programmpunkt', 'Programmpunkte')
	].filter(Boolean);
	// Ein automatisch erzeugter Festtag ohne Einträge ist der Normalfall — er
	// kommt trotzdem mit, weil sein Datum und sein Label die Gliederung tragen.
	return parts.length > 0 ? parts.join(' · ') : 'ohne Einträge';
}

/**
 * Die Zeilen der Werkbank. Die Reihenfolge kommt aus der Abfrage (Tage nach
 * Datum) — die Vorschau sortiert nicht um.
 */
export function schedulePreviewRows({
	days,
	sourceStartDate,
	targetStartDate
}: SchedulePreviewInput): SchedulePreviewRow[] {
	// Die Vorlage steht schon, während Schritt 1 noch leer ist — über den
	// Deep-Link `?vorlage=` sogar von Anfang an. Ohne Startdatum gibt es keinen
	// Versatz, und die Rechnung darüber liefe auf ein ungültiges Datum hinaus.
	if (!targetStartDate || !sourceStartDate) return [];

	return days.map((day) => ({
		id: day.id,
		when: formatDayLabel(day.date),
		// Dieselbe Versatz-Funktion, die `copyFestivalData` schreibt (#94) — sonst
		// verspricht der Bildschirm Termine, die anders landen.
		newWhen: formatDayLabel(shiftFestivalDate(sourceStartDate, day.date, targetStartDate)),
		label: day.label?.trim() || '',
		meta: dayMeta(day)
	}));
}

/** Umfang des Ablaufplans für die Untertitel-Zeile der Stempelkarte. */
export function scheduleScope(days: ScheduleDayWithEntries[]): {
	scheduleDays: number;
	scheduleEntries: number;
} {
	return {
		scheduleDays: days.length,
		scheduleEntries: days.reduce((sum, day) => sum + day.entries.length, 0)
	};
}
