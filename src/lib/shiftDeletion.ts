/** Die Rückfragen der beiden ⋮-Menüs des Schichtplans (#106). Reine Texte, kein
React: was beim Löschen mitgeht, muss dastehen, bevor jemand „Löschen" drückt.

Gezählt wird über das fertige `StationBoard` bzw. über die Besetzung der Zeile —
also über genau das, was der Fokus-Kasten daneben zeigt. Eine eigene Zählung
über die Rohdaten liefe unweigerlich irgendwann anders als der Kasten, und dann
nennt die Frage eine andere Zahl als das Bild. */

import { formatFestDayLong } from '@/lib/festDates';
import { countLabel } from '@/lib/plural';
import { shiftTimeLabel, type StationBoard } from '@/lib/shiftBoard';
import type { StationShift } from '@/lib/shiftService';

const UNWIDERRUFLICH = 'Das lässt sich nicht rückgängig machen.';

/** Was an einer Station hängt und mit ihr fällt. Beide Arten von Zuteilung
zählen mit — die auf einer Schicht und die Stationsmitgliedschaft ohne Schicht;
die Cascade nimmt ohnehin beide. */
function cascadeCounts(board: StationBoard): { shifts: number; assignments: number } {
	const rows = board.days.flatMap((day) => day.rows);
	return {
		shifts: rows.length,
		assignments:
			rows.reduce((sum, row) => sum + row.assigned, 0) +
			(board.wholeFestRow?.assigned ?? 0) +
			board.members.length
	};
}

/**
 * Was das Löschen einer Station mitreißt: **alle ihre Schichten und
 * Zuteilungen** (die Datenbank räumt sie per Cascade weg).
 */
export function stationDeletionMessage(board: StationBoard): string {
	const { shifts, assignments } = cascadeCounts(board);
	// Leere Posten fallen weg, statt als Null dazustehen.
	const mit = [
		shifts > 0 ? countLabel(shifts, 'Schicht', 'Schichten') : null,
		assignments > 0 ? countLabel(assignments, 'Zuteilung', 'Zuteilungen') : null
	].filter((t): t is string => t !== null);

	// Auch die leere Station verschwindet endgültig — gerade dort ist der Satz
	// die einzige Warnung, die bleibt.
	if (mit.length === 0) {
		return `„${board.station.name}" wird gelöscht. Die Station trägt weder Schichten noch Zuteilungen. ${UNWIDERRUFLICH}`;
	}
	return `„${board.station.name}" wird gelöscht — samt ${mit.join(' und ')}. ${UNWIDERRUFLICH}`;
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

	if (assigned === 0) return `${schicht} wird gelöscht. Sie ist unbesetzt. ${UNWIDERRUFLICH}`;
	return `${schicht} wird gelöscht — samt ${countLabel(assigned, 'Zuteilung', 'Zuteilungen')}. ${UNWIDERRUFLICH}`;
}
