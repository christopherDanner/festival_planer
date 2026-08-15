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
 */
export function stationStaffing(
	station: Station,
	shifts: StationShift[],
	assignments: ShiftAssignment[],
	stationHelpers: StationHelper[]
): { required: number; assigned: number } {
	const stationShifts = shifts.filter((s) => s.station_id === station.id);
	if (stationShifts.length === 0) {
		const assigned = stationHelpers.filter((sm) => sm.station_id === station.id).length;
		return { required: station.required_people, assigned };
	}
	const required = stationShifts.reduce((sum, s) => sum + s.required_people, 0);
	const shiftIds = new Set(stationShifts.map((s) => s.id));
	const assigned = assignments.filter((a) => shiftIds.has(a.station_shift_id)).length;
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
		const { required, assigned } = stationStaffing(station, shifts, assignments, stationHelpers);
		gesamt += required;
		besetzt += Math.min(assigned, required); // Überbesetzung nicht mitzählen
	}
	const fehlen = Math.max(0, gesamt - besetzt);
	return { besetzt, gesamt, fehlen, status: statusColor(besetzt, gesamt), isEmpty: gesamt === 0 };
}
