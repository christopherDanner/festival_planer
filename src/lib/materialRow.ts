/** Die Lesefakten einer Zeile der Positionstabelle (#114). Reines Logikmodul
ohne React: die Tabelle malt, gerechnet wird in `materialCosts` (ADR 0006) und
umgerechnet in `materialQuantity`. */

import { ceilToPackaging, toBaseQuantity } from './materialQuantity';

/** Gebinde-Angaben einer Position — strukturell, damit auch Teilobjekte reichen. */
interface Packaged {
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

/** Mengen einer Position samt ihrem Gebinde. */
export interface RowQuantities extends Packaged {
	ordered_quantity: number;
	actual_quantity: number | null;
}

/**
 * MwSt-Spalte: „10 %" oder „keine". Ohne Steuersatz sind Netto- und
 * Bruttospalte derselbe Betrag (CONTEXT.md, Entscheid in #114) — das Wort sagt
 * warum, eine leere Zelle sähe nach fehlender Angabe aus.
 */
export function taxLabel(m: { tax_rate: number | null }): string {
	return m.tax_rate == null ? 'keine' : `${m.tax_rate} %`;
}

/**
 * Die Gebinde-Umrechnung unter einer Menge: „→ 4 × Fass". Sie bleibt in der
 * Tabelle, obwohl die Vision sie nicht erwähnt — beim Bestellen braucht man die
 * Gebindezahl, nicht die Stückzahl (#114). Aufgerundet wird in
 * `ceilToPackaging`: ein angebrochenes Fass wird trotzdem geliefert.
 *
 * `formatRequiredPackaging` sagt dasselbe für die alte Übernahme-Maske; hier
 * steht der Wortlaut der Plakat-Tabelle, die Rundungsregel teilen sich beide.
 */
export function packagingHint(stored: number | null, m: Packaged): string | null {
	if (!m.packaging_unit || !m.amount_per_packaging) return null;
	const packages = ceilToPackaging(stored, m);
	return packages == null ? null : `→ ${packages} × ${m.packaging_unit}`;
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
	// Auf zwei Stellen, sonst steht 0,3 − 0,1 als 0.19999999999999998 im Feld.
	const diff = Math.round((actual - ordered) * 100) / 100;

	if (diff > 0) return { text: `+${diff}`, tone: 'over' };
	if (diff < 0) return { text: String(diff), tone: 'under' };
	return { text: '±0', tone: 'zero' };
}
