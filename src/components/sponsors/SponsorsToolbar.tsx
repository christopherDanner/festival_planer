import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

/**
 * Höhe der Werkzeugleiste am Desktop — der Tabellenkopf klebt genau darunter
 * (`SponsorTable` `headerOffsetPx`). Deshalb ist die Höhe ab 900px fixiert.
 */
export const WERKLEISTE_HOEHE_PX = 59;

export interface SponsorsToolbarProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	/** Treffer der Suche. */
	shown: number;
	/** Größe des gesamten Sponsorenbestands. */
	total: number;
}

/**
 * Klebende Werkzeugleiste unter dem Mast (#101 Entscheid 5): Suche über den
 * Firmennamen plus Trefferzähler. Klebt am Handy wie am Desktop, weil der
 * Scrollweg bei 40 Firmen lang ist.
 */
export default function SponsorsToolbar({
	searchTerm,
	onSearchChange,
	shown,
	total
}: SponsorsToolbarProps) {
	return (
		<div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-2.5 border-t-0 border-tinte bg-white px-4 py-2.5 min-[900px]:h-[59px] min-[900px]:flex-nowrap">
			<div className="relative min-w-0 flex-1 min-[900px]:flex-none min-[900px]:basis-[260px]">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
				<Input
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Firma suchen …"
					aria-label="Firma suchen"
					className="h-9 pl-9 text-[13px]"
				/>
			</div>
			<span className="text-xs font-bold uppercase tracking-[.06em] text-tinte-soft">
				{shown} von {total}
			</span>
		</div>
	);
}
