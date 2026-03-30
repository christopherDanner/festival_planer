import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ArrowDownToLine } from 'lucide-react';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
import { getMaterials, type FestivalMaterialWithStation, type FestivalMaterial } from '@/lib/materialService';

type Step = 'select-festival' | 'review';

interface TransferRow {
	sourceMaterial: FestivalMaterialWithStation;
	checked: boolean;
	desiredQuantity: string;
	existingMatch: FestivalMaterialWithStation | null;
}

interface MaterialTransferDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalId: string;
	festivalName: string;
	targetMaterials: FestivalMaterialWithStation[];
	targetStations: { id: string; name: string }[];
	onTransfer: (
		newMaterials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[],
		updates: { id: string; ordered_quantity: number }[]
	) => void;
	isTransferring: boolean;
}

function matchByName(
	sourceMaterials: FestivalMaterialWithStation[],
	targetMaterials: FestivalMaterialWithStation[]
): TransferRow[] {
	const targetByName = new Map<string, FestivalMaterialWithStation>();
	for (const t of targetMaterials) {
		targetByName.set(t.name.trim().toLowerCase(), t);
	}

	return sourceMaterials.map((src) => {
		const match = targetByName.get(src.name.trim().toLowerCase()) || null;
		return {
			sourceMaterial: src,
			checked: false,
			desiredQuantity: '',
			existingMatch: match,
		};
	});
}

function mapStationId(
	sourceStationName: string | null | undefined,
	targetStations: { id: string; name: string }[]
): string | null {
	if (!sourceStationName) return null;
	const match = targetStations.find(
		(s) => s.name.trim().toLowerCase() === sourceStationName.trim().toLowerCase()
	);
	return match ? match.id : null;
}

