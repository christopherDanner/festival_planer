import { describe, it, expect, vi } from 'vitest';
import { createSaveOrchestrator } from '../materialSaveOrchestrator';
import type { MatchRow } from '../materialMatcher';
import type { FestivalMaterialWithStation } from '../materialService';

function makeMaterial(overrides: Partial<FestivalMaterialWithStation> & { name: string; id: string }): FestivalMaterialWithStation {
	return {
		id: overrides.id,
		festival_id: 'f-src',
		station_id: null,
		name: overrides.name,
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
		station: null,
		...overrides
	};
}

function makeMatchRow(opts: {
	key: string;
	status: 'match' | 'only-source' | 'only-target';
	name?: string;
	targetId?: string;
	stationName?: string | null;
	sourceMaterial?: FestivalMaterialWithStation;
	targetOrderedQuantity?: number | null;
}): MatchRow {
	const name = opts.name ?? 'Bier';
	const target = opts.targetId
		? makeMaterial({ id: opts.targetId, name, ordered_quantity: opts.targetOrderedQuantity ?? 0 })
		: null;
	return {
		key: opts.key,
		status: opts.status,
		name,
		normalizedName: name.toLowerCase(),
		stationName: opts.stationName ?? null,
		targetMaterial: target,
		sourceMaterials: opts.sourceMaterial ? [opts.sourceMaterial] : [],
		srcOrderedTotal: opts.sourceMaterial?.ordered_quantity ?? null,
		srcActualTotal: opts.sourceMaterial?.actual_quantity ?? null,
		srcAggregateCount: opts.sourceMaterial ? 1 : 0,
		supplier: opts.sourceMaterial?.supplier ?? target?.supplier ?? null,
		category: opts.sourceMaterial?.category ?? target?.category ?? null,
		unit: opts.sourceMaterial?.unit ?? target?.unit ?? 'Stück',
		packagingUnit: opts.sourceMaterial?.packaging_unit ?? target?.packaging_unit ?? null,
		amountPerPackaging: opts.sourceMaterial?.amount_per_packaging ?? target?.amount_per_packaging ?? null,
		targetOrderedQuantity: opts.targetOrderedQuantity ?? null,
		sourceDetails: []
	};
}

