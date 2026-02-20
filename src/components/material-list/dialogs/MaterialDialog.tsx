import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { Station } from '@/lib/shiftService';

interface MaterialDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	material?: FestivalMaterialWithStation | null;
	stations: Station[];
	festivalId: string;
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
		notes: string | null;
	}) => void;
}

const CATEGORIES = ['Getränke', 'Lebensmittel', 'Dekoration', 'Geschirr/Besteck', 'Technik', 'Sonstiges'];
const UNITS = ['Stück', 'Liter', 'kg', 'Meter'];

const MaterialDialog: React.FC<MaterialDialogProps> = ({
	open,
	onOpenChange,
	material,
	stations,
	festivalId,
	onSave
}) => {
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
		notes: ''
	});

	useEffect(() => {
		if (material) {
			setForm({
				name: material.name,
				category: material.category || '',
				station_id: material.station_id || '',
				supplier: material.supplier || '',
				unit: material.unit,
				packaging_unit: material.packaging_unit || '',
				amount_per_packaging: material.amount_per_packaging != null ? String(material.amount_per_packaging) : '',
				ordered_quantity: String(material.ordered_quantity),
				actual_quantity: material.actual_quantity != null ? String(material.actual_quantity) : '',
				unit_price: material.unit_price != null ? String(material.unit_price) : '',
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
				notes: ''
			});
		}
	}, [material, open]);

	const handleSave = () => {
		if (!form.name || !form.ordered_quantity) return;
		onSave({
			festival_id: festivalId,
			station_id: form.station_id && form.station_id !== '__none__' ? form.station_id : null,
			name: form.name,
			category: form.category || null,
			supplier: form.supplier || null,
			unit: form.unit,
			packaging_unit: form.packaging_unit || null,
			amount_per_packaging: form.amount_per_packaging ? Number(form.amount_per_packaging) : null,
			ordered_quantity: Number(form.ordered_quantity),
			actual_quantity: form.actual_quantity ? Number(form.actual_quantity) : null,
			unit_price: form.unit_price ? Number(form.unit_price) : null,
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
				<div className="space-y-4">
					<div>
						<Label htmlFor="mat-name">Name *</Label>
						<Input
							id="mat-name"
							value={form.name}
							onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="z.B. Bier, Servietten, Grillkohle"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="mat-category">Kategorie</Label>
							<Select
								value={form.category}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, category: value === '__none__' ? '' : value }))
								}>
								<SelectTrigger id="mat-category">
									<SelectValue placeholder="Kategorie wählen" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Keine Kategorie</SelectItem>
									{CATEGORIES.map((cat) => (
										<SelectItem key={cat} value={cat}>{cat}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="mat-station">Station</Label>
							<Select
								value={form.station_id || '__none__'}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, station_id: value === '__none__' ? '' : value }))
								}>
								<SelectTrigger id="mat-station">
									<SelectValue placeholder="Keine Station" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Keine Station</SelectItem>
									{stations.map((station) => (
										<SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label htmlFor="mat-supplier">Lieferant</Label>
						<Input
							id="mat-supplier"
							value={form.supplier}
							onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
							placeholder="z.B. Getränkehandel Müller"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="mat-unit">Einheit *</Label>
							<Select
								value={form.unit}
								onValueChange={(value) => setForm((prev) => ({ ...prev, unit: value }))}>
								<SelectTrigger id="mat-unit">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{UNITS.map((u) => (
										<SelectItem key={u} value={u}>{u}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="mat-packaging">Gebindeeinheit</Label>
							<Input
								id="mat-packaging"
								value={form.packaging_unit}
								onChange={(e) => setForm((prev) => ({ ...prev, packaging_unit: e.target.value }))}
								placeholder="z.B. Fass, Karton, Kiste"
							/>
						</div>
					</div>

					{form.packaging_unit && (
						<div>
							<Label htmlFor="mat-amount-per">Menge pro Gebinde ({form.unit})</Label>
							<Input
								id="mat-amount-per"
								type="number"
								min="0"
								step="any"
								value={form.amount_per_packaging}
								onChange={(e) => setForm((prev) => ({ ...prev, amount_per_packaging: e.target.value }))}
								placeholder={`z.B. 50 für 50${form.unit === 'Liter' ? 'L' : form.unit} ${form.packaging_unit}`}
							/>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="mat-ordered">Bestellmenge *</Label>
							<Input
								id="mat-ordered"
								type="number"
								min="0"
								step="any"
								value={form.ordered_quantity}
								onChange={(e) => setForm((prev) => ({ ...prev, ordered_quantity: e.target.value }))}
								placeholder={form.packaging_unit ? `Anzahl ${form.packaging_unit}` : `Anzahl ${form.unit}`}
							/>
						</div>
						<div>
							<Label htmlFor="mat-actual">Tatsächlicher Verbrauch</Label>
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

					<div>
						<Label htmlFor="mat-price">
							Preis pro {form.packaging_unit || form.unit} (€)
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
						<Label htmlFor="mat-notes">Notizen</Label>
						<Textarea
							id="mat-notes"
							value={form.notes}
							onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
							placeholder="Zusätzliche Informationen..."
							rows={2}
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.name || !form.ordered_quantity}>
							{material ? 'Aktualisieren' : 'Hinzufügen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialDialog;
