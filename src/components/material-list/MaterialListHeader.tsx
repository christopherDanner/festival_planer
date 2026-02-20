import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, Upload } from 'lucide-react';

interface MaterialListHeaderProps {
	onAddMaterial: () => void;
	onImportMaterial: () => void;
}

const MaterialListHeader: React.FC<MaterialListHeaderProps> = ({ onAddMaterial, onImportMaterial }) => {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-xl font-semibold">Materialliste</h2>
			<div className="flex gap-2">
				<Button variant="outline" onClick={onImportMaterial} className="gap-2">
					<Upload className="h-4 w-4" />
					KI-Import
				</Button>
				<Button onClick={onAddMaterial} className="gap-2">
					<Package className="h-4 w-4" />
					Material hinzufügen
				</Button>
			</div>
		</div>
	);
};

export default MaterialListHeader;
