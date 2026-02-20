import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import FileDropZone from '../FileDropZone';
import MaterialImportPreview from '../MaterialImportPreview';
import { processFileForImport, type ImportedMaterial } from '@/lib/materialImportService';
import type { Station } from '@/lib/shiftService';
import type { FestivalMaterial } from '@/lib/materialService';

type Step = 'upload' | 'processing' | 'preview';

interface MaterialImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalId: string;
	stations: Station[];
	onImport: (materials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[]) => void;
	isImporting: boolean;
}

const ACCEPT = '.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.pdf';

const MaterialImportDialog: React.FC<MaterialImportDialogProps> = ({
	open,
	onOpenChange,
	festivalId,
	stations,
	onImport,
	isImporting
}) => {
	const [step, setStep] = useState<Step>('upload');
	const [materials, setMaterials] = useState<ImportedMaterial[]>([]);
	const [error, setError] = useState<string | undefined>();

	const reset = useCallback(() => {
		setStep('upload');
		setMaterials([]);
		setError(undefined);
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) reset();
			onOpenChange(open);
		},
		[onOpenChange, reset]
	);

	const handleFileSelected = useCallback(
		async (file: File) => {
			setError(undefined);
			setStep('processing');
			try {
				const result = await processFileForImport(file);
				if (result.length === 0) {
					setError('Es konnten keine Materialien aus der Datei extrahiert werden.');
					setStep('upload');
					return;
				}
				setMaterials(result);
				setStep('preview');
			} catch (err: any) {
				setError(err.message || 'Fehler beim Verarbeiten der Datei.');
				setStep('upload');
			}
		},
		[]
	);

	const handleConfirm = useCallback(() => {
		const selected = materials.filter((m) => m._selected);
		const rows = selected.map((m) => ({
			festival_id: festivalId,
			station_id: m._stationId,
			name: m.name,
			category: m.category,
			supplier: m.supplier,
			unit: m.unit,
			packaging_unit: m.packaging_unit,
			amount_per_packaging: m.amount_per_packaging,
			ordered_quantity: m.ordered_quantity,
			actual_quantity: null as number | null,
			unit_price: m.unit_price,
			notes: m.notes
		}));
		onImport(rows);
	}, [materials, festivalId, onImport]);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>KI-Material-Import</DialogTitle>
				</DialogHeader>

				{step === 'upload' && (
					<FileDropZone
						onFileSelected={handleFileSelected}
						accept={ACCEPT}
						error={error}
					/>
				)}

				{step === 'processing' && (
					<div className="flex flex-col items-center justify-center gap-4 py-12">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<p className="text-muted-foreground">KI analysiert Datei...</p>
					</div>
				)}

				{step === 'preview' && (
					<MaterialImportPreview
						materials={materials}
						stations={stations}
						onMaterialsChange={setMaterials}
						onConfirm={handleConfirm}
						onBack={() => setStep('upload')}
						isImporting={isImporting}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default MaterialImportDialog;
