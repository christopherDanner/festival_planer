import React, { useEffect, useState, type ElementType } from 'react';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields
} from '@/components/toolkit/PaperSheet';
import type { Station } from '@/lib/shiftService';
import {
	canSave,
	KEINE,
	showsQuantityAndPrice,
	ZEILEN_HINWEIS,
	type MaterialDialogMode,
	type MaterialForm,
	type PriceBase,
	type PriceIsNet
} from '@/lib/materialDialogForm';

const DEFAULT_UNITS = ['Stück', 'Liter', 'kg', 'Meter', 'Packung', 'Dose', 'Flasche'];
const DEFAULT_PACKAGING_UNITS = ['Fass', 'Karton', 'Kiste', 'Palette', 'Sack', 'Beutel', 'Kanister'];

export interface MaterialZettelProps {
	mode: MaterialDialogMode;
	form: MaterialForm;
	onChange: (patch: Partial<MaterialForm>) => void;
	stations: Station[];
	categorySuggestions: string[];
	supplierSuggestions: string[];
	onCreateStation?: (name: string) => Promise<Station>;
	onCancel: () => void;
	onSave: () => void;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

/**
 * Der Positions-Zettel (#117): Papier-Grund, 3px-Tinte-Rahmen,
 * Versatz-Schatten, grüner Halftone-Kopf mit Oswald-Titel, gelber
 * Primärknopf — der Rahmen kommt aus `<PaperSheet>` (#119), damit Positions- und
 * Export-Dialoge dasselbe Papier bedrucken.
 *
 * Inhaltlich ist er auf **Stammdaten** geschnitten (Entscheid Wayfinder #66):
 * Bezeichnung, Kategorie, Station, Lieferant, Gebinde, Einheit, Stück je
 * Gebinde, Notiz. Mengen und Preise ändert man in der Zeile (#115) — beim
 * *Anlegen* stehen sie trotzdem hier, damit eine Position in einem Zug
 * vollständig wird.
 *
 * Der Zettel ist gesteuert: er hält keinen Formularzustand außer dem
 * Zwischenschritt „neue Station anlegen".
 */
const MaterialZettel: React.FC<MaterialZettelProps> = ({
	mode,
	form,
	onChange,
	stations,
	categorySuggestions,
	supplierSuggestions,
	onCreateStation,
	onCancel,
	onSave,
	TitleTag = 'h2'
}) => {
	const [creatingStation, setCreatingStation] = useState(false);
	const [newStationName, setNewStationName] = useState('');
	const [creatingStationBusy, setCreatingStationBusy] = useState(false);

	// Verschwindet der Weg zum Anlegen (anderer Aufrufer), darf kein halb
	// offenes Eingabefeld stehen bleiben.
	useEffect(() => {
		if (!onCreateStation) setCreatingStation(false);
	}, [onCreateStation]);

	const handleCreateStation = async () => {
		if (!onCreateStation) return;
		const trimmed = newStationName.trim();
		if (!trimmed) return;
		const existing = stations.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
		if (existing) {
			onChange({ station_id: existing.id });
			setCreatingStation(false);
			setNewStationName('');
			return;
		}
		setCreatingStationBusy(true);
		try {
			const created = await onCreateStation(trimmed);
			onChange({ station_id: created.id });
			setCreatingStation(false);
			setNewStationName('');
		} finally {
			setCreatingStationBusy(false);
		}
	};

	const gebinde = form.packaging_unit.trim();
	const mengenUndPreis = showsQuantityAndPrice(mode);
	const preisBezug = gebinde && form.price_per === 'packaging' ? gebinde : form.unit;

	return (
		<PaperSheet
			title={mode === 'edit' ? 'Position bearbeiten' : 'Neue Position'}
			TitleTag={TitleTag}
			onClose={onCancel}
			footer={
				<>
					<Button variant="outline" className={FOCUS_INK} onClick={onCancel}>
						Abbrechen
					</Button>
					<Button
						data-zettel="speichern"
						className={FOCUS_INK}
						onClick={onSave}
						disabled={!canSave(form, mode)}>
						{mode === 'edit' ? 'Speichern' : 'Anlegen'}
					</Button>
				</>
			}>
			<PaperSheetFields>
				{mode === 'edit' && (
					// Der Hinweis steht neben der Lücke, nicht im Changelog.
					<p className="border-2 border-l-[7px] border-tinte bg-white px-3 py-2 text-xs leading-relaxed min-[900px]:col-span-2">
						Hier liegen die <b>Stammdaten</b> der Position. {ZEILEN_HINWEIS}
					</p>
				)}

				<PaperSheetField wide label="Bezeichnung" htmlFor="mat-name">
					<Input
						id="mat-name"
						className={FOCUS_INK}
						value={form.name}
						onChange={(e) => onChange({ name: e.target.value })}
						placeholder="z.B. Bier, Servietten, Grillkohle"
					/>
				</PaperSheetField>

				<PaperSheetField label="Kategorie" htmlFor="mat-category">
					<CreatableCombobox
						id="mat-category"
						className={FOCUS_INK}
						value={form.category}
						onChange={(value) => onChange({ category: value })}
						suggestions={categorySuggestions}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Keine Kategorie"
					/>
				</PaperSheetField>

				<PaperSheetField label="Station" htmlFor="mat-station">
					{creatingStation ? (
						<div className="flex gap-2">
							<Input
								id="mat-station"
								autoFocus
								className={FOCUS_INK}
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
								className={FOCUS_INK}
								onClick={handleCreateStation}
								disabled={!newStationName.trim() || creatingStationBusy}
								title="Anlegen">
								<Check className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="outline"
								className={FOCUS_INK}
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
						<div className="flex gap-2">
							<Select
								value={form.station_id || KEINE}
								onValueChange={(value) =>
									onChange({ station_id: value === KEINE ? '' : value })
								}>
								<SelectTrigger id="mat-station" className={FOCUS_INK}>
									<SelectValue placeholder="Keine Station" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={KEINE}>Keine Station</SelectItem>
									{stations.map((station) => (
										<SelectItem key={station.id} value={station.id}>
											{station.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{onCreateStation && (
								<Button
									type="button"
									variant="outline"
									className={cn('shrink-0 px-2.5 text-xs', FOCUS_INK)}
									onClick={() => setCreatingStation(true)}>
									+ Station
								</Button>
							)}
						</div>
					)}
				</PaperSheetField>

				<PaperSheetField label="Lieferant" htmlFor="mat-supplier">
					<CreatableCombobox
						id="mat-supplier"
						className={FOCUS_INK}
						value={form.supplier}
						onChange={(value) => onChange({ supplier: value })}
						suggestions={supplierSuggestions}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Kein Lieferant"
					/>
				</PaperSheetField>

				<PaperSheetField label="Gebinde" htmlFor="mat-packaging">
					<CreatableCombobox
						id="mat-packaging"
						className={FOCUS_INK}
						value={form.packaging_unit}
						onChange={(value) => onChange({ packaging_unit: value })}
						suggestions={DEFAULT_PACKAGING_UNITS}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Kein Gebinde"
					/>
				</PaperSheetField>

				<PaperSheetField label="Einheit" htmlFor="mat-unit">
					<CreatableCombobox
						id="mat-unit"
						className={FOCUS_INK}
						value={form.unit}
						onChange={(value) => onChange({ unit: value })}
						suggestions={DEFAULT_UNITS}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Einheit wählen"
					/>
				</PaperSheetField>

				<PaperSheetField
					label={gebinde ? `${form.unit} je ${gebinde}` : 'Stück je Gebinde'}
					htmlFor="mat-amount-per"
					hint={gebinde ? null : 'Erst mit Gebinde'}>
					<Input
						id="mat-amount-per"
						type="number"
						min="0"
						step="any"
						className={FOCUS_INK}
						disabled={!gebinde}
						value={form.amount_per_packaging}
						onChange={(e) => onChange({ amount_per_packaging: e.target.value })}
						placeholder={gebinde ? `z.B. 50 ${form.unit} je ${gebinde}` : '—'}
					/>
				</PaperSheetField>

				<PaperSheetField wide label="Notiz" htmlFor="mat-notes">
					<Textarea
						id="mat-notes"
						rows={2}
						className={FOCUS_INK}
						value={form.notes}
						onChange={(e) => onChange({ notes: e.target.value })}
						placeholder="z.B. Abholung Freitag 14 Uhr"
					/>
				</PaperSheetField>

				{mengenUndPreis && (
					<>
						<SectionHeading as="h3" className="mt-1 min-[900px]:col-span-2">
							Mengen &amp; Preis
						</SectionHeading>

						<PaperSheetField label={`Bestellt (${form.unit || 'Einheit'})`} htmlFor="mat-ordered">
							<Input
								id="mat-ordered"
								type="number"
								min="0"
								step="any"
								className={cn('text-right tabular-nums', FOCUS_INK)}
								value={form.ordered_quantity}
								onChange={(e) => onChange({ ordered_quantity: e.target.value })}
								placeholder={form.unit ? `Menge in ${form.unit}` : 'Menge'}
							/>
						</PaperSheetField>

						<PaperSheetField
							label={`Verbraucht (${form.unit || 'Einheit'})`}
							htmlFor="mat-actual"
							hint="Wird typisch nach dem Fest nachgetragen">
							<Input
								id="mat-actual"
								type="number"
								min="0"
								step="any"
								className={cn('text-right tabular-nums', FOCUS_INK)}
								value={form.actual_quantity}
								onChange={(e) => onChange({ actual_quantity: e.target.value })}
								placeholder="Optional"
							/>
						</PaperSheetField>

						<PaperSheetField label={`Preis je ${preisBezug} (€)`} htmlFor="mat-price">
							<Input
								id="mat-price"
								type="number"
								min="0"
								step="0.01"
								className={cn('text-right tabular-nums', FOCUS_INK)}
								value={form.unit_price}
								onChange={(e) => onChange({ unit_price: e.target.value })}
								placeholder="0.00"
							/>
						</PaperSheetField>

						<PaperSheetField label="MwSt" htmlFor="mat-tax-rate">
							<Select
								value={form.tax_rate || KEINE}
								onValueChange={(value) => onChange({ tax_rate: value === KEINE ? '' : value })}>
								<SelectTrigger id="mat-tax-rate" className={FOCUS_INK}>
									<SelectValue placeholder="Keine" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={KEINE}>Keine</SelectItem>
									<SelectItem value="10">10% (Lebensmittel)</SelectItem>
									<SelectItem value="13">13% (Beherbergung)</SelectItem>
									<SelectItem value="20">20% (Standard)</SelectItem>
								</SelectContent>
							</Select>
						</PaperSheetField>

						<PaperSheetField
							wide
							label="Preisbasis"
							hint="Ohne MwSt sind Netto und Brutto gleich.">
							<SegmentedControl
								aria-label="Preisbasis"
								className="w-max"
								value={form.price_is_net}
								onValueChange={(value: PriceIsNet) => onChange({ price_is_net: value })}
								options={[
									{ value: 'true', label: 'Netto eingegeben' },
									{ value: 'false', label: 'Brutto eingegeben' }
								]}
							/>
						</PaperSheetField>

						{gebinde && (
							<PaperSheetField wide label="Preis bezieht sich auf">
								<SegmentedControl
									aria-label="Preis bezieht sich auf"
									className="w-max"
									value={form.price_per}
									onValueChange={(value: PriceBase) => onChange({ price_per: value })}
									options={[
										{ value: 'unit', label: `pro ${form.unit}` },
										{ value: 'packaging', label: `pro ${gebinde}` }
									]}
								/>
							</PaperSheetField>
						)}
					</>
				)}
			</PaperSheetFields>
		</PaperSheet>
	);
};

export default MaterialZettel;
