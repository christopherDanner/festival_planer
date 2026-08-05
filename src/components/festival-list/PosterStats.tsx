import type { FestivalMetrics } from '@/lib/festivalMetrics';
import { cn } from '@/lib/utils';
import { festivalStatTexts } from './festivalList';

interface PosterStatsProps {
	/** Kennzahlen des Fests; fehlen sie, entfällt die Zeile ganz. */
	metrics: FestivalMetrics | undefined;
	/** `light` = helle Schrift auf dem grünen Plakat, `muted` = Papier und getönt. */
	tone: 'light' | 'muted';
}

/**
 * Die Kennzahl-Zeile eines Plakats (Issue #92): die Angaben aus
 * `festivalStatTexts`, durch Abstand getrennt wie im Plakat-Rezept. Ist nichts
 * zu sagen — keine Zahlen geladen oder alle leer —, steht dort nichts.
 */
export default function PosterStats({ metrics, tone }: PosterStatsProps) {
	const texts = festivalStatTexts(metrics);
	if (texts.length === 0) return null;

	return (
		<div
			className={cn(
				'flex flex-wrap justify-center',
				tone === 'light'
					? 'mt-3 gap-4 text-[11.5px] text-papier/90'
					: 'mt-2.5 gap-3.5 text-[11px] text-tinte-soft'
			)}>
			{texts.map((text) => (
				<span key={text}>{text}</span>
			))}
		</div>
	);
}
