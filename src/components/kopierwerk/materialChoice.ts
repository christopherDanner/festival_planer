/** Die Regeln von Schritt 3 des Kopierwerks (#95): Mengenquelle, Gruppen-Chips
und die Frage, welche Position ohne Station im neuen Fest ankommt. Reines
Logikmodul ohne React — die Werkbank fragt nur und stellt dar. */

import type { CopyFestivalOptions } from '@/lib/festivalCopyService';
import { MATERIAL_AXES, groupMaterials, type GroupableMaterial } from '@/lib/materialGrouping';

/** Aus welcher Spalte die Menge der kopierten Position kommt. Der Typ hängt am
Kopier-Service, damit Schalter und Auftrag nicht auseinanderlaufen. */
export type QuantitySource = CopyFestivalOptions['materialQuantitySource'];

/** Beschriftung der Quellen in der Reihenfolge des Segment-Schalters. */
export const QUANTITY_SOURCES: readonly { value: QuantitySource; label: string }[] = [
	{ value: 'ordered', label: 'Bestellmenge' },
	{ value: 'actual', label: 'Tatsächliche Menge' }
];

/** Was Schritt 3 von einer Position der Vorlage braucht — strukturell, damit
Testfixturen ohne vollständige DB-Zeile auskommen. */
export interface CopyableMaterial extends GroupableMaterial {
	id: string;
	unit: string;
	/** Die Zuordnung, nach der `copyFestivalData` umschlüsselt. */
	station_id: string | null;
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
	/** Positionen, deren Station nicht mitkopiert wird — sie tragen die rote
	Notiz in der Zeile, ob gewählt oder nicht. */
	ids: ReadonlySet<string>;
	/** Davon gewählt: nur diese kommen wirklich ohne Station an. */
	arriving: number;
	/** Der Satz über der Liste; `null`, solange keine davon ankommt. */
	notice: string | null;
}

/**
 * Welche Position hängt an einer in Schritt 2 abgewählten Station? Genau die
 * verliert sie beim Kopieren: `copyFestivalData` schlägt `station_id` in der
 * Karte der kopierten Stationen nach und schreibt sonst `null`.
 *
 * Wer nie eine Station hatte, ist nicht betroffen — an ihm ändert die Auswahl
 * aus Schritt 2 nichts. Gezählt wird nur, was auch gewählt ist: eine abgewählte
 * Position kommt gar nicht an, über sie gibt es nichts zu warnen (#95).
 */
export function stationLoss(
	materials: readonly CopyableMaterial[],
	selectedStationIds: ReadonlySet<string>,
	selectedMaterialIds: ReadonlySet<string>
): StationLoss {
	const ids = new Set<string>();
	let arriving = 0;

	for (const material of materials) {
		if (!material.station_id || selectedStationIds.has(material.station_id)) continue;
		ids.add(material.id);
		if (selectedMaterialIds.has(material.id)) arriving += 1;
	}

	return { ids, arriving, notice: stationLossNotice(arriving) };
}

/** Der Satz über der Liste — im Wortlaut des Tickets. */
function stationLossNotice(arriving: number): string | null {
	if (arriving === 0) return null;
	return arriving === 1
		? '1 Position kommt ohne Station an, weil ihre Station nicht mitkopiert wird.'
		: `${arriving} Positionen kommen ohne Station an, weil deren Station nicht mitkopiert wird.`;
}

/** Die Achsen, nach denen Schritt 3 Chips anbietet — dieselben wie die
Arbeitsliste, ohne ALLE (das ist der „Alle/Keine"-Umschalter über der Liste). */
const CHIP_AXES = ['category', 'supplier', 'station'] as const;

export type ChipAxis = (typeof CHIP_AXES)[number];

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
	return CHIP_AXES.map((axis) => ({
		axis,
		label: MATERIAL_AXES.find((entry) => entry.value === axis)?.label ?? '',
		chips: groupMaterials([...materials], axis).map((group) => ({
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

/** Einzelauswahl einer Position. */
export function toggleMaterial(selected: ReadonlySet<string>, id: string): Set<string> {
	const next = new Set(selected);
	if (!next.delete(id)) next.add(id);
	return next;
}

/** „Alle/Keine": nur eine vollständige Auswahl räumt leer, jede andere füllt auf. */
export function toggleAll(
	materials: readonly CopyableMaterial[],
	selected: ReadonlySet<string>
): Set<string> {
	const all = materials.map((material) => material.id);
	return all.every((id) => selected.has(id)) ? new Set() : new Set(all);
}
