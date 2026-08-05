import React from 'react';
import { Ruler } from '@/components/toolkit/Ruler';
import { formatEuro } from '@/lib/money';

export interface SponsoringHeadlineProps {
	/** Geld-Gesamtsumme des Fests. */
	total: number;
	sponsorCount: number;
	/** Sachwert — steht neben dem Geld, nie darin (ADR 0008). */
	inKindTotal: number;
	/**
	 * Geld-Gesamtsumme des vorigen Fests (`getPreviousFestivalTotal()`, #145).
	 * `null` heißt: **Maßband weglassen** — kein Balken, keine Marke und kein
	 * erklärender Satz. Beim ersten Fest ist das der Normalfall (#69, Entscheid 5).
	 */
	previousFestivalTotal: number | null;
}

/**
 * Maßband im Bereichskopf Sponsoring: die Geldsumme groß, darunter das Band
 * gegen das vorige Fest mit der Marke an der Vorjahres-Position.
 */
const SponsoringHeadline: React.FC<SponsoringHeadlineProps> = ({
	total,
	sponsorCount,
	inKindTotal,
	previousFestivalTotal
}) => {
	const subline = [
		`${sponsorCount} ${sponsorCount === 1 ? 'Sponsor' : 'Sponsoren'}`,
		previousFestivalTotal != null ? `Vorjahr ${formatEuro(previousFestivalTotal)}` : null,
		inKindTotal > 0 ? `+ ${formatEuro(inKindTotal)} Sachwert` : null
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className="border-2.5 border-tinte bg-white px-4 py-3">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<span className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
					Sponsoring
				</span>
				<span className="font-display text-[22px] font-semibold leading-none tabular-nums text-gruen">
					{formatEuro(total)}
				</span>
				{previousFestivalTotal != null && (
					<div className="min-w-[120px] flex-1 pt-4">
						<Ruler
							value={total}
							max={Math.max(total, previousFestivalTotal)}
							mark={previousFestivalTotal}
							markLabel="Vorjahr"
							valueText={`${formatEuro(total)}, Vorjahr ${formatEuro(previousFestivalTotal)}`}
						/>
					</div>
				)}
			</div>
			<p className="mt-1.5 text-[11.5px] text-tinte-soft">{subline}</p>
		</div>
	);
};

export default SponsoringHeadline;
