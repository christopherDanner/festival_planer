import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { Station } from '@/lib/shiftService';
import { mergeSuggestions, canonicalizeValue } from '@/lib/materialSuggestions';
import { toBaseQuantity, fromBaseQuantity } from '@/lib/materialQuantity';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';

const DEFAULT_CATEGORIES = [
	'Getränke',
	'Lebensmittel',
	'Dekoration',
	'Geschirr/Besteck',
	'Inventar',
	'Technik',
	'Sonstiges'
];

const DEFAULT_UNITS = ['Stück', 'Liter', 'kg', 'Meter', 'Packung', 'Dose', 'Flasche'];
const DEFAULT_PACKAGING_UNITS = ['Fass', 'Karton', 'Kiste', 'Palette', 'Sack', 'Beutel', 'Kanister'];

interface MaterialDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	material?: FestivalMaterialWithStation | null;
	stations: Station[];
	festivalId: string;
	existingSuppliers?: string[];
	existingCategories?: string[];
	onCreateStation?: (name: string) => Promise<Station>;
	onSave: (data: {
		festival_id: string;
		station_id: string | null;
		name: string;
		category: string | null;
		supplier: string | null;
		unit: string;
		packaging_unit: string | null;
		amount_per_packaging: number | null;
		ordered_quantity: number;
		actual_quantity: number | null;
		unit_price: number | null;
		tax_rate: number | null;
		price_is_net: boolean;
		price_per: string;
		notes: string | null;
	}) => void;
}

