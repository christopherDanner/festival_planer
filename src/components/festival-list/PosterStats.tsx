import type { FestivalMetrics } from '@/lib/festivalMetrics';
import { cn } from '@/lib/utils';
import { festivalStatTexts } from './festivalList';

interface PosterStatsProps {
	/** Kennzahlen des Fests; fehlen sie, entfällt die Zeile ganz. */
	metrics: FestivalMetrics | undefined;
	/** `hell` = helle Schrift auf dem grünen Plakat, `grau` = Papier und getönt. */
	tone: 'hell' | 'grau';
}

/**
 * Die Kennzahl-Zeile eines Plakats („52 Schichten · 86 Materialien · € 4.850
 * Sponsoring", Issue #92). Sie hängt der Wand nach: solange keine Zahlen da
 * sind — oder alle leer —, steht dort nichts. Kein „0", kein Platzhalter.
 */
export default function PosterStats({ metrics, tone }: PosterStatsProps) {
	const texts = festivalStatTexts(metrics);
	if (texts.length === 0) return null;

	return (
		<div
			className={cn(
				'flex flex-wrap justify-center',
				tone === 'hell' ? 'mt-3 gap-4 text-[11.5px] text-papier/90' : 'mt-2.5 gap-3.5 text-[11px] text-tinte-soft'
			)}>
			{texts.map((text) => (
				<span key={text}>{text}</span>
			))}
		</div>
	);
}
