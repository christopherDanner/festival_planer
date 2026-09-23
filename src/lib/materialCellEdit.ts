/** Die Regeln *einer* Zelle der Arbeitsliste (#216/#217, ADR 0013). Reines
Logikmodul ohne React: gerechnet wird in `materialCosts` (ADR 0006), umgerechnet
in `materialQuantity` — hier steht nur, was aus den getippten Zeichen wird und
wohin die Tastatur führt. */

import { grossPrice, netPrice, type MaterialPosition } from './materialCosts';
import { fromBaseQuantity, toBaseQuantity } from './materialQuantity';

/** Die zwei Mengenspalten. Sie stehen für sich, weil nur sie eine Gebinde-
Umrechnung unter dem Feld tragen. */
export type QuantityColumn = 'ordered' | 'consumed';

/** Die drei Spalten, in denen der Preis einer Position erfasst wird (#217). */
export type PriceColumn = 'tax' | 'net' | 'gross';

/** Die fünf tippbaren Zellen der Positionstabelle, in der Reihenfolge, in der
Tab sie abläuft (CONTEXT.md „Zellbearbeitung"). */
export type EditableColumn = QuantityColumn | PriceColumn;

/** Die Mengenspalten in der Reihenfolge der Tabelle. */
const QUANTITY_COLUMNS: QuantityColumn[] = ['ordered', 'consumed'];

/** Alle fünf in der Reihenfolge, in der Tab sie abläuft: Bestellt → Verbraucht
→ MwSt → Netto → Brutto → nächste Zeile (#217). */
const COLUMN_ORDER: EditableColumn[] = [...QUANTITY_COLUMNS, 'tax', 'net', 'gross'];

/** Ob eine Spalte der Positionstabelle eine Mengenspalte ist — sie allein
rechnet in Gebinde um. */
export function isQuantityColumn(column: string): column is QuantityColumn {
	return (QUANTITY_COLUMNS as string[]).includes(column);
}

/** Ob eine Spalte der Positionstabelle in der Zelle getippt wird. Sie steht
hier und nicht bei den Zellen, damit „welche Spalten sind tippbar" genau einmal
festgeschrieben ist. */
export function isEditableColumn(column: string): column is EditableColumn {
	return (COLUMN_ORDER as string[]).includes(column);
}