const MaterialDialog: React.FC<MaterialDialogProps> = ({
	open,
	onOpenChange,
	material,
	stations,
	festivalId,
	existingSuppliers = [],
	existingCategories = [],
	onCreateStation,
	onSave
}) => {
	const categorySuggestions = mergeSuggestions(DEFAULT_CATEGORIES, existingCategories);
	const supplierSuggestions = mergeSuggestions([], existingSuppliers);
	const [creatingStation, setCreatingStation] = useState(false);
	const [newStationName, setNewStationName] = useState('');
	const [creatingStationBusy, setCreatingStationBusy] = useState(false);
	const [form, setForm] = useState({
		name: '',
		category: '' as string,
		station_id: '' as string,
		supplier: '',
		unit: 'Stück',
		packaging_unit: '',
		amount_per_packaging: '' as string,
		ordered_quantity: '' as string,
		actual_quantity: '' as string,
		unit_price: '' as string,
		tax_rate: '' as string,
		price_is_net: 'true' as string,
		price_per: 'packaging' as string,
		notes: ''
	});

	useEffect(() => {
		setCreatingStation(false);
		setNewStationName('');
		setCreatingStationBusy(false);
		if (material) {
			const orderedBase = toBaseQuantity(material.ordered_quantity, material);
			const actualBase = toBaseQuantity(material.actual_quantity, material);
			setForm({
				name: material.name,
				category: material.category || '',
				station_id: material.station_id || '',
				supplier: material.supplier || '',
				unit: material.unit,
				packaging_unit: material.packaging_unit || '',
				amount_per_packaging:
					material.amount_per_packaging != null ? String(material.amount_per_packaging) : '',
				ordered_quantity: orderedBase != null ? String(orderedBase) : '',
				actual_quantity: actualBase != null ? String(actualBase) : '',
				unit_price: material.unit_price != null ? String(material.unit_price) : '',
				tax_rate: material.tax_rate != null ? String(material.tax_rate) : '',
				price_is_net: material.price_is_net ? 'true' : 'false',
				price_per: material.price_per || 'packaging',
				notes: material.notes || ''
			});
		} else {
			setForm({
				name: '',
				category: '',
				station_id: '',
				supplier: '',
				unit: 'Stück',
				packaging_unit: '',
				amount_per_packaging: '',
				ordered_quantity: '',
				actual_quantity: '',
				unit_price: '',
				tax_rate: '',
				price_is_net: 'true',
				price_per: 'packaging',
				notes: ''
			});
		}
	}, [material, open]);

	const handleCreateStation = async () => {
		if (!onCreateStation) return;
		const trimmed = newStationName.trim();
		if (!trimmed) return;
		const existing = stations.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
		if (existing) {
			setForm((prev) => ({ ...prev, station_id: existing.id }));
			setCreatingStation(false);
			setNewStationName('');
			return;
		}
		setCreatingStationBusy(true);
		try {
			const created = await onCreateStation(trimmed);
			setForm((prev) => ({ ...prev, station_id: created.id }));
			setCreatingStation(false);
			setNewStationName('');
		} finally {
			setCreatingStationBusy(false);
		}
	};

	const handleSave = () => {
		if (!form.name || !form.ordered_quantity) return;
		const normalizedCategory = canonicalizeValue(form.category, categorySuggestions);
		const normalizedSupplier = canonicalizeValue(form.supplier, supplierSuggestions);
		const quantityContext = {
			packaging_unit: form.packaging_unit || null,
			amount_per_packaging: form.amount_per_packaging ? Number(form.amount_per_packaging) : null
		};
		onSave({
			festival_id: festivalId,
			station_id: form.station_id && form.station_id !== '__none__' ? form.station_id : null,
			name: form.name,
			category: normalizedCategory || null,
			supplier: normalizedSupplier || null,
			unit: form.unit,
			packaging_unit: form.packaging_unit || null,
			amount_per_packaging: quantityContext.amount_per_packaging,
			ordered_quantity: fromBaseQuantity(Number(form.ordered_quantity), quantityContext),
			actual_quantity: form.actual_quantity
				? fromBaseQuantity(Number(form.actual_quantity), quantityContext)
				: null,
			unit_price: form.unit_price ? Number(form.unit_price) : null,
			tax_rate: form.tax_rate && form.tax_rate !== '__none__' ? Number(form.tax_rate) : null,
			price_is_net: form.price_is_net === 'true',
			price_per: form.packaging_unit ? form.price_per : 'unit',
			notes: form.notes || null
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{material ? 'Material bearbeiten' : 'Material hinzufügen'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Grunddaten
						</h3>
						<div>
							<Label htmlFor="mat-name">Name *</Label>
							<Input
								id="mat-name"
								value={form.name}
								onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
								placeholder="z.B. Bier, Servietten, Grillkohle"
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
							<div>
								<Label htmlFor="mat-category">Kategorie</Label>
								<CreatableCombobox
									id="mat-category"
									value={form.category}
									onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
									suggestions={categorySuggestions}
									placeholder="Suchen oder neu anlegen"
									emptyPlaceholder="Keine Kategorie"
								/>
							</div>
							<div>
								<Label htmlFor="mat-station">Station</Label>
								{creatingStation ? (
								<div className="flex gap-2">
									<Input
										id="mat-station"
										autoFocus
										value={newStationName}
										onChange={(e) => setNewStationName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleCreateStation();
											} else if (e.key === 'Escape') {
												e.preventDefault();
												setCreatingStation(false);
												setNewStationName('');
											}
										}}
										placeholder="Stationsname"
										disabled={creatingStationBusy}
									/>
									<Button
										type="button"
										size="icon"
										variant="default"
										onClick={handleCreateStation}
										disabled={!newStationName.trim() || creatingStationBusy}
										title="Anlegen">
										<Check className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="outline"
										onClick={() => {
											setCreatingStation(false);
											setNewStationName('');
										}}
										disabled={creatingStationBusy}
										title="Abbrechen">
										<X className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Select
									value={form.station_id || '__none__'}
									onValueChange={(value) => {
										if (value === '__create__') {
											setCreatingStation(true);
											return;
										}
										setForm((prev) => ({ ...prev, station_id: value === '__none__' ? '' : value }));
									}}>
									<SelectTrigger id="mat-station">
										<SelectValue placeholder="Keine Station" />
									</SelectTrigger>
									<SelectContent>
										{onCreateStation && (
											<SelectItem value="__create__" className="text-primary">
												<span className="inline-flex items-center gap-1">
													<Plus className="h-3.5 w-3.5" /> Neue Station anlegen
												</span>
											</SelectItem>
										)}
										<SelectItem value="__none__">Keine Station</SelectItem>
										{stations.map((station) => (
											<SelectItem key={station.id} value={station.id}>
												{station.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
					</div>

					<div>
						<Label htmlFor="mat-supplier">Lieferant</Label>
						<CreatableCombobox
							id="mat-supplier"
							value={form.supplier}
							onChange={(value) => setForm((prev) => ({ ...prev, supplier: value }))}
							suggestions={supplierSuggestions}
							placeholder="Suchen oder neu anlegen"
							emptyPlaceholder="Kein Lieferant"
						/>
					</div>
					</section>

					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Einheit & Gebinde
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<div>
							<Label htmlFor="mat-unit">Einheit *</Label>
							<CreatableCombobox
								id="mat-unit"
								value={form.unit}
								onChange={(value) => setForm((prev) => ({ ...prev, unit: value }))}
								suggestions={DEFAULT_UNITS}
								placeholder="Suchen oder neu anlegen"
								emptyPlaceholder="Einheit wählen"
							/>
						</div>
						<div>
							<Label htmlFor="mat-packaging">Gebinde</Label>
							<CreatableCombobox
								id="mat-packaging"
								value={form.packaging_unit}
								onChange={(value) => setForm((prev) => ({ ...prev, packaging_unit: value }))}
								suggestions={DEFAULT_PACKAGING_UNITS}
								placeholder="Suchen oder neu anlegen"
								emptyPlaceholder="Kein Gebinde"
							/>
						</div>
					</div>

					{form.packaging_unit && (
						<div>
							<Label htmlFor="mat-amount-per">
								{form.unit} pro {form.packaging_unit}
							</Label>
							<Input
								id="mat-amount-per"
								type="number"
								min="0"
								step="any"
								value={form.amount_per_packaging}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, amount_per_packaging: e.target.value }))
								}
								placeholder={`z.B. 50 für 50${form.unit === 'Liter' ? 'L' : form.unit} ${form.packaging_unit}`}
							/>
						</div>
					)}
					</section>

					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Mengen
						</h3>
						<div className="grid grid-cols-2 gap-3 sm:gap-4">
						<div>
							<Label htmlFor="mat-ordered">Bestellmenge * ({form.unit || 'Einheit'})</Label>
							<Input
								id="mat-ordered"
								type="number"
								min="0"
								step="any"
								value={form.ordered_quantity}
								onChange={(e) => setForm((prev) => ({ ...prev, ordered_quantity: e.target.value }))}
								placeholder={form.unit ? `Menge in ${form.unit}` : 'Menge'}
							/>
						</div>
						<div>
							<Label htmlFor="mat-actual">Verbrauch ({form.unit || 'Einheit'})</Label>
							<Input
								id="mat-actual"
								type="number"
								min="0"
								step="any"
								value={form.actual_quantity}
								onChange={(e) => setForm((prev) => ({ ...prev, actual_quantity: e.target.value }))}
								placeholder="Optional"
							/>
						</div>
					</div>
					</section>

					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Preis
						</h3>
						{form.packaging_unit && (
						<div>
							<Label>Preis bezieht sich auf</Label>
							<div className="flex gap-1 mt-1">
								<Button
									size="sm"
									variant={form.price_per === 'unit' ? 'default' : 'outline'}
									type="button"
									className="flex-1 h-8 text-xs"
									onClick={() => setForm((prev) => ({ ...prev, price_per: 'unit' }))}>
									pro {form.unit}
								</Button>
								<Button
									size="sm"
									variant={form.price_per === 'packaging' ? 'default' : 'outline'}
									type="button"
									className="flex-1 h-8 text-xs"
									onClick={() => setForm((prev) => ({ ...prev, price_per: 'packaging' }))}>
									pro {form.packaging_unit}
								</Button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<Label htmlFor="mat-price">
								Preis pro{' '}
								{form.packaging_unit && form.price_per === 'packaging'
									? form.packaging_unit
									: form.unit}{' '}
								(€)
							</Label>
							<Input
								id="mat-price"
								type="number"
								min="0"
								step="0.01"
								value={form.unit_price}
								onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))}
								placeholder="0.00"
							/>
						</div>
						<div>
							<Label>Preisart</Label>
							<div className="flex gap-1 mt-1">
								<Button
									type="button"
									size="sm"
									variant={form.price_is_net === 'true' ? 'default' : 'outline'}
									onClick={() => setForm((prev) => ({ ...prev, price_is_net: 'true' }))}>
									Netto
								</Button>
								<Button
									type="button"
									size="sm"
									variant={form.price_is_net === 'false' ? 'default' : 'outline'}
									onClick={() => setForm((prev) => ({ ...prev, price_is_net: 'false' }))}>
									Brutto
								</Button>
							</div>
						</div>
						<div>
							<Label htmlFor="mat-tax-rate">MwSt-Satz</Label>
							<Select
								value={form.tax_rate || '__none__'}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, tax_rate: value === '__none__' ? '' : value }))
								}>
								<SelectTrigger id="mat-tax-rate">
									<SelectValue placeholder="Keine" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Keine</SelectItem>
									<SelectItem value="10">10% (Lebensmittel)</SelectItem>
									<SelectItem value="13">13% (Beherbergung)</SelectItem>
									<SelectItem value="20">20% (Standard)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					</section>

					<section className="space-y-3 rounded-lg border bg-muted/30 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Notizen
						</h3>
						<div>
							<Label htmlFor="mat-notes" className="sr-only">Notizen</Label>
							<Textarea
								id="mat-notes"
								value={form.notes}
								onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
								placeholder="Zusätzliche Informationen..."
								rows={2}
							/>
						</div>
					</section>
				</div>

				<div className="flex justify-end gap-2 pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
						Abbrechen
					</Button>
					<Button onClick={handleSave} disabled={!form.name || !form.ordered_quantity} size="sm">
						{material ? 'Aktualisieren' : 'Hinzufügen'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialDialog;
