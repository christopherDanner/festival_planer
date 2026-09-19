/** Die Rückfragen der beiden ⋮-Menüs des Schichtplans (#106). Reine Texte, kein
React: was beim Löschen mitgeht, muss dastehen, bevor jemand „Löschen" drückt.

Gezählt wird über das fertige `StationBoard` bzw. über die Besetzung der Zeile —
also über genau das, was der Fokus-Kasten daneben zeigt. Eine eigene Zählung
über die Rohdaten liefe unweigerlich irgendwann anders als der Kasten, und dann
nennt die Frage eine andere Zahl als das Bild. */

import { formatFestDayLong } from '@/lib/festDates';
import { shiftTimeLabel, type StationBoard } from '@/lib/shiftBoard';
import type { StationShift } from '@/lib/shiftService';

const UNWIDERRUFLICH = 'Das lässt sich nicht rückgängig machen.';

function zaehl(n: number, einzahl: string, mehrzahl: string): string {
	return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

/** „samt 3 Schichten und 7 Zuteilungen" — leere Posten fallen weg, statt als
Null dazustehen. */
function samt(teile: string[]): string {
	if (teile.length === 0) return '';
	return ` — samt ${teile.join(' und ')}`;
}

/**
 * Was das Löschen einer Station mitreißt: **alle ihre Schichten und
 * Zuteilungen** (die Datenbank räumt sie per Cascade weg). Mitgezählt werden
 * beide Arten von Zuteilung — die auf einer Schicht und die
 * Stationsmitgliedschaft ohne Schicht; gelöscht werden ohnehin beide.
 */
export function stationDeletionMessage(board: StationBoard): string {
	const shifts = board.days.reduce((sum, day) => sum + day.shiftCount, 0);
	const assignments =
		board.days.reduce((sum, day) => sum + day.rows.reduce((s, row) => s + row.assigned, 0), 0) +
		(board.wholeFestRow?.assigned ?? 0) +
		board.members.length;

	const teile = [
		shifts > 0 ? zaehl(shifts, 'Schicht', 'Schichten') : null,
		assignments > 0 ? zaehl(assignments, 'Zuteilung', 'Zuteilungen') : null
	].filter((t): t is string => t !== null);

	if (teile.length === 0) {
		return `„${board.station.name}" wird gelöscht. Die Station trägt weder Schichten noch Zuteilungen.`;
	}
	return `„${board.station.name}" wird gelöscht${samt(teile)}. ${UNWIDERRUFLICH}`;
}

/**
 * Was das Löschen einer Schicht mitreißt: ihre Zuteilungen. Benannt wird sie
 * wie in der Zeile — Tag ausgeschrieben, Zeit als Chip samt Mitternachts-`+1`,
 * damit bei 13 Schichten klar ist, welche gemeint ist.
 */
export function shiftDeletionMessage(shift: StationShift, assigned: number): string {
	const name = shift.name ? `„${shift.name}" ` : '';
	const wann = `${formatFestDayLong(shift.start_date)} (${shiftTimeLabel(shift)})`;
	const schicht = `Die Schicht ${name}am ${wann}`;

	if (assigned === 0) return `${schicht} wird gelöscht. Sie ist unbesetzt.`;
	return `${schicht} wird gelöscht${samt([zaehl(assigned, 'Zuteilung', 'Zuteilungen')])}. ${UNWIDERRUFLICH}`;
}
