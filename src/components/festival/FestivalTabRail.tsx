import { cn } from '@/lib/utils';
import { FESTIVAL_TABS, type FestivalTab } from './FestivalTabBar';

interface FestivalTabRailProps {
	active: FestivalTab;
	onSelect: (tab: FestivalTab) => void;
}

/**
 * Desktop (≥900px): angedockte Tab-Leiste unter dem Mast — aktiver Tab als
 * gelber Block, scrollt horizontal bei Platznot (Master-Prototyp `nav.tabs`).
 */
export default function FestivalTabRail({ active, onSelect }: FestivalTabRailProps) {
	return (
		<nav className="flex overflow-x-auto border-2.5 border-t-0 border-tinte bg-white">
			{FESTIVAL_TABS.map(({ value, label }) => (
				<button
					key={value}
					type="button"
					onClick={() => onSelect(value)}
					className={cn(
						'whitespace-nowrap border-r border-linie px-[18px] py-[11px] text-sm font-semibold',
						active === value
							? 'bg-gelb text-tinte shadow-[inset_0_-3px_0_oklch(var(--tinte))]'
							: 'text-tinte-soft hover:bg-fusszeile hover:text-tinte'
					)}>
					{label}
				</button>
			))}
		</nav>
	);
}
