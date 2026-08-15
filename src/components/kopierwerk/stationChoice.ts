import { copiedShiftDateLabel, formatShiftRange } from '@/lib/shiftDates';
import type { Station, StationShift } from '@/lib/shiftService';

/**
 * Schritt 2 des Kopierwerks (#94) als reine Logik: welche Zeilen die Werkbank
 * zeigt und was das Ankreuzen bewirkt.
 *
 * Gewählt wird auf **Stations-Ebene** (Entscheid #64) — die Schichten hängen
 * nur als Vorschau darunter, damit man vor dem Anlegen sieht, auf welche Tage
 * sie rücken.
 */

/** Eine Schicht in der Vorschau — read-only, ohne eigene Auswahl. */
export interface ShiftPreview {
	id: string;
	/** Alter Termin, z. B. „Sa 11–15". */
	when: string;
	/** Name der Schicht; leer, wenn sie keinen trägt. */
	name: string;
	/** „4 Plätze" */
	places: string;
	/** Neuer Termin, z. B. „Sa 24.07.2027" — den Pfeil setzt die Zeile davor. */
	newWhen: string;
}

/** Eine Station als Zeile der Werkbank. */
export interface StationPreviewRow {
	id: string;
	name: string;
	/** „Zelt Nord · 14 Pers. · 4 Schichten" — Beschreibung nur, wenn es eine gibt. */
	meta: string;
	shifts: ShiftPreview[];
}

export interface StationPreviewInput {
	stations: Station[];
	shifts: StationShift[];
	/** Start des Quellfests — der Bezugspunkt des Versatzes. */
	sourceStartDate: string;
	/** Start des geplanten Fests. */
	targetStartDate: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Station dazu oder heraus; die Reihenfolge der Auswahl bleibt stabil. */
export function toggleStation(selected: string[], stationId: string): string[] {
	return selected.includes(stationId)
		? selected.filter((id) => id !== stationId)
		: [...selected, stationId];
}

/**
 * Zustand des „Alle Stationen"-Umschalters. Der Zwischenzustand hält fest, dass
 * ein Teil gewählt ist — ohne ihn läse sich eine Teilauswahl als „keine".
 */
export function allStationsState(
	stationIds: string[],
	selected: string[]
): boolean | 'indeterminate' {
	const chosen = stationIds.filter((id) => selected.includes(id)).length;
	if (chosen === 0) return false;
	return chosen === stationIds.length ? true : 'indeterminate';
}

/** Der Umschalter wählt alle — außer es sind schon alle, dann keine. */
export function toggleAllStations(stationIds: string[], selected: string[]): string[] {
	return allStationsState(stationIds, selected) === true ? [] : [...stationIds];
}

/**
 * Die Zeilen der Werkbank. Die Reihenfolge von Stationen und Schichten kommt
 * aus der Abfrage (Stationen nach Namen, Schichten nach Termin) — die Vorschau
 * sortiert nicht um.
 */
export function stationPreviewRows({
	stations,
	shifts,
	sourceStartDate,
	targetStartDate
}: StationPreviewInput): StationPreviewRow[] {
	return stations.map((station) => {
		const own = shifts.filter((shift) => shift.station_id === station.id);
		return {
			id: station.id,
			name: station.name,
			meta: [
				station.description,
				`${station.required_people} Pers.`,
				plural(own.length, 'Schicht', 'Schichten')
			]
				.filter(Boolean)
				.join(' · '),
			shifts: own.map((shift) => ({
				id: shift.id,
				when: formatShiftRange(shift),
				name: shift.name,
				places: plural(shift.required_people, 'Platz', 'Plätze'),
				newWhen: copiedShiftDateLabel(shift, sourceStartDate, targetStartDate)
			}))
		};
	});
}
