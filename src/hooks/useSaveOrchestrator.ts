import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
	createSaveOrchestrator,
	type CreateOrchestratorOpts,
	type OrchestratorSnapshot
} from '@/lib/materialSaveOrchestrator';

export function useSaveOrchestrator(opts: CreateOrchestratorOpts, resetKey: string) {
	const optsRef = useRef(opts);
	optsRef.current = opts;

	const orchestrator = useMemo(
		() =>
			createSaveOrchestrator({
				get targetFestivalId() {
					return optsRef.current.targetFestivalId;
				},
				get targetStations() {
					return optsRef.current.targetStations;
				},
				onCreate: (payload) => optsRef.current.onCreate(payload),
				onUpdate: (id, qty) => optsRef.current.onUpdate(id, qty),
				getInitialCommitted: (row) => optsRef.current.getInitialCommitted?.(row) ?? null
			}),
		[]
	);

	useEffect(() => {
		orchestrator.reset();
	}, [orchestrator, resetKey]);

	const snapshot: OrchestratorSnapshot = useSyncExternalStore(
		(cb) => orchestrator.subscribe(cb),
		() => orchestrator.getState(),
		() => orchestrator.getState()
	);

	return {
		saveRow: orchestrator.saveRow,
		retry: orchestrator.retry,
		reset: orchestrator.reset,
		statesByKey: snapshot.statesByKey,
		stats: snapshot.stats
	};
}
