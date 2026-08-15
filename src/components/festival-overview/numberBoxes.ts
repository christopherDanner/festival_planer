/** Ableitungen für die „Zahlen"-Spalte des Dashboards (DESIGN-VISION §5, Fächer
Variante C). Reine Logik ohne React — vier Kennzahl-Kästen: Schichten besetzt,
Material bestellt-€, Verbraucht-€ (Ist) und Sponsoring. Alle Werte rechnen aus
den bereits geladenen Fest-Daten; die Summenlogik fürs Sponsoring bleibt in
`sponsoringTotals` (keine Doppelung). */

import { formatEuro } from '@/lib/money';
import type { Station, StationShift, ShiftAssignment, StationMember } from '@/lib/shiftService';
import type { FestivalMaterial } from '@/lib/materialService';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import { statusColor, type AmpelStatus } from '@/components/toolkit/status';
import { festivalInKindTotal, festivalSponsoringTotal } from '@/lib/sponsoringTotals';
import {
	consumedDelta,
	consumedValue,
	orderedValue,
	withoutPrice
} from '@/lib/materialCosts';

// --- Schichten besetzt -------------------------------------------------------

export interface ShiftsMetric {
	/** Besetzte Plätze (pro Station auf Soll gekappt, keine Überbesetzung). */
	besetzt: number;
	/** Soll-Plätze über alle Stationen/Schichten. */
	gesamt: number;
	/** Fehlende Plätze = gesamt − besetzt. */
	fehlen: number;
	/** Ampel-Logik (leer/teil/voll → rot/gelb/grün). */
	status: AmpelStatus;
	/** Kein Soll vorhanden (keine Stationen/Schichten) → Leerzustand. */
	isEmpty: boolean;
}

/** Soll/Ist einer einzelnen Station: mit Schichten die Schicht-Summe, sonst
die Stations-Ebene (required_people gegen zugeteilte StationMembers). */
function stationStaffing(
	station: Station,
	shifts: StationShift[],
	assignments: ShiftAssignment[],
	stationMembers: StationMember[]
): { required: number; assigned: number } {
	const stationShifts = shifts.filter((s) => s.station_id === station.id);
	if (stationShifts.length === 0) {
		const assigned = stationMembers.filter((sm) => sm.station_id === station.id).length;
		return { required: station.required_people, assigned };
	}
	const required = stationShifts.reduce((sum, s) => sum + s.required_people, 0);
	const shiftIds = new Set(stationShifts.map((s) => s.id));
	const assigned = assignments.filter((a) => shiftIds.has(a.station_shift_id)).length;
	return { required, assigned };
}

export function deriveShiftsMetric(
	stations: Station[],
	shifts: StationShift[],
	assignments: ShiftAssignment[],
	stationMembers: StationMember[]
): ShiftsMetric {
	let besetzt = 0;
	let gesamt = 0;
	for (const station of stations) {
		const { required, assigned } = stationStaffing(station, shifts, assignments, stationMembers);
		gesamt += required;
		besetzt += Math.min(assigned, required); // Überbesetzung nicht mitzählen
	}
	const fehlen = Math.max(0, gesamt - besetzt);
	return { besetzt, gesamt, fehlen, status: statusColor(besetzt, gesamt), isEmpty: gesamt === 0 };
}

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
	/**
	 * Sachwert des Fests — zweite Zahl neben dem Geld, nie darin (ADR 0008).
	 * Dieselbe Funktion wie der Bereichskopf und der Tabellenfuß rechnen, damit
	 * der Sprung vom Kasten in den Bereich nicht wie ein Rechenfehler aussieht.
	 */
	inKindTotal: number;
	/** Leerzustand hängt an der Sponsoren-Anzahl, nicht an den Beträgen. */
	isEmpty: boolean;
}

export function deriveSponsoringMetric(sponsorings: SponsoringWithDetails[]): SponsoringMetric {
	return {
		total: festivalSponsoringTotal(sponsorings),
		count: sponsorings.length,
		inKindTotal: festivalInKindTotal(sponsorings),
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
