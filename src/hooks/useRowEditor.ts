import { useMemo, useRef, useSyncExternalStore } from 'react';
import {
	createRowEditor,
	type CreateRowEditorOpts,
	type RowEditorSnapshot
} from '@/lib/materialRowEditor';

/**
 * Bindet den Zeilenmodus (`materialRowEditor`) an React — dasselbe Muster wie
 * `useSaveOrchestrator` für die Übernahme: der Store lebt über Renderzyklen
 * hinweg, `useSyncExternalStore` holt seinen Stand.
 *
 * `onSave` darf sich bei jedem Render ändern (react-query gibt neue
 * Mutationen); der Store bekommt darum nur einen Zeiger darauf.
 */
export function useRowEditor(opts: CreateRowEditorOpts) {
	const optsRef = useRef(opts);
	optsRef.current = opts;

	const editor = useMemo(
		() =>
			createRowEditor({
				onSave: (id, update) => optsRef.current.onSave(id, update),
				flashMs: optsRef.current.flashMs
			}),
		[]
	);

	const snapshot: RowEditorSnapshot = useSyncExternalStore(
		(cb) => editor.subscribe(cb),
		() => editor.getState(),
		() => editor.getState()
	);

	return { editor, snapshot };
}
