/** Die Achsen der Material-Arbeitsliste und das Gruppieren danach (#113).
Reines Logikmodul ohne React. Gerechnet wird nicht hier, sondern in
`materialCosts` — dieses Modul ordnet nur (ADR 0006). */

import { sumTotals, withoutPrice, type MaterialPosition } from './materialCosts';

/** Die Achse, nach der die Arbeitsliste gruppiert: planen (Station),
bestellen (Lieferant), Kosten prüfen (Kategorie) oder alles auf einem Papier. */
export type MaterialAxis = 'station' | 'supplier' | 'category' | 'all';

/** Beschriftung der Achsen in der Reihenfolge des Umschalters. */
export const MATERIAL_AXES: readonly { value: MaterialAxis; label: string }[] = [
	{ value: 'station', label: 'STATION' },
	{ value: 'supplier', label: 'LIEFERANT' },
	{ value: 'category', label: 'KATEGORIE' },
	{ value: 'all', label: 'ALLE' }
];

/** Was eine Material-Position beisteuern muss, um gruppiert zu werden —
strukturell, damit auch Testfixtures ohne DB-Felder reichen. */
export interface GroupableMaterial extends MaterialPosition {
	name: string;
	category: string | null;
	supplier: string | null;
	station?: { id: string; name: string } | null;
}

/** Ein Gruppen-Kasten samt der Zahlen, die sein Reiter trägt. */
export interface MaterialGroup<T extends GroupableMaterial = GroupableMaterial> {
	/** Stabiler Schlüssel über Achse und Zuordnung — Reiter-Zustand hängt daran. */
	id: string;
	/** Die Zuordnung selbst (Stations-Id, Lieferanten- oder Kategoriename);
	`null` bei der Restgruppe. Daraus trägt „+ POSITION FÜR X" vor. */
	key: string | null;
	name: string;
	/** „Ohne Station" / „Kein Lieferant": vollwertige Gruppe, aber am Ende. */
	unassigned: boolean;
	materials: T[];
	count: number;
	/** Zwischensumme der Gruppe: Σ Zeilenkosten (`sumTotals`). */
	total: number;
	withoutPrice: number;
}

const UNASSIGNED_KEY = '__none__';

/** Name der Kategorie-Restgruppe — Chip im Kasten *und* Gruppe der Kategorie-Achse. */
export const NO_CATEGORY = 'Ohne Kategorie';

/** Wie eine Achse eine Position einordnet: Schlüssel, Anzeigename und der
Name der Restgruppe für alles ohne Zuordnung. */
const AXIS_KEYS: Record<
	MaterialAxis,
	{ key: (m: GroupableMaterial) => string | null; name: (m: GroupableMaterial) => string; unassignedName: string }
> = {
	station: {
		// Schlüssel ist die Stations-Id, nicht ihr Name: zwei gleichnamige
		// Stationen sind zwei Gruppen.
		key: (m) => m.station?.id ?? null,
		name: (m) => m.station?.name ?? '',
		unassignedName: 'Ohne Station'
	},
	supplier: {
		key: (m) => blankToNull(m.supplier),
		name: (m) => blankToNull(m.supplier) ?? '',
		unassignedName: 'Kein Lieferant'
	},
	category: {
		key: (m) => blankToNull(m.category),
		name: (m) => blankToNull(m.category) ?? '',
		unassignedName: NO_CATEGORY
	},
	all: {
		key: () => 'alle',
		name: () => 'Alle Positionen',
		unassignedName: 'Alle Positionen'
	}
};

function blankToNull(value: string | null): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

/**
 * Zerlegt die (bereits gesuchten/gefilterten) Positionen in die Kästen einer
 * Achse. Alphabetisch nach Gruppennamen; die Gruppe ohne Zuordnung steht am
 * Ende, nicht als Fußnote (#113). Bei `all` ist es genau ein Kasten.
 */
