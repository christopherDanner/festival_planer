import { ArrowRight } from 'lucide-react';

import { Stamp } from '@/components/toolkit/Stamp';
import { Button } from '@/components/ui/button';
import { festCountdown, formatFestDateRange } from '@/lib/festDates';
import type { Festival } from '@/lib/festivalService';
import PosterMenu from './PosterMenu';
import { festivalTitle } from './festivalRanks';

interface NextFestivalPosterProps {
	festival: Festival;
	today: Date;
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

/**
 * Rang 1 der Plakatwand: das nächste Fest als großes grünes Plakat mit
 * Halftone-Raster, Countdown-Stempel und weißem „FEST ÖFFNEN" über die volle
 * Breite. Im Dreispalter über zwei Spalten (Fächer-Variante A).
 */
export default function NextFestivalPoster({
	festival,
	today,
	onOpen,
	onEdit,
	onDelete
}: NextFestivalPosterProps) {
	const title = festivalTitle(festival);

	return (
		<div className="poster relative border-2.5 border-tinte px-5 pb-[18px] pt-[26px] text-center text-white shadow-versatz min-[900px]:col-span-2">
			<PosterMenu
				festivalName={title}
				tone="white"
				onEdit={onEdit}
				onDelete={onDelete}
				className="absolute right-0.5 top-0.5"
			/>
			<div className="font-display text-[11px] font-semibold uppercase tracking-[.14em] text-gelb">
				NÄCHSTES FEST
			</div>
			<h3 className="font-display mt-1.5 text-[27px] font-semibold uppercase leading-[1.1] tracking-[.02em]">
				{title}
			</h3>
			<div className="font-display text-sm font-semibold tracking-[.05em] text-gelb">
				{formatFestDateRange(festival.start_date, festival.end_date).toUpperCase()}
			</div>
			<Stamp tone="yellow" size="md" tilt="none" filled className="mt-2.5 tracking-[.06em]">
				{festCountdown(festival.start_date, festival.end_date, today).toUpperCase()}
			</Stamp>
			<Button
				onClick={onOpen}
				className="mt-3.5 h-10 w-full border-0 bg-white text-[12.5px] text-tinte hover:bg-white/90">
				FEST ÖFFNEN <ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
