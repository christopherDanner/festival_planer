import { type ReactNode } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface PageHeaderMenuItem {
	label: string;
	icon?: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	onBack: () => void;
	/** Desktop: sichtbare Aktionen rechts */
	actions?: ReactNode;
	/** Mobile: Einträge im ⋮-Menü rechts */
	menuItems?: PageHeaderMenuItem[];
}

/**
 * Sticky Header-Zeile für Unterseiten — einziges Header-Element,
 * gilt für Desktop UND Mobile: ← Zurück · Titel (+ Untertitel) · Aktionen rechts.
 */
export default function PageHeader({ title, subtitle, onBack, actions, menuItems }: PageHeaderProps) {
	return (
		<header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
			<div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 min-h-[52px] py-1.5">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					onClick={onBack}
					aria-label="Zurück">
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="min-w-0 flex-1">
					<h1 className="text-base sm:text-lg font-semibold truncate leading-tight">{title}</h1>
					{subtitle && (
						<p className="text-xs text-muted-foreground truncate leading-tight">{subtitle}</p>
					)}
				</div>
				{actions && <div className="hidden md:flex items-center gap-2 shrink-0">{actions}</div>}
				{menuItems && menuItems.length > 0 && (
					<div className="md:hidden shrink-0">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Menü">
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
					</div>
				)}
			</div>
		</header>
	);
}
