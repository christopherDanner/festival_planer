/** Die Regeln *einer* Mengenzelle der Arbeitsliste (#216, ADR 0013). Reines
Logikmodul ohne React: umgerechnet wird in `materialQuantity`, hier steht nur,
was aus den getippten Zeichen wird und wohin die Tastatur führt. */

import { fromBaseQuantity, toBaseQuantity } from './materialQuantity';

/** Die zwei Mengenspalten, die in der Zelle getippt werden. Preise und MwSt
bleiben vorerst beim Zeilenmodus (Übergang aus #216). */
export type QuantityColumn = 'ordered' | 'consumed';

/** Ob eine Spalte der Positionstabelle in der Zelle getippt wird. Sie steht
hier und nicht bei den Zellen, damit „welche Spalten sind Mengen" genau einmal
festgeschrieben ist. */
export function isQuantityColumn(column: string): column is QuantityColumn {
	return column === 'ordered' || column === 'consumed';
}

/** Mengen samt Gebinde — mehr braucht eine Mengenzelle nicht. */
export interface CellQuantities {
	ordered_quantity: number;
	actual_quantity: number | null;
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

/** Die gespeicherte Menge der Spalte, in Gebinden wie in der Datenbank. Eine
Stelle für „welches Feld gehört zu welcher Spalte" — Zelle, Entwurfsvorschau und
Vergleich fragen sie alle drei. */
export function storedQuantity(column: QuantityColumn, m: CellQuantities): number | null {
	return column === 'ordered' ? m.ordered_quantity : m.actual_quantity;
}

/**
 * Was beim Öffnen im Feld steht: die gespeicherte Menge in der **Basiseinheit**
 * (Flaschen, Liter), so wie sie auch gelesen dasteht. Nicht erfasst heißt leer —
 * das ist bei Verbraucht ein eigener Zustand, kein 0 (CONTEXT.md).
 */
export function cellText(column: QuantityColumn, m: CellQuantities): string {
	const base = toBaseQuantity(storedQuantity(column, m), m);
	return base == null ? '' : String(base);
}

/** Leer, eine Zahl — oder Gekritzel, das keine ist. Die drei laufen im
`cellUpdate` auseinander, darum sind sie hier drei Fälle und nicht zwei. */
type Typed = { kind: 'empty' } | { kind: 'number'; value: number } | { kind: 'unreadable' };

/**
 * Was in der Zelle steht, gelesen.
 *
 * Das **Dezimalkomma** zählt: auf einer österreichischen Lieferantenrechnung
 * stehen 2,5 Fass, und CONTEXT.md nennt angebrochene Gebinde ausdrücklich.
 * Ein verworfenes Komma machte aus 2,5 ein „nicht erfasst" — genau das stille
 * Verwerfen, das ADR 0013 ausschließt.
 */
function read(text: string): Typed {
	const trimmed = text.trim();
	if (trimmed === '') return { kind: 'empty' };
	const value = Number(trimmed.replace(',', '.'));
	return Number.isNaN(value) ? { kind: 'unreadable' } : { kind: 'number', value };
}

/** Was eine gespeicherte Mengenzelle an der Position ändert — genau ein Feld.
Die Stammdaten und die Preise bleiben unberührt. */
export type CellUpdate =
	| { ordered_quantity: number }
	| { actual_quantity: number | null };

/**
 * Der getippte Text als Änderung an der Position, in Gebinden zurückgerechnet.
 *
 * Die zwei Spalten lesen eine **leere** Zelle verschieden (CONTEXT.md): eine
 * Position ohne Bestellmenge ist eine mit 0, eine ohne Verbraucht-Menge ist
 * eine, an der nichts nachgetragen wurde — sie zählt in keinen Verbrauchswert.
 * Eine getippte 0 in Verbraucht heißt dagegen „nichts verbraucht".
 *
 * **Unlesbares** ist etwas Drittes: es steht für den gespeicherten Stand, ist
 * damit keine Änderung und schreibt nichts. Ein Zahlendreher darf die
 * Verbraucht-Menge nicht auf „nicht erfasst" zurücksetzen.
 */
export function cellUpdate(column: QuantityColumn, text: string, m: CellQuantities): CellUpdate {
	const typed = read(text);
	if (typed.kind === 'unreadable') {
		return column === 'ordered'
			? { ordered_quantity: m.ordered_quantity }
			: { actual_quantity: m.actual_quantity };
	}
	const base = typed.kind === 'empty' ? null : typed.value;
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
	return storedQuantity(column, previewCell(column, text, m)) !== storedQuantity(column, m);
}

/** Die Position, wie sie mit dem Getippten aussähe. Die Gebinde-Umrechnung
unter dem Feld rechnet darüber mit, ohne eine zweite Formel zu bekommen —
dasselbe Mittel wie `draftPreview` im Zeilenmodus. */
export function previewCell<T extends CellQuantities>(
	column: QuantityColumn,
	text: string,
	m: T
): T {
	return { ...m, ...cellUpdate(column, text, m) };
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

	// Tab liest das Gitter zeilenweise: alle Mengenzellen hintereinander
	// durchnummeriert, ein Schritt vor oder zurück, dann wieder in Zeile und
	// Spalte zerlegt.
	const width = COLUMN_ORDER.length;
	const step = move === 'forward' ? 1 : -1;
	const seat = row * width + COLUMN_ORDER.indexOf(from.column) + step;
	if (seat < 0 || seat >= ids.length * width) return null;
	return { id: ids[Math.floor(seat / width)], column: COLUMN_ORDER[seat % width] };
}
