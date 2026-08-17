/** Die Ableitungen der Fokus-Werkbank des Schichtplans (#102, Entscheide 1, 3
und 4 aus #68). Reines Logikmodul ohne React: der Ampel-Reiter-Streifen, der
Fokus-Kasten *einer* Station und die Aufschriften ihrer Zeilen.

Gezählt wird nicht hier, sondern in `staffing` — Reiter, KPI-Maßband und
Dashboard müssen für dasselbe Fest dieselbe Zahl nennen. Dieses Modul ordnet
nur und beschriftet. */

import { formatFestDayLong } from '@/lib/festDates';
import { stationStaffing } from '@/lib/staffing';
import { statusColor, type AmpelStatus } from '@/components/toolkit/status';
import type {
	HelperRef,
	ShiftAssignmentWithHelper,
	Station,
	StationHelperWithDetails,
	StationShift
} from '@/lib/shiftService';

/** Ein Reiter des Ampel-Streifens: die Station, ihr Zähler und ihre Farbe. */
export interface StationTab {
	station: Station;
	required: number;
	assigned: number;
	status: AmpelStatus;
}

/** Ein Platz im Raster einer Zeile. **Belegt ist er, wenn er einen Namen
trägt** — nicht am `helperId`: eine Zuteilung ohne Helfer-Verweis wäre sonst
ein freier Platz, auf den sich ein zweiter Helfer setzen dürfte. Entfernen
lässt sich nur, was einen `helperId` hat. */
export interface BoardSlot {
	/** Laufende Nummer im Raster, 1-basiert. */
	position: number;
	helperId: string | null;
	name: string | null;
}

/** Eine Zeile des Fokus-Kastens: eine Schicht — oder, bei einer Station ohne
Schichten, die Pseudo-Zeile „GANZES FEST" über `stations.required_people`
(Entscheid 1 aus #68: gleiche Optik, gleiche Geste, eine Ebene tiefer). */
export interface BoardRow {
	/** Schicht-Id bzw. `station:<id>` — Schlüssel der Liste. */
	id: string;
	/** Oswald-Zeit: `11–15`, `23–02 +1`, `GANZES FEST`. */
	time: string;
	/** „Frühschoppen · 4 Plätze" bzw. „Keine Schichten · 3 Plätze". */
	subtitle: string;
	required: number;
	assigned: number;
	open: number;
	status: AmpelStatus;
	slots: BoardSlot[];
	/** Die Schicht hinter der Zeile; `null` bei der Pseudo-Zeile. Zuteilen und
	das ⋮-Menü der Zeile brauchen den Unterschied. */
	shift: StationShift | null;
}

/** Ein Tag mit Schichten samt eigenem Offen-Zähler. */
export interface BoardDay {
	date: string;
	/** „Samstag 25. Juli" */
	title: string;
	shiftCount: number;
	open: number;
	rows: BoardRow[];
}

/** Ein Stationsmitglied in der Fußzeile („ohne Schicht"). */
export interface BoardMember {
	id: string;
	helperId: string;
	name: string;
}

/** Alles, was der Fokus-Kasten einer Station zeigt. */
export interface StationBoard {
	station: Station;
	hasShifts: boolean;
	/** Tage mit Schichten, chronologisch; leer bei einer Station ohne Schichten. */
	days: BoardDay[];
	/** Die eine Pseudo-Zeile einer Station ohne Schichten, sonst `null`. */
	wholeFestRow: BoardRow | null;
	required: number;
	assigned: number;
	open: number;
	status: AmpelStatus;
	/**
	 * Stationsmitglieder für die schmale Fußzeile. Nur bei einer Station **mit**
	 * Schichten: ohne Schichten sind dieselben Leute schon das Platz-Raster.
	 * Sie zählen bewusst nicht in die Ampel (Entscheid 2 aus #68).
	 */
	members: BoardMember[];
}

/** Wer auf einem Platz sitzt. `helperId` fehlt nur, wenn die Zuteilung ihren
Helfer-Verweis verloren hat — dann steht der Name da, aber ohne Griff. */
interface Occupant {
	helperId: string | null;
	name: string;
}

/** „Hochauer Franz" — Nachname zuerst, wie überall sonst in der App. */
function helperName(helper?: HelperRef | null): string {
	if (!helper) return 'Unbekannt';
	return `${helper.last_name} ${helper.first_name}`.trim();
}

/** `11:00:00` → `11`, `11:30` → `11:30`. Sekunden und glatte Minuten fallen
weg; der Chip soll die Zeit lesbar machen, nicht die Datenbank zeigen. */
function clockLabel(time: string): string {
	const [hours, minutes] = time.split(':');
	return minutes && minutes !== '00' ? `${hours}:${minutes}` : hours;
}

/** Ob eine Schicht über Mitternacht läuft: eigenes, abweichendes Enddatum. */
function crossesMidnight(shift: StationShift): boolean {
	return Boolean(shift.end_date) && shift.end_date !== shift.start_date;
}

/**
 * Die Zeit-Aufschrift einer Schicht-Zeile: `11–15`. Der Tag steht im
 * Zwischentitel darüber — außer bei einer Schicht über Mitternacht, die beim
 * **Starttag** steht und ihr zweites Datum darum selbst mitträgt: `23–02 +1`.
 */
