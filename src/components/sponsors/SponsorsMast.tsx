import { LogOut, MoreVertical } from 'lucide-react';

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
	/** Kompakt-Mast unter 900px: „Abmelden" wandert ins ⋮. */
	compact?: boolean;
	/** Klick auf den Wordmark — der einzige Zurück-Weg dieser Seite. */
	onOpenFestivalList: () => void;
	onAddSponsor: () => void;
	onSignOut: () => void;
}

/**
 * Zählzeile des Sponsorenbestands. Der Historie-Slice (#158) hängt hier
 * „· {m} sponsern {Jahr}" an; bis dahin steht nur die Bestandsgröße.
 */
const bestandsZeile = (count: number) => `${count} ${count === 1 ? 'Firma' : 'Firmen'}`;

/**
 * Mast der Sponsoren-Stammdaten (#101 Entscheid 2): eigener Kopf statt
 * `PageHeader`, Wordmark als Zurück-Weg zur Festliste, gelbes „+ FIRMA"
 * und ruhiges „Abmelden" rechts.
 */
export default function SponsorsMast({
	sponsorCount,
	compact,
	onOpenFestivalList,
	onAddSponsor,
	onSignOut
}: SponsorsMastProps) {
	const addButton = (
		<Button
			size="sm"
			onClick={onAddSponsor}
			className="h-8 border-tinte px-3 text-[12.5px] uppercase tracking-[.04em]">
			+ FIRMA
		</Button>
	);

	return (
		<Mast
			title="Sponsoren"
			when={sponsorCount === null ? undefined : bestandsZeile(sponsorCount)}
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
									className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
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
