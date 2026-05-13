import type { FestivalMaterialWithStation } from './materialService';
import { toBaseQuantity } from './materialQuantity';

export type MatchRowStatus = 'match' | 'only-source' | 'only-target';

export interface SourceDetail {
	stationName: string | null;
	ordered: number;
	actual: number | null;
}

export interface MatchRow {
	key: string;
	status: MatchRowStatus;
	name: string;
	normalizedName: string;
	stationName: string | null;
	targetMaterial: FestivalMaterialWithStation | null;
	sourceMaterials: FestivalMaterialWithStation[];
	srcOrderedTotal: number | null;
	srcActualTotal: number | null;
	srcAggregateCount: number;
	supplier: string | null;
	category: string | null;
	unit: string;
	packagingUnit: string | null;
	amountPerPackaging: number | null;
	targetOrderedQuantity: number | null;
	sourceDetails: SourceDetail[];
}

export interface GroupAggregate {
	rowCount: number;
	srcOrderedTotal: number | null;
	srcActualTotal: number | null;
}

export interface MatchResult {
	rows: MatchRow[];
	groupByName: Map<string, GroupAggregate>;
}

function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

function normalizeStation(stationName: string | null | undefined): string {
	if (stationName == null) return '';
	return stationName.trim().toLowerCase();
}

function sumNullable(values: (number | null)[]): number | null {
	const nonNull = values.filter((v): v is number => v != null);
	if (nonNull.length === 0) return null;
	return nonNull.reduce((acc, v) => acc + v, 0);
}

function detailFor(m: FestivalMaterialWithStation): SourceDetail {
	return {
		stationName: m.station?.name ?? null,
		ordered: toBaseQuantity(m.ordered_quantity, m) ?? 0,
		actual: toBaseQuantity(m.actual_quantity, m)
	};
}

function rowFromTarget(
	tgt: FestivalMaterialWithStation,
	srcs: FestivalMaterialWithStation[]
): MatchRow {
	const status: MatchRowStatus = srcs.length > 0 ? 'match' : 'only-target';
	const srcOrderedTotal =
		srcs.length > 0
			? srcs.reduce((acc, s) => acc + (toBaseQuantity(s.ordered_quantity, s) ?? 0), 0)
			: null;
	const srcActualTotal =
		srcs.length > 0 ? sumNullable(srcs.map((s) => toBaseQuantity(s.actual_quantity, s))) : null;
	return {
		key: `tgt:${tgt.id}`,
		status,
		name: tgt.name,
		normalizedName: normalizeName(tgt.name),
		stationName: tgt.station?.name ?? null,
		targetMaterial: tgt,
		sourceMaterials: srcs,
		srcOrderedTotal,
		srcActualTotal,
		srcAggregateCount: srcs.length,
		supplier: tgt.supplier,
		category: tgt.category,
		unit: tgt.unit,
		packagingUnit: tgt.packaging_unit,
		amountPerPackaging: tgt.amount_per_packaging,
		targetOrderedQuantity: toBaseQuantity(tgt.ordered_quantity, tgt),
		sourceDetails: srcs.map(detailFor)
	};
}

function rowFromOnlySource(src: FestivalMaterialWithStation): MatchRow {
	return {
		key: `src:${src.id}`,
		status: 'only-source',
		name: src.name,
		normalizedName: normalizeName(src.name),
		stationName: src.station?.name ?? null,
		targetMaterial: null,
		sourceMaterials: [src],
		srcOrderedTotal: toBaseQuantity(src.ordered_quantity, src),
		srcActualTotal: toBaseQuantity(src.actual_quantity, src),
		srcAggregateCount: 1,
		supplier: src.supplier,
		category: src.category,
		unit: src.unit,
		packagingUnit: src.packaging_unit,
		amountPerPackaging: src.amount_per_packaging,
		targetOrderedQuantity: null,
		sourceDetails: [detailFor(src)]
	};
}

export function matchMaterials(
	src: FestivalMaterialWithStation[],
	tgt: FestivalMaterialWithStation[]
): MatchResult {
	const remainingSrc = [...src];
	const matchedSrcByTarget = new Map<string, FestivalMaterialWithStation[]>();

	// Pass 1 — exact (normalizedName + normalizedStation)
	for (const t of tgt) {
		const tName = normalizeName(t.name);
		const tStation = normalizeStation(t.station?.name);
		const idx = remainingSrc.findIndex(
			(s) => normalizeName(s.name) === tName && normalizeStation(s.station?.name) === tStation
		);
		if (idx >= 0) {
			const [s] = remainingSrc.splice(idx, 1);
			matchedSrcByTarget.set(t.id, [s]);
		}
	}

	// Pass 2 — name-only aggregation for unmatched targets
	for (const t of tgt) {
		if (matchedSrcByTarget.has(t.id)) continue;
		const tName = normalizeName(t.name);
		const aggregated: FestivalMaterialWithStation[] = [];
		for (let i = remainingSrc.length - 1; i >= 0; i--) {
			if (normalizeName(remainingSrc[i].name) === tName) {
				aggregated.unshift(remainingSrc[i]);
				remainingSrc.splice(i, 1);
			}
		}
		if (aggregated.length > 0) matchedSrcByTarget.set(t.id, aggregated);
	}

	// Build target-based rows in input order
	const rows: MatchRow[] = tgt.map((t) =>
		rowFromTarget(t, matchedSrcByTarget.get(t.id) ?? [])
	);

	// Pass 3 — remaining source entries → only-source rows
	for (const s of remainingSrc) {
		rows.push(rowFromOnlySource(s));
	}

	// Group aggregate per normalized name
	const groupByName = new Map<string, GroupAggregate>();
	for (const row of rows) {
		const existing = groupByName.get(row.normalizedName);
		if (existing) {
			existing.rowCount += 1;
			if (row.srcOrderedTotal != null) {
				existing.srcOrderedTotal = (existing.srcOrderedTotal ?? 0) + row.srcOrderedTotal;
			}
			if (row.srcActualTotal != null) {
				existing.srcActualTotal = (existing.srcActualTotal ?? 0) + row.srcActualTotal;
			}
		} else {
			groupByName.set(row.normalizedName, {
				rowCount: 1,
				srcOrderedTotal: row.srcOrderedTotal,
				srcActualTotal: row.srcActualTotal
			});
		}
	}

	return { rows, groupByName };
}
