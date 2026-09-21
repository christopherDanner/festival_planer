/** Die Lesefakten einer Zeile der Positionstabelle (#114). Reines Logikmodul
ohne React: die Tabelle malt, gerechnet wird in `materialCosts` (ADR 0006) und
umgerechnet in `materialQuantity`. */

import { formatQuantity, toBaseQuantity } from './materialQuantity';

/** Mengen einer Position samt ihrem Gebinde. */
export interface RowQuantities {
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
	ordered_quantity: number;
	actual_quantity: number | null;
}

/**
 * MwSt-Spalte: „10 %" oder „keine". Ohne Steuersatz sind Netto- und
 * Bruttospalte derselbe Betrag (CONTEXT.md, Entscheid in #114) — das Wort sagt
 * warum, eine leere Zelle sähe nach fehlender Angabe aus. Es steht gedämpft,
 * weil es keine Zahl ist, sondern deren Abwesenheit.
 */
export function taxCell(m: { tax_rate: number | null }): { text: string; muted: boolean } {
	return m.tax_rate == null
		? { text: 'keine', muted: true }
		: { text: `${m.tax_rate} %`, muted: false };
}

/**
 * Wie die Δ-Zelle zu lesen ist: mehr verbraucht als bestellt (`over`, rot),
 * weniger (`under`, grün), Punktlandung (`zero`) oder nichts erfasst (`none`).
 */
export type DeltaTone = 'over' | 'under' | 'zero' | 'none';

/**
 * Δ-Spalte: **Verbraucht − Bestellt** in Basismengen. Mehrverbrauch ist rot —
 * er hat das Fest mehr gekostet als geplant, nicht umgekehrt (#114).
 */
export function deltaCell(m: RowQuantities): { text: string; tone: DeltaTone } {
	if (m.actual_quantity == null) return { text: '–', tone: 'none' };

	const ordered = toBaseQuantity(m.ordered_quantity, m) ?? 0;
	const actual = toBaseQuantity(m.actual_quantity, m) ?? 0;
	// Auf zwei Stellen, sonst entscheidet ein Fließkomma-Rest über das Vorzeichen.
	const diff = Math.round((actual - ordered) * 100) / 100;

	if (diff > 0) return { text: `+${formatQuantity(diff)}`, tone: 'over' };
	if (diff < 0) return { text: formatQuantity(diff), tone: 'under' };
	return { text: '±0', tone: 'zero' };
}
