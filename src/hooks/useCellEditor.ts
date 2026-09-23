import { useMemo, useRef, useSyncExternalStore } from 'react';
import {
	createCellEditor,
	type CellEditorSnapshot,
	type CreateCellEditorOpts
} from '@/lib/materialCellEditor';

/**
 * Bindet die Zellbearbeitung (`materialCellEditor`) an React: der Store lebt
 * über Renderzyklen hinweg, `useSyncExternalStore` holt seinen Stand.
 *
 * `onSave` darf sich bei jedem Render ändern (react-query gibt neue
 * Mutationen); der Store bekommt darum nur einen Zeiger darauf.
 */
export function useCellEditor(opts: CreateCellEditorOpts) {
	const optsRef = useRef(opts);
	optsRef.current = opts;

	const editor = useMemo(
		() =>
			createCellEditor({
				onSave: (id, update) => optsRef.current.onSave(id, update),
				flashMs: optsRef.current.flashMs
			}),
		[]
	);

	const snapshot: CellEditorSnapshot = useSyncExternalStore(
		(cb) => editor.subscribe(cb),
		() => editor.getState(),
		() => editor.getState()
	);

	return { editor, snapshot };
}
