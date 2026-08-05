/** Lücken-Aufbereitung für die „Da fehlt noch was"-Spalte (Dashboard links,
DESIGN-VISION §5, Fächer Variante C). Reine Logik ohne React: leitet aus
Stationen/Schichten/Zuweisungen, Ablauf-Aufgaben und Material die drei Lücken-
Arten ab — je unterbesetzte Station ein Kasten (mit konkreten Schichten), offene
Aufgaben und Material ohne Preis. */

import type {
	Station,
	StationShift,
	ShiftAssignmentWithHelper,
	StationHelperWithDetails
} from '@/lib/shiftService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { withoutPrice } from '@/lib/materialCosts';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Eine unterbesetzte Schicht als Detailzeile, z. B. „Sa 15–19" + `missing`. */
export interface ShiftGap {
	shiftId: string;
	/** „Sa 15–19" — Wochentag + Stundenbereich, Sekunden/„:00" gekürzt. */
	label: string;
	/** Fehlende Personen dieser Schicht (> 0). */
	missing: number;
}

/** Eine unterbesetzte Station = ein Lücken-Kasten in der linken Spalte. */
export interface StationGap {
	stationId: string;
	stationName: string;
	/** Gesamt fehlende Personen der Station (Summe der Schicht-Lücken bzw. Direktbesetzung). */
	missing: number;
	/** Konkrete unterbesetzte Schichten; leer bei Stationen ohne Schichten (Direktbesetzung). */
	shiftGaps: ShiftGap[];
}

/** Offene-Aufgaben-Kasten: Anzahl + früheste Frist (Tag + Startzeit). */
export interface OpenTaskGap {
	count: number;
	/** Früheste offene Aufgabe nach Tag + Startzeit; `time` null, wenn keine Zeit gesetzt. */
	deadline: { date: string; time: string | null };
}

export interface GapBoard {
	/** Nach Dringlichkeit sortiert (fehlende Personen absteigend, dann Name). */
	stationGaps: StationGap[];
	/** null, wenn keine offene Aufgabe existiert. */
	openTasks: OpenTaskGap | null;
	/** Anzahl Material-Positionen ohne Stückpreis (`unit_price == null`). */
	materialsWithoutPrice: number;
	/** true → nichts fehlt → Leerzustand-Stempel statt Kästen. */
	isEmpty: boolean;
}

export interface GapBoardInput {
	stations: Station[];
	shifts: StationShift[];
	assignments: ShiftAssignmentWithHelper[];
	stationHelpers: StationHelperWithDetails[];
	scheduleDays: ScheduleDayWithPhases[];
	materials: FestivalMaterialWithStation[];
}

/** Wochentag-Kürzel eines Datum-Strings („2026-07-25" → „Sa"). */
function weekday(date: string): string {
	return WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
}

/** „15:00:00"/„15:00" → „15"; „15:30:00" → „15:30". */
function shortHour(time: string): string {
	const hhmm = time.slice(0, 5);
	return hhmm.endsWith(':00') ? hhmm.slice(0, 2) : hhmm;
}

/** Schicht als kompakte Zeitspanne, z. B. „Sa 15–19" (mehrtägig: „Sa 22–So 02"). */
export function formatShiftRange(shift: StationShift): string {
	const start = `${weekday(shift.start_date)} ${shortHour(shift.start_time)}`;
	const crossesDay = shift.end_date && shift.end_date !== shift.start_date;
	const end = crossesDay
		? `${weekday(shift.end_date as string)} ${shortHour(shift.end_time)}`
		: shortHour(shift.end_time);
	return `${start}–${end}`;
}

/** Frist als knapper Text, z. B. „Sa 26.7., 15:00" (ohne Zeit: „Sa 26.7."). */
export function formatDeadline(date: string, time: string | null): string {
	const d = new Date(`${date}T00:00:00`);
	const day = `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
	return time ? `${day}, ${time.slice(0, 5)}` : day;
}

/** Alle Programm-/Aufgaben-Einträge eines Tages über seine Phasen. */
function entriesOf(day: ScheduleDayWithPhases) {
	return (day.phases ?? []).flatMap((phase) => phase.entries ?? []);
}

function deriveStationGaps(input: GapBoardInput): StationGap[] {
	const gaps: StationGap[] = [];

	for (const station of input.stations) {
		const stationShifts = input.shifts.filter((s) => s.station_id === station.id);

		if (stationShifts.length > 0) {
			// Station mit Schichten: je Schicht Ist gegen Soll, konkrete Lücken sammeln.
			const shiftGaps: ShiftGap[] = [];
			for (const shift of stationShifts) {
				const assigned = input.assignments.filter((a) => a.station_shift_id === shift.id).length;
				const missing = Math.max(0, shift.required_people - assigned);
				if (missing > 0) {
					shiftGaps.push({ shiftId: shift.id, label: formatShiftRange(shift), missing });
				}
			}
			const missing = shiftGaps.reduce((sum, g) => sum + g.missing, 0);
			if (missing > 0) {
				gaps.push({ stationId: station.id, stationName: station.name, missing, shiftGaps });
			}
		} else {
			// Station ohne Schichten: Direktbesetzung gegen required_people.
			const assigned = input.stationHelpers.filter((sm) => sm.station_id === station.id).length;
			const missing = Math.max(0, station.required_people - assigned);
			if (missing > 0) {
				gaps.push({ stationId: station.id, stationName: station.name, missing, shiftGaps: [] });
			}
		}
	}

	// Dringlichkeit: fehlende Personen absteigend (leere/kritische zuerst), dann Name.
	return gaps.sort((a, b) => b.missing - a.missing || a.stationName.localeCompare(b.stationName, 'de'));
}

function deriveOpenTaskGap(days: ScheduleDayWithPhases[]): OpenTaskGap | null {
	const open: { date: string; time: string | null }[] = [];
	for (const day of days) {
		for (const entry of entriesOf(day)) {
			if (entry.type === 'task' && entry.status === 'open') {
				open.push({ date: day.date, time: entry.start_time });
			}
		}
	}
	if (open.length === 0) return null;

	// Früheste Frist: nach Tag, dann Startzeit; ohne Zeit ans Ende des Tages.
	const earliest = open.reduce((best, cur) => {
		if (cur.date !== best.date) return cur.date < best.date ? cur : best;
		if (cur.time === best.time) return best;
		if (best.time === null) return cur;
		if (cur.time === null) return best;
		return cur.time < best.time ? cur : best;
	});

	return { count: open.length, deadline: earliest };
}

/** Leitet alle drei Lücken-Arten der linken Spalte ab (deep module). */
export function deriveGapBoard(input: GapBoardInput): GapBoard {
	const stationGaps = deriveStationGaps(input);
	const openTasks = deriveOpenTaskGap(input.scheduleDays);
	const materialsWithoutPrice = withoutPrice(input.materials);

	return {
		stationGaps,
		openTasks,
		materialsWithoutPrice,
		isEmpty: stationGaps.length === 0 && openTasks === null && materialsWithoutPrice === 0
	};
}
