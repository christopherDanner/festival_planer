import { CalendarDays, Package, CalendarClock, LayoutDashboard, HandCoins, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FestivalTab = 'overview' | 'shifts' | 'materials' | 'schedule' | 'sponsoring';

export const FESTIVAL_TABS: { value: FestivalTab; label: string; icon: LucideIcon }[] = [
	{ value: 'overview', label: 'Übersicht', icon: LayoutDashboard },
	{ value: 'shifts', label: 'Schichtplan', icon: CalendarDays },
	{ value: 'materials', label: 'Materialliste', icon: Package },
	{ value: 'schedule', label: 'Ablaufplan', icon: CalendarClock },
	{ value: 'sponsoring', label: 'Sponsoring', icon: HandCoins }
];

export function isFestivalTab(value: string | null): value is FestivalTab {
	return FESTIVAL_TABS.some((t) => t.value === value);
}

interface FestivalTabBarProps {
	active: FestivalTab;
	onSelect: (tab: FestivalTab) => void;
}

/**
 * Mobile Bottom-Tab-Bar eines Festes. Immer sichtbar, solange man sich
 * innerhalb eines Festes bewegt (auch auf Unterseiten wie Material-Übernahme).
 */
export default function FestivalTabBar({ active, onSelect }: FestivalTabBarProps) {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
			<div className="flex h-14">
				{FESTIVAL_TABS.map(({ value, label, icon: Icon }) => (
					<button
						key={value}
						type="button"
						onClick={() => onSelect(value)}
						className={cn(
							'flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
							active === value ? 'text-primary' : 'text-muted-foreground'
						)}>
						<Icon className="h-5 w-5" />
						<span className="truncate max-w-full px-0.5">{label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
