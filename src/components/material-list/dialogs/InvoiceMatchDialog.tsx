import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, PlusCircle, Plus } from 'lucide-react';
import FileDropZone from '../FileDropZone';
import { processFileForImport } from '@/lib/materialImportService';
import { matchMaterials, type MatchedMaterial } from '@/lib/materialMatchService';
import type { FestivalMaterialWithStation, FestivalMaterial } from '@/lib/materialService';

type Step = 'upload' | 'processing' | 'preview';

interface NewItemOverrides {
	category: string | null;
	station_id: string | null;
	unit: string;
	packaging_unit: string | null;
	amount_per_packaging: string;
}

interface InvoiceMatchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	materials: FestivalMaterialWithStation[];
	stations: { id: string; name: string }[];
	festivalId: string;
	onApply: (updates: { id: string; actual_quantity: number; unit_price?: number | null }[]) => void;
	onCreateNew: (materials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[]) => void;
	isApplying: boolean;
}

const ACCEPT = '.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.pdf,image/*';

function resolveSupplier(extracted: string | null, existingSuppliers: string[]): string | null {
	if (!extracted) return null;
	const lower = extracted.toLowerCase().trim();
	if (!lower) return null;
	const exact = existingSuppliers.find(s => s.toLowerCase().trim() === lower);
	if (exact) return exact;
	const partial = existingSuppliers.find(s => {
		const sl = s.toLowerCase().trim();
		return sl.includes(lower) || lower.includes(sl);
	});
	if (partial) return partial;
	return extracted;
}

function inferStation(
	supplier: string | null,
	category: string | null,
	existingMaterials: FestivalMaterialWithStation[]
): string | null {
	if (supplier) {
		const supplierLower = supplier.toLowerCase().trim();
		const bySupplier = existingMaterials.filter(
			m => m.supplier && m.supplier.toLowerCase().trim() === supplierLower && m.station_id
		);
		if (bySupplier.length > 0) {
			const stationCounts = new Map<string, number>();
			for (const m of bySupplier) {
				stationCounts.set(m.station_id!, (stationCounts.get(m.station_id!) || 0) + 1);
			}
			const best = [...stationCounts.entries()].sort((a, b) => b[1] - a[1])[0];
			if (best && best[1] > bySupplier.length / 2) return best[0];
		}
	}
	if (category) {
		const catLower = category.toLowerCase().trim();
		const byCat = existingMaterials.filter(
			m => m.category && m.category.toLowerCase().trim() === catLower && m.station_id
		);
		if (byCat.length > 0) {
			const stationCounts = new Map<string, number>();
			for (const m of byCat) {
				stationCounts.set(m.station_id!, (stationCounts.get(m.station_id!) || 0) + 1);
			}
			const best = [...stationCounts.entries()].sort((a, b) => b[1] - a[1])[0];
			if (best && best[1] > byCat.length / 2) return best[0];
		}
	}
	return null;
}

const MatchStatusIcon: React.FC<{ m: MatchedMaterial }> = ({ m }) => {
	if (m.createNew) return <PlusCircle className="h-4 w-4 text-primary shrink-0" />;
	if (m.matchedMaterial && m.confidence >= 0.8) return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
	if (m.matchedMaterial && m.confidence > 0) return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
	return null;
};