export function shiftTimeLabel(shift: StationShift): string {
	const span = `${clockLabel(shift.start_time)}–${clockLabel(shift.end_time)}`;
	return crossesMidnight(shift) ? `${span} +1` : span;
}

/**
 * Der Ampel-Reiter-Streifen. Reihenfolge = **Anlage-Reihenfolge**
 * (`created_at`), nicht nach Dringlichkeit: sonst springen die Reiter unter der
 * Hand weg, während man arbeitet (Entscheid 3 aus #68). Die Abfrage liefert die
 * Stationen nach Namen sortiert — die Reihenfolge wird deshalb hier gesetzt,
 * nicht in `getStations`, wo sie an den Auswahlfeldern der Dialoge hinge.
 */
export function buildStationTabs(
	stations: Station[],
	shifts: StationShift[],
	assignments: ShiftAssignmentWithHelper[],
	stationHelpers: StationHelperWithDetails[]
): StationTab[] {
	return [...stations]
		.sort((a, b) => a.created_at.localeCompare(b.created_at))
		.map((station) => {
			const { required, assigned } = stationStaffing(station, shifts, assignments, stationHelpers);
			return { station, required, assigned, status: statusColor(assigned, required) };
		});
}

/**
 * Hält die Fokus-Station gültig: beim ersten Rendern und nach dem Löschen der
 * gewählten Station übernimmt der erste Reiter.
 */
export function resolveFocusStationId(tabs: StationTab[], requested: string | null): string | null {
	if (requested && tabs.some((t) => t.station.id === requested)) return requested;
	return tabs[0]?.station.id ?? null;
}

/** Baut das Platz-Raster: erst die Belegten in ihrer Reihenfolge, dann freie
Plätze bis zum Soll. Überzählige Belegte hängen hinten dran — wer zugeteilt
ist, verschwindet nicht, bloß weil das Soll gesenkt wurde. */
function buildSlots(occupants: Occupant[], required: number): BoardSlot[] {
	const count = Math.max(required, occupants.length);
	return Array.from({ length: count }, (_, i) => {
		const occupant = occupants[i];
		return {
			position: i + 1,
			helperId: occupant?.helperId ?? null,
			name: occupant?.name ?? null
		};
	});
}

function row(
	id: string,
	time: string,
	label: string,
	required: number,
	occupants: Occupant[],
	shift: StationShift | null
): BoardRow {
	const assigned = occupants.length;
	const plaetze = `${required} ${required === 1 ? 'Platz' : 'Plätze'}`;
	return {
		id,
		time,
		subtitle: label ? `${label} · ${plaetze}` : plaetze,
		required,
		assigned,
		open: Math.max(0, required - assigned),
		status: statusColor(assigned, required),
		slots: buildSlots(occupants, required),
		shift
	};
}

function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name, 'de');
}

/**
 * Der Fokus-Kasten einer Station. Zwei Zweige, wie in #68 entschieden: mit
 * Schichten die nach Tagen gegliederten Schicht-Zeilen plus die schmale
 * Fußzeile, ohne Schichten ein Platz-Raster über `required_people`.
 */
export function buildStationBoard(
	station: Station,
	shifts: StationShift[],
	assignments: ShiftAssignmentWithHelper[],
	stationHelpers: StationHelperWithDetails[]
): StationBoard {
	const { required, assigned } = stationStaffing(station, shifts, assignments, stationHelpers);
	const base = {
		station,
		required,
		assigned,
		open: Math.max(0, required - assigned),
		status: statusColor(assigned, required)
	};

	const members = stationHelpers
		.filter((m) => m.station_id === station.id)
		.map((m) => ({ id: m.id, helperId: m.helper_id, name: helperName(m.helper) }))
		.sort(byName);

	const ownShifts = shifts.filter((s) => s.station_id === station.id);
	if (ownShifts.length === 0) {
		return {
			...base,
			hasShifts: false,
			days: [],
			wholeFestRow: row(
				`station:${station.id}`,
				'GANZES FEST',
				'Keine Schichten',
				station.required_people,
				members.map(({ helperId, name }) => ({ helperId, name })),
				null
			),
			// Ohne Schichten sind die Mitglieder das Raster — sie ein zweites Mal
			// als Fußzeile zu zeigen, wäre dieselbe Liste doppelt.
			members: []
		};
	}

	const days = new Map<string, BoardRow[]>();
	for (const shift of [...ownShifts].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
		const occupants = assignments
			.filter((a) => a.station_shift_id === shift.id)
			.sort((a, b) => a.position - b.position)
			.map((a) => ({ helperId: a.helper_id ?? null, name: helperName(a.helper) }));

		const rows = days.get(shift.start_date) ?? [];
		// Die Schicht über Mitternacht steht beim Starttag (Entscheid 4 aus #68).
		rows.push(row(shift.id, shiftTimeLabel(shift), shift.name, shift.required_people, occupants, shift));
		days.set(shift.start_date, rows);
	}

	return {
		...base,
		hasShifts: true,
		days: [...days.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, rows]) => ({
				date,
				title: formatFestDayLong(date),
				shiftCount: rows.length,
				open: rows.reduce((sum, r) => sum + r.open, 0),
				rows
			})),
		wholeFestRow: null,
		members
	};
}
