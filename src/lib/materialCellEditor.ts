/** Die Zellbearbeitung der Arbeitsliste (#216/#217, ADR 0013) als Zustand ohne
React: welche Zelle offen ist, was darin steht und was ein fehlgeschlagenes
Speichern daraus macht. Store-Muster wie der `materialSaveOrchestrator` der
Übernahme — subscribe/getState, damit die Regeln ohne Browser prüfbar bleiben.
Gerechnet wird in `materialCellEdit`. */

import {
	BASE_UNITS,
	cellText,
	cellUpdate,
	isCellDirty,
	isQuantityColumn,
	nextCell,
	type CellMove,
	type CellRef,
	type CellUpdate,
	type CellValues,
	type EditableColumn,
	type InputUnit,
	type InputUnits
} from './materialCellEdit';

/** Eine Zeile, wie die Zellbearbeitung sie kennt: Mengen, Preis, Gebinde,
Kennung. */
export type CellRow = CellValues & { id: string };

export interface CellEditorSnapshot {
	/** Die offene Zelle — höchstens eine, wie beim Zettel des Sponsorings. */
	editing: CellRef | null;
	/** Was darin steht: Mengen als Text in der Eingabe-Einheit der Spalte, Preise
	auf Cent, MwSt als Prozentzahl (leer = keine). */
	value: string;
	/** Ob darin getippt wurde, seit sie aufging — beim Preis entscheidet das
	über die Quelle und über die Rundung (siehe `materialCellEdit`). */
	touched: boolean;
	/**
	 * Worin die offene Zelle getippt wird (#218) — festgehalten beim Öffnen.
	 * Wer den Text deutet, muss diese Einheit nehmen und nicht die, auf der der
	 * Spaltenkopf inzwischen steht; sonst rechnete die Vorschau anders als das
	 * Speichern. Ohne offene Zelle und in den Preisspalten: Basis.
	 */
	unit: InputUnit;
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
	/**
	 * Die **Eingabe-Einheit je Mengenspalte** (#218), wie die Spaltenköpfe sie
	 * gerade zeigen. Als Geber, nicht als Wert: der Store lebt über Renderzyklen
	 * hinweg, die Wahl liegt in der Arbeitsliste. Ohne Angabe — und ohne Antwort
	 * — wird in der Basiseinheit getippt; dieser Rückfall steht genau hier.
	 */
	units?: () => InputUnits | undefined;
	/** Wie lange der grüne Blitz nach dem Speichern steht (Vision: ~0,9 s). */
	flashMs?: number;
}

export interface CellEditor {
	open: (row: CellRow, column: EditableColumn) => void;
	type: (value: string) => void;
	/**
	 * Speichert die offene Zelle und geht weiter. `move` ist die Taste, die das
	 * Verlassen ausgelöst hat; ohne sie (Klick daneben) schließt die Zelle.
	 *
	 * `from` ist die Zelle, die der Aufrufer zu verlassen glaubt. Das Feld meldet
	 * beim Ausblenden noch einen Blur — ohne diese Angabe machte er die Zelle
	 * wieder zu, die die Taste eben aufgeschlagen hat.
	 */
	commit: (move: CellMove | null, rows: CellRow[], from?: CellRef) => Promise<void>;
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
	// Die Einheit, in der die offene Zelle getippt wird — festgehalten beim
	// Öffnen, wie `origin` auch: was gelesen aufging, muss gleich gedeutet wieder
	// weggeschrieben werden.
	let unit: InputUnit = 'base';
	let value = '';
	let touched = false;
	let saving = false;
	let failed = false;
	// Der Klick auf die nächste Zelle kommt vor dem Ausgang des Speicherns, das
	// sein eigener Blur ausgelöst hat — er wartet hier, bis feststeht, ob die
	// getippte Zelle überhaupt weichen darf.
	let pendingOpen: { row: CellRow; column: EditableColumn } | null = null;
	let cached: CellEditorSnapshot | null = null;

	function notify() {
		cached = null;
		for (const listener of listeners) listener();
	}

	function start(row: CellRow, column: EditableColumn) {
		editing = { id: row.id, column };
		origin = row;
		unit = isQuantityColumn(column) ? (opts.units?.() ?? BASE_UNITS)[column] : 'base';
		value = cellText(column, row, unit);
		touched = false;
		failed = false;
	}

	function close() {
		editing = null;
		origin = null;
		unit = 'base';
		value = '';
		touched = false;
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
			touched = true;
			notify();
		},
		async commit(move, rows, from) {
			if (!editing || !origin || saving) return;
			if (from && (from.id !== editing.id || from.column !== editing.column)) return;
			const cell = editing;
			const row = origin;
			const typed = value;
			const wasTouched = touched;
			const typedUnit = unit;
			const target = move ? nextCell(rows.map((r) => r.id), cell, move) : null;

			if (!isCellDirty(cell.column, typed, row, typedUnit, wasTouched)) {
				go(target, rows);
				notify();
				return;
			}

			const update = cellUpdate(cell.column, typed, row, typedUnit, wasTouched);
			saving = true;
			failed = false;
			notify();
			try {
				await opts.onSave(cell.id, update);
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
			// `rows` ist der Stand vom Tastendruck — das Nachladen der Liste ist noch
			// unterwegs. Die eine Zeile, die sich geändert hat, kennt der Store aber
			// genauer als die Liste: es ist die, die er eben selbst geschrieben hat.
			// Ohne sie stünde in der Brutto-Zelle nach dem Tippen in Netto noch der
			// Preis von vorher, und „die andere Seite rechnet sofort nach" bräche
			// genau dort, wo man hinsieht (#217).
			const saved: CellRow = { ...row, ...update };
			const fresh = (r: CellRow) => (r.id === saved.id ? saved : r);
			// Ein Klick, der während des Speicherns wartete, schlägt die Taste: er
			// nennt die Zelle, die der Bediener wirklich meint.
			const queued = pendingOpen;
			pendingOpen = null;
			if (queued) start(fresh(queued.row), queued.column);
			else go(target, rows.map(fresh));
			notify();
		},
		cancel() {
			if (!editing) return;
			close();
			notify();
		},
		getState() {
			if (cached) return cached;
			cached = { editing, value, touched, unit, saving, failed, savedIds: [...savedIds] };
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
