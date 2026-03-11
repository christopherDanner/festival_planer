import React from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MapPin, Zap, UserPlus, Maximize, Minimize, Download, FileSpreadsheet, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ShiftPlanningHeaderProps {
	isFullscreen: boolean;
	onToggleFullscreen: () => void;
	onAddStation: () => void;
	onAutoAssign: () => void;
	onAddMember: () => void;
	onExportExcel: () => void;
	onExportPdf: () => void;
}

const ShiftPlanningHeader: React.FC<ShiftPlanningHeaderProps> = ({
	isFullscreen,
	onToggleFullscreen,
	onAddStation,
	onAutoAssign,
	onAddMember,
	onExportExcel,
	onExportPdf
}) => {
	const isMobile = useIsMobile();

	return (
		<div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b bg-background">
			<h2 className="text-sm md:text-base font-semibold">Schichtplan</h2>
			<div className="flex items-center gap-1 md:gap-2">
				<Button variant="outline" size="sm" onClick={onAddStation} className="h-8 px-2 md:px-3">
					<MapPin className="h-4 w-4 md:mr-1.5" />
					{!isMobile && 'Station'}
				</Button>
				<Button variant="outline" size="sm" onClick={onAddMember} className="h-8 px-2 md:px-3">
					<UserPlus className="h-4 w-4 md:mr-1.5" />
					{!isMobile && 'Mitglied'}
				</Button>
				<Button
					variant="default"
					size="sm"
					className="h-8 px-2 md:px-3"
					onClick={onAutoAssign}>
					<Zap className="h-4 w-4 md:mr-1.5" />
					{!isMobile && 'Auto-Zuteilung'}
				</Button>
				{isMobile ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onExportExcel}>
								<FileSpreadsheet className="h-4 w-4 mr-2" />
								Excel exportieren
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onExportPdf}>
								<Download className="h-4 w-4 mr-2" />
								PDF exportieren
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onToggleFullscreen}>
								{isFullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
								{isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<>
						<div className="h-6 w-px bg-border mx-1" />
						<Button variant="outline" size="sm" onClick={onExportExcel}>
							<FileSpreadsheet className="h-4 w-4 mr-1.5" />
							Excel
						</Button>
						<Button variant="outline" size="sm" onClick={onExportPdf}>
							<Download className="h-4 w-4 mr-1.5" />
							PDF
						</Button>
						<div className="h-6 w-px bg-border mx-1" />
						<Button variant="ghost" size="sm" onClick={onToggleFullscreen} className="h-8 w-8 p-0">
							{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
						</Button>
					</>
				)}
			</div>
		</div>
	);
};

export default ShiftPlanningHeader;
