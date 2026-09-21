import { OpenSlot } from '@/components/toolkit/OpenSlot';
import type { SponsorHistory } from '@/lib/sponsorHistory';

/**
 * Die Sponsoren-Historie einer Firma als Auszeichnung: „2025 · 3 Feste", das
 * Jahr in der Akzentschrift. Ohne Historie steht die rote gestrichelte Marke —
 * dieselbe Marke ist im ⋮-Slice (#159) die Begründung, warum diese Firma
 * löschbar ist. Ein Fest ohne Datum steuert kein Jahr bei, zählt aber mit; dann
 * bleibt es bei der Anzahl statt einem erfundenen Jahr.
 *
 * Steht hier und nicht in der Tabelle, weil die Handy-Karte (#160) dieselbe
 * Auskunft trägt — eine Regel, eine Stelle (ADR 0003 §2).
 */
export default function SponsorHistoryMark({ history }: { history: SponsorHistory }) {
	if (history.festivalCount === 0) {
		// Dasselbe Rezept wie die rote Lücke im Schichtplan (`OpenSlot`), nur
		// enger gesetzt: in einer Frachtbrief-Zeile darf die Marke die Zeilenhöhe
		// nicht treiben. Nichts zum Anklicken, also `span`.
		return (
			<OpenSlot as="span" className="px-1.5 py-px text-[11px] tracking-[.04em]">
				NOCH NIE
			</OpenSlot>
		);
	}

	const feste = `${history.festivalCount} ${history.festivalCount === 1 ? 'Fest' : 'Feste'}`;
	return (
		<>
			{history.lastYear !== null && (
				<span className="font-display text-[13.5px] font-semibold tracking-[.02em]">
					{history.lastYear}
				</span>
			)}
			<span className="text-[11.5px] text-tinte-soft">
				{history.lastYear !== null ? ' · ' : ''}
				{feste}
			</span>
		</>
	);
}
