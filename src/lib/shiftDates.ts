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

/** Tag, Monat und Jahr eines Datum-Strings, zweistellig — „24", „07", „2027". */
function dateParts(date: string): { day: string; month: string; year: string } {
	const d = festDayStart(date);
	return {
		day: String(d.getDate()).padStart(2, '0'),
		month: String(d.getMonth() + 1).padStart(2, '0'),
		year: String(d.getFullYear())
	};
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
	const from = dateParts(start);
	const crossesDay = shift.end_date && shift.end_date !== shift.start_date;
	if (!crossesDay) return `${weekday(start)} ${from.day}.${from.month}.${from.year}`;

	const end = shiftFestivalDate(sourceStart, shift.end_date as string, targetStart);
	const to = dateParts(end);
	// Innerhalb eines Monats steht der Monat nur einmal („24.–25.07.2027"); über
	// den Monatswechsel zweimal, sonst läse sich „31.–01.08." als ein Zeitraum
	// innerhalb des Augusts.
	const span =
		from.month === to.month && from.year === to.year
			? `${from.day}.–${to.day}.${to.month}.${to.year}`
			: `${from.day}.${from.month}.–${to.day}.${to.month}.${to.year}`;
	return `${weekday(start)}/${weekday(end)} ${span}`;
}
