/** Der Entwurf einer Zeile im Zeilenmodus (#115). Reines Logikmodul ohne React:
gerechnet wird in `materialCosts` (ADR 0006), umgerechnet in `materialQuantity`
— hier steht nur, was der Entwurf aus den getippten Zeichen macht. */

import { grossPrice, netPrice, roundEuro } from './materialCosts';
import { fromBaseQuantity, toBaseQuantity } from './materialQuantity';

/** Die fünf tippbaren Felder einer Zeile (#115). Material, Lieferant, Gebinde,
Δ und Gesamt bleiben lesend — Δ und Gesamt rechnen mit. */
export type RowDraftField = 'ordered' | 'actual' | 'tax' | 'net' | 'gross';

/**
 * Was in den Feldern einer offenen Zeile steht — als Text, so wie getippt.
 * Mengen in **Basiseinheiten** (wie im Dialog), Preise auf Cent.
 *
 * `source` ist die zuletzt getippte Preisseite. Sie entscheidet beim Speichern
 * über `price_is_net` und bleibt Quelle, wenn sich die MwSt ändert — damit
 * verschwindet das `price_is_net`-Rätsel aus der Oberfläche: man sieht beide
 * Zahlen und wie sie zusammenhängen.
 */
export interface RowDraft {
	ordered: string;
	actual: string;
	/** Steuersatz als Text; leer heißt „keine" — dann sind Netto und Brutto gleich. */
	tax: string;
	net: string;
	gross: string;
	source: 'net' | 'gross';
}

/** Mengen, Preis und Gebinde einer Position — mehr braucht der Entwurf nicht. */
export type RowDraftMaterial = {
	ordered_quantity: number;
	actual_quantity: number | null;
	unit_price: number | null;
	tax_rate: number | null;
	price_is_net: boolean;
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
};

/** Die geläufigen österreichischen Steuersätze; leer heißt „keine". */
const TAX_RATES = ['', '10', '13', '20'];

/**
 * Die Auswahl des MwSt-Felds. Ein Satz, der nicht in der Liste steht, kommt
 * dazu — sonst schluckte das Öffnen einer Zeile still den erfassten Wert und
 * das Speichern schriebe einen anderen, als vorher dastand.
 */
export function taxOptions(current: number | null): string[] {
	const rate = current == null ? '' : String(current);
	if (TAX_RATES.includes(rate)) return TAX_RATES;
	return [...TAX_RATES, rate].sort((a, b) => Number(a || 0) - Number(b || 0));
}

/** Ein Betrag, wie er im Preisfeld steht: auf Cent, mit Punkt — `<input
type="number">` kennt kein Dezimalkomma. */
function priceText(value: number | null): string {
	return value == null ? '' : value.toFixed(2);
}

function taxOf(draft: Pick<RowDraft, 'tax'>): number | null {
	return draft.tax.trim() === '' ? null : Number(draft.tax);
}

function numberOrNull(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const value = Number(trimmed);
	return Number.isNaN(value) ? null : value;
}

/** Die Gegenseite eines Preises über die MwSt derselben Zeile. */
function counterPrice(value: string, source: 'net' | 'gross', tax: number | null): string {
	const price = numberOrNull(value);
	if (price == null) return '';
	const money = { unit_price: price, tax_rate: tax, price_is_net: source === 'net' };
	return priceText(source === 'net' ? grossPrice(money) : netPrice(money));
}

/** Der Entwurf, mit dem eine Zeile aufgeht: was gespeichert ist, in Feldern. */
export function draftFromMaterial(m: RowDraftMaterial): RowDraft {
	const ordered = toBaseQuantity(m.ordered_quantity, m);
	const actual = toBaseQuantity(m.actual_quantity, m);
	return {
		ordered: ordered == null ? '' : String(ordered),
		actual: actual == null ? '' : String(actual),
		tax: m.tax_rate == null ? '' : String(m.tax_rate),
		net: priceText(netPrice(m)),
		gross: priceText(grossPrice(m)),
		source: m.price_is_net ? 'net' : 'gross'
	};
}

/** Was eine gespeicherte Zeile an der Position ändert — Mengen, Steuersatz,
Preis und seine Basis in einem Zug (#115). Die Stammdaten bleiben unberührt;
sie gehören dem Dialog (#117). */
export type RowUpdate = Pick<
	RowDraftMaterial,
	'ordered_quantity' | 'actual_quantity' | 'tax_rate' | 'unit_price' | 'price_is_net'
>;

