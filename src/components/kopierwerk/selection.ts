/** Das Ankreuzen in den Kopier-Schritten: Stationen in Schritt 2, Positionen in
Schritt 3 — dieselben Regeln, darum an einer Stelle. Reines Logikmodul. */

/** Zustand einer Checkbox über eine Menge: an, aus oder dazwischen. */
export type CheckboxState = boolean | 'indeterminate';

/** Einen Eintrag an- oder abhaken. */
export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
	const next = new Set(selected);
	if (!next.delete(id)) next.add(id);
	return next;
}

/** „Alle/Keine": nur eine vollständige Auswahl räumt leer, jede andere füllt
auf — aus dem Zwischenzustand führt der Klick also nach oben, nicht ins Leere. */
export function toggleAllIds(all: readonly string[], selected: ReadonlySet<string>): Set<string> {
	return all.every((id) => selected.has(id)) ? new Set() : new Set(all);
}

/** Der Zustand des „Alle/Keine"-Schalters über einer Menge. Eine leere Menge
hat nichts zu wählen und steht darum aus. */
export function checkboxState(
	all: readonly string[],
	selected: ReadonlySet<string>
): CheckboxState {
	const chosen = all.filter((id) => selected.has(id)).length;
	if (chosen === 0) return false;
	return chosen === all.length ? true : 'indeterminate';
}
