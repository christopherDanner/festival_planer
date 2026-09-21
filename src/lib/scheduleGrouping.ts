/** Gruppierung Tag → Phase für den Ablaufplan (ADR 0007).
Die Abfrage liefert alle Einträge am Tag nebeneinander; welche davon unter
welchem Zwischentitel stehen, entscheidet die Darstellung. Reine Logik ohne
React — und damit an derselben Stelle wie `materialCosts` (ADR 0006): Bildschirm
und Papier teilen sich eine Fassung, sonst drucken sie anders, als sie zeigen. */

import type {
	ScheduleDayWithEntries,
	ScheduleEntryWithHelper,
	SchedulePhase
} from './scheduleService';

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
 * und löschen können muss.
 *
 * Zeigt ein Eintrag auf eine Phase, die nicht an *diesem* Tag hängt, landet er
 * unter dem Tag. Der Fremdschlüssel verhindert das nicht — er kennt nur
 * `schedule_phases`, nicht „Phase dieses Tages" — und ein Eintrag, der
 * stattdessen ganz aus der Darstellung fiele, wäre am Bildschirm wie auf Papier
 * unauffindbar.
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
