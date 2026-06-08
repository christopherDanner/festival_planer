import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, FileDown, ArrowDownToLine, ClipboardList } from 'lucide-react';

interface MaterialListHeaderProps {
	onAddMaterial: () => void;
	onExport: () => void;
	onExportOrderList: () => void;
	onTransfer: () => void;
}

const MaterialListHeader: React.FC<MaterialListHeaderProps> = ({ onAddMaterial, onExport, onExportOrderList, onTransfer }) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<h2 className="text-lg sm:text-xl font-semibold">Materialliste</h2>
			<div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2">
				<Button variant="outline" onClick={onTransfer} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Übernehmen</span>
				</Button>
				<Button variant="outline" onClick={onExport} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Materialliste</span>
				</Button>
				<Button variant="outline" onClick={onExportOrderList} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Bestellliste</span>
				</Button>
				<Button onClick={onAddMaterial} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Neu</span>
				</Button>
			</div>
		</div>
	);
};

export default MaterialListHeader;
