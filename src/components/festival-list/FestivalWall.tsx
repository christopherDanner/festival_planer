import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';
import type { FestivalMetricsMap } from '@/lib/festivalMetrics';
import type { Festival } from '@/lib/festivalService';
import FestivalPoster from './FestivalPoster';
import NextFestivalPoster from './NextFestivalPoster';
import type { FestivalWallRanks } from './festivalList';

interface FestivalWallProps {
	/** Eingeräumte Ränge — der Mast braucht dieselbe Rechnung für die Zählzeile. */
	ranks: FestivalWallRanks;
	/** Bezugstag der Countdown-Stempel; derselbe, mit dem die Ränge gerechnet wurden. */
	today: Date;
	/**
	 * Kennzahlen je Fest-ID. Sie hängen der Wand nach: die Plakate stehen sofort,
	 * die Zeile kommt, sobald die Zahlen da sind — und bleibt weg, wenn nicht.
	 */
	metrics: FestivalMetricsMap;
	onOpen: (festival: Festival) => void;
	onUseAsTemplate: (festival: Festival) => void;
	onEdit: (festival: Festival) => void;
	onDelete: (festival: Festival) => void;
	onNewFestival: () => void;
}

/** Rang 1 steht allein auf seiner Zeile — 1.3fr, damit „groß" auch groß aussieht. */
const LEAD_GRID =
	'grid grid-cols-1 items-start gap-4 min-[900px]:grid-cols-[1.3fr_minmax(0,1fr)_minmax(0,1fr)]';
const TRIO_GRID =
	'grid grid-cols-1 items-start gap-4 min-[900px]:grid-cols-[repeat(3,minmax(0,1fr))]';

/**
 * Die Plakatwand des Fest-Einstiegs (Issue #90, Fächer-Variante A „Drei Ränge"):
 * nächstes Fest als großes grünes Plakat, weitere bevorstehende als
 * Papier-Plakate, vergangene getönt. Kein Cap — es sind wenige Feste.
 */
export default function FestivalWall({
	ranks,
	today,
	metrics,
	onOpen,
	onUseAsTemplate,
	onEdit,
	onDelete,
	onNewFestival
}: FestivalWallProps) {
	const { next, soon, past } = ranks;

	if (!next && soon.length === 0 && past.length === 0) {
		return <EmptyWall onNewFestival={onNewFestival} />;
	}

	return (
		<div className="space-y-6">
			{next && (
				<section>
					<SectionHeading className="mb-3">Nächstes Fest</SectionHeading>
					<div className={LEAD_GRID}>
						<NextFestivalPoster
							festival={next}
							today={today}
							metrics={metrics[next.id]}
							onOpen={() => onOpen(next)}
							onEdit={() => onEdit(next)}
							onDelete={() => onDelete(next)}
						/>
					</div>
				</section>
			)}

			{soon.length > 0 && (
				<section>
					<SectionHeading className="mb-3">Weitere bevorstehende Feste</SectionHeading>
					<div className={TRIO_GRID}>
						{soon.map((festival) => (
							<FestivalPoster
								key={festival.id}
								festival={festival}
								variant="soon"
								today={today}
								metrics={metrics[festival.id]}
								onOpen={() => onOpen(festival)}
								onUseAsTemplate={() => onUseAsTemplate(festival)}
								onEdit={() => onEdit(festival)}
								onDelete={() => onDelete(festival)}
							/>
						))}
					</div>
				</section>
			)}

			{past.length > 0 && (
				<section>
					<SectionHeading className="mb-3">Vergangene Feste</SectionHeading>
					<div className={TRIO_GRID}>
						{past.map((festival) => (
							<FestivalPoster
								key={festival.id}
								festival={festival}
								variant="past"
								today={today}
								metrics={metrics[festival.id]}
								onOpen={() => onOpen(festival)}
								onUseAsTemplate={() => onUseAsTemplate(festival)}
								onEdit={() => onEdit(festival)}
								onDelete={() => onDelete(festival)}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

/** Leerzustand: gestrichelter Plakat-Umriss an der Stelle des großen Plakats. */
function EmptyWall({ onNewFestival }: { onNewFestival: () => void }) {
	return (
		<div className={LEAD_GRID}>
			{/* Plakat-Format: derselbe Rahmen und dieselbe Höhe wie das große Plakat,
			nur gestrichelt — es ist der Platz, den das erste Fest einnehmen wird. */}
			<div className="flex min-h-[220px] flex-col items-center justify-center border-2.5 border-dashed border-tinte-soft px-5 py-7 text-center min-[900px]:col-span-2">
				<Stamp tone="red" size="lg" tilt="right">
					NOCH KEIN FEST
				</Stamp>
				<p className="mx-auto mt-4 max-w-[46ch] text-[12.5px] leading-snug text-tinte-soft">
					Leg das erste Fest an — Schichten, Material, Ablauf und Sponsoring hängen daran.
				</p>
				<Button onClick={onNewFestival} className="mt-4 h-10 text-[12.5px]">
					+ ERSTES FEST ANLEGEN
				</Button>
			</div>
		</div>
	);
}
