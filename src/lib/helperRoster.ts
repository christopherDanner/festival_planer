/** Die Regeln der **Helferliste** rechts an der Werkbank (#103, Entscheid 7 aus
#68). Reines Logikmodul ohne React: Suche, Segment-Filter samt seinen Zählern
und die Gruppierung nach Wunsch-Passung zur fokussierten Station.

Hier wird **anders gezählt als in `staffing`**, und das mit Absicht (Entscheid 2
aus #68): „zugeteilt" ist, wer *irgendeine* Zuteilung hat — Schicht **oder**
Stationsmitgliedschaft. Die Ampel zählt enger. Wer in der Ausschank-Fußzeile
steht, ohne in einer Schicht zu sein, gilt hier also als zugeteilt, obwohl ihn
die Ampel nicht mitzählt. Das ist kein Fehler, der zu „reparieren" wäre. */

import type { Helper } from '@/lib/helperService';
import type { ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';

/** Der Segment-Schalter über der Liste: `Alle · Frei · Zugeteilt`. */
export type HelperFilter = 'all' | 'free' | 'assigned';

/** Eine Marke der Liste. */
export interface RosterChip {
	helper: Helper;
	/** „Hochauer Franz" — Nachname zuerst, wie überall sonst in der App. */
	name: string;
	/**
	 * Die Zahl auf der Oswald-Plakette: **nur Schicht**-Zuteilungen. Sie
	 * beantwortet „wen hab ich noch nicht ausgenutzt?" — eine Stationsmitglied-
	 * schaft sagt dazu nichts und zählt darum nicht mit (anders als `assigned`).
	 */
	shiftCount: number;
	/** Weit gefasst: Schicht **oder** Stationsmitgliedschaft (Entscheid 2 aus #68). */
	assigned: boolean;
}

/** Eine Gruppe der Liste. */
export interface RosterGroup {
	id: 'wish' | 'rest';
	/**
	 * Versalien-Aufschrift samt Zahl, z. B. „Wünschen sich diese Station (3)".
	 * `null`, wenn die Liste gar nicht geteilt ist — ohne Wünschende gäbe es kein
	 * „weitere", und eine einzelne Aufschrift über allem wäre Lärm.
	 */
	title: string | null;
	chips: RosterChip[];
}

export interface HelperRoster {
	/** Alle Helfer des Fests, ungefiltert — für die Auskunft der leeren Liste. */
	total: number;
	/**
	 * Die Zahlen in den drei Knöpfen. Sie zählen über die **durchsuchte** Menge:
	 * die Zahl im Knopf ist die Zahl der Marken, die sein Druck zeigt.
	 */
	counts: Record<HelperFilter, number>;
	/** Nicht leere Gruppen in Anzeigereihenfolge — Wünschende zuerst. */
	groups: RosterGroup[];
}

export interface HelperRosterInput {
	helpers: Helper[];
	assignments: ShiftAssignmentWithHelper[];
	stationHelpers: StationHelperWithDetails[];
	/** Die Station im Fokus — wechselt sie, gruppiert die Liste neu. */
	focusStationId: string | null;
	search: string;
	filter: HelperFilter;
}

const matchesFilter = (chip: RosterChip, filter: HelperFilter): boolean =>
	filter === 'all' || (filter === 'assigned') === chip.assigned;

function group(id: RosterGroup['id'], label: string, chips: RosterChip[], split: boolean): RosterGroup[] {
	if (chips.length === 0) return [];
	return [{ id, title: split ? `${label} (${chips.length})` : null, chips }];
}

/**
 * Baut die Helferliste, wie sie am Bildschirm steht: erst die Suche, dann die
 * Zähler der drei Knöpfe, dann der gedrückte Knopf, dann die Gruppierung.
 *
 * Die Reihenfolge ist die Regel hinter „die Zähler stimmen mit der Liste
 * überein": gezählt wird **nach** der Suche und **vor** dem Filter — sonst
 * verspräche „Frei (9)" neun Marken, während drei dastehen.
 */
export function buildHelperRoster({
	helpers,
	assignments,
	stationHelpers,
	focusStationId,
	search,
	filter
}: HelperRosterInput): HelperRoster {
	const needle = search.trim().toLowerCase();

	const found = helpers
		.map((helper): RosterChip => {
			const shiftCount = assignments.filter((a) => a.helper_id === helper.id).length;
			const isMember = stationHelpers.some((m) => m.helper_id === helper.id);
			return {
				helper,
				name: `${helper.last_name} ${helper.first_name}`.trim(),
				shiftCount,
				assigned: shiftCount > 0 || isMember
			};
		})
		.filter((chip) => chip.name.toLowerCase().includes(needle))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'));

	const shown = found.filter((chip) => matchesFilter(chip, filter));
	// Wunsch-Passung heißt: die Station im Fokus steht in seinen Wünschen. Ohne
	// Fokus-Station gibt es nichts zu passen — dann bleibt die Liste ungeteilt.
	const wishes = (chip: RosterChip) =>
		Boolean(focusStationId) && (chip.helper.station_preferences ?? []).includes(focusStationId);
	const wishing = shown.filter(wishes);
	const split = wishing.length > 0;

	return {
		total: helpers.length,
		counts: {
			all: found.length,
			free: found.filter((chip) => !chip.assigned).length,
			assigned: found.filter((chip) => chip.assigned).length
		},
		groups: [
			...group('wish', 'Wünschen sich diese Station', wishing, split),
			...group('rest', 'Weitere', shown.filter((chip) => !wishes(chip)), split)
		]
	};
}
