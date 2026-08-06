import React, { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
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
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { Poster } from '@/components/toolkit/Poster';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
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

/**
 * Fokus als 2px-Tinte-Outline mit Versatz (DESIGN-VISION §6, #117). Die
 * Shell-Bausteine bringen einen Ring mit; der wird hier abgeschaltet, damit
 * nicht beides übereinander liegt. Zustände als Tailwind-Utilities in der
 * Komponente sind der von ADR 0003 §2 vorgesehene Ort; die Ringe der Hüllen
 * repo-weit auf Outline zu drehen wäre ein eigenes Ticket.
 */
const FOKUS =
	'focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ' +
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

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
 * Primärknopf.
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
		<div className="max-h-[88vh] w-full overflow-y-auto border-3 border-tinte bg-papier shadow-versatz">
			<Poster className="sticky top-0 z-10 flex items-center gap-3 border-0 border-b-2 px-4 py-2.5">
				<TitleTag className="font-display text-[17px] font-semibold uppercase tracking-[.02em]">
					{mode === 'edit' ? 'Position bearbeiten' : 'Neue Position'}
				</TitleTag>
				{/* Gelber Knopf auf dem Plakat-Kopf — gleiches Rezept wie
				„+ POSITION FÜR …" im Gruppen-Kasten (#113). */}
				<button
					type="button"
					onClick={onCancel}
					className={cn(
						'ml-auto bg-gelb px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte',
						'max-[899px]:min-h-10',
						// Papier statt Tinte: auf der grünen Kopffläche wäre eine
						// Tinte-Outline kaum zu sehen.
						'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papier'
					)}>
					Schließen
				</button>
			</Poster>

			<div className="grid grid-cols-1 gap-3.5 px-4 py-4 min-[900px]:grid-cols-2">
				{mode === 'edit' && (
					// Der Hinweis steht neben der Lücke, nicht im Changelog.
					<p className="border-2 border-l-[7px] border-tinte bg-white px-3 py-2 text-xs leading-relaxed min-[900px]:col-span-2">
						Hier liegen die <b>Stammdaten</b> der Position. {ZEILEN_HINWEIS}
					</p>
				)}

				<Feld wide label="Bezeichnung" htmlFor="mat-name">
					<Input
						id="mat-name"
						className={FOKUS}
						value={form.name}
						onChange={(e) => onChange({ name: e.target.value })}
						placeholder="z.B. Bier, Servietten, Grillkohle"
					/>
				</Feld>

				<Feld label="Kategorie" htmlFor="mat-category">
					<CreatableCombobox
						id="mat-category"
						className={FOKUS}
						value={form.category}
						onChange={(value) => onChange({ category: value })}
						suggestions={categorySuggestions}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Keine Kategorie"
					/>
				</Feld>

				<Feld label="Station" htmlFor="mat-station">
					{creatingStation ? (
						<div className="flex gap-2">
							<Input
								id="mat-station"
								autoFocus
								className={FOKUS}
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
								className={FOKUS}
								onClick={handleCreateStation}
								disabled={!newStationName.trim() || creatingStationBusy}
								title="Anlegen">
								<Check className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="outline"
								className={FOKUS}
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
								<SelectTrigger id="mat-station" className={FOKUS}>
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
									className={cn('shrink-0 px-2.5 text-xs', FOKUS)}
									onClick={() => setCreatingStation(true)}>
									+ Station
								</Button>
							)}
						</div>
					)}
				</Feld>

				<Feld label="Lieferant" htmlFor="mat-supplier">
					<CreatableCombobox
						id="mat-supplier"
						className={FOKUS}
						value={form.supplier}
						onChange={(value) => onChange({ supplier: value })}
						suggestions={supplierSuggestions}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Kein Lieferant"
					/>
				</Feld>

				<Feld label="Gebinde" htmlFor="mat-packaging">
					<CreatableCombobox
						id="mat-packaging"
						className={FOKUS}
						value={form.packaging_unit}
						onChange={(value) => onChange({ packaging_unit: value })}
						suggestions={DEFAULT_PACKAGING_UNITS}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Kein Gebinde"
					/>
				</Feld>

				<Feld label="Einheit" htmlFor="mat-unit">
					<CreatableCombobox
						id="mat-unit"
						className={FOKUS}
						value={form.unit}
						onChange={(value) => onChange({ unit: value })}
						suggestions={DEFAULT_UNITS}
						placeholder="Suchen oder neu anlegen"
						emptyPlaceholder="Einheit wählen"
					/>
				</Feld>

				<Feld
					label={gebinde ? `${form.unit} je ${gebinde}` : 'Stück je Gebinde'}
					htmlFor="mat-amount-per"
					hint={gebinde ? null : 'Erst mit Gebinde'}>
					<Input
						id="mat-amount-per"
						type="number"
						min="0"
						step="any"
						className={FOKUS}
						disabled={!gebinde}
						value={form.amount_per_packaging}
						onChange={(e) => onChange({ amount_per_packaging: e.target.value })}
						placeholder={gebinde ? `z.B. 50 ${form.unit} je ${gebinde}` : '—'}
					/>
				</Feld>

				<Feld wide label="Notiz" htmlFor="mat-notes">
					<Textarea
						id="mat-notes"
						rows={2}
						className={FOKUS}
						value={form.notes}
						onChange={(e) => onChange({ notes: e.target.value })}
						placeholder="z.B. Abholung Freitag 14 Uhr"
					/>
				</Feld>

				{mengenUndPreis && (
					<>
						<SectionHeading as="h3" className="mt-1 min-[900px]:col-span-2">
							Mengen &amp; Preis
						</SectionHeading>

						<Feld label={`Bestellt (${form.unit || 'Einheit'})`} htmlFor="mat-ordered">
							<Input
								id="mat-ordered"
								type="number"
								min="0"
								step="any"
								className={cn('text-right tabular-nums', FOKUS)}
								value={form.ordered_quantity}
								onChange={(e) => onChange({ ordered_quantity: e.target.value })}
								placeholder={form.unit ? `Menge in ${form.unit}` : 'Menge'}
							/>
						</Feld>

						<Feld
							label={`Verbraucht (${form.unit || 'Einheit'})`}
							htmlFor="mat-actual"
							hint="Wird typisch nach dem Fest nachgetragen">
							<Input
								id="mat-actual"
								type="number"
								min="0"
								step="any"
								className={cn('text-right tabular-nums', FOKUS)}
								value={form.actual_quantity}
								onChange={(e) => onChange({ actual_quantity: e.target.value })}
								placeholder="Optional"
							/>
						</Feld>

						<Feld label={`Preis je ${preisBezug} (€)`} htmlFor="mat-price">
							<Input
								id="mat-price"
								type="number"
								min="0"
								step="0.01"
								className={cn('text-right tabular-nums', FOKUS)}
								value={form.unit_price}
								onChange={(e) => onChange({ unit_price: e.target.value })}
								placeholder="0.00"
							/>
						</Feld>

						<Feld label="MwSt" htmlFor="mat-tax-rate">
							<Select
								value={form.tax_rate || KEINE}
								onValueChange={(value) => onChange({ tax_rate: value === KEINE ? '' : value })}>
								<SelectTrigger id="mat-tax-rate" className={FOKUS}>
									<SelectValue placeholder="Keine" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={KEINE}>Keine</SelectItem>
									<SelectItem value="10">10% (Lebensmittel)</SelectItem>
									<SelectItem value="13">13% (Beherbergung)</SelectItem>
									<SelectItem value="20">20% (Standard)</SelectItem>
								</SelectContent>
							</Select>
						</Feld>

						<Feld
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
						</Feld>

						{gebinde && (
							<Feld wide label="Preis bezieht sich auf">
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
							</Feld>
						)}
					</>
				)}
			</div>

			<div className="sticky bottom-0 flex justify-end gap-2 border-t-2 border-tinte bg-white px-4 py-3">
				<Button variant="outline" className={FOKUS} onClick={onCancel}>
					Abbrechen
				</Button>
				<Button
					data-zettel="speichern"
					className={FOKUS}
					onClick={onSave}
					disabled={!canSave(form, mode)}>
					{mode === 'edit' ? 'Speichern' : 'Anlegen'}
				</Button>
			</div>
		</div>
	);
};

interface FeldProps {
	label: ReactNode;
	htmlFor?: string;
	hint?: ReactNode;
	wide?: boolean;
	children: ReactNode;
}

/** Eine Feldzeile des Zettels: Versalien-Kleinlabel (Public Sans 800,
letter-spacing .06em, #117) über dem Baustein, darunter optional ein Hinweis. */
const Feld: React.FC<FeldProps> = ({ label, htmlFor, hint, wide, children }) => (
	<div className={cn('flex flex-col gap-1', wide && 'min-[900px]:col-span-2')}>
		<Label htmlFor={htmlFor} variant="kleinlabel">
			{label}
		</Label>
		{children}
		{hint && <span className="text-[10.5px] leading-snug text-tinte-soft">{hint}</span>}
	</div>
);

export default MaterialZettel;
