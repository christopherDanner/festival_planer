import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';
import { festCountdownCoarse, festYear, formatFestDateRange } from '@/lib/festDates';
import type { FestivalMetrics } from '@/lib/festivalMetrics';
import type { Festival } from '@/lib/festivalService';
import { cn } from '@/lib/utils';
import PosterMenu from './PosterMenu';
import PosterStats from './PosterStats';
import { festivalTitle } from './festivalList';

interface FestivalPosterProps {
	festival: Festival;
	/** `soon` = Papier-Plakat mit gelbem Countdown-Stempel, `past` = getönt mit ERLEDIGT. */
	variant: 'soon' | 'past';
	today: Date;
	/** Kennzahlen des Fests; noch nicht geladen heißt: Zeile entfällt. */
	metrics: FestivalMetrics | undefined;
	onOpen: () => void;
	onUseAsTemplate: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

/**
 * Rang 2 und 3 der Plakatwand: kleines Plakat mit Jahr-Zeile, Namen in
 * Akzentschrift, Datum und Knopfpaar ÖFFNEN / ALS VORLAGE. Der Stempel oben
 * rechts trennt die beiden Ränge — gelber Countdown gegen den grünen ERLEDIGT,
 * bewusst gegenläufig gedreht, damit die Marken nicht verwechselt werden.
 */
export default function FestivalPoster({
	festival,
	variant,
	today,
	metrics,
	onOpen,
	onUseAsTemplate,
	onEdit,
	onDelete
}: FestivalPosterProps) {
	const title = festivalTitle(festival);
	const year = festYear(festival.start_date);
	const dateLine = `${formatFestDateRange(festival.start_date, festival.end_date).toUpperCase()} ${year}`;

	return (
		<div
			className={cn(
				// pt-11 hält die Zeile frei, in der links das ⋮ und rechts der Stempel sitzen
				'relative border-2.5 px-3.5 pb-3.5 pt-11 text-center',
				variant === 'past' ? 'border-tinte-soft bg-papier-getoent' : 'border-tinte bg-white'
			)}>
			<PosterMenu
				festivalName={title}
				onEdit={onEdit}
				onDelete={onDelete}
				className="absolute left-0.5 top-0.5"
			/>
			{variant === 'past' ? (
				<Stamp
					tone="green"
					size="sm"
					tilt="right"
					className="absolute right-[-8px] top-2.5 border-2 tracking-[.08em]">
					ERLEDIGT
				</Stamp>
			) : (
				<Stamp
					tone="yellow"
					size="sm"
					tilt="left"
					filled
					className="absolute right-[-8px] top-2.5 border-2 border-tinte tracking-[.07em]">
					{festCountdownCoarse(festival.start_date, today).toUpperCase()}
				</Stamp>
			)}
			<div className="font-display text-[10.5px] font-semibold uppercase tracking-[.12em] text-tinte-soft">
				{year}
			</div>
			<h3 className="font-display mt-1 text-[18px] font-semibold uppercase leading-tight tracking-[.02em] text-tinte">
				{title}
			</h3>
			<div className="font-display text-[12.5px] font-semibold tracking-[.04em] text-tinte-soft">
				{dateLine}
			</div>
			<PosterStats metrics={metrics} tone="grau" />
			<div className="mt-2.5 flex gap-1.5">
				<Button variant="outline" onClick={onOpen} className="h-10 flex-1 px-2 text-[11.5px]">
					ÖFFNEN
				</Button>
				<Button onClick={onUseAsTemplate} className="h-10 flex-1 px-2 text-[11.5px]">
					ALS VORLAGE
				</Button>
			</div>
		</div>
	);
}
