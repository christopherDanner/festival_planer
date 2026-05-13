import { describe, it, expect } from 'vitest';
import { matchMaterials } from '../materialMatcher';
import type { FestivalMaterialWithStation } from '../materialService';

let idCounter = 0;
function nextId(): string {
	idCounter += 1;
	return `m-${idCounter}`;
}

interface MakeOpts {
	name: string;
	station?: string | null;
	ordered?: number;
	actual?: number | null;
	supplier?: string | null;
	id?: string;
}

function make(opts: MakeOpts): FestivalMaterialWithStation {
	const station = opts.station === undefined ? null : opts.station;
	return {
		id: opts.id ?? nextId(),
		festival_id: 'f1',
		station_id: station ? `s-${station}` : null,
		name: opts.name,
		category: null,
		supplier: opts.supplier ?? null,
		unit: 'Stück',
		packaging_unit: null,
		amount_per_packaging: null,
		ordered_quantity: opts.ordered ?? 0,
		actual_quantity: opts.actual === undefined ? null : opts.actual,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		notes: null,
		created_at: '',
		updated_at: '',
		station: station ? { id: `s-${station}`, name: station } : null
	};
}

describe('matchMaterials', () => {
	it('returns all targets as only-target when source is empty', () => {
		const tgt = [make({ name: 'Bier', station: 'Bar' }), make({ name: 'Wein', station: 'Bar' })];
		const result = matchMaterials([], tgt);

		expect(result.rows).toHaveLength(2);
		expect(result.rows.every((r) => r.status === 'only-target')).toBe(true);
		expect(result.rows.every((r) => r.sourceMaterials.length === 0)).toBe(true);
		expect(result.rows.every((r) => r.srcOrderedTotal === null)).toBe(true);
	});

	it('returns all sources as only-source when target is empty', () => {
		const src = [make({ name: 'Bier' }), make({ name: 'Wein' })];
		const result = matchMaterials(src, []);

		expect(result.rows).toHaveLength(2);
		expect(result.rows.every((r) => r.status === 'only-source')).toBe(true);
	});

	it('matches 1:1 by (name + station) without aggregation', () => {
		const src = [make({ name: 'Bier', station: 'Bar', ordered: 10 })];
		const tgt = [make({ name: 'Bier', station: 'Bar', ordered: 0 })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(1);
		const row = result.rows[0];
		expect(row.status).toBe('match');
		expect(row.srcAggregateCount).toBe(1);
		expect(row.srcOrderedTotal).toBe(10);
	});

	it('falls back to name-only match across stations (Pass 2) when station differs', () => {
		const src = [make({ name: 'Bier', station: 'Bar', ordered: 7 })];
		const tgt = [make({ name: 'Bier', station: 'Weinbar' })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].status).toBe('match');
		expect(result.rows[0].srcOrderedTotal).toBe(7);
		expect(result.rows[0].srcAggregateCount).toBe(1);
	});

	it('Pass 1 takes matching-station source, Pass 3 makes remaining source only-source', () => {
		const src = [
			make({ name: 'Kühlschrank', station: 'Bar', ordered: 1 }),
			make({ name: 'Kühlschrank', station: 'Weinbar', ordered: 1 })
		];
		const tgt = [make({ name: 'Kühlschrank', station: 'Bar' })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(2);
		const matchRow = result.rows.find((r) => r.status === 'match')!;
		const onlySource = result.rows.find((r) => r.status === 'only-source')!;
		expect(matchRow.stationName).toBe('Bar');
		expect(matchRow.srcAggregateCount).toBe(1);
		expect(onlySource.stationName).toBe('Weinbar');
	});

	it('Pass 2 aggregates multiple same-name sources when target station differs from both', () => {
		const src = [
			make({ name: 'Eis', station: 'Bar', ordered: 3, actual: 2 }),
			make({ name: 'Eis', station: 'Küche', ordered: 5, actual: 4 })
		];
		const tgt = [make({ name: 'Eis', station: 'Kassa' })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(1);
		const row = result.rows[0];
		expect(row.status).toBe('match');
		expect(row.srcAggregateCount).toBe(2);
		expect(row.srcOrderedTotal).toBe(8);
		expect(row.srcActualTotal).toBe(6);
	});

	it('produces two clean Pass-1 matches when both sides have identical (name, station) pairs', () => {
		const src = [
			make({ name: 'Kühlschrank', station: 'Bar', ordered: 1 }),
			make({ name: 'Kühlschrank', station: 'Weinbar', ordered: 2 })
		];
		const tgt = [
			make({ name: 'Kühlschrank', station: 'Bar' }),
			make({ name: 'Kühlschrank', station: 'Weinbar' })
		];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(2);
		expect(result.rows.every((r) => r.status === 'match')).toBe(true);
		expect(result.rows.every((r) => r.srcAggregateCount === 1)).toBe(true);
	});

	it('actual-null handling: all-null aggregate is null, mixed sums only non-null', () => {
		const allNull = matchMaterials(
			[
				make({ name: 'X', station: 'A', ordered: 1, actual: null }),
				make({ name: 'X', station: 'B', ordered: 2, actual: null })
			],
			[make({ name: 'X', station: 'C' })]
		);
		expect(allNull.rows[0].srcActualTotal).toBeNull();

		const mixed = matchMaterials(
			[
				make({ name: 'Y', station: 'A', ordered: 1, actual: null }),
				make({ name: 'Y', station: 'B', ordered: 2, actual: 5 })
			],
			[make({ name: 'Y', station: 'C' })]
		);
		expect(mixed.rows[0].srcActualTotal).toBe(5);
	});

	it('name normalization is case-insensitive and trimmed', () => {
		const src = [make({ name: 'Bier 0,5l', station: 'Bar', ordered: 4 })];
		const tgt = [make({ name: ' BIER 0,5L ', station: 'Bar' })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].status).toBe('match');
		expect(result.rows[0].srcOrderedTotal).toBe(4);
	});

	it('treats null and empty-string station as equivalent in Pass 1', () => {
		const src = [make({ name: 'Salz', station: null, ordered: 3 })];
		const tgt = [make({ name: 'Salz', station: '' })];
		const result = matchMaterials(src, tgt);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].status).toBe('match');
		expect(result.rows[0].srcAggregateCount).toBe(1);
	});

	it('groupByName aggregates rowCount and srcOrderedTotal across rows with same name', () => {
		const src = [
			make({ name: 'Kühlschrank', station: 'Bar', ordered: 1 }),
			make({ name: 'Kühlschrank', station: 'Weinbar', ordered: 2 })
		];
		const tgt = [
			make({ name: 'Kühlschrank', station: 'Bar' }),
			make({ name: 'Kühlschrank', station: 'Weinbar' })
		];
		const result = matchMaterials(src, tgt);

		const group = result.groupByName.get('kühlschrank');
		expect(group).toBeDefined();
		expect(group!.rowCount).toBe(2);
		expect(group!.srcOrderedTotal).toBe(3);
	});
});
