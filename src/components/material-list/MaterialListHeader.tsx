import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, Upload } from 'lucide-react';

interface MaterialListHeaderProps {
	onAddMaterial: () => void;
	onImportMaterial: () => void;
}

const MaterialListHeader: React.FC<MaterialListHeaderProps> = ({ onAddMaterial, onImportMaterial }) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<h2 className="text-lg sm:text-xl font-semibold">Materialliste</h2>
			<div className="flex gap-2">
				<Button variant="outline" onClick={onImportMaterial} className="gap-2 flex-1 sm:flex-initial" size="sm">
					<Upload className="h-4 w-4" />
					KI-Import
				</Button>
				<Button onClick={onAddMaterial} className="gap-2 flex-1 sm:flex-initial" size="sm">
					<Package className="h-4 w-4" />
					Hinzufügen
				</Button>
			</div>
		</div>
	);
};

export default MaterialListHeader;
