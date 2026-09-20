/** Die Regeln des Zeilenmodus als reine Logik (#116, Regeln aus #115): was eine
geöffnete Zeile hält, wie Netto und Brutto einander mitrechnen, was Speichern
übernimmt und wann „geändert" gilt.

Ohne React, damit die Karte am Handy (#116) und die Tabellenzeile am Desktop
(#115) *dieselben* Regeln tragen — zwei Fassungen liefen unweigerlich
auseinander. Gerechnet wird weiter in `materialCosts` (ADR 0006), umgerechnet in
`materialQuantity`, gelesen in `materialRow`; dieses Modul hält nur den
getippten Zwischenstand. */

import { rowTotal, type MaterialPrice } from './materialCosts';
import { formatRequiredPackaging, fromBaseQuantity, toBaseQuantity } from './materialQuantity';
import { deltaCell, type DeltaTone, type RowQuantities } from './materialRow';

/** Was der Zeilenmodus an einer Position braucht — strukturell, damit auch
Testfixtures ohne DB-Felder reichen. */
export interface EditableRow extends MaterialPrice, RowQuantities {}

/** Die fünf tippbaren Werte einer Zeile als Text — so, wie sie im Feld stehen.
Text und nicht Zahl: „2," ist ein gültiger Zwischenstand, `NaN` wäre keiner.

`priceSource` merkt sich die **zuletzt getippte** Preisseite. Sie bleibt Quelle,
wenn der Steuersatz wechselt, und sie ist es, die gespeichert wird (#115). */
export interface RowDraft {
	/** Bestellt-Menge in Basiseinheiten. */
	ordered: string;
	/** Verbraucht-Menge in Basiseinheiten; leer heißt „nicht erfasst". */
	consumed: string;
	/** Steuersatz in Prozent; leer heißt „keine". */
	taxRate: string;
	net: string;
	gross: string;
	priceSource: 'net' | 'gross';
}

/** Die tippbaren Felder einer Zeile. Material, Lieferant, Gebinde, Δ und Gesamt
bleiben lesend (#115) — sie stehen darum nicht hier. */
export type RowField = 'ordered' | 'consumed' | 'taxRate' | 'net' | 'gross';

/** Was `rowDraftUpdates` an die Position schreibt — alle fünf Werte in einem Zug. */
export interface RowDraftUpdates {
	ordered_quantity: number;
	actual_quantity: number | null;
	tax_rate: number | null;
	unit_price: number | null;
	price_is_net: boolean;
}

/** Eine offene Zeile: ihr Entwurf und die Position, aus der er stammt. Die
beiden reisen überall zusammen — einzeln ist keiner von beiden zu gebrauchen. */
export interface OpenRowDraft<T extends EditableRow = EditableRow> {
	draft: RowDraft;
	row: T;
}

/** Was die Karte neben den Feldern zeigt, während getippt wird. */
export interface RowDraftPreview {
	delta: { text: string; tone: DeltaTone };
	/** Kosten der Zeile aus den getippten Werten; ohne Preis `null`. */
	total: number | null;
	/** „6 × Fass" unter den Mengenfeldern; ohne Gebinde `null`. */
	orderedPackaging: string | null;
	consumedPackaging: string | null;
}

/** Öffnet eine Zeile: die gespeicherten Werte als Text, Mengen in
Basiseinheiten — getippt wird in Litern, gespeichert in Fässern. */
export function startRowDraft(row: EditableRow): RowDraft {
	const price = priceFields(row.unit_price, row.tax_rate, row.price_is_net);
	return {
		ordered: formatNumber(toBaseQuantity(row.ordered_quantity, row)),
		consumed: formatNumber(toBaseQuantity(row.actual_quantity, row)),
		taxRate: row.tax_rate == null ? '' : String(row.tax_rate),
		...price,
		priceSource: row.price_is_net ? 'net' : 'gross'
	};
}

/**
 * Ein Tastendruck in einem der fünf Felder. Mengen stehen für sich; die
 * Preisseiten rechnen einander über die MwSt **derselben Zeile** mit (#115):
 *
 * - Netto getippt → Brutto folgt, Quelle ist Netto; Brutto getippt umgekehrt.
 * - MwSt gewechselt → die zuletzt getippte Seite bleibt Quelle, die andere
 *   rechnet neu.
 * - MwSt „keine" → beide Felder zeigen denselben Wert.
 */
export function editRowDraft(draft: RowDraft, field: RowField, value: string): RowDraft {
	switch (field) {
		case 'ordered':
		case 'consumed':
			return { ...draft, [field]: value };
		case 'taxRate':
			return couple({ ...draft, taxRate: value }, draft.priceSource);
		case 'net':
			return couple({ ...draft, net: value }, 'net');
		case 'gross':
			return couple({ ...draft, gross: value }, 'gross');
	}
}

/** Rechnet die *nicht* getippte Preisseite aus der Quelle und dem Steuersatz. */
function couple(draft: RowDraft, source: 'net' | 'gross'): RowDraft {
	const typed = parseNumber(source === 'net' ? draft.net : draft.gross);
	const factor = taxFactor(parseNumber(draft.taxRate));
	// Ein geleertes Preisfeld löscht den Preis — dann steht auch die andere
	// Seite leer, sonst behauptete sie einen Betrag, den es nicht mehr gibt.
	const derived = typed == null ? '' : formatPrice(source === 'net' ? typed * factor : typed / factor);

	return source === 'net'
		? { ...draft, gross: derived, priceSource: 'net' }
		: { ...draft, net: derived, priceSource: 'gross' };
}

