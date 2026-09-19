import type { Station, StationShift } from './shiftService';

/** Was das Löschen trifft, liest der Umfang an Station und Helfer — mehr nicht. */
interface AssignmentRef {
	station_id: string;
	helper_id?: string;
}

export interface AutoAssignScope {
	/** Station, auf die eingeschränkt ist; `null` heißt: das ganze Fest. */
	station: Station | null;
	/** Aufschrift des Dialogs. */
	title: string;
	/** Die Schichten, über die dieser Lauf zuteilt. */
	shifts: StationShift[];
	/** Wortlaut des Lösch-Knopfs. */
	clearLabel: string;
	/** Wie viele Zuweisungen das Löschen trifft. */
	clearCount: number;
	/** Die Rückfrage vor dem Löschen — nennt die Zahl. */
	clearQuestion: string;
}

/**
 * Der **Umfang** eines Laufs der Auto-Zuteilung (#108): entweder das ganze Fest
 * oder eine Station („NUR DIESE STATION AUTO-FÜLLEN" im Stationskopf).
 *
 * Einschränken heißt hier nichts weiter, als ein **gefiltertes Schicht-Array**
 * weiterzureichen — `performAutomaticAssignment` bleibt unberührt (Entscheid 6
 * aus #68). Die Regler „Min./Max. Schichten pro Person" zählen deshalb weiter
 * über das ganze Fest: der Service liest den Bestand ungefiltert, sonst sammelte
 * jemand in fünf Stationen je drei Schichten.
 *
 * Aufschrift, Schichten und Lösch-Zahl fallen aus *einer* Quelle, damit der
 * Dialog nicht behaupten kann, was der Lauf nicht tut.
 */
export const autoAssignScope = (
	station: Station | null,
	stationShifts: StationShift[],
	assignments: AssignmentRef[]
): AutoAssignScope => {
	const shifts = station ? stationShifts.filter((s) => s.station_id === station.id) : stationShifts;
	// Gezählt wird über `helper_id` wie in `performAutomaticAssignment`: eine
	// Zeile ohne Helfer steht auf keinem Platz, die Rückfrage darf sie darum
	// auch nicht mitzählen. Gelöscht wird sie trotzdem — sie ist Buchhaltung.
	const clearCount = assignments.filter(
		(a) => a.helper_id && (!station || a.station_id === station.id)
	).length;
	const zahl = `${clearCount} ${clearCount === 1 ? 'Zuweisung' : 'Zuweisungen'}`;
	const wo = station ? `der Station „${station.name}"` : 'im ganzen Fest';

	return {
		station,
		title: station ? `Auto-Zuteilung · nur ${station.name}` : 'Auto-Zuteilung',
		shifts,
		clearLabel: station ? 'Zuweisungen dieser Station löschen' : 'Alle Zuweisungen löschen',
		clearCount,
		clearQuestion: `${zahl} ${wo} löschen? Das lässt sich nicht rückgängig machen.`
	};
};
