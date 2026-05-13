import type { MatchRow } from './materialMatcher';
import type { FestivalMaterial } from './materialService';
import { fromBaseQuantity } from './materialQuantity';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveState {
	status: SaveStatus;
	error?: string;
}

export type CreatePayload = Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>;

export interface OrchestratorStats {
	saved: number;
	saving: number;
	pending: number;
	errors: number;
}

export interface OrchestratorSnapshot {
	statesByKey: Record<string, SaveState>;
	stats: OrchestratorStats;
}

export interface CreateOrchestratorOpts {
	targetFestivalId: string;
	targetStations: { id: string; name: string }[];
	onCreate: (payload: CreatePayload) => Promise<{ id: string }>;
	onUpdate: (id: string, orderedQuantity: number) => Promise<void>;
	getInitialCommitted?: (row: MatchRow) => number | null;
}

export interface SaveOrchestrator {
	saveRow: (row: MatchRow, valueString: string) => void;
	retry: (row: MatchRow) => void;
	reset: () => void;
	getState: () => OrchestratorSnapshot;
	subscribe: (listener: () => void) => () => void;
}

function mapStationId(
	sourceStationName: string | null | undefined,
	targetStations: { id: string; name: string }[]
): string | null {
	if (!sourceStationName) return null;
	const normalized = sourceStationName.trim().toLowerCase();
	const found = targetStations.find((s) => s.name.trim().toLowerCase() === normalized);
	return found ? found.id : null;
}

function buildCreatePayload(
	row: MatchRow,
	value: number,
	targetFestivalId: string,
	targetStations: { id: string; name: string }[]
): CreatePayload {
	const src = row.sourceMaterials[0];
	return {
		festival_id: targetFestivalId,
		name: src?.name ?? row.name,
		category: src?.category ?? null,
		supplier: src?.supplier ?? null,
		unit: src?.unit ?? row.unit,
		packaging_unit: src?.packaging_unit ?? null,
		amount_per_packaging: src?.amount_per_packaging ?? null,
		notes: src?.notes ?? null,
		ordered_quantity: value,
		actual_quantity: null,
		unit_price: null,
		tax_rate: null,
		price_is_net: true,
		price_per: 'unit',
		station_id: mapStationId(src?.station?.name ?? row.stationName, targetStations)
	};
}

export function createSaveOrchestrator(opts: CreateOrchestratorOpts): SaveOrchestrator {
	const statesByKey: Record<string, SaveState> = {};
	const committedByKey = new Map<string, number>();
	const createdIdByKey = new Map<string, string>();
	const lastValueByKey = new Map<string, number>();
	const listeners = new Set<() => void>();
	let cachedSnapshot: OrchestratorSnapshot | null = null;

	function getCommitted(row: MatchRow): number | undefined {
		if (committedByKey.has(row.key)) return committedByKey.get(row.key);
		const initial = opts.getInitialCommitted?.(row);
		if (initial != null && initial > 0) {
			committedByKey.set(row.key, initial);
			return initial;
		}
		return undefined;
	}

	function notify() {
		cachedSnapshot = null;
		for (const l of listeners) l();
	}

	function setState(key: string, state: SaveState) {
		statesByKey[key] = state;
		notify();
	}

	function computeStats(): OrchestratorStats {
		let saved = 0;
		let saving = 0;
		let errors = 0;
		for (const s of Object.values(statesByKey)) {
			if (s.status === 'saved') saved++;
			else if (s.status === 'saving') saving++;
			else if (s.status === 'error') errors++;
		}
		return { saved, saving, pending: 0, errors };
	}

	function saveRow(row: MatchRow, valueString: string) {
		const trimmed = valueString.trim();
		if (trimmed === '') return;
		const num = parseFloat(trimmed);
		if (Number.isNaN(num)) return;
		if (num <= 0) return;
		if (getCommitted(row) === num) return;
		lastValueByKey.set(row.key, num);
		setState(row.key, { status: 'saving' });

		const packagingCount = fromBaseQuantity(num, {
			packaging_unit: row.packagingUnit,
			amount_per_packaging: row.amountPerPackaging
		});

		const createdId = createdIdByKey.get(row.key);
		const useCreate = row.status === 'only-source' && !createdId;

		const onError = (err: unknown) => {
			const message = err instanceof Error ? err.message : String(err);
			setState(row.key, { status: 'error', error: message });
		};

		if (useCreate) {
			const payload = buildCreatePayload(row, packagingCount, opts.targetFestivalId, opts.targetStations);
			opts.onCreate(payload).then(
				(result) => {
					createdIdByKey.set(row.key, result.id);
					committedByKey.set(row.key, num);
					setState(row.key, { status: 'saved' });
				},
				onError
			);
		} else {
			const id = createdId ?? row.targetMaterial!.id;
			opts.onUpdate(id, packagingCount).then(() => {
				committedByKey.set(row.key, num);
				setState(row.key, { status: 'saved' });
			}, onError);
		}
	}

	function retry(row: MatchRow) {
		const last = lastValueByKey.get(row.key);
		if (last == null) return;
		saveRow(row, String(last));
	}
	function reset() {
		for (const key of Object.keys(statesByKey)) delete statesByKey[key];
		committedByKey.clear();
		createdIdByKey.clear();
		lastValueByKey.clear();
		notify();
	}

	return {
		saveRow,
		retry,
		reset,
		getState: () => {
			if (cachedSnapshot) return cachedSnapshot;
			cachedSnapshot = { statesByKey: { ...statesByKey }, stats: computeStats() };
			return cachedSnapshot;
		},
		subscribe: (l) => {
			listeners.add(l);
			return () => listeners.delete(l);
		}
	};
}