export function groupMaterials<T extends GroupableMaterial>(
	materials: T[],
	axis: MaterialAxis
): MaterialGroup<T>[] {
	const axisKeys = AXIS_KEYS[axis];
	const buckets = new Map<
		string,
		{ key: string | null; name: string; unassigned: boolean; materials: T[] }
	>();

	for (const m of materials) {
		const key = axisKeys.key(m);
		const id = `${axis}:${key ?? UNASSIGNED_KEY}`;
		let bucket = buckets.get(id);
		if (!bucket) {
			bucket = {
				key,
				name: key == null ? axisKeys.unassignedName : axisKeys.name(m),
				unassigned: key == null,
				materials: []
			};
			buckets.set(id, bucket);
		}
		bucket.materials.push(m);
	}

	return [...buckets.entries()]
		.map(([id, bucket]) => ({
			id,
			key: bucket.key,
			name: bucket.name,
			unassigned: bucket.unassigned,
			materials: bucket.materials,
			count: bucket.materials.length,
			total: sumTotals(bucket.materials),
			withoutPrice: withoutPrice(bucket.materials)
		}))
		.sort((a, b) => {
			if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
			return a.name.localeCompare(b.name, 'de');
		});
}

/**
 * Die Suche der Werkzeugleiste: Name, Lieferant, Kategorie und Station. Sie
 * läuft vor dem Gruppieren, damit die Reiter die Trefferzahl je Gruppe zeigen.
 */
export function searchMaterials<T extends GroupableMaterial>(materials: T[], term: string): T[] {
	const needle = term.trim().toLowerCase();
	if (!needle) return materials;

	return materials.filter((m) =>
		[m.name, m.supplier, m.category, m.station?.name].some((field) =>
			field?.toLowerCase().includes(needle)
		)
	);
}

/**
 * Hält den Reiter-Zustand gültig: Achsenwechsel, Suche und Löschen können die
 * gewählte Gruppe verschwinden lassen — dann übernimmt der erste Reiter.
 */
export function resolveActiveGroupId(
	groups: MaterialGroup<GroupableMaterial>[],
	requested: string | null
): string | null {
	if (requested && groups.some((g) => g.id === requested)) return requested;
	return groups[0]?.id ?? null;
}

/**
 * Die Kategorie-Chips eines Kastens: jede Kategorie der Gruppe einmal,
 * alphabetisch, „Ohne Kategorie" am Ende — dieselbe Regel wie bei den Gruppen
 * ohne Zuordnung. Auf der Kategorie-Achse sind die Chips redundant und werden
 * im Kasten ausgeblendet (#113).
 */
export function groupCategories(materials: GroupableMaterial[]): string[] {
	const named = new Set<string>();
	let hasNone = false;

	for (const m of materials) {
		const category = blankToNull(m.category);
		if (category) named.add(category);
		else hasNone = true;
	}

	const sorted = [...named].sort((a, b) => a.localeCompare(b, 'de'));
	return hasNone ? [...sorted, NO_CATEGORY] : sorted;
}

/** Filtert eine Gruppe auf einen Kategorie-Chip; `null` heißt „alle Chips aus". */
export function filterByCategory<T extends GroupableMaterial>(
	materials: T[],
	category: string | null
): T[] {
	if (category == null) return materials;
	if (category === NO_CATEGORY) return materials.filter((m) => blankToNull(m.category) == null);
	return materials.filter((m) => blankToNull(m.category) === category);
}

/** Hält den Chip gültig: die neue Gruppe hat ihn vielleicht nicht — dann alle. */
export function resolveActiveCategory(categories: string[], requested: string | null): string | null {
	return requested && categories.includes(requested) ? requested : null;
}

/** Vorgetragene Zuordnung einer neuen Position. */
export interface MaterialPrefill {
	station_id?: string;
	supplier?: string;
	category?: string;
}

/** Was „+ POSITION FÜR X" im Dialog vorträgt: die Zuordnung der Gruppe. Die
Restgruppe und die Achse ALLE tragen nichts vor — sie stehen für keine. */
export function prefillFromGroup(
	group: MaterialGroup<GroupableMaterial>,
	axis: MaterialAxis
): MaterialPrefill {
	if (group.key == null) return {};
	switch (axis) {
		case 'station':
			return { station_id: group.key };
		case 'supplier':
			return { supplier: group.key };
		case 'category':
			return { category: group.key };
		default:
			return {};
	}
}
