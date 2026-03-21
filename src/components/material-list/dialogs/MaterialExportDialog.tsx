import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { exportMaterialsToExcel, exportMaterialsToPdf } from '@/lib/materialExportService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

interface MaterialExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	stations: Array<{ id: string; name: string }>;
	suppliers: string[];
}

const MaterialExportDialog: React.FC<MaterialExportDialogProps> = ({
	open, onOpenChange, festivalName, materials, stations, suppliers
}) => {
	const [filterMode, setFilterMode] = useState<'all' | 'station' | 'supplier'>('all');
	const [selectedStationId, setSelectedStationId] = useState<string>('__none__');
	const [selectedSupplier, setSelectedSupplier] = useState<string>('__none__');

	const filteredMaterials = useMemo(() => {
		if (filterMode === 'station' && selectedStationId !== '__none__') {
			return materials.filter(m => m.station_id === selectedStationId);
		}
		if (filterMode === 'supplier' && selectedSupplier !== '__none__') {
			return materials.filter(m => m.supplier === selectedSupplier);
		}
		return materials;
	}, [materials, filterMode, selectedStationId, selectedSupplier]);

	const filterLabel = useMemo(() => {
		if (filterMode === 'station' && selectedStationId !== '__none__') {
			const station = stations.find(s => s.id === selectedStationId);
			return station ? `Station: ${station.name}` : undefined;
		}
		if (filterMode === 'supplier' && selectedSupplier !== '__none__') {
			return `Lieferant: ${selectedSupplier}`;
		}
		return undefined;
	}, [filterMode, selectedStationId, selectedSupplier, stations]);

	const handleExportPdf = () => {
		exportMaterialsToPdf({ festivalName, materials: filteredMaterials, filterLabel });
	};

	const handleExportExcel = () => {
		exportMaterialsToExcel({ festivalName, materials: filteredMaterials, filterLabel });
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setFilterMode('all');
			setSelectedStationId('__none__');
			setSelectedSupplier('__none__');
		}
		onOpenChange(open);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">Materialliste exportieren</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Filter mode toggle */}
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Was exportieren?</p>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setFilterMode('all')}
								className={`px-3 py-1 rounded-full text-xs border transition-colors ${
									filterMode === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Gesamte Liste
							</button>
							<button
								type="button"
								onClick={() => setFilterMode('station')}
								className={`px-3 py-1 rounded-full text-xs border transition-colors ${
									filterMode === 'station' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Nach Station
							</button>
							<button
								type="button"
								onClick={() => setFilterMode('supplier')}
								className={`px-3 py-1 rounded-full text-xs border transition-colors ${
									filterMode === 'supplier' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Nach Lieferant
							</button>
						</div>
					</div>

					{/* Station select */}
					{filterMode === 'station' && (
						<Select value={selectedStationId} onValueChange={setSelectedStationId}>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder="Station auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Station auswählen...</SelectItem>
								{stations.map(s => (
									<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* Supplier select */}
					{filterMode === 'supplier' && (
						<Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder="Lieferant auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Lieferant auswählen...</SelectItem>
								{suppliers.map(s => (
									<SelectItem key={s} value={s}>{s}</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{/* Count info */}
					<p className="text-sm text-muted-foreground">
						{filteredMaterials.length} Materialien
					</p>

					{/* Export buttons */}
					<div className="flex gap-2">
						<Button
							onClick={handleExportPdf}
							variant="outline"
							className="flex-1 gap-2"
							disabled={filteredMaterials.length === 0}>
							<FileDown className="h-4 w-4" />
							PDF exportieren
						</Button>
						<Button
							onClick={handleExportExcel}
							variant="outline"
							className="flex-1 gap-2"
							disabled={filteredMaterials.length === 0}>
							<FileSpreadsheet className="h-4 w-4" />
							Excel
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialExportDialog;
