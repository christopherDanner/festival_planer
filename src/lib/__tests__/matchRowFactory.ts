/** Testfixtures für die Zeilen der Material-Übernahme. Eine `MatchRow` trägt 18
Felder, von denen ein Test höchstens drei interessieren — hier steht der Rest
einmal, statt in jeder Testdatei noch einmal. */

import type { MatchRow, MatchRowStatus } from '../materialMatcher';
import type { FestivalMaterialWithStation } from '../materialService';

export interface MatchRowOpts {
	name: string;
	status?: MatchRowStatus;
	station?: string | null;
	/** Bestellt/Verbraucht im Quellfest, in Basiseinheiten. */
	srcOrdered?: number | null;
	srcActual?: number | null;
	/** Bestellmenge, die im Zielfest schon steht (Basiseinheiten). */
	targetOrdered?: number | null;
	unit?: string;
	packagingUnit?: string | null;
	amountPerPackaging?: number | null;
	srcAggregateCount?: number;
	sourceDetails?: MatchRow['sourceDetails'];
	/** Position, die im Zielfest wirklich existiert — nur die ist löschbar. */
	inTarget?: boolean;
}

export function matchRow(opts: MatchRowOpts): MatchRow {
	const station = opts.station === undefined ? 'Ausschank' : opts.station;
	const status = opts.status ?? 'match';
	const inTarget = opts.inTarget ?? status !== 'only-source';
	return {
		key: `row:${opts.name}:${station ?? ''}`,
		status,
		name: opts.name,
		normalizedName: opts.name.trim().toLowerCase(),
		stationName: station,
		targetMaterial: inTarget ? targetMaterial(opts.name, station) : null,
		sourceMaterials: [],
		srcOrderedTotal: opts.srcOrdered ?? null,
		srcActualTotal: opts.srcActual ?? null,
		srcAggregateCount: opts.srcAggregateCount ?? (status === 'only-target' ? 0 : 1),
		supplier: null,
		category: null,
		unit: opts.unit ?? 'Stück',
		packagingUnit: opts.packagingUnit ?? null,
		amountPerPackaging: opts.amountPerPackaging ?? null,
		targetOrderedQuantity: opts.targetOrdered ?? null,
		sourceDetails: opts.sourceDetails ?? []
	};
}

export function targetMaterial(name: string, station: string | null): FestivalMaterialWithStation {
	return {
		id: `mat:${name}`,
		festival_id: 'ziel',
		station_id: station ? `s:${station}` : null,
		name,
		category: null,
		supplier: null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: 0,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		station: station ? { id: `s:${station}`, name: station } : null
	};
}
