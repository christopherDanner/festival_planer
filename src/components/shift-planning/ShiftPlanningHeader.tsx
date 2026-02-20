import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Zap, UserPlus, Maximize, Minimize, Download, FileSpreadsheet } from 'lucide-react';

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
	return (
		<div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
			<h2 className="text-lg font-semibold">Schichtplan</h2>
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={onAddStation}>
					<MapPin className="h-4 w-4 mr-1.5" />
					Station
				</Button>
				<Button variant="outline" size="sm" onClick={onAddMember}>
					<UserPlus className="h-4 w-4 mr-1.5" />
					Mitglied
				</Button>
				<Button
					variant="default"
					size="sm"
					className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
					onClick={onAutoAssign}>
					<Zap className="h-4 w-4 mr-1.5" />
					Auto-Zuteilung
				</Button>
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
			</div>
		</div>
	);
};

export default ShiftPlanningHeader;
