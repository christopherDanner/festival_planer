/** Die Plakat-Kennzahlen des Fest-Einstiegs (Issue #92): drei Zahlen je Fest,
gebündelt über alle Feste der Wand geladen. Der Besetzungs-Anteil („41/52")
gehört bewusst nicht dazu — er hängt am Helfer-pro-Fest-Modell (ADR 0005) und
wird erst im Schichtplan-Bereich nachgezogen. */

import { sponsoringTotal, type SponsoringValue } from '@/lib/sponsoringTotals';

/** Die drei Zahlen eines Plakats. */
export interface FestivalMetrics {
	/** Anzahl Schichten des Fests (`station_shifts`). */
	shifts: number;
	/** Anzahl Material-Positionen des Fests (`festival_materials`). */
	materials: number;
	/** Geldsumme des eingeworbenen Sponsorings (Regel aus `sponsoringTotals`). */
	sponsoring: number;
}

/** Kennzahlen je Fest-ID; ein Fest ohne Eintrag hat (noch) keine Zahlen. */
export type FestivalMetricsMap = Record<string, FestivalMetrics>;

/** Zeile, von der nur die Fest-Zugehörigkeit zählt (Schichten, Materialien). */
export interface FestivalScopedRow {
	festival_id: string;
}

/** Sponsoring-Zeile, so schmal wie die Geldregel es verlangt. */
export type FestivalSponsoringRow = FestivalScopedRow & SponsoringValue;

/** Die drei gebündelt geladenen Zeilenmengen der ganzen Wand. */
export interface FestivalMetricsRows {
	shifts: FestivalScopedRow[];
	materials: FestivalScopedRow[];
	sponsorings: FestivalSponsoringRow[];
}

/**
 * Rechnet die gebündelt geladenen Zeilen auf Kennzahlen je Fest um. Feste ohne
 * eine einzige Zeile tauchen nicht auf — die Zeile entfällt dort ohnehin.
 */
export function buildFestivalMetrics(rows: FestivalMetricsRows): FestivalMetricsMap {
	const metrics: FestivalMetricsMap = {};
	const entry = (festivalId: string): FestivalMetrics =>
		(metrics[festivalId] ??= { shifts: 0, materials: 0, sponsoring: 0 });

	for (const shift of rows.shifts) entry(shift.festival_id).shifts += 1;
	for (const material of rows.materials) entry(material.festival_id).materials += 1;
	for (const sponsoring of rows.sponsorings) {
		entry(sponsoring.festival_id).sponsoring += sponsoringTotal(sponsoring);
	}

	return metrics;
}