/** Mengen, Preis und Gebinde — mehr braucht eine Zelle nicht. Die Preisfelder
kommen aus `materialCosts`, damit Zelle und Tabelle denselben Betrag rechnen. */
export interface CellValues extends MaterialPosition {
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

/** Die gespeicherte Menge der Spalte, in Gebinden wie in der Datenbank. Eine
Stelle für „welches Feld gehört zu welcher Spalte" — Zelle, Entwurfsvorschau und
Vergleich fragen sie alle drei. */
export function storedQuantity(column: QuantityColumn, m: CellValues): number | null {
	return column === 'ordered' ? m.ordered_quantity : m.actual_quantity;
}

/** Die geläufigen österreichischen Steuersätze; leer heißt „keine". */
const TAX_RATES = ['', '10', '13', '20'];

/**
 * Die Auswahl der MwSt-Zelle (#217). Ein Satz, der nicht in der Liste steht,
 * kommt dazu — sonst schluckte das Öffnen der Zelle still den erfassten Wert
 * und die Auswahl schriebe einen anderen, als vorher dastand.
 */
export function taxOptions(current: number | null): string[] {
	const rate = current == null ? '' : String(current);
	if (TAX_RATES.includes(rate)) return TAX_RATES;
	return [...TAX_RATES, rate].sort((a, b) => Number(a || 0) - Number(b || 0));
}

/**
 * Was beim Öffnen in der Zelle steht.
 *
 * Mengen in der **Basiseinheit** (Flaschen, Liter), so wie sie auch gelesen
 * dastehen; Preise auf Cent, beide Seiten aus `materialCosts`. Nicht erfasst
 * heißt leer — das ist bei Verbraucht wie beim Preis ein eigener Zustand, keine
 * 0 (CONTEXT.md).
 */
export function cellText(column: EditableColumn, m: CellValues): string {
	switch (column) {
		case 'ordered':
		case 'consumed': {
			const base = toBaseQuantity(storedQuantity(column, m), m);
			return base == null ? '' : String(base);
		}
		case 'tax':
			return m.tax_rate == null ? '' : String(m.tax_rate);
		case 'net':
			return priceText(netPrice(m));
		case 'gross':
			return priceText(grossPrice(m));
	}
}

/** Ein Betrag, wie er im Preisfeld steht: auf Cent, mit Punkt — das Komma nimmt
`read` beim Lesen an. */
function priceText(value: number | null): string {
	return value == null ? '' : value.toFixed(2);
}

/** Leer, eine Zahl — oder Gekritzel, das keine ist. Die drei laufen im
`cellUpdate` auseinander, darum sind sie hier drei Fälle und nicht zwei. */
type Typed = { kind: 'empty' } | { kind: 'number'; value: number } | { kind: 'unreadable' };

/**
 * Was in der Zelle steht, gelesen.
 *
 * Das **Dezimalkomma** zählt: auf einer österreichischen Lieferantenrechnung
 * stehen 2,5 Fass und 2,50 €, und CONTEXT.md nennt angebrochene Gebinde
 * ausdrücklich. Ein verworfenes Komma machte aus 2,5 ein „nicht erfasst" —
 * genau das stille Verwerfen, das ADR 0013 ausschließt.
 */
function read(text: string): Typed {
	const trimmed = text.trim();
	if (trimmed === '') return { kind: 'empty' };
	const value = Number(trimmed.replace(',', '.'));
	return Number.isNaN(value) ? { kind: 'unreadable' } : { kind: 'number', value };
}

/** Was eine gespeicherte Zelle an der Position ändert — genau ein Wert. Der
Preis nimmt seine Quelle mit: welche Seite getippt wurde, *ist* die Angabe
`price_is_net` (ADR 0006). Die Stammdaten bleiben unberührt. */
export type CellUpdate =
	| { ordered_quantity: number }
	| { actual_quantity: number | null }
	| { tax_rate: number | null }
	| { unit_price: number | null; price_is_net: boolean };

/**
 * Der getippte Text als Änderung an der Position.
 *
 * Die zwei Mengenspalten lesen eine **leere** Zelle verschieden (CONTEXT.md):
 * eine Position ohne Bestellmenge ist eine mit 0, eine ohne Verbraucht-Menge
 * ist eine, an der nichts nachgetragen wurde — sie zählt in keinen
 * Verbrauchswert. Eine getippte 0 in Verbraucht heißt dagegen „nichts
 * verbraucht". Ein leeres Preisfeld ist eine *Preislücke*.
 *
 * **Unlesbares** ist etwas Drittes: es steht für den gespeicherten Stand, ist
 * damit keine Änderung und schreibt nichts. Ein Zahlendreher darf die
 * Verbraucht-Menge nicht auf „nicht erfasst" zurücksetzen.
 */
export function cellUpdate(column: EditableColumn, text: string, m: CellValues): CellUpdate {
	const typed = read(text);
	switch (column) {
		case 'ordered':
			if (typed.kind === 'unreadable') return { ordered_quantity: m.ordered_quantity };
			return {
				ordered_quantity: typed.kind === 'empty' ? 0 : fromBaseQuantity(typed.value, m)
			};
		case 'consumed':
			if (typed.kind === 'unreadable') return { actual_quantity: m.actual_quantity };
			return {
				actual_quantity: typed.kind === 'empty' ? null : fromBaseQuantity(typed.value, m)
			};
		case 'tax':
			if (typed.kind === 'unreadable') return { tax_rate: m.tax_rate };
			return { tax_rate: typed.kind === 'empty' ? null : typed.value };
		case 'net':
		case 'gross':
			return priceUpdate(column, typed, text, m);
	}
}

/**
 * Was eine Preiszelle schreibt.
 *
 * Ein **unberührtes** Feld schreibt den gespeicherten Preis zurück, nicht die
 * Zahl, die dort steht: die Zelle zeigt Cent, der gespeicherte Preis kann
 * feiner sein. 41,67 € pro 50-Liter-Fass sind 0,8334 € je Liter — wer an so
 * einer Zeile nur die Verbraucht-Menge nachträgt, hätte sonst nebenbei auf
 * 0,83 € gekürzt und das Fass um 17 Cent verbilligt (#217). Unberührt heißt
 * auch: die Quelle bleibt, wo sie war — die gerechnete Gegenseite legt
 * `price_is_net` nicht um, bloß weil man durch sie hindurchgetabt ist.
 */
function priceUpdate(
	column: 'net' | 'gross',
	typed: Typed,
	text: string,
	m: CellValues
): CellUpdate {
	const untouched = text.trim().replace(',', '.') === cellText(column, m);
	if (untouched || typed.kind === 'unreadable') {
		return { unit_price: m.unit_price, price_is_net: m.price_is_net };
	}
	// Die getippte Seite wird Quelle — sie ist die Zahl, die jemand von einer
	// Rechnung abgelesen hat (CONTEXT.md „Quelle des Preises").
	return {
		unit_price: typed.kind === 'empty' ? null : typed.value,
		price_is_net: column === 'net'
	};
}

/**
 * Ob die Zelle beim Verlassen etwas zu schreiben hat.
 *
 * Verglichen wird, was **gespeichert würde**, gegen das, was steht — nicht der
 * Text gegen den Text: eine geleerte Bestellt-Zelle über einer gespeicherten 0
 * schriebe dieselbe 0 und ist darum keine Änderung, während leer und 0 bei
 * Verbraucht zwei verschiedene Stände sind. Beim Preis zählt auch der Wechsel
 * der Quelle: 50 brutto über einer netto erfassten Position ist dieselbe Zahl
 * mit anderer Bedeutung — ohne Preis sagt die Quelle dagegen nichts aus.
 */
export function isCellDirty(column: EditableColumn, text: string, m: CellValues): boolean {
	const update = cellUpdate(column, text, m) as Record<string, number | boolean | null>;
	if ('price_is_net' in update && update.unit_price == null) {
		return m.unit_price != null;
	}
	return Object.entries(update).some(([field, value]) => !same(value, m[field as keyof CellValues]));
}

/** Zwei Werte sind derselbe, wenn sie auf Centbruchteile übereinstimmen — sonst
erklärte ein Fließkomma-Rest aus der Gebinde-Umrechnung eine unberührte Zelle
für geändert. */
function same(a: unknown, b: unknown): boolean {
	if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
	return a === b;
}

/** Die Position, wie sie mit dem Getippten aussähe. Die Gebinde-Umrechnung
unter dem Feld, die Gegenseite des Preises, Δ und Gesamt rechnen darüber mit,
ohne eine zweite Formel zu bekommen (ADR 0003 §2). */
export function previewCell<T extends CellValues>(
	column: EditableColumn,
	text: string,
	m: T
): T {
	return { ...m, ...cellUpdate(column, text, m) };
}

/** Eine Zelle, benannt wie die Tabelle sie kennt: Position und Spalte. */
export interface CellRef {
	id: string;
	column: EditableColumn;
}

/**
 * Wohin eine Taste führt. `down`/`up` sind Enter und Shift+Enter, `forward`/
 * `back` sind Tab und Shift+Tab — der Rechnungsabgleich arbeitet eine Spalte von
 * oben nach unten ab, das Nachtragen einer ganzen Zeile läuft quer.
 */
export type CellMove = 'down' | 'up' | 'forward' | 'back';

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

	// Tab liest das Gitter zeilenweise: alle tippbaren Zellen hintereinander
	// durchnummeriert, ein Schritt vor oder zurück, dann wieder in Zeile und
	// Spalte zerlegt.
	const width = COLUMN_ORDER.length;
	const step = move === 'forward' ? 1 : -1;
	const seat = row * width + COLUMN_ORDER.indexOf(from.column) + step;
	if (seat < 0 || seat >= ids.length * width) return null;
	return { id: ids[Math.floor(seat / width)], column: COLUMN_ORDER[seat % width] };
}
