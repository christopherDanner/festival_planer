import type { FestivalMaterialWithStation } from '@/lib/materialService';

export type OrderListAxis = 'supplier' | 'station';

export interface OrderListRow {
	name: string;
	quantity: number;
	unit: string;
}

export const NO_SUPPLIER_LABEL = 'Kein Lieferant';
export const NO_STATION_LABEL = 'Keine Station';

export interface OrderListGroup {
	/** Stable identity within an axis: supplier string, station id, or '' for the none-group. */
	key: string;
	/** Display name: supplier/station name, or "Kein Lieferant"/"Keine Station". */
	name: string;
	rows: OrderListRow[];
}

/**
 * Builds the order list (Bestellliste) groups for the given axis.
 * Only positions with ordered_quantity > 0 are included.
 */
function groupKeyAndName(m: FestivalMaterialWithStation, axis: OrderListAxis): { key: string; name: string } {
	if (axis === 'supplier') {
		const supplier = (m.supplier ?? '').trim();
		return { key: supplier, name: supplier };
	}
	const stationName = (m.station?.name ?? '').trim();
	return { key: m.station_id ?? '', name: stationName };
}

export function buildOrderList(
	materials: FestivalMaterialWithStation[],
	axis: OrderListAxis
): OrderListGroup[] {
	const ordered = materials.filter((m) => m.ordered_quantity > 0);

	const byKey = new Map<string, OrderListGroup>();
	for (const m of ordered) {
		const { key, name } = groupKeyAndName(m, axis);
		let group = byKey.get(key);
		if (!group) {
			group = { key, name, rows: [] };
			byKey.set(key, group);
		}
		group.rows.push({ name: m.name, quantity: m.ordered_quantity, unit: m.unit });
	}

	const noneLabel = axis === 'supplier' ? NO_SUPPLIER_LABEL : NO_STATION_LABEL;
	const groups = [...byKey.values()];
	for (const group of groups) {
		if (group.key === '') group.name = noneLabel;
		group.rows.sort((a, b) => a.name.localeCompare(b.name, 'de'));
	}

	// Named groups alphabetically; the none-group ("Kein Lieferant"/"Keine Station") always last.
	groups.sort((a, b) => {
		if (a.key === '') return 1;
		if (b.key === '') return -1;
		return a.name.localeCompare(b.name, 'de');
	});
	return groups;
}

/** Human-readable axis label, used in headers ("Lieferant: …" / "Station: …"). */
export function axisLabel(axis: OrderListAxis): string {
	return axis === 'supplier' ? 'Lieferant' : 'Station';
}

function sanitizeFilenamePart(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

/**
 * Builds the download filename for an order list export.
 * group set → single-group file named after the group; group null → collection document.
 */
export function buildOrderListFilename(
	festivalName: string,
	suffix: 'pdf' | 'xlsx',
	axis: OrderListAxis,
	group: OrderListGroup | null
): string {
	const base = sanitizeFilenamePart(festivalName);
	const label = group ? group.name : axis === 'supplier' ? 'Alle Lieferanten' : 'Alle Stationen';
	return `${base}_Bestellliste_${sanitizeFilenamePart(label)}.${suffix}`;
}

export interface OrderListExportPlan {
	/** One output file per group. */
	individual: OrderListGroup[];
	/** Collection document (one section per group), or null for a single-group export. */
	collection: OrderListGroup[] | null;
}

/**
 * Plans an order list export.
 * - selectedKey set (incl. '' for the none-group) → a single file for that group.
 * - selectedKey null → one file per group plus a collection document.
 */
export function planOrderListExport(
	materials: FestivalMaterialWithStation[],
	axis: OrderListAxis,
	selectedKey: string | null
): OrderListExportPlan {
	const groups = buildOrderList(materials, axis);

	if (selectedKey === null) {
		return { individual: groups, collection: groups };
	}

	const selected = groups.filter((g) => g.key === selectedKey);
	return { individual: selected, collection: null };
}
