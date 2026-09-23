/** Die Zellbearbeitung der Mengen (#216, ADR 0013) als Zustand ohne React:
welche Zelle offen ist, was darin steht und was ein fehlgeschlagenes Speichern
daraus macht. Dasselbe Store-Muster wie `materialRowEditor` — subscribe/getState,
damit die Regeln ohne Browser prüfbar bleiben. Gerechnet wird in
`materialCellEdit`. */

import {
	cellText,
	cellUpdate,
	isCellDirty,
	nextCell,
	type CellMove,
	type CellQuantities,
	type CellRef,
	type CellUpdate,
	type QuantityColumn
} from './materialCellEdit';

/** Eine Zeile, wie die Zellbearbeitung sie kennt: Mengen, Gebinde, Kennung. */
export type CellRow = CellQuantities & { id: string };

export interface CellEditorSnapshot {
	/** Die offene Zelle — höchstens eine, wie beim Zettel des Sponsorings. */
	editing: CellRef | null;
	/** Was darin steht, als Text in der Basiseinheit. */
	value: string;
	/** Das Speichern läuft; die Zelle nimmt solange keine Zeichen an. */
	saving: boolean;
	/** Das letzte Speichern ist gescheitert — roter Rand, Wert bleibt stehen. */
	failed: boolean;
	/** Eben gespeicherte Zeilen — der kurze grüne Blitz. */
	savedIds: string[];
}

export interface CreateCellEditorOpts {
	/** Schreibt die Zelle weg. Eine Ablehnung lässt die Zelle offen. */
	onSave: (id: string, update: CellUpdate) => Promise<unknown>;
	/** Wie lange der grüne Blitz nach dem Speichern steht (Vision: ~0,9 s). */
	flashMs?: number;
}

export interface CellEditor {
	open: (row: CellRow, column: QuantityColumn) => void;
	type: (value: string) => void;
	/**
	 * Speichert die offene Zelle und geht weiter. `move` ist die Taste, die das
	 * Verlassen ausgelöst hat; ohne sie (Klick daneben) schließt die Zelle.
	 */
	commit: (move: CellMove | null, rows: CellRow[]) => Promise<void>;
	/** Esc — verwirft **nur** diese Zelle und stellt den gespeicherten Wert her. */
	cancel: () => void;
	getState: () => CellEditorSnapshot;
	subscribe: (listener: () => void) => () => void;
}

const DEFAULT_FLASH_MS = 900;

export function createCellEditor(opts: CreateCellEditorOpts): CellEditor {
	const flashMs = opts.flashMs ?? DEFAULT_FLASH_MS;
	const savedIds = new Set<string>();
	const listeners = new Set<() => void>();
	let editing: CellRef | null = null;
	// Der Stand beim Öffnen: woran sich „geändert" misst und woraus die Nutzlast
	// entsteht. Ein Nachladen der Liste darf beides nicht verschieben.
	let origin: CellRow | null = null;
	let value = '';
	let saving = false;
	let failed = false;
	// Der Klick auf die nächste Zelle kommt vor dem Ausgang des Speicherns, das
	// sein eigener Blur ausgelöst hat — er wartet hier, bis feststeht, ob die
	// getippte Zelle überhaupt weichen darf.
	let pendingOpen: { row: CellRow; column: QuantityColumn } | null = null;
	let cached: CellEditorSnapshot | null = null;

	function notify() {
		cached = null;
		for (const listener of listeners) listener();
	}

	function start(row: CellRow, column: QuantityColumn) {
		editing = { id: row.id, column };
		origin = row;
		value = cellText(column, row);
		failed = false;
	}

	function close() {
		editing = null;
		origin = null;
		value = '';
		failed = false;
		pendingOpen = null;
	}

	function flash(id: string) {
		savedIds.add(id);
		setTimeout(() => {
			savedIds.delete(id);
			notify();
		}, flashMs);
	}

	/** Weiter zur Nachbarzelle — oder zu, wo der Kasten aufhört. */
	function go(target: CellRef | null, rows: CellRow[]) {
		const row = target && rows.find((r) => r.id === target.id);
		if (target && row) start(row, target.column);
		else close();
	}

	return {
		open(row, column) {
			// Eine rote Zelle hält Getipptes, das nirgends steht — sie weicht erst,
			// wenn sie gespeichert oder mit Esc verworfen wurde.
			if (failed) return;
			if (saving) {
				pendingOpen = { row, column };
				return;
			}
			start(row, column);
			notify();
		},
		type(next) {
			if (!editing || saving) return;
			value = next;
			notify();
		},
		async commit(move, rows) {
			if (!editing || !origin || saving) return;
			const cell = editing;
			const row = origin;
			const typed = value;
			const target = move ? nextCell(rows.map((r) => r.id), cell, move) : null;

			if (!isCellDirty(cell.column, typed, row)) {
				go(target, rows);
				notify();
				return;
			}

			saving = true;
			failed = false;
			notify();
			try {
				await opts.onSave(cell.id, cellUpdate(cell.column, typed, row));
			} catch {
				// Nie ein stilles Verwerfen: die Zelle bleibt offen, samt Getipptem —
				// und der wartende Klick verfällt, statt später an ihrer Stelle zu
				// landen.
				saving = false;
				failed = true;
				pendingOpen = null;
				notify();
				return;
			}
			saving = false;
			flash(cell.id);
			// Ein Klick, der während des Speicherns wartete, schlägt die Taste: er
			// nennt die Zelle, die der Bediener wirklich meint.
			const queued = pendingOpen;
			pendingOpen = null;
			if (queued) start(queued.row, queued.column);
			else go(target, rows);
			notify();
		},
		cancel() {
			if (!editing) return;
			close();
			notify();
		},
		getState() {
			if (cached) return cached;
			cached = { editing, value, saving, failed, savedIds: [...savedIds] };
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
