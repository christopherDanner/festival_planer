/** Die Regel des Materiallisten-Exports (#119): welche Papiere aus Achse und
gewählter Gruppe entstehen und welche Beträge daraufstehen. Reines Logikmodul
ohne React und ohne jsPDF.

Eingeteilt wird mit `groupMaterials` auf der Achse aus #113 — der Export darf
nicht anders gruppieren als der Bildschirm. Gerechnet wird in `materialCosts`
(ADR 0006); hier steht keine Geldformel. */

import { consumedValue, orderedValue, withoutPrice } from './materialCosts';
import { groupMaterials, type GroupableMaterial, type MaterialAxis } from './materialGrouping';

/** Ein Papier des Exports — eine Gruppe der Achse, oder die ganze Liste. */
export interface MaterialExportSheet<T extends GroupableMaterial = GroupableMaterial> {
	/** Gruppen-Id aus `groupMaterials`; hält die Auswahl im Dialog. */
	groupId: string;
	/** Untertitel des Papiers („Ausschank"); `null` auf der Achse ALLE — dort
	trägt das Papier nur „Materialliste". */
	label: string | null;
	/** Station als Tabellenspalte nur, wo die Achse sie nicht schon gesetzt hat
	(Regel aus #113). */
	showStation: boolean;
	materials: T[];
}

/** Eine Gruppe der Achse als Auswahl im Dialog. */
export interface MaterialExportChoice {
	id: string;
	name: string;
	count: number;
}

export interface MaterialExportPlan<T extends GroupableMaterial = GroupableMaterial> {
	/** Die Gruppen der Achse — woraus der Dialog wählen lässt. */
	groups: MaterialExportChoice[];
	/** Ein Eintrag je Datei, in der Reihenfolge der Reiter (#113). */
	sheets: MaterialExportSheet<T>[];
	/** Positionen über alle Papiere — die Zahl der Infozeile. */
	positionCount: number;
	/** Bestellwert € der Auswahl (`orderedValue`). */
	ordered: number;
	/** Verbrauchswert € der Auswahl (`consumedValue`). */
	consumed: number;
	/** Preislücke: Positionen ohne erfassten Preis. */
	withoutPrice: number;
}

/**
 * Plant den Materiallisten-Export.
 *
 * - `groupId` gesetzt → genau ein Papier für diese Gruppe.
 * - `groupId` `null` → ein Papier je Gruppe der Achse.
 *
 * Kennt die Achse die Gruppe nicht (sie kam von einer anderen Achse), gelten
 * wieder alle Gruppen — dieselbe Regel, mit der die Arbeitsliste ihren Reiter
 * gültig hält.
 */
export function planMaterialExport<T extends GroupableMaterial>(
	materials: T[],
	axis: MaterialAxis,
	groupId: string | null
): MaterialExportPlan<T> {
	const groups = groupMaterials(materials, axis);
	const selected = groups.filter((group) => groupId == null || group.id === groupId);
	const chosen = selected.length > 0 ? selected : groups;

	const sheets = chosen.map((group) => ({
		groupId: group.id,
		label: axis === 'all' ? null : group.name,
		showStation: axis !== 'station',
		materials: group.materials
	}));

	const all = sheets.flatMap((sheet) => sheet.materials);
	return {
		groups: groups.map((group) => ({ id: group.id, name: group.name, count: group.count })),
		sheets,
		positionCount: all.length,
		ordered: orderedValue(all),
		consumed: consumedValue(all),
		withoutPrice: withoutPrice(all)
	};
}
