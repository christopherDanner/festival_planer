import { LogOut, MoreVertical } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Mast } from '@/components/toolkit/Mast';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface SponsorsMastProps {
	/** Größe des Sponsorenbestands; `null`, solange er lädt (dann keine Zählzeile). */
	sponsorCount: number | null;
	/**
	 * Wie viele Firmen das Bezugsfest sponsern, samt dessen Jahr. Entfällt
	 * zwischen zwei Festen (kein Bezugsfest) und solange der Bestand lädt —
	 * dann bleibt es bei der Firmenzahl.
	 */
	referenceSponsoring?: { count: number; year: number };
	/** Kompakt-Mast unter 900px: „Abmelden" wandert ins ⋮. */
	compact?: boolean;
	/** Klick auf den Wordmark — der einzige Zurück-Weg dieser Seite. */
	onOpenFestivalList: () => void;
	onAddSponsor: () => void;
	onSignOut: () => void;
}

/**
 * Zählzeile des Sponsorenbestands: „40 Firmen · 12 sponsern 2026". Zwischen
 * zwei Festen gibt es kein Bezugsfest — dann bleibt es bei der Firmenzahl,
 * statt ein Jahr zu erfinden (#158).
 */
function sponsorCountLine(
	count: number,
	referenceSponsoring: { count: number; year: number } | undefined
): string {
	const firmen = `${count} ${count === 1 ? 'Firma' : 'Firmen'}`;
	if (!referenceSponsoring) return firmen;
	const { count: sponsoring, year } = referenceSponsoring;
	return `${firmen} · ${sponsoring} ${sponsoring === 1 ? 'sponsert' : 'sponsern'} ${year}`;
}

/**
 * Mast der Sponsoren-Stammdaten (#101 Entscheid 2): eigener Kopf statt
 * `PageHeader`, Wordmark als Zurück-Weg zur Festliste, gelbes „+ FIRMA"
 * und ruhiges „Abmelden" rechts.
 */
export default function SponsorsMast({
	sponsorCount,
	referenceSponsoring,
	compact,
	onOpenFestivalList,
	onAddSponsor,
	onSignOut
}: SponsorsMastProps) {
	// Am Handy sind 40px Pflicht (DESIGN-VISION §6), am Desktop reicht die
	// gedrängte Mast-Höhe.
	const addButton = (
		<Button
			size="sm"
			onClick={onAddSponsor}
			className={cn(
				'border-tinte px-3 text-[12.5px] uppercase tracking-[.04em]',
				compact ? 'h-10' : 'h-8'
			)}>
			+ FIRMA
		</Button>
	);

	return (
		<Mast
			title="Sponsoren"
			when={
				sponsorCount === null ? undefined : sponsorCountLine(sponsorCount, referenceSponsoring)
			}
			compact={compact}
			onWordmarkClick={onOpenFestivalList}
			end={
				compact ? (
					<>
						{addButton}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-10 w-10 text-white hover:bg-white/15 hover:text-white"
									aria-label="Menü">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="z-[60]">
								<DropdownMenuItem onClick={onSignOut} className="gap-2">
									<LogOut className="h-4 w-4" />
									Abmelden
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<>
						{addButton}
						<Button
							variant="ghost"
							size="sm"
							onClick={onSignOut}
							className="h-8 border-2 border-white/40 px-3 text-[12.5px] font-bold text-white hover:bg-white/15 hover:text-white">
							Abmelden
						</Button>
					</>
				)
			}
		/>
	);
}
