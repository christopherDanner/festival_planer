/** Ableitungen für die „Zahlen"-Spalte des Dashboards (DESIGN-VISION §5, Fächer
Variante C). Reine Logik ohne React — vier Kennzahl-Kästen: Schichten besetzt,
Material bestellt-€, Verbraucht-€ (Ist) und Sponsoring. Alle Werte rechnen aus
den bereits geladenen Fest-Daten; die Summenlogik fürs Sponsoring bleibt in
`sponsoringTotals`, die Besetzung in `staffing` (keine Doppelung). */

import { formatEuro } from '@/lib/money';
import type { FestivalMaterial } from '@/lib/materialService';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import { festivalSponsoringTotal } from '@/lib/sponsoringTotals';
import {
	consumedDelta,
	consumedValue,
	orderedValue,
	withoutPrice
} from '@/lib/materialCosts';

// --- Material bestellt -------------------------------------------------------

export interface MaterialOrderedMetric {
	/** Bestellwert € = Σ(Bestellt-Menge × Bruttopreis) über bepreiste Positionen. */
	total: number;
	positions: number;
	/** Positionen ohne Preis (rot, wenn > 0). */
	withoutPrice: number;
	/** Positionen mit Preis — Maßband value gegen positions als max. */
	withPrice: number;
	isEmpty: boolean;
}

export function deriveMaterialOrdered(materials: FestivalMaterial[]): MaterialOrderedMetric {
	const positions = materials.length;
	const gaps = withoutPrice(materials);
	return {
		total: orderedValue(materials),
		positions,
		withoutPrice: gaps,
		withPrice: positions - gaps,
		isEmpty: positions === 0
	};
}

// --- Verbraucht (Ist) --------------------------------------------------------

export interface MaterialConsumedMetric {
	/** Verbrauchswert € = Σ(Verbraucht-Menge × Bruttopreis) über erfasste Positionen. */
	consumed: number;
	/** Bestellwert € (Referenz für Δ) — dieselbe Zahl wie „Material bestellt". */
	ordered: number;
	/** Δ = verbraucht − bestellt (negativ = unter Plan, positiv = über Plan). */
	delta: number;
	/** Positionen mit gesetzter actual_quantity. */
	recorded: number;
	positions: number;
	isEmpty: boolean;
}

export function deriveMaterialConsumed(materials: FestivalMaterial[]): MaterialConsumedMetric {
	const consumed = consumedValue(materials);
	const ordered = orderedValue(materials);
	const recorded = materials.filter((m) => m.actual_quantity != null).length;
	const positions = materials.length;
	return {
		consumed,
		ordered,
		delta: consumedDelta(materials),
		recorded,
		positions,
		isEmpty: positions === 0
	};
}

// --- Sponsoring --------------------------------------------------------------

export interface SponsoringMetric {
	/** €-Summe des eingeworbenen Sponsorings (sponsoringTotals). */
	total: number;
	count: number;
	isEmpty: boolean;
}

export function deriveSponsoringMetric(sponsorings: SponsoringWithDetails[]): SponsoringMetric {
	return {
		total: festivalSponsoringTotal(sponsorings),
		count: sponsorings.length,
		isEmpty: sponsorings.length === 0
	};
}

// --- Formatierung ------------------------------------------------------------

export type DeltaTone = 'under' | 'over' | 'equal';

/** Δ-Zeile für „Verbraucht": Vorzeichen + Betrag, farbcodiert
(unter Plan = grün, über Plan = rot). */
export function formatDeltaEuro(delta: number): { text: string; tone: DeltaTone } {
	if (delta === 0) return { text: 'Δ € 0', tone: 'equal' };
	const sign = delta < 0 ? '−' : '+';
	return { text: `Δ ${sign} ${formatEuro(Math.abs(delta))}`, tone: delta < 0 ? 'under' : 'over' };
}