/** Δ, Gesamt und die Gebinde-Umrechnung aus dem getippten Zwischenstand —
alles, was neben den Feldern mitlaufen muss, während getippt wird. */
export function rowDraftPreview(draft: RowDraft, row: EditableRow): RowDraftPreview {
	const updates = rowDraftUpdates(draft, row);
	const stored = { ...row, ...updates };

	return {
		delta: deltaCell(stored),
		total: rowTotal(stored),
		orderedPackaging: formatRequiredPackaging(updates.ordered_quantity, row),
		consumedPackaging: formatRequiredPackaging(updates.actual_quantity, row)
	};
}

/** Was Speichern übernimmt: Bestellt, Verbraucht, MwSt, Preis **und**
`price_is_net` in einem Zug (#115). Mengen gehen in die gespeicherte Einheit
zurück; ein geleertes Verbraucht-Feld heißt „nicht erfasst", ein geleertes
Bestellt-Feld heißt 0 — eine Bestellmenge gibt es immer. */
export function rowDraftUpdates(draft: RowDraft, row: EditableRow): RowDraftUpdates {
	const ordered = parseNumber(draft.ordered);
	const consumed = parseNumber(draft.consumed);
	const source = draft.priceSource === 'net' ? draft.net : draft.gross;

	return {
		ordered_quantity: ordered == null ? 0 : fromBaseQuantity(ordered, row),
		actual_quantity: consumed == null ? null : fromBaseQuantity(consumed, row),
		tax_rate: parseNumber(draft.taxRate),
		unit_price: parseNumber(source),
		price_is_net: draft.priceSource === 'net'
	};
}

/**
 * Ob die Karte etwas zu speichern hat. Verglichen wird, was ankäme — nicht der
 * Text: „10" und „10.00" sind derselbe Preis, und eine unberührte Karte darf die
 * Sammel-Fußleiste nicht auf „geändert" stellen.
 *
 * Verglichen wird gegen die **frisch geöffnete** Karte, nicht gegen die
 * gespeicherten Zahlen. Die Felder zeigen Beträge auf Cent und Mengen auf drei
 * Stellen; ein Preis von 0,105 € stünde dort als 0,11 und machte damit jede
 * unberührte Karte sofort „geändert".
 */
export function isRowDraftDirty(draft: RowDraft, row: EditableRow): boolean {
	const next = rowDraftUpdates(draft, row);
	const fresh = rowDraftUpdates(startRowDraft(row), row);
	return (
		!sameNumber(next.ordered_quantity, fresh.ordered_quantity) ||
		!sameNumber(next.actual_quantity, fresh.actual_quantity) ||
		!sameNumber(next.tax_rate, fresh.tax_rate) ||
		!sameNumber(next.unit_price, fresh.unit_price) ||
		next.price_is_net !== fresh.price_is_net
	);
}

/** Die Zahlen der Sammel-Fußleiste: „n Karten offen, davon m geändert" (#116).
Den Wortlaut trägt die Leiste selbst — hier stehen nur die Zahlen. */
export function draftsSummary(open: OpenRowDraft[]): { open: number; dirty: number } {
	return {
		open: open.length,
		dirty: open.filter(({ draft, row }) => isRowDraftDirty(draft, row)).length
	};
}

/* ------------------------------------------------------------------ */
/*  Text ⇄ Zahl                                                        */
/* ------------------------------------------------------------------ */

/** Die beiden Preisfelder aus dem gespeicherten Preis. Gerechnet wird über
`materialCosts`, damit die Felder dieselben Beträge zeigen wie die Tabelle. */
function priceFields(
	unitPrice: number | null,
	taxRate: number | null,
	priceIsNet: boolean
): { net: string; gross: string } {
	if (unitPrice == null) return { net: '', gross: '' };
	const factor = taxFactor(taxRate);
	return priceIsNet
		? { net: formatPrice(unitPrice), gross: formatPrice(unitPrice * factor) }
		: { net: formatPrice(unitPrice / factor), gross: formatPrice(unitPrice) };
}

/** 1 + MwSt/100; ohne Steuersatz 1 — dann sind Netto und Brutto derselbe Betrag. */
function taxFactor(taxRate: number | null): number {
	return taxRate == null ? 1 : 1 + taxRate / 100;
}

/** Nimmt auch das Dezimalkomma an: am Handy liegt es auf der Taste. Leerer oder
unvollständiger Text ist kein Wert, nicht 0. */
function parseNumber(value: string): number | null {
	const trimmed = value.trim().replace(',', '.');
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

/** Eine Menge im Eingabefeld: ohne Fließkomma-Rest und mit Punkt, weil das Feld
ein Zahlenfeld ist. */
function formatNumber(value: number | null): string {
	return value == null ? '' : String(Math.round(value * 1000) / 1000);
}

/** Die mitgerechnete Preisseite steht auf Cent — sie ist ein Betrag, kein
Zwischenstand. */
function formatPrice(value: number): string {
	return value.toFixed(2);
}

/** Zwei Werte sind derselbe, wenn sie auf Centbruchteile übereinstimmen —
sonst erklärte ein Fließkomma-Rest eine unberührte Karte für geändert. */
function sameNumber(a: number | null, b: number | null): boolean {
	if (a == null || b == null) return a == b;
	return Math.abs(a - b) < 1e-9;
}