describe('createSaveOrchestrator', () => {
	it('calls onUpdate with row id and parsed value, transitions idle→saving→saved', async () => {
		const onUpdate = vi.fn().mockResolvedValue(undefined);
		const onCreate = vi.fn();
		const row = makeMatchRow({ key: 'r1', status: 'match', targetId: 't-1' });

		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate,
			onUpdate
		});

		expect(orch.getState().statesByKey['r1']).toBeUndefined();

		orch.saveRow(row, '5');

		expect(orch.getState().statesByKey['r1']?.status).toBe('saving');
		expect(onUpdate).toHaveBeenCalledWith('t-1', 5);
		expect(onCreate).not.toHaveBeenCalled();

		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['r1']?.status).toBe('saved');
		});
	});

	it('does not call onUpdate or onCreate when value is empty', () => {
		const onUpdate = vi.fn();
		const onCreate = vi.fn();
		const row = makeMatchRow({ key: 'r1', status: 'match', targetId: 't-1' });
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate,
			onUpdate
		});

		orch.saveRow(row, '');
		orch.saveRow(row, '   ');

		expect(onUpdate).not.toHaveBeenCalled();
		expect(onCreate).not.toHaveBeenCalled();
		expect(orch.getState().statesByKey['r1']).toBeUndefined();
	});

	it('does not call save when value is 0 or negative', () => {
		const onUpdate = vi.fn();
		const row = makeMatchRow({ key: 'r1', status: 'match', targetId: 't-1' });
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate: vi.fn(),
			onUpdate
		});

		orch.saveRow(row, '0');
		orch.saveRow(row, '-5');

		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('does not call save when value equals the initially committed value (pre-fill unchanged)', () => {
		const onUpdate = vi.fn();
		const row = makeMatchRow({
			key: 'r1',
			status: 'match',
			targetId: 't-1',
			targetOrderedQuantity: 12
		});
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate: vi.fn(),
			onUpdate,
			getInitialCommitted: (r) => r.targetOrderedQuantity
		});

		orch.saveRow(row, '12');

		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('calls onCreate for only-source row with mapped fields, NULL price fields, and station_id by name match', async () => {
		const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
		const onUpdate = vi.fn();
		const src = makeMaterial({
			id: 's-1',
			name: 'Eis',
			category: 'Tiefkühl',
			supplier: 'Eisfabrik',
			unit: 'kg',
			packaging_unit: 'Sack',
			amount_per_packaging: 5,
			ordered_quantity: 10,
			actual_quantity: 8,
			unit_price: 99,
			tax_rate: 20,
			notes: 'kalt halten',
			station: { id: 's-src-bar', name: 'Bar' }
		});
		const row = makeMatchRow({
			key: 's-1',
			status: 'only-source',
			name: 'Eis',
			stationName: 'Bar',
			sourceMaterial: src
		});

		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [{ id: 's-tgt-bar', name: 'Bar' }],
			onCreate,
			onUpdate
		});

		orch.saveRow(row, '7');

		expect(onUpdate).not.toHaveBeenCalled();
		expect(onCreate).toHaveBeenCalledTimes(1);
		const payload = onCreate.mock.calls[0][0];
		expect(payload).toMatchObject({
			festival_id: 'f-tgt',
			name: 'Eis',
			category: 'Tiefkühl',
			supplier: 'Eisfabrik',
			unit: 'kg',
			packaging_unit: 'Sack',
			amount_per_packaging: 5,
			notes: 'kalt halten',
			ordered_quantity: 7,
			actual_quantity: null,
			unit_price: null,
			tax_rate: null,
			price_is_net: true,
			price_per: 'unit',
			station_id: 's-tgt-bar'
		});

		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['s-1']?.status).toBe('saved');
		});
	});

	it('sets station_id to null when source station name has no target match', () => {
		const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
		const src = makeMaterial({
			id: 's-1',
			name: 'Salz',
			station: { id: 's-src-küche', name: 'Küche' }
		});
		const row = makeMatchRow({
			key: 's-1',
			status: 'only-source',
			name: 'Salz',
			stationName: 'Küche',
			sourceMaterial: src
		});

		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [{ id: 's-tgt-bar', name: 'Bar' }],
			onCreate,
			onUpdate: vi.fn()
		});

		orch.saveRow(row, '3');

		expect(onCreate.mock.calls[0][0].station_id).toBeNull();
	});

	it('uses onUpdate (not onCreate) on second save of an only-source row after create succeeded', async () => {
		const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
		const onUpdate = vi.fn().mockResolvedValue(undefined);
		const src = makeMaterial({ id: 's-1', name: 'Eis' });
		const row = makeMatchRow({
			key: 's-1',
			status: 'only-source',
			name: 'Eis',
			sourceMaterial: src
		});
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate,
			onUpdate
		});

		orch.saveRow(row, '5');
		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['s-1']?.status).toBe('saved');
		});

		orch.saveRow(row, '8');

		expect(onCreate).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledWith('new-1', 8);
	});

	it('transitions saving→error and captures error message on rejection', async () => {
		const onUpdate = vi.fn().mockRejectedValue(new Error('DB explodiert'));
		const row = makeMatchRow({ key: 'r1', status: 'match', targetId: 't-1' });
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate: vi.fn(),
			onUpdate
		});

		orch.saveRow(row, '4');

		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['r1']?.status).toBe('error');
		});
		expect(orch.getState().statesByKey['r1']?.error).toBe('DB explodiert');
	});

	it('retry re-issues the save with the same value, succeeds the second time', async () => {
		const onUpdate = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(undefined);
		const row = makeMatchRow({ key: 'r1', status: 'match', targetId: 't-1' });
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate: vi.fn(),
			onUpdate
		});

		orch.saveRow(row, '4');
		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['r1']?.status).toBe('error');
		});

		orch.retry(row);

		expect(onUpdate).toHaveBeenCalledTimes(2);
		expect(onUpdate).toHaveBeenLastCalledWith('t-1', 4);
		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['r1']?.status).toBe('saved');
		});
	});

	it('reset() clears states, committed values, and created IDs', async () => {
		const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
		const onUpdate = vi.fn().mockResolvedValue(undefined);
		const src = makeMaterial({ id: 's-1', name: 'Eis' });
		const row = makeMatchRow({
			key: 's-1',
			status: 'only-source',
			name: 'Eis',
			sourceMaterial: src
		});
		const orch = createSaveOrchestrator({
			targetFestivalId: 'f-tgt',
			targetStations: [],
			onCreate,
			onUpdate
		});

		orch.saveRow(row, '5');
		await vi.waitFor(() => {
			expect(orch.getState().statesByKey['s-1']?.status).toBe('saved');
		});

		orch.reset();

		expect(orch.getState().statesByKey).toEqual({});

		// Saving the same row again must go through onCreate (created-id forgotten)
		orch.saveRow(row, '5');
		expect(onCreate).toHaveBeenCalledTimes(2);
		expect(onUpdate).not.toHaveBeenCalled();
	});
});
