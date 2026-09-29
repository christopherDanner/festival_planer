import { useMemo, useRef, useSyncExternalStore } from 'react';
import {
	createAssignmentPicker,
	type AssignmentPickerSnapshot,
	type CreateAssignmentPickerOpts
} from '@/lib/shiftAssignmentPicker';

/**
 * Bindet die Zuteil-Geste (`shiftAssignmentPicker`) an React: der Store lebt
 * über Renderzyklen hinweg, `useSyncExternalStore` holt seinen Stand.
 *
 * Wie bei `useCellEditor` bekommt der Store nur **Zeiger** auf `onAssign` und
 * die Listen: react-query gibt bei jedem Render neue Mutationen und neue
 * Arrays, und zwischen dem Aufnehmen einer Marke und dem Absetzen kann die
 * Liste nachgeladen worden sein — geprüft wird gegen den Stand im Augenblick
 * des Griffs.
 */
export function useAssignmentPicker(opts: CreateAssignmentPickerOpts) {
	const optsRef = useRef(opts);
	optsRef.current = opts;

	const picker = useMemo(
		() =>
			createAssignmentPicker({
				onAssign: (target, helperId, position) =>
					optsRef.current.onAssign(target, helperId, position),
				source: () => optsRef.current.source(),
				pulseMs: optsRef.current.pulseMs
			}),
		[]
	);

	const snapshot: AssignmentPickerSnapshot = useSyncExternalStore(
		(cb) => picker.subscribe(cb),
		() => picker.getState(),
		() => picker.getState()
	);

	return { picker, snapshot };
}