const MaterialTransferDialog: React.FC<MaterialTransferDialogProps> = ({
	open, onOpenChange, festivalId, festivalName, targetMaterials, targetStations,
	onTransfer, isTransferring
}) => {
	const [step, setStep] = useState<Step>('select-festival');
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loadingFestivals, setLoadingFestivals] = useState(false);
	const [selectedFestivalId, setSelectedFestivalId] = useState<string>('__none__');
	const [sourceMaterials, setSourceMaterials] = useState<FestivalMaterialWithStation[]>([]);
	const [loadingMaterials, setLoadingMaterials] = useState(false);
	const [rows, setRows] = useState<TransferRow[]>([]);

	useEffect(() => {
		if (!open) return;
		setLoadingFestivals(true);
		getUserFestivals()
			.then((data) => setFestivals(data.filter((f) => f.id !== festivalId)))
			.catch(() => setFestivals([]))
			.finally(() => setLoadingFestivals(false));
	}, [open, festivalId]);

	useEffect(() => {
		if (selectedFestivalId === '__none__') {
			setSourceMaterials([]);
			setRows([]);
			return;
		}
		setLoadingMaterials(true);
		getMaterials(selectedFestivalId)
			.then((data) => {
				setSourceMaterials(data);
				setRows(matchByName(data, targetMaterials));
			})
			.catch(() => {
				setSourceMaterials([]);
				setRows([]);
			})
			.finally(() => setLoadingMaterials(false));
	}, [selectedFestivalId, targetMaterials]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setStep('select-festival');
			setSelectedFestivalId('__none__');
			setSourceMaterials([]);
			setRows([]);
		}
		onOpenChange(open);
	};

	const handleQuantityChange = useCallback((index: number, value: string) => {
		setRows((prev) => {
			const next = [...prev];
			const row = { ...next[index] };
			row.desiredQuantity = value;
			const numVal = parseFloat(value);
			if (!row.existingMatch) {
				row.checked = !isNaN(numVal) && numVal > 0;
			}
			next[index] = row;
			return next;
		});
	}, []);

	const handleCheckChange = useCallback((index: number, checked: boolean) => {
		setRows((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], checked };
			return next;
		});
	}, []);

	const summary = useMemo(() => {
		let newCount = 0;
		let updateCount = 0;
		for (const row of rows) {
			if (!row.checked) continue;
			const qty = parseFloat(row.desiredQuantity);
			if (isNaN(qty) || qty <= 0) continue;
			if (row.existingMatch) updateCount++;
			else newCount++;
		}
		return { newCount, updateCount, total: newCount + updateCount };
	}, [rows]);

	const handleTransfer = () => {
		const newMaterials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[] = [];
		const updates: { id: string; ordered_quantity: number }[] = [];

		for (const row of rows) {
			if (!row.checked) continue;
			const qty = parseFloat(row.desiredQuantity);
			if (isNaN(qty) || qty <= 0) continue;

			if (row.existingMatch) {
				updates.push({ id: row.existingMatch.id, ordered_quantity: qty });
			} else {
				const src = row.sourceMaterial;
				newMaterials.push({
					festival_id: festivalId,
					name: src.name,
					category: src.category,
					supplier: src.supplier,
					station_id: mapStationId(src.station?.name, targetStations),
					unit: src.unit,
					packaging_unit: src.packaging_unit,
					amount_per_packaging: src.amount_per_packaging,
					ordered_quantity: qty,
					actual_quantity: null,
					unit_price: null,
					tax_rate: null,
					price_is_net: true,
					price_per: 'unit',
					notes: src.notes,
				});
			}
		}

		onTransfer(newMaterials, updates);
	};

	const selectedFestival = festivals.find((f) => f.id === selectedFestivalId);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">
						Material übernehmen
					</DialogTitle>
				</DialogHeader>

				{step === 'select-festival' && (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Wähle ein vergangenes Fest, von dem du Materialien in <strong>{festivalName}</strong> übernehmen möchtest.
						</p>

						{loadingFestivals ? (
							<div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Feste werden geladen…
							</div>
						) : (
							<Select value={selectedFestivalId} onValueChange={setSelectedFestivalId}>
								<SelectTrigger className="h-9 text-sm">
									<SelectValue placeholder="Fest auswählen…" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Fest auswählen…</SelectItem>
									{festivals.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.name || 'Unbenanntes Fest'} — {new Date(f.start_date).toLocaleDateString('de-AT')}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						{selectedFestivalId !== '__none__' && loadingMaterials && (
							<div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Materialien werden geladen…
							</div>
						)}

						{selectedFestivalId !== '__none__' && !loadingMaterials && sourceMaterials.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								Dieses Fest hat keine Materialien.
							</p>
						)}

						{selectedFestivalId !== '__none__' && !loadingMaterials && sourceMaterials.length > 0 && (
							<div className="text-sm text-muted-foreground">
								{sourceMaterials.length} Materialien gefunden
							</div>
						)}

						<div className="flex justify-end">
							<Button
								onClick={() => setStep('review')}
								disabled={selectedFestivalId === '__none__' || loadingMaterials || sourceMaterials.length === 0}
								className="gap-2"
								size="sm"
							>
								Weiter
							</Button>
						</div>
					</div>
				)}

				{step === 'review' && (
					<div className="flex flex-col gap-3 min-h-0 flex-1">
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm" onClick={() => setStep('select-festival')} className="gap-1 px-2">
								<ArrowLeft className="h-3.5 w-3.5" />
								Zurück
							</Button>
							<span className="text-sm text-muted-foreground">
								Quelle: <strong>{selectedFestival?.name || 'Fest'}</strong>
							</span>
						</div>

						<p className="text-xs text-muted-foreground">
							Trage die gewünschte Bestellmenge in der Spalte „Wunschmenge" ein. Positionen, die bereits in {festivalName} vorhanden sind, sind markiert und standardmäßig abgewählt.
						</p>

						<div className="overflow-auto flex-1 min-h-0 border rounded-md">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 sticky top-0 z-10">
									<tr className="border-b">
										<th className="p-2 w-8"></th>
										<th className="p-2 text-left font-medium">Name</th>
										<th className="p-2 text-left font-medium">Station</th>
										<th className="p-2 text-left font-medium">Lieferant</th>
										<th className="p-2 text-left font-medium">Einheit</th>
										<th className="p-2 text-left font-medium">VE</th>
										<th className="p-2 text-right font-medium">Menge/VE</th>
										<th className="p-2 text-right font-medium">Bestellt</th>
										<th className="p-2 text-right font-medium">Ist-Menge</th>
										<th className="p-2 text-right font-medium min-w-[100px]">Wunschmenge</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row, i) => {
										const isExisting = !!row.existingMatch;
										return (
											<tr
												key={row.sourceMaterial.id}
												className={`border-b ${isExisting ? 'bg-muted/30 text-muted-foreground' : ''}`}
											>
												<td className="p-2 text-center">
													<Checkbox
														checked={row.checked}
														onCheckedChange={(checked) => handleCheckChange(i, !!checked)}
													/>
												</td>
												<td className="p-2">
													<div className="flex items-center gap-1.5">
														<span className={isExisting ? 'text-muted-foreground' : ''}>{row.sourceMaterial.name}</span>
														{isExisting && (
															<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
																vorhanden
															</Badge>
														)}
													</div>
												</td>
												<td className="p-2">{row.sourceMaterial.station?.name || '–'}</td>
												<td className="p-2">{row.sourceMaterial.supplier || '–'}</td>
												<td className="p-2">{row.sourceMaterial.unit}</td>
												<td className="p-2">{row.sourceMaterial.packaging_unit || '–'}</td>
												<td className="p-2 text-right">{row.sourceMaterial.amount_per_packaging ?? '–'}</td>
												<td className="p-2 text-right">{row.sourceMaterial.ordered_quantity}</td>
												<td className="p-2 text-right">
													{row.sourceMaterial.actual_quantity != null
														? row.sourceMaterial.actual_quantity
														: '–'}
												</td>
												<td className="p-2">
													<Input
														type="number"
														min="0"
														step="any"
														value={row.desiredQuantity}
														onChange={(e) => handleQuantityChange(i, e.target.value)}
														placeholder="0"
														className="h-7 text-sm text-right w-full"
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<div className="flex items-center justify-between pt-1">
							<p className="text-sm text-muted-foreground">
								{summary.total === 0
									? 'Keine Positionen ausgewählt'
									: `${summary.newCount > 0 ? `${summary.newCount} neue` : ''}${summary.newCount > 0 && summary.updateCount > 0 ? ', ' : ''}${summary.updateCount > 0 ? `${summary.updateCount} aktualisieren` : ''}`}
							</p>
							<Button
								onClick={handleTransfer}
								disabled={summary.total === 0 || isTransferring}
								className="gap-2"
								size="sm"
							>
								{isTransferring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
								<ArrowDownToLine className="h-3.5 w-3.5" />
								Übernehmen
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default MaterialTransferDialog;