const InvoiceMatchDialog: React.FC<InvoiceMatchDialogProps> = ({
	open, onOpenChange, materials, stations, festivalId, onApply, onCreateNew, isApplying
}) => {
	const [step, setStep] = useState<Step>('upload');
	const [matches, setMatches] = useState<MatchedMaterial[]>([]);
	const [error, setError] = useState<string | undefined>();
	const [addToExisting, setAddToExisting] = useState(true);
	const [overrides, setOverrides] = useState<Record<number, NewItemOverrides>>({});
	const [supplierForNewItems, setSupplierForNewItems] = useState('');
	const [priceOverrides, setPriceOverrides] = useState<Record<number, string>>({});
	const [quantityOverrides, setQuantityOverrides] = useState<Record<number, string>>({});
	const [nameOverrides, setNameOverrides] = useState<Record<number, string>>({});

	const existingSuppliers = useMemo(
		() => [...new Set(materials.map(m => m.supplier).filter(Boolean))] as string[],
		[materials]
	);

	const existingCategories = useMemo(
		() => [...new Set(materials.map(m => m.category).filter(Boolean))] as string[],
		[materials]
	);

	const isNewSupplier = supplierForNewItems.trim() !== '' &&
		!existingSuppliers.some(s => s.toLowerCase() === supplierForNewItems.trim().toLowerCase());

	useEffect(() => {
		if (matches.length === 0) return;
		const detectedSupplier = matches.find(m => m.importedData.supplier)?.importedData.supplier || null;
		const resolved = resolveSupplier(detectedSupplier, existingSuppliers);
		setSupplierForNewItems(resolved || '');
	}, [matches, existingSuppliers]);

	useEffect(() => {
		if (matches.length === 0) return;
		const prices: Record<number, string> = {};
		const quantities: Record<number, string> = {};
		matches.forEach((m, i) => {
			prices[i] = m.importedData.unit_price != null ? String(m.importedData.unit_price) : '';
			quantities[i] = String(m.extractedQuantity);
		});
		setPriceOverrides(prices);
		setQuantityOverrides(quantities);
	}, [matches]);

	const reset = useCallback(() => {
		setStep('upload');
		setMatches([]);
		setError(undefined);
		setOverrides({});
		setSupplierForNewItems('');
		setPriceOverrides({});
		setQuantityOverrides({});
		setNameOverrides({});
	}, []);

	const handleOpenChange = useCallback((open: boolean) => {
		if (!open) reset();
		onOpenChange(open);
	}, [onOpenChange, reset]);

	const initOverrides = useCallback((index: number, m: MatchedMaterial) => {
		setOverrides(prev => {
			if (prev[index]) return prev;
			const inferredStation = inferStation(
				m.importedData.supplier,
				m.importedData.category,
				materials
			);
			return {
				...prev,
				[index]: {
					category: m.importedData.category,
					station_id: inferredStation,
					unit: m.importedData.unit || 'Stück',
					packaging_unit: m.importedData.packaging_unit || null,
					amount_per_packaging: m.importedData.amount_per_packaging != null
						? String(m.importedData.amount_per_packaging)
						: '',
				}
			};
		});
	}, [materials]);

	const handleFileSelected = useCallback(async (file: File) => {
		setError(undefined);
		setStep('processing');
		try {
			const imported = await processFileForImport(file);
			if (imported.length === 0) {
				setError('Es konnten keine Materialien aus der Datei extrahiert werden.');
				setStep('upload');
				return;
			}
			const result = matchMaterials(imported, materials);
			setMatches(result);
			setOverrides({});
			setStep('preview');
		} catch (err: any) {
			setError(err.message || 'Fehler beim Verarbeiten der Datei.');
			setStep('upload');
		}
	}, [materials]);

	const toggleMatch = (index: number) => {
		setMatches(prev => prev.map((m, i) => {
			if (i !== index) return m;
			const newSelected = !m.selected;
			if (newSelected && !m.matchedMaterial) {
				initOverrides(i, m);
				return { ...m, selected: true, createNew: true };
			}
			return { ...m, selected: newSelected, createNew: false };
		}));
	};

	const toggleAll = (checked: boolean) => {
		setMatches(prev => prev.map((m, i) => {
			if (checked) {
				if (!m.matchedMaterial) {
					initOverrides(i, m);
					return { ...m, selected: true, createNew: true };
				}
				return { ...m, selected: true };
			} else {
				return { ...m, selected: false, createNew: false };
			}
		}));
	};

	const reassignMatch = (index: number, value: string) => {
		setMatches(prev => prev.map((m, i) => {
			if (i !== index) return m;
			if (value === '__create_new__') {
				initOverrides(i, m);
				return { ...m, matchedMaterial: null, selected: true, createNew: true, confidence: 0 };
			}
			if (value === '__none__') {
				return { ...m, matchedMaterial: null, selected: false, createNew: false, confidence: 0 };
			}
			const mat = materials.find(x => x.id === value) || null;
			return { ...m, matchedMaterial: mat, selected: !!mat, createNew: false, confidence: mat ? 0.5 : 0 };
		}));
	};

	const updateOverride = (index: number, field: keyof NewItemOverrides, value: string | null) => {
		setOverrides(prev => ({
			...prev,
			[index]: { ...prev[index], [field]: value }
		}));
	};

	const updatePrice = (index: number, value: string) => {
		setPriceOverrides(prev => ({ ...prev, [index]: value }));
	};

	const updateQuantity = (index: number, value: string) => {
		setQuantityOverrides(prev => ({ ...prev, [index]: value }));
	};

	const updateName = (index: number, value: string) => {
		setNameOverrides(prev => ({ ...prev, [index]: value }));
	};

	const getDisplayName = (m: MatchedMaterial, index: number): string => {
		return nameOverrides[index] !== undefined ? nameOverrides[index] : m.extractedName;
	};

	const addManualItem = () => {
		const newIndex = matches.length;
		const emptyImported: any = {
			name: '',
			category: null,
			supplier: null,
			unit: 'Stück',
			packaging_unit: null,
			amount_per_packaging: null,
			ordered_quantity: 1,
			unit_price: null,
			tax_rate: null,
			price_is_net: true,
			price_per: 'unit',
			notes: null,
			_id: `manual-${Date.now()}`,
			_selected: true,
		};
		const newMatch: MatchedMaterial = {
			extractedName: '',
			extractedQuantity: 1,
			extractedUnit: 'Stück',
			matchedMaterial: null,
			confidence: 0,
			selected: true,
			createNew: true,
			importedData: emptyImported,
		};
		setMatches(prev => [...prev, newMatch]);
		setNameOverrides(prev => ({ ...prev, [newIndex]: '' }));
		setPriceOverrides(prev => ({ ...prev, [newIndex]: '' }));
		setQuantityOverrides(prev => ({ ...prev, [newIndex]: '1' }));
		initOverrides(newIndex, newMatch);
	};

	const getParsedPrice = (index: number): number | null => {
		const val = priceOverrides[index];
		if (val === undefined || val === '') return null;
		const num = parseFloat(val);
		return isNaN(num) ? null : num;
	};

	const getParsedQuantity = (index: number): number => {
		const val = quantityOverrides[index];
		if (val === undefined || val === '') return 0;
		const num = parseFloat(val);
		return isNaN(num) ? 0 : num;
	};

	const handleApply = () => {
		const updates = matches
			.filter(m => m.selected && m.matchedMaterial && !m.createNew)
			.map(m => {
				const i = matches.indexOf(m);
				const qty = getParsedQuantity(i);
				const existing = m.matchedMaterial!.actual_quantity ?? 0;
				const newQty = addToExisting ? existing + qty : qty;
				const price = getParsedPrice(i);
				return { id: m.matchedMaterial!.id, actual_quantity: newQty, unit_price: price };
			});

		const supplier = supplierForNewItems.trim() || null;

		const newMaterials = matches
			.filter(m => m.selected && m.createNew)
			.map(m => {
				const i = matches.indexOf(m);
				const ov = overrides[i];
				const price = getParsedPrice(i);
				const qty = getParsedQuantity(i);
				const amountPer = ov?.amount_per_packaging ? Number(ov.amount_per_packaging) : m.importedData.amount_per_packaging;
				return {
					festival_id: festivalId,
					station_id: ov?.station_id || null,
					name: getDisplayName(m, i) || m.importedData.name,
					category: ov?.category || m.importedData.category,
					supplier,
					unit: ov?.unit || m.importedData.unit,
					packaging_unit: ov?.packaging_unit || m.importedData.packaging_unit,
					amount_per_packaging: amountPer != null && !isNaN(amountPer) ? amountPer : null,
					ordered_quantity: qty,
					actual_quantity: qty,
					unit_price: price,
					tax_rate: m.importedData.tax_rate,
					price_is_net: m.importedData.price_is_net ?? true,
					price_per: m.importedData.price_per ?? 'unit',
					notes: m.importedData.notes,
				};
			});

		if (updates.length > 0) onApply(updates);
		if (newMaterials.length > 0) onCreateNew(newMaterials);
	};

	const selectedUpdateCount = matches.filter(m => m.selected && m.matchedMaterial && !m.createNew).length;
	const selectedCreateCount = matches.filter(m => m.selected && m.createNew).length;
	const totalSelectedCount = selectedUpdateCount + selectedCreateCount;
	const unmatchedCount = matches.filter(m => !m.matchedMaterial && !m.createNew).length;
	const allSelected = matches.length > 0 && matches.every(m => m.selected);
	const someSelected = matches.some(m => m.selected);

	const totalInvoiceAmount = useMemo(() => {
		return matches.reduce((sum, _m, i) => {
			const price = getParsedPrice(i);
			const qty = getParsedQuantity(i);
			if (price != null) return sum + qty * price;
			return sum;
		}, 0);
	}, [matches, priceOverrides, quantityOverrides]);

	const buttonLabel = () => {
		const parts: string[] = [];
		if (selectedUpdateCount > 0) parts.push(`${selectedUpdateCount} aktualisieren`);
		if (selectedCreateCount > 0) parts.push(`${selectedCreateCount} neu erstellen`);
		return parts.length > 0 ? parts.join(' + ') : 'Übernehmen';
	};

	const renderMatchSelect = (m: MatchedMaterial, i: number) => (
		<Select
			value={m.createNew ? '__create_new__' : (m.matchedMaterial?.id || '__none__')}
			onValueChange={(v) => reassignMatch(i, v)}>
			<SelectTrigger className={`h-8 text-xs ${m.createNew ? 'border-primary' : ''}`}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="__none__">Nicht zuordnen</SelectItem>
				<SelectItem value="__create_new__">
					<span className="flex items-center gap-1">
						<PlusCircle className="h-3 w-3" />
						Neu erstellen
					</span>
				</SelectItem>
				{materials.map(mat => (
					<SelectItem key={mat.id} value={mat.id}>
						{mat.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);

	const renderQuantityPrice = (i: number, m: MatchedMaterial) => {
		const ov = overrides[i];
		const qty = getParsedQuantity(i);
		const price = getParsedPrice(i);
		const lineTotal = price != null && qty > 0 ? qty * price : null;
		return (
			<div className="flex items-center gap-1.5 flex-wrap">
				<Input
					type="number"
					min="0"
					step="any"
					value={quantityOverrides[i] ?? ''}
					onChange={(e) => updateQuantity(i, e.target.value)}
					className="h-7 text-xs w-16 px-1.5"
				/>
				<span className="text-xs text-muted-foreground">
					{ov?.unit || m.extractedUnit}
				</span>
				<span className="text-xs text-muted-foreground mx-0.5">×</span>
				<span className="text-xs text-muted-foreground">€</span>
				<Input
					type="number"
					min="0"
					step="0.01"
					value={priceOverrides[i] ?? ''}
					onChange={(e) => updatePrice(i, e.target.value)}
					className="h-7 text-xs w-20 px-1.5"
					placeholder="—"
				/>
				{lineTotal != null && (
					<span className="text-[10px] text-muted-foreground whitespace-nowrap">
						= {lineTotal.toFixed(2)} €
					</span>
				)}
			</div>
		);
	};

	const renderOverrides = (m: MatchedMaterial, i: number, ov: NewItemOverrides, mobile: boolean) => (
		<div className={mobile ? 'ml-7 grid grid-cols-2 gap-2' : 'px-3 pb-2 pt-0 ml-8 flex flex-wrap gap-2'}>
			<div className={mobile ? '' : 'w-[140px]'}>
				<label className="text-[10px] text-muted-foreground uppercase tracking-wide">Einheit</label>
				<Input
					value={ov.unit}
					onChange={(e) => updateOverride(i, 'unit', e.target.value)}
					className="h-7 text-xs mt-0.5"
					placeholder="z.B. Stück, Flasche"
					list="unit-suggestions-invoice"
				/>
			</div>
			<div className={mobile ? '' : 'w-[140px]'}>
				<label className="text-[10px] text-muted-foreground uppercase tracking-wide">Gebinde</label>
				<Input
					value={ov.packaging_unit || ''}
					onChange={(e) => updateOverride(i, 'packaging_unit', e.target.value || null)}
					className="h-7 text-xs mt-0.5"
					placeholder="z.B. Fass, Karton"
				/>
			</div>
			{ov.packaging_unit && (
				<div className={mobile ? '' : 'w-[140px]'}>
					<label className="text-[10px] text-muted-foreground uppercase tracking-wide">Menge/Gebinde</label>
					<Input
						type="number"
						min="0"
						step="any"
						value={ov.amount_per_packaging}
						onChange={(e) => updateOverride(i, 'amount_per_packaging', e.target.value)}
						className="h-7 text-xs mt-0.5"
						placeholder={`${ov.unit} pro ${ov.packaging_unit}`}
					/>
				</div>
			)}
			<div className={mobile ? '' : 'w-[160px]'}>
				<label className="text-[10px] text-muted-foreground uppercase tracking-wide">Kategorie</label>
				<Select
					value={ov.category || '__none__'}
					onValueChange={(v) => updateOverride(i, 'category', v === '__none__' ? null : v)}>
					<SelectTrigger className="h-7 text-xs mt-0.5">
						<SelectValue placeholder={mobile ? 'Keine' : 'Keine Kategorie'} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__none__">{mobile ? 'Keine' : 'Keine Kategorie'}</SelectItem>
						{existingCategories.map(c => (
							<SelectItem key={c} value={c}>{c}</SelectItem>
						))}
						{m.importedData.category &&
							!existingCategories.some(c => c.toLowerCase() === m.importedData.category!.toLowerCase()) && (
							<SelectItem value={m.importedData.category}>
								{m.importedData.category} (neu)
							</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>
			<div className={mobile ? '' : 'w-[160px]'}>
				<label className="text-[10px] text-muted-foreground uppercase tracking-wide">Station</label>
				<Select
					value={ov.station_id || '__none__'}
					onValueChange={(v) => updateOverride(i, 'station_id', v === '__none__' ? null : v)}>
					<SelectTrigger className="h-7 text-xs mt-0.5">
						<SelectValue placeholder={mobile ? 'Keine' : 'Keine Station'} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__none__">{mobile ? 'Keine' : 'Keine Station'}</SelectItem>
						{stations.map(s => (
							<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">Rechnungsabgleich</DialogTitle>
				</DialogHeader>

				{step === 'upload' && (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							<span className="hidden sm:inline">
								Laden Sie eine Rechnung oder Lieferschein hoch. Die KI extrahiert die Materialien
								und gleicht sie mit Ihrer bestehenden Materialliste ab.
							</span>
							<span className="sm:hidden">
								Rechnung fotografieren oder Datei hochladen. Die KI extrahiert und gleicht automatisch ab.
							</span>
						</p>
						<FileDropZone
							onFileSelected={handleFileSelected}
							accept={ACCEPT}
							error={error}
						/>
					</div>
				)}

				{step === 'processing' && (
					<div className="flex flex-col items-center justify-center gap-4 py-12">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<p className="text-muted-foreground text-sm">KI analysiert Rechnung...</p>
					</div>
				)}

				{step === 'preview' && (
					<div className="space-y-3 sm:space-y-4">
						{/* Summary badges */}
						<div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
							{selectedUpdateCount > 0 && (
								<Badge variant="secondary" className="gap-1 text-xs">
									<CheckCircle className="h-3 w-3" />
									{selectedUpdateCount} zugeordnet
								</Badge>
							)}
							{selectedCreateCount > 0 && (
								<Badge variant="default" className="gap-1 text-xs">
									<PlusCircle className="h-3 w-3" />
									{selectedCreateCount} neu
								</Badge>
							)}
							{unmatchedCount > 0 && (
								<Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
									<AlertCircle className="h-3 w-3" />
									{unmatchedCount} offen
								</Badge>
							)}
							{totalInvoiceAmount > 0 && (
								<Badge variant="outline" className="gap-1 text-xs ml-auto">
									Gesamt: {totalInvoiceAmount.toFixed(2)} €
								</Badge>
							)}
						</div>

						{/* Supplier field */}
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">
								Lieferant (aus Rechnung erkannt)
							</label>
							<div className="flex items-center gap-2">
								<div className="relative flex-1">
									<Input
										value={supplierForNewItems}
										onChange={(e) => setSupplierForNewItems(e.target.value)}
										placeholder="Lieferant eingeben..."
										className="h-8 text-sm"
										list="supplier-suggestions"
									/>
									<datalist id="supplier-suggestions">
										{existingSuppliers.map(s => (
											<option key={s} value={s} />
										))}
									</datalist>
								</div>
								{isNewSupplier && supplierForNewItems.trim() && (
									<Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">neu</Badge>
								)}
								{!isNewSupplier && supplierForNewItems.trim() && (
									<Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">vorhanden</Badge>
								)}
							</div>
						</div>

						{/* Add or replace toggle */}
						<div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
							<span className="text-muted-foreground text-xs">Menge:</span>
							<button
								type="button"
								onClick={() => setAddToExisting(true)}
								className={`px-2.5 sm:px-3 py-1 rounded-full text-xs border transition-colors ${
									addToExisting ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Addieren
							</button>
							<button
								type="button"
								onClick={() => setAddToExisting(false)}
								className={`px-2.5 sm:px-3 py-1 rounded-full text-xs border transition-colors ${
									!addToExisting ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Ersetzen
							</button>
						</div>

						{/* Select all / deselect all */}
						<div className="flex items-center gap-2">
							<Checkbox
								checked={allSelected ? true : someSelected ? 'indeterminate' : false}
								onCheckedChange={(checked) => toggleAll(!!checked)}
							/>
							<button
								type="button"
								onClick={() => toggleAll(!allSelected)}
								className="text-xs text-muted-foreground hover:text-foreground transition-colors">
								{allSelected ? 'Alle abwählen' : 'Alle auswählen'}
							</button>
							<span className="text-xs text-muted-foreground">
								({totalSelectedCount}/{matches.length})
							</span>
						</div>

						{/* Match list */}
						<div className="border rounded-md divide-y max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
							{matches.map((m, i) => {
								const ov = overrides[i];
								return (
									<div key={i} className={`${
										m.createNew ? 'bg-primary/5' : !m.matchedMaterial ? 'bg-amber-50/50' : ''
									}`}>
										{/* Mobile layout */}
										<div className="sm:hidden px-3 py-2 space-y-1.5">
											<div className="flex items-start gap-2">
												<Checkbox
													checked={m.selected}
													onCheckedChange={() => toggleMatch(i)}
													className="mt-0.5"
												/>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-1.5">
														<Input
															value={getDisplayName(m, i)}
															onChange={(e) => updateName(i, e.target.value)}
															className="h-7 text-sm font-medium px-1.5 flex-1"
															placeholder="Bezeichnung eingeben"
														/>
														<MatchStatusIcon m={m} />
													</div>
													<div className="mt-0.5">
														{renderQuantityPrice(i, m)}
													</div>
												</div>
											</div>
											<div className="ml-7">
												{renderMatchSelect(m, i)}
											</div>
											{m.createNew && m.selected && ov && renderOverrides(m, i, ov, true)}
										</div>

										{/* Desktop layout */}
										<div className="hidden sm:block">
											<div className="px-3 py-2 flex items-center gap-3">
												<Checkbox
													checked={m.selected}
													onCheckedChange={() => toggleMatch(i)}
												/>
												<div className="flex-1 min-w-0">
													<Input
														value={getDisplayName(m, i)}
														onChange={(e) => updateName(i, e.target.value)}
														className="h-7 text-sm font-medium px-1.5 mb-0.5"
														placeholder="Bezeichnung eingeben"
													/>
													<div className="mt-0.5">
														{renderQuantityPrice(i, m)}
													</div>
												</div>
												<span className="text-xs text-muted-foreground shrink-0 mx-1">&rarr;</span>
												<div className="w-[220px] shrink-0">
													{renderMatchSelect(m, i)}
												</div>
												<MatchStatusIcon m={m} />
											</div>
											{m.createNew && m.selected && ov && renderOverrides(m, i, ov, false)}
										</div>
									</div>
								);
							})}
						</div>

						{/* Add manual item */}
						<Button variant="outline" size="sm" onClick={addManualItem} className="w-full gap-1.5 text-muted-foreground">
							<Plus className="h-4 w-4" />
							Position manuell hinzufügen
						</Button>

						{/* Actions */}
						<div className="flex gap-2 sm:gap-3">
							<Button variant="outline" onClick={() => setStep('upload')} size="sm" className="flex-1 sm:size-default">
								<ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
								<span className="hidden sm:inline">Andere Datei</span>
								<span className="sm:hidden">Zurück</span>
							</Button>
							<Button
								onClick={handleApply}
								size="sm"
								className="flex-1 sm:size-default"
								disabled={totalSelectedCount === 0 || isApplying}>
								{isApplying ? 'Speichert...' : buttonLabel()}
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default InvoiceMatchDialog;
