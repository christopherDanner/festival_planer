/** Die Besetzungs-Zählung eines Fests — eine Regel, ein Modul (#102).
Dashboard-Kasten, KPI-Maßband der Fokus-Werkbank, Ampel-Reiter und
Schicht-Status hängen alle hier dran; liefe eine Ansicht mit eigener Formel,
zeigten zwei Bildschirme für dasselbe Fest verschiedene Zahlen.

**Nicht** dieselbe Zählung wie der Filter „Frei / Zugeteilt" der Helferliste:
der zählt breiter (irgendeine Zuteilung, Schicht *oder* Stationsmitgliedschaft)
und ist bewusst so — siehe Entscheid 2 in #68. Wer in der Fußzeile einer
Station mit Schichten steht, gilt dort als zugeteilt, obwohl die Ampel ihn
nicht mitzählt. */

import type { Station, StationShift, ShiftAssignment, StationHelper } from '@/lib/shiftService';
import { statusColor, type AmpelStatus } from '@/components/toolkit/status';

export interface ShiftsMetric {
	/** Besetzte Plätze (pro Station auf Soll gekappt, keine Überbesetzung). */
	besetzt: number;
	/** Soll-Plätze über alle Stationen/Schichten. */
	gesamt: number;
	/** Fehlende Plätze = gesamt − besetzt. */
	fehlen: number;
	/** Ampel-Logik (leer/teil/voll → rot/gelb/grün). */
	status: AmpelStatus;
	/** Kein Soll vorhanden (keine Stationen/Schichten) → Leerzustand. */
	isEmpty: boolean;
}

/**
 * Soll/Ist einer einzelnen Station: mit Schichten die Schicht-Summe, sonst die
 * Stations-Ebene (`required_people` gegen `station_members`). Die beiden Ebenen
 * mischen sich nie — eine Station mit Schichten plant ihre Leute in den
 * Schichten.
 *
 * **Überbesetzung zählt nicht mit, und zwar je Schicht.** Ein Kopf zu viel in
 * der Frühschicht füllt kein Loch in der Nachtschicht: sonst meldete der
 * Stationskopf „voll besetzt", während direkt darunter ein roter freier Platz
 * steht (#102). Auf Stationsebene bleibt die Kappung zusätzlich stehen, weil
 * `station_members` dieselbe Falle hat.
 */
export function stationStaffing(
	station: Station,
	shifts: StationShift[],
	assignments: ShiftAssignment[],
	stationHelpers: StationHelper[]
): { required: number; assigned: number } {
	const stationShifts = shifts.filter((s) => s.station_id === station.id);
	if (stationShifts.length === 0) {
		const helpers = stationHelpers.filter((sm) => sm.station_id === station.id).length;
		return {
			required: station.required_people,
			assigned: Math.min(helpers, station.required_people)
		};
	}
	let required = 0;
	let assigned = 0;
	for (const shift of stationShifts) {
		const filled = assignments.filter((a) => a.station_shift_id === shift.id).length;
		required += shift.required_people;
		assigned += Math.min(filled, shift.required_people);
	}
	return { required, assigned };
}

/** Besetzung über **alle** Stationen eines Fests — der Dashboard-Kasten
„Schichten besetzt" und das KPI-Maßband „BESETZT 41/52". */
export function deriveShiftsMetric(
	stations: Station[],
	shifts: StationShift[],
	assignments: ShiftAssignment[],
	stationHelpers: StationHelper[]
): ShiftsMetric {
	let besetzt = 0;
	let gesamt = 0;
	for (const station of stations) {
		// `stationStaffing` kappt die Überbesetzung bereits je Schicht.
		const { required, assigned } = stationStaffing(station, shifts, assignments, stationHelpers);
		gesamt += required;
		besetzt += assigned;
	}
	const fehlen = Math.max(0, gesamt - besetzt);
	return { besetzt, gesamt, fehlen, status: statusColor(besetzt, gesamt), isEmpty: gesamt === 0 };
}
