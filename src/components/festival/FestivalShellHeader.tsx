import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

import { Mast } from '@/components/toolkit/Mast';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { festCountdown, formatFestDateRange } from '@/lib/festDates';
import FestivalTabRail from './FestivalTabRail';
import { type FestivalTab } from './FestivalTabBar';

export interface FestivalShellMenuItem {
	label: string;
	icon?: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}

interface FestivalShellHeaderProps {
	festivalName: string;
	startDate: string;
	endDate?: string | null;
	activeTab: FestivalTab;
	onTabChange: (tab: FestivalTab) => void;
	/** Desktop (≥900px): sichtbare Aktionen rechts im Mast */
	actions?: ReactNode;
	/** Mobil (<900px): Einträge im ⋮-Menü rechts im Kompakt-Mast */
	menuItems?: FestivalShellMenuItem[];
}

/**
 * Kopf des Fest-Arbeitsbereichs (Issue #76): Mast + angedockte Tab-Leiste
 * ab 900px, mitscrollender Kompakt-Mast darunter (Bottom-Bar rendert die
 * Seite selbst, damit sie auch auf Unterseiten sichtbar bleibt).
 */
export default function FestivalShellHeader({
	festivalName,
	startDate,
	endDate,
	activeTab,
	onTabChange,
	actions,
	menuItems
}: FestivalShellHeaderProps) {
	const navigate = useNavigate();
	const isMobile = useIsMobile();

	const when = (
		<>
			{formatFestDateRange(startDate, endDate)} ·{' '}
			<b className="font-semibold text-gelb">{festCountdown(startDate, endDate)}</b>
		</>
	);

	const mobileMenu = menuItems && menuItems.length > 0 && (
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
				{menuItems.map((item) => (
					<DropdownMenuItem
						key={item.label}
						onClick={item.onClick}
						disabled={item.disabled}
						className="gap-2">
						{item.icon}
						{item.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<div>
			<Mast
				title={festivalName}
				when={when}
				compact={isMobile}
				onWordmarkClick={() => navigate('/dashboard')}
				end={isMobile ? mobileMenu : actions}
			/>
			{!isMobile && <FestivalTabRail active={activeTab} onSelect={onTabChange} />}
		</div>
	);
}
