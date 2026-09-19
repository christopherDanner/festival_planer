/** Der Zeilenmodus der Arbeitsliste (#115) als Zustand ohne React: welche
Zeilen offen sind, was in ihren Feldern steht und welcher Sichtwechsel auf die
Rückfrage wartet. Dasselbe Store-Muster wie der `materialSaveOrchestrator` der
Übernahme — subscribe/getState, damit die Regeln ohne Browser prüfbar bleiben. */

import {
	draftFromMaterial,
	draftUpdate,
	editDraft,
	isDirty,
	type RowDraft,
	type RowDraftField,
	type RowDraftMaterial,
	type RowUpdate
} from './materialRowDraft';

/** Eine Position, wie der Zeilenmodus sie kennt: Mengen, Preis, Gebinde — und
eine Kennung, unter der ihr Entwurf liegt. */
export type EditableRow = RowDraftMaterial & { id: string };

/**
 * Ein Wechsel der Sicht, der offene Änderungen aus dem Bild nähme: Achse,
 * Reiter, Kategorie-Chip oder Suche. Mit ungespeicherten Zeilen wird gewarnt,
 * nicht still verworfen (#115).
 */
export type ViewChange = 'axis' | 'group' | 'category' | 'search';

/** Wie die Rückfrage ausgeht. */
export type GuardAnswer = 'save' | 'discard' | 'back';

export interface RowEditorSnapshot {
	/** Die offenen Zeilen mit ihren Entwürfen, nach Position-ID. */
	draftsById: Record<string, RowDraft>;
	/** Eben gespeicherte Zeilen — sie blitzen kurz grün auf. */
	savedIds: string[];
	/** Zahlen der Sammel-Fußleiste: „n Zeilen offen, davon m geändert". */
	open: number;
	dirty: number;
	/** Der zurückgehaltene Sichtwechsel, solange die Rückfrage offen steht. */
	guard: ViewChange | null;
}

export interface CreateRowEditorOpts {
	/** Schreibt die Zeile weg. Aufgerufen wird nur für **geänderte** Zeilen. */
	onSave: (id: string, update: RowUpdate) => void;
	/** Wie lange der grüne Blitz nach dem Speichern steht (Vision: ~0,9 s). */
	flashMs?: number;
}

export interface RowEditor {
	open: (row: EditableRow) => void;
	openAll: (rows: EditableRow[]) => void;
	edit: (id: string, field: RowDraftField, value: string) => void;
	save: (id: string) => void;
	saveAll: () => void;
	cancel: (id: string) => void;
	cancelAll: () => void;
	/** Eine Sichtänderung anmelden — sie läuft sofort oder nach der Rückfrage. */
	requestViewChange: (change: ViewChange, apply: () => void) => void;
	resolveGuard: (answer: GuardAnswer) => void;
	getState: () => RowEditorSnapshot;
	subscribe: (listener: () => void) => () => void;
}

const DEFAULT_FLASH_MS = 900;

export function createRowEditor(opts: CreateRowEditorOpts): RowEditor {
	const flashMs = opts.flashMs ?? DEFAULT_FLASH_MS;
	const draftsById: Record<string, RowDraft> = {};
	// Der Stand beim Öffnen: woran sich „geändert" misst und woraus die
	// Nutzlast entsteht. Ein Nachladen der Liste darf beides nicht verschieben.
	const originById = new Map<string, EditableRow>();
	const savedIds = new Set<string>();
	const listeners = new Set<() => void>();
	let guard: ViewChange | null = null;
	let pendingChange: (() => void) | null = null;
	let cached: RowEditorSnapshot | null = null;

	function notify() {
		cached = null;
		for (const listener of listeners) listener();
	}

	function close(id: string) {
		delete draftsById[id];
		originById.delete(id);
	}

	function dirtyIds(): string[] {
		return Object.keys(draftsById).filter((id) => {
			const origin = originById.get(id);
			return origin != null && isDirty(draftsById[id], origin);
		});
	}

	function flash(id: string) {
		savedIds.add(id);
		setTimeout(() => {
			savedIds.delete(id);
			notify();
		}, flashMs);
	}

	/** Schreibt die Zeile weg, sofern sie etwas ändert, und schließt sie. Ohne
	Änderung ist das Speichern nur ein Zuklappen — sonst stünde in der Liste ein
	Schreibvorgang, den niemand ausgelöst hat. */
	function commit(id: string) {
		const draft = draftsById[id];
		const origin = originById.get(id);
		if (!draft || !origin) return;
		const changed = isDirty(draft, origin);
		if (changed) opts.onSave(id, draftUpdate(draft, origin));
		close(id);
		if (changed) flash(id);
	}

	function openRow(row: EditableRow) {
		if (draftsById[row.id]) return;
		draftsById[row.id] = draftFromMaterial(row);
		originById.set(row.id, row);
	}

	function clearAll() {
		for (const id of Object.keys(draftsById)) close(id);
	}

	return {
		open(row) {
			openRow(row);
			notify();
		},
		openAll(rows) {
			for (const row of rows) openRow(row);
			notify();
		},
		edit(id, field, value) {
			const draft = draftsById[id];
			if (!draft) return;
			draftsById[id] = editDraft(draft, field, value);
			notify();
		},
		save(id) {
			commit(id);
			notify();
		},
		saveAll() {
			for (const id of Object.keys(draftsById)) commit(id);
			notify();
		},
		cancel(id) {
			close(id);
			notify();
		},
		cancelAll() {
			clearAll();
			notify();
		},
		requestViewChange(change, apply) {
			if (dirtyIds().length === 0) {
				// Unberührte Zeilen gehören zur alten Sicht und gehen mit ihr zu.
				clearAll();
				apply();
				notify();
				return;
			}
			guard = change;
			pendingChange = apply;
			notify();
		},
		resolveGuard(answer) {
			const apply = pendingChange;
			guard = null;
			pendingChange = null;
			if (answer === 'back') {
				notify();
				return;
			}
			if (answer === 'save') {
				for (const id of Object.keys(draftsById)) commit(id);
			} else {
				clearAll();
			}
			apply?.();
			notify();
		},
		getState() {
			if (cached) return cached;
			cached = {
				draftsById: { ...draftsById },
				savedIds: [...savedIds],
				open: Object.keys(draftsById).length,
				dirty: dirtyIds().length,
				guard
			};
			return cached;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
	};
}
