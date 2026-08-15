import { festDayStart } from './festDates';
import type { StationShift } from './shiftService';

/**
 * Termine einer Schicht — Versatz und Beschriftung an einer Stelle.
 *
 * Der Versatz liegt hier, weil ihn zwei Seiten brauchen: der Kopier-Service
 * schreibt die neuen Termine, die Vorschau in Schritt 2 des Kopierwerks (#94)
 * zeigt sie an. Zwei Rechnungen liefen unweigerlich auseinander.
 */

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Was für einen Schicht-Termin gebraucht wird — mehr kennt dieses Modul nicht. */
export type ShiftTimes = Pick<StationShift, 'start_date' | 'start_time' | 'end_date' | 'end_time'>;

/** Wochentag-Kürzel eines Datum-Strings („2026-07-25" → „Sa"). */
function weekday(date: string): string {
	return WEEKDAYS[festDayStart(date).getDay()];
}

/** „15:00:00"/„15:00" → „15"; „15:30:00" → „15:30". */
function shortHour(time: string): string {
	const hhmm = time.slice(0, 5);
	return hhmm.endsWith(':00') ? hhmm.slice(0, 2) : hhmm;
}

/** „24.07.2027" — der Termin, wie ihn ein Kalender schreibt. */
function germanDate(date: string): string {
	const d = festDayStart(date);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	return `${day}.${month}.${d.getFullYear()}`;
}

/** Schicht als kompakte Zeitspanne, z. B. „Sa 15–19" (mehrtägig: „Sa 22–So 02"). */
export function formatShiftRange(shift: ShiftTimes): string {
	const start = `${weekday(shift.start_date)} ${shortHour(shift.start_time)}`;
	const crossesDay = shift.end_date && shift.end_date !== shift.start_date;
	const end = crossesDay
		? `${weekday(shift.end_date as string)} ${shortHour(shift.end_time)}`
		: shortHour(shift.end_time);
	return `${start}–${end}`;
}

/**
 * Ein Datum des Quellfests auf das Zielfest versetzt: gleicher Abstand zum
 * Fest-Start und damit derselbe Wochentags-Abstand.
 *
 * Gerechnet wird bewusst über die UTC-Lesart tagesgenauer Datums-Strings — alle
 * drei Werte kommen aus derselben Quelle, der Abstand ist ein ganzes Vielfaches
 * eines Tages, und `toISOString()` gibt wieder einen tagesgenauen String heraus.
 */
export function shiftFestivalDate(sourceStart: string, date: string, targetStart: string): string {
	const offsetMs = new Date(date).getTime() - new Date(sourceStart).getTime();
	return new Date(new Date(targetStart).getTime() + offsetMs).toISOString().split('T')[0];
}

/**
 * Der neue Termin einer kopierten Schicht als Text: „Sa 24.07.2027", über
 * Mitternacht „Sa/So 24.–25.07.2027".
 *
 * Der Master-Prototyp kürzt die zweite Form auf „Sa/So 2027" ab. Hier stehen
 * die Tage ausgeschrieben: die Vorschau ist dazu da, die neuen Termine zu
 * prüfen — ein Termin ohne Datum prüft sich nicht.
 */
export function copiedShiftDateLabel(
	shift: Pick<ShiftTimes, 'start_date' | 'end_date'>,
	sourceStart: string,
	targetStart: string
): string {
	const start = shiftFestivalDate(sourceStart, shift.start_date, targetStart);
	const crossesDay = shift.end_date && shift.end_date !== shift.start_date;
	if (!crossesDay) return `${weekday(start)} ${germanDate(start)}`;

	const end = shiftFestivalDate(sourceStart, shift.end_date as string, targetStart);
	const days = `${weekday(start)}/${weekday(end)}`;
	// Innerhalb eines Monats steht er nur einmal: „24.–25.07.2027".
	const sameMonth = start.slice(0, 7) === end.slice(0, 7);
	const span = sameMonth
		? `${germanDate(start).slice(0, 3)}–${germanDate(end)}`
		: `${germanDate(start).slice(0, 6)}–${germanDate(end)}`;
	return `${days} ${span}`;
}
