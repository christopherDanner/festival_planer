import { Building2, LogOut, MoreVertical } from 'lucide-react';

import { Mast } from '@/components/toolkit/Mast';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { festivalCountLine } from './festivalList';

interface FestivalListMastProps {
	festivalCount: number;
	upcomingCount: number;
	/** <900px: Kompakt-Mast, die ruhigen Aktionen wandern ins ⋮-Menü. */
	compact: boolean;
	onNewFestival: () => void;
	onSponsors: () => void;
	onSignOut: () => void;
}

/**
 * Mast der Festliste (Issue #90): Wortmarke + „Meine Feste" + Zählzeile, rechts
 * der gelbe „+ NEUES FEST" und die ruhigen Stammdaten-Aktionen. Kein
 * Wortmarken-Klick — wir sind schon auf der Festliste; keine Verein-Zeile
 * (`Festival` kennt kein solches Feld).
 */
export default function FestivalListMast({
	festivalCount,
	upcomingCount,
	compact,
	onNewFestival,
	onSponsors,
	onSignOut
}: FestivalListMastProps) {
	const countLine = festivalCountLine(festivalCount, upcomingCount);

	// Trefferflächen am Handy ≥ 40px (DESIGN-VISION §6, WCAG 2.5.8)
	const newFestival = (
		<Button
			size="sm"
			className={cn('px-3.5 text-[12.5px]', compact ? 'h-10' : 'h-8')}
			onClick={onNewFestival}>
			+ NEUES FEST
		</Button>
	);

	const quietAction = (label: string, onClick: () => void) => (
		<Button
			key={label}
			variant="ghost"
			size="sm"
			className="h-8 text-white hover:bg-white/15 hover:text-white"
			onClick={onClick}>
			{label}
		</Button>
	);

	return (
		<Mast
			title="Meine Feste"
			when={countLine ?? undefined}
			compact={compact}
			end={
				compact ? (
					<>
						{newFestival}
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
								<DropdownMenuItem onClick={onSponsors} className="gap-2">
									<Building2 className="h-4 w-4" />
									Sponsoren
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onSignOut} className="gap-2">
									<LogOut className="h-4 w-4" />
									Abmelden
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				) : (
					<>
						{newFestival}
						{quietAction('Sponsoren', onSponsors)}
						{quietAction('Abmelden', onSignOut)}
					</>
				)
			}
		/>
	);
}
