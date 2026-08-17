/** Die Regeln von Schritt 3 des Kopierwerks (#95): Mengenquelle, Gruppen-Chips
und die Frage, welche Position ohne Station im neuen Fest ankommt. Reines
Logikmodul ohne React — die Werkbank fragt nur und stellt dar. */

import type { CopyFestivalOptions } from '@/lib/festivalCopyService';
import {
	MATERIAL_AXES,
	groupMaterials,
	type GroupableMaterial,
	type MaterialAxis
} from '@/lib/materialGrouping';

/** Aus welcher Spalte die Menge der kopierten Position kommt. Der Typ hängt am
Kopier-Service, damit Schalter und Auftrag nicht auseinanderlaufen. */
export type QuantitySource = CopyFestivalOptions['materialQuantitySource'];

/** Beschriftung der Quellen in der Reihenfolge des Segment-Schalters. */
export const QUANTITY_SOURCES: readonly { value: QuantitySource; label: string }[] = [
	{ value: 'ordered', label: 'Bestellmenge' },
	{ value: 'actual', label: 'Tatsächliche Menge' }
];

/** Was Schritt 3 von einer Position der Vorlage braucht — strukturell, damit
Testfixturen ohne vollständige DB-Zeile auskommen. Die Station steht allein in
`station` (von `GroupableMaterial`): Chips und Warnung müssen dieselbe
Zuordnung lesen, sonst warnt die Zeile über eine Gruppe, in der sie nicht
steht. */
export interface CopyableMaterial extends GroupableMaterial {
	id: string;
	unit: string;
}

/**
 * Die Menge, die diese Position ins neue Fest mitbringt. Eine nie erfasste
 * Verbrauchsmenge zählt als 0 — genau das schreibt `copyFestivalData` in die
 * Bestellmenge des neuen Fests, und die Zeile darf nichts anderes behaupten.
 */
export function sourceQuantity(material: CopyableMaterial, source: QuantitySource): number {
	return source === 'actual' ? (material.actual_quantity ?? 0) : material.ordered_quantity;
}

/** Was Schritt 3 über die Kante „Material zeigt auf Stationen" zu sagen hat. */
export interface StationLoss {
	/** Die Positionen, die ohne Station ankommen — sie tragen die rote Notiz in
	der Zeile und stehen im Satz darüber. Eine Menge, kein zweiter Zähler:
	sonst stünden drei rote Zeilen über dem Satz „1 Position kommt ohne Station
	an". */
	ids: ReadonlySet<string>;
	/** Der Satz über der Liste; `null`, solange keine Position betroffen ist. */
	notice: string | null;
}

/**
 * Welche gewählte Position hängt an einer in Schritt 2 abgewählten Station?
 * Genau die verliert sie beim Kopieren: `copyFestivalData` schlägt die Station
 * in der Karte der kopierten Stationen nach und schreibt sonst `null`.
 *
 * Zwei Einschränkungen, beide aus dem Wortlaut „kommt ohne Station **an**":
 * Wer nie eine Station hatte, ist nicht betroffen — an ihm ändert Schritt 2
 * nichts. Und eine abgewählte Position kommt gar nicht an, über sie gibt es
 * nichts zu warnen. Abgewählt wird von hier aus nichts (Entscheid #64).
 */
export function stationLoss(
	materials: readonly CopyableMaterial[],
	selectedStationIds: ReadonlySet<string>,
	selectedMaterialIds: ReadonlySet<string>
): StationLoss {
	const ids = new Set<string>();

	for (const material of materials) {
		const stationId = material.station?.id;
		if (!stationId || selectedStationIds.has(stationId)) continue;
		if (selectedMaterialIds.has(material.id)) ids.add(material.id);
	}

	return { ids, notice: stationLossNotice(ids.size) };
}

/** Der Satz über der Liste — im Wortlaut des Tickets. */
function stationLossNotice(count: number): string | null {
	if (count === 0) return null;
	return count === 1
		? '1 Position kommt ohne Station an, weil ihre Station nicht mitkopiert wird.'
		: `${count} Positionen kommen ohne Station an, weil deren Station nicht mitkopiert wird.`;
}

export type ChipAxis = Exclude<MaterialAxis, 'all'>;

/** Die Achsen, nach denen Schritt 3 Chips anbietet — dieselben wie die
Arbeitsliste, ohne ALLE (das ist der „Alle/Keine"-Umschalter über der Liste).
Reihenfolge aus dem Ticket, Beschriftung aus `MATERIAL_AXES`: eine Achse darf im
Kopierwerk nicht anders heißen als in der Arbeitsliste. */
const CHIP_AXES: readonly { value: ChipAxis; label: string }[] = (
	['category', 'supplier', 'station'] as const
).map((value) => {
	const axis = MATERIAL_AXES.find((entry) => entry.value === value);
	if (!axis) throw new Error(`Achse „${value}" fehlt in MATERIAL_AXES`);
	return { value, label: axis.label };
});

/** Ein Chip schaltet die Positionen einer Gruppe gemeinsam um. */
export interface MaterialChip {
	/** Schlüssel aus `groupMaterials` — über Achse und Zuordnung eindeutig. */
	id: string;
	label: string;
	materialIds: string[];
}

/** Eine Chip-Reihe mit ihrem Versalien-Kleinlabel. */
export interface MaterialChipSection {
	axis: ChipAxis;
	label: string;
	chips: MaterialChip[];
}

/** Alle / teilweise / keine — der Zwischenzustand ist der Punkt an den Chips. */
export type ChipState = 'all' | 'some' | 'none';

/**
 * Die Chip-Reihen des Schritts. Gruppiert wird über `groupMaterials` (#113) und
 * nicht nach eigener Regel: die Restgruppen heißen dann überall gleich („Ohne
 * Station", „Kein Lieferant", „Ohne Kategorie") und stehen wie dort am Ende.
 *
 * Eine Reihe, in der jede Position denselben Chip trüge, fällt weg — sie
 * schaltet dieselbe Menge wie der „Alle/Keine"-Umschalter darüber.
 */
export function materialChipSections(
	materials: readonly CopyableMaterial[]
): MaterialChipSection[] {
	return CHIP_AXES.map(({ value, label }) => ({
		axis: value,
		label,
		chips: groupMaterials([...materials], value).map((group) => ({
			id: group.id,
			label: group.name,
			materialIds: group.materials.map((material) => material.id)
		}))
	})).filter((section) => section.chips.length > 1);
}

/** Wie voll ein Chip gewählt ist. Ein Chip ohne Positionen kann es nicht
geben — `groupMaterials` legt eine Gruppe erst mit ihrer ersten Position an. */
export function chipState(chip: MaterialChip, selected: ReadonlySet<string>): ChipState {
	const count = chip.materialIds.filter((id) => selected.has(id)).length;
	if (count === 0) return 'none';
	return count === chip.materialIds.length ? 'all' : 'some';
}

/** Ein ganz gewählter Chip fällt heraus, jeder andere kommt vollständig dazu —
so bringt ein zweiter Klick den Zwischenzustand nicht zum Stehen. */
export function toggleChip(selected: ReadonlySet<string>, chip: MaterialChip): Set<string> {
	const next = new Set(selected);
	const remove = chipState(chip, selected) === 'all';
	for (const id of chip.materialIds) {
		if (remove) next.delete(id);
		else next.add(id);
	}
	return next;
}
