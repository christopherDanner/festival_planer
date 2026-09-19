/** Gruppierung Tag → Phase für den Ablaufplan (ADR 0007).
Die Abfrage liefert alle Einträge am Tag nebeneinander; welche davon unter
welchem Zwischentitel stehen, entscheidet die Ansicht. Reine Logik ohne React. */

import type {
	ScheduleDayWithEntries,
	ScheduleEntryWithHelper,
	SchedulePhase
} from '@/lib/scheduleService';

/** Ein Block unter einem Ablauf-Tag; `phase === null` heißt „direkt unter dem Tag". */
export interface EntryGroup {
	phase: SchedulePhase | null;
	entries: ScheduleEntryWithHelper[];
}

/**
 * Die Blöcke eines Tages in Anzeigereihenfolge: erst die Einträge ohne Phase
 * (nur wenn es welche gibt), dann jede Phase in der Reihenfolge der Tagesliste.
 *
 * Leere Phasen bleiben stehen — sie sind benannte Gruppen, die man umbenennen
 * und löschen können muss. Ein Eintrag, dessen Phase nicht am Tag hängt, landet
 * unter dem Tag statt aus der Ansicht zu fallen.
 */
export function groupEntriesByPhase(day: ScheduleDayWithEntries): EntryGroup[] {
	const phases = day.phases ?? [];
	const entries = day.entries ?? [];
	const known = new Set(phases.map((phase) => phase.id));

	const ungrouped = entries.filter(
		(entry) => !entry.schedule_phase_id || !known.has(entry.schedule_phase_id)
	);

	const groups: EntryGroup[] = ungrouped.length > 0 ? [{ phase: null, entries: ungrouped }] : [];

	for (const phase of phases) {
		groups.push({
			phase,
			entries: entries.filter((entry) => entry.schedule_phase_id === phase.id)
		});
	}

	return groups;
}
