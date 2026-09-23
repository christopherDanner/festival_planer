/** Die Regeln *einer* Mengenzelle der Arbeitsliste (#216, ADR 0013). Reines
Logikmodul ohne React: umgerechnet wird in `materialQuantity`, hier steht nur,
was aus den getippten Zeichen wird und wohin die Tastatur führt. */

import { fromBaseQuantity, toBaseQuantity } from './materialQuantity';

/** Die zwei Mengenspalten, die in der Zelle getippt werden. Preise und MwSt
bleiben vorerst beim Zeilenmodus (Übergang aus #216). */
export type QuantityColumn = 'ordered' | 'consumed';

/** Mengen samt Gebinde — mehr braucht eine Mengenzelle nicht. */
export interface CellQuantities {
	ordered_quantity: number;
	actual_quantity: number | null;
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

function stored(column: QuantityColumn, m: CellQuantities): number | null {
	return column === 'ordered' ? m.ordered_quantity : m.actual_quantity;
}

/**
 * Was beim Öffnen im Feld steht: die gespeicherte Menge in der **Basiseinheit**
 * (Flaschen, Liter), so wie sie auch gelesen dasteht. Nicht erfasst heißt leer —
 * das ist bei Verbraucht ein eigener Zustand, kein 0 (CONTEXT.md).
 */
export function cellText(column: QuantityColumn, m: CellQuantities): string {
	const base = toBaseQuantity(stored(column, m), m);
	return base == null ? '' : String(base);
}

function numberOrNull(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const value = Number(trimmed);
	return Number.isNaN(value) ? null : value;
}

/** Was eine gespeicherte Mengenzelle an der Position ändert — genau ein Feld.
Die Stammdaten und die Preise bleiben unberührt. */
export type CellUpdate =
	| { ordered_quantity: number }
	| { actual_quantity: number | null };

/**
 * Der getippte Text als Änderung an der Position, in Gebinden zurückgerechnet.
 *
 * Die zwei Spalten lesen eine leere Zelle **verschieden** (CONTEXT.md): eine
 * Position ohne Bestellmenge ist eine mit 0, eine ohne Verbraucht-Menge ist
 * eine, an der nichts nachgetragen wurde — sie zählt in keinen Verbrauchswert.
 * Eine getippte 0 in Verbraucht heißt dagegen „nichts verbraucht".
 */
export function cellUpdate(
	column: QuantityColumn,
	text: string,
	m: CellQuantities
): CellUpdate {
	const base = numberOrNull(text);
	if (column === 'ordered') {
		return { ordered_quantity: base == null ? 0 : fromBaseQuantity(base, m) };
	}
	return { actual_quantity: base == null ? null : fromBaseQuantity(base, m) };
}

/**
 * Ob die Zelle beim Verlassen etwas zu schreiben hat.
 *
 * Verglichen wird, was **gespeichert würde**, gegen das, was steht — nicht der
 * Text gegen den Text: eine geleerte Bestellt-Zelle über einer gespeicherten 0
 * schriebe dieselbe 0 und ist darum keine Änderung, während leer und 0 bei
 * Verbraucht zwei verschiedene Stände sind. Gerundet wird nicht: `cellUpdate`
 * und `cellText` rechnen mit demselben Faktor hin und her.
 */
export function isCellDirty(column: QuantityColumn, text: string, m: CellQuantities): boolean {
	const update = cellUpdate(column, text, m);
	return 'ordered_quantity' in update
		? update.ordered_quantity !== m.ordered_quantity
		: update.actual_quantity !== m.actual_quantity;
}

/** Eine Mengenzelle, benannt wie die Tabelle sie kennt: Position und Spalte. */
export interface CellRef {
	id: string;
	column: QuantityColumn;
}

/**
 * Wohin eine Taste führt. `down`/`up` sind Enter und Shift+Enter, `forward`/
 * `back` sind Tab und Shift+Tab — der Rechnungsabgleich arbeitet eine Spalte von
 * oben nach unten ab, das Nachtragen einer ganzen Zeile läuft quer.
 */
export type CellMove = 'down' | 'up' | 'forward' | 'back';

/** Die Mengenspalten in der Reihenfolge, in der Tab sie abläuft. */
const COLUMN_ORDER: QuantityColumn[] = ['ordered', 'consumed'];

/**
 * Die Zelle, die nach dem Speichern aufgeht — `null` am Rand des Kastens.
 *
 * Kein Umbruch von der letzten in die erste Zeile: wer unten ankommt, ist
 * fertig, und ein Sprung nach oben schriebe die eben getippte Spalte ein zweites
 * Mal an. `ids` sind die **sichtbaren** Zeilen in ihrer Reihenfolge; steht die
 * Zelle nicht mehr darunter, führt die Taste nirgendwohin.
 */
export function nextCell(ids: string[], from: CellRef, move: CellMove): CellRef | null {
	const row = ids.indexOf(from.id);
	if (row < 0) return null;

	if (move === 'down' || move === 'up') {
		const target = ids[row + (move === 'down' ? 1 : -1)];
		return target == null ? null : { id: target, column: from.column };
	}

	const step = move === 'forward' ? 1 : -1;
	const flat = row * COLUMN_ORDER.length + COLUMN_ORDER.indexOf(from.column) + step;
	if (flat < 0 || flat >= ids.length * COLUMN_ORDER.length) return null;
	return {
		id: ids[Math.floor(flat / COLUMN_ORDER.length)],
		column: COLUMN_ORDER[flat % COLUMN_ORDER.length]
	};
}