/**
 * Der Entwurf als Änderung an der Position.
 *
 * Der **Preis der Quelle** wird gespeichert, nicht die errechnete Gegenseite:
 * so steht in der Datenbank die Zahl, die jemand von einer Rechnung abgelesen
 * hat, und `price_is_net` sagt, welche es war (ADR 0006). Die Mengen gehen in
 * Gebinden zurück, getippt wird in Basiseinheiten.
 */
export function draftUpdate(draft: RowDraft, m: RowDraftMaterial): RowUpdate {
	const orderedBase = numberOrNull(draft.ordered);
	const actualBase = numberOrNull(draft.actual);
	const price = numberOrNull(draft.source === 'net' ? draft.net : draft.gross);
	return {
		// Eine Position ohne Bestellmenge ist keine gelöschte Position, sondern
		// eine mit 0 — `actual_quantity` dagegen heißt leer „nichts nachgetragen".
		ordered_quantity: orderedBase == null ? 0 : fromBaseQuantity(orderedBase, m),
		actual_quantity: actualBase == null ? null : fromBaseQuantity(actualBase, m),
		tax_rate: taxOf(draft),
		unit_price: price,
		price_is_net: draft.source === 'net'
	};
}

/**
 * Die Position, wie sie mit dem Entwurf aussähe. Δ, Gesamt und die
 * Gebinde-Umrechnung rechnen darüber live mit, ohne dass die Tabelle ihre
 * eigene Formel bekäme — gerechnet wird weiter in `materialCosts`,
 * `materialRow` und `materialQuantity`.
 */
export function draftPreview<T extends RowDraftMaterial>(draft: RowDraft, m: T): T {
	return { ...m, ...draftUpdate(draft, m) };
}

/**
 * Ob die offene Zeile etwas ändern würde — was die Sammel-Fußleiste zählt und
 * worüber die Rückfrage beim Sichtwechsel entscheidet (#115).
 *
 * Mengen und Steuersatz vergleichen sich als **Text**: getippt wird in
 * Basiseinheiten, und ein Umweg über Gebinde und zurück ließe eine unberührte
 * Zeile an einem Fließkomma-Rest als geändert erscheinen. Der Preis vergleicht
 * sich dagegen an dem, was gespeichert würde — die Basis zu wechseln ist eine
 * Änderung, auch wenn beide Zahlen stehen bleiben. Ohne erfassten Preis sagt
 * die Basis nichts aus und zählt darum nicht.
 *
 * Verglichen wird der Preis **auf Cent**: das Feld kann nur Cent zeigen, und
 * ein gespeicherter Bruchteil davon (0,8334 € je Liter aus 41,67 € pro Fass)
 * machte sonst jede unberührte Zeile beim Öffnen zur geänderten — samt stillem
 * Zurückrunden durch „ALLE SPEICHERN".
 */
export function isDirty(draft: RowDraft, m: RowDraftMaterial): boolean {
	const saved = draftFromMaterial(m);
	if (draft.ordered !== saved.ordered) return true;
	if (draft.actual !== saved.actual) return true;
	if (draft.tax !== saved.tax) return true;

	const price = draftUpdate(draft, m).unit_price;
	if ((price == null) !== (m.unit_price == null)) return true;
	if (price == null || m.unit_price == null) return false;
	if (roundEuro(price) !== roundEuro(m.unit_price)) return true;
	return (draft.source === 'net') !== m.price_is_net;
}

/**
 * Ein Tastendruck in einem der fünf Felder.
 *
 * Netto und Brutto rechnen sich über die MwSt **derselben Zeile** gegenseitig:
 * die getippte Seite wird Quelle, die andere folgt. Ändert sich die MwSt,
 * bleibt die zuletzt getippte Seite Quelle und die andere rechnet neu — sonst
 * spränge unter der Hand die Zahl, die man gerade selbst eingetragen hat.
 */
export function editDraft(draft: RowDraft, field: RowDraftField, value: string): RowDraft {
	switch (field) {
		case 'net':
			return { ...draft, net: value, source: 'net', gross: counterPrice(value, 'net', taxOf(draft)) };
		case 'gross':
			return { ...draft, gross: value, source: 'gross', net: counterPrice(value, 'gross', taxOf(draft)) };
		case 'tax': {
			const next = { ...draft, tax: value };
			const tax = taxOf(next);
			return draft.source === 'net'
				? { ...next, gross: counterPrice(next.net, 'net', tax) }
				: { ...next, net: counterPrice(next.gross, 'gross', tax) };
		}
		default:
			return { ...draft, [field]: value };
	}
}
