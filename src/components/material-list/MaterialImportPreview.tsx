import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type { ImportedMaterial } from '@/lib/materialImportService';
import type { Station } from '@/lib/shiftService';

interface MaterialImportPreviewProps {
	materials: ImportedMaterial[];
	stations: Station[];
	onMaterialsChange: (materials: ImportedMaterial[]) => void;
	onConfirm: () => void;
	onBack: () => void;
	isImporting: boolean;
}

const MaterialImportPreview: React.FC<MaterialImportPreviewProps> = ({
	materials,
	stations,
	onMaterialsChange,
	onConfirm,
	onBack,
	isImporting
}) => {
	const selectedCount = materials.filter((m) => m._selected).length;
	const allSelected = selectedCount === materials.length;

	const toggleAll = (checked: boolean) => {
		onMaterialsChange(materials.map((m) => ({ ...m, _selected: checked })));
	};

	const toggleOne = (id: string, checked: boolean) => {
		onMaterialsChange(
			materials.map((m) => (m._id === id ? { ...m, _selected: checked } : m))
		);
	};

	const updateStation = (id: string, stationId: string) => {
		onMaterialsChange(
			materials.map((m) =>
				m._id === id ? { ...m, _stationId: stationId === '__none__' ? null : stationId } : m
			)
		);
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				{selectedCount} von {materials.length} Materialien ausgewählt
			</p>

			<div className="max-h-[50vh] overflow-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">
								<Checkbox
									checked={allSelected}
									onCheckedChange={(checked) => toggleAll(!!checked)}
								/>
							</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Kategorie</TableHead>
							<TableHead>Lieferant</TableHead>
							<TableHead className="text-right">Menge</TableHead>
							<TableHead>Einheit</TableHead>
							<TableHead>Gebinde</TableHead>
							<TableHead className="text-right">Preis</TableHead>
							<TableHead>Station</TableHead>
							<TableHead>Notizen</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{materials.map((m) => (
							<TableRow key={m._id} className={m._selected ? '' : 'opacity-50'}>
								<TableCell>
									<Checkbox
										checked={m._selected}
										onCheckedChange={(checked) => toggleOne(m._id, !!checked)}
									/>
								</TableCell>
								<TableCell className="font-medium">{m.name}</TableCell>
								<TableCell>{m.category || '—'}</TableCell>
								<TableCell>{m.supplier || '—'}</TableCell>
								<TableCell className="text-right">{m.ordered_quantity}</TableCell>
								<TableCell>{m.unit}</TableCell>
								<TableCell>{m.packaging_unit || '—'}</TableCell>
								<TableCell className="text-right">
									{m.unit_price != null ? `€ ${m.unit_price.toFixed(2)}` : '—'}
								</TableCell>
								<TableCell>
									<Select
										value={m._stationId || '__none__'}
										onValueChange={(v) => updateStation(m._id, v)}>
										<SelectTrigger className="w-[140px] h-8 text-xs">
											<SelectValue placeholder="Keine" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="__none__">Keine Station</SelectItem>
											{stations.map((s) => (
												<SelectItem key={s.id} value={s.id}>
													{s.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</TableCell>
								<TableCell className="text-xs max-w-[120px] truncate">
									{m.notes || '—'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack} disabled={isImporting}>
					Zurück
				</Button>
				<Button onClick={onConfirm} disabled={selectedCount === 0 || isImporting}>
					{isImporting
						? 'Importiere...'
						: `${selectedCount} Materialien importieren`}
				</Button>
			</div>
		</div>
	);
};

export default MaterialImportPreview;
