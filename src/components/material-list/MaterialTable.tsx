import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Package, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import {
	toBaseQuantity,
	fromBaseQuantity,
	formatPackaging,
	formatRequiredPackaging
} from '@/lib/materialQuantity';
import { grossPrice, netPrice, rowTotal, sumTotals } from '@/lib/materialCosts';
import { formatAmount } from '@/lib/money';
import {
	PAPER_TABLE_BODY_CELL,
	PAPER_TABLE_FOOT_CELL,
	PAPER_TABLE_HEAD_CELL
} from '@/components/toolkit/PaperTable';
import {
	DeltaText,
	EditingCell,
	ReadingCell,
	type ColumnKey,
	type RowEditControls
} from './MaterialTableCells';

/* ------------------------------------------------------------------ */
/*  Generic inline-editable cell (text / number)                      */
/* ------------------------------------------------------------------ */

/** Nur noch für die Handy-Karte; die Tabelle liest seit #114 bloß, getippt wird
im Zeilenmodus (#115). Die Karte kommt mit #116 an die Reihe. */
const InlineEditCell: React.FC<{
	value: string;
	onSave: (value: string) => void;
	type?: 'text' | 'number';
	placeholder?: string;
	className?: string;
	inputClassName?: string;
}> = ({ value, onSave, type = 'text', placeholder, className, inputClassName }) => {
	const [editing, setEditing] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const startEdit = () => {
		setInputValue(value);
		setEditing(true);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	const commit = () => {
		setEditing(false);
		if (inputValue !== value) onSave(inputValue);
	};

	if (editing) {
		return (
			<Input
				ref={inputRef}
				type={type}
				step={type === 'number' ? 'any' : undefined}
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') setEditing(false);
					if (e.key === 'Tab') { commit(); } // Don't prevent default — let browser move focus
				}}
				className={inputClassName || 'h-7 w-full text-sm px-1'}
				placeholder={placeholder}
			/>
		);
	}

	return (
		<span
			onClick={startEdit}
			className={`cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 -mx-1 inline-block min-w-[30px] ${className || ''}`}
			title="Klicken zum Bearbeiten"
		>
			{value || <span className="text-muted-foreground/40">{placeholder || '–'}</span>}
		</span>
	);
};

/* ------------------------------------------------------------------ */
/*  Inline tax-rate select                                             */
/* ------------------------------------------------------------------ */

const InlineTaxSelect: React.FC<{
	value: number | null;
	onSave: (value: number | null) => void;
}> = ({ value, onSave }) => {
	return (
		<select
			value={value != null ? String(value) : ''}
			onChange={(e) => {
				const v = e.target.value;
				onSave(v ? Number(v) : null);
			}}
			className="h-7 text-xs bg-transparent border rounded px-1 cursor-pointer hover:bg-primary/5"
		>
			<option value="">Keine MwSt</option>
			<option value="10">10%</option>
			<option value="13">13%</option>
			<option value="20">20%</option>
		</select>
	);
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MaterialTableProps {
	materials: FestivalMaterialWithStation[];
	/**
	 * Station als eigene Spalte — nur sinnvoll, wenn die Arbeitsliste *nicht*
	 * nach Station gruppiert; im Stations-Kasten wäre sie redundant (#113).
	 */
	showStation?: boolean;
	onEdit: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
	onCopy: (material: FestivalMaterialWithStation) => void;
	/** Nur noch für die Handy-Karte — die Tabelle schreibt seit #114 nicht mehr. */
	onUpdateField: (id: string, field: string, value: any) => void;
	/** Ebenfalls nur für die Handy-Karte (#116). */
	onUpdateFields: (id: string, partial: Partial<FestivalMaterialWithStation>) => void;
	rowEdit: RowEditControls;
}

/* ------------------------------------------------------------------ */
/*  Spalten                                                            */
/* ------------------------------------------------------------------ */

interface Column {
	key: ColumnKey;
	label: string;
	/** Anteil am festen Raster (`table-layout: fixed`). */
	width: string;
	align?: 'right';
}

/** Die elf Spalten des Entscheids aus #114, in dieser Reihenfolge. Netto und
Brutto bleiben zwei Spalten: ohne Steuersatz stehen dort zweimal derselbe
Betrag, mit Steuersatz zwei verschiedene — und beide sind erfassbar (#115). */
const COLUMNS: Column[] = [
	{ key: 'material', label: 'Material', width: '19%' },
	{ key: 'supplier', label: 'Lieferant', width: '11%' },
	{ key: 'packaging', label: 'Gebinde', width: '11%' },
	{ key: 'ordered', label: 'Bestellt', width: '9%', align: 'right' },
	{ key: 'consumed', label: 'Verbraucht', width: '9%', align: 'right' },
	{ key: 'delta', label: 'Δ', width: '4.5%', align: 'right' },
	{ key: 'tax', label: 'MwSt', width: '7%', align: 'right' },
	// Das €-Zeichen steht im Kopf, nicht in jeder Zelle — sonst tragen drei
	// Spalten × n Zeilen dasselbe Zeichen und die Zahlen verlieren die Flucht.
	{ key: 'net', label: 'Netto €', width: '8%', align: 'right' },
	{ key: 'gross', label: 'Brutto €', width: '8%', align: 'right' },
	{ key: 'total', label: 'Gesamt €', width: '8.5%', align: 'right' },
	{ key: 'actions', label: 'Aktionen', width: '5%' }
];

/** Breiten der Textspalten, wenn die Station dazukommt (#113): sie geben ihr
die 9 % ab, die Zahlenspalten bleiben unangetastet — die Tabelle wird dadurch
nicht breiter, nur die Namen bekommen weniger Platz. */
const WIDTHS_WITH_STATION: Partial<Record<ColumnKey, string>> = {
	material: '14%',
	supplier: '10%',
	packaging: '8%'
};

/** Gemessene Mindestbreite der Spalten (#114): ~1.085 px, die in die ~1.136 px
des Arbeitsbereichs ohne Querscrollen passen. Sie gilt mit wie ohne Station,
weil die Station ihre 9 % aus den Textspalten bekommt. Darunter scrollt der
Kasten, statt die Spalten weiter zu stauchen. */
const MIN_WIDTH_PX = 1085;

function columns(showStation: boolean): Column[] {
	if (!showStation) return COLUMNS;
	const station: Column = { key: 'station', label: 'Station', width: '9%' };
	return [COLUMNS[0], station, ...COLUMNS.slice(1)].map((column) => ({
		...column,
		width: WIDTHS_WITH_STATION[column.key] ?? column.width
	}));
}

/* ------------------------------------------------------------------ */
/*  Zellen — der Inhalt steht in `MaterialTableCells`                  */
/* ------------------------------------------------------------------ */

const HEAD_CELL = PAPER_TABLE_HEAD_CELL;
const BODY_CELL = PAPER_TABLE_BODY_CELL;
const FOOT_CELL = PAPER_TABLE_FOOT_CELL;

/* ------------------------------------------------------------------ */
/*  Mobile card                                                        */
/* ------------------------------------------------------------------ */

/** Exportiert, damit die Station-Regel aus #113 auch für die Karte prüfbar ist —
`useIsMobile` entscheidet erst im Browser, ein Server-Rendern der Tabelle käme
nie hier vorbei. Die Karte behält ihre Inline-Felder bis #116. */
export const MaterialMobileCard: React.FC<{
	material: FestivalMaterialWithStation;
	showStation: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onCopy: () => void;
	onUpdateField: (field: string, value: any) => void;
	onUpdateFields: (partial: Partial<FestivalMaterialWithStation>) => void;
}> = ({ material, showStation, onEdit, onDelete, onCopy, onUpdateField, onUpdateFields }) => {
	return (
		<div className="border bg-card overflow-hidden">
			<div className="flex items-start justify-between gap-2 p-3 pb-2">
				<div className="min-w-0">
					<p className="font-medium text-sm">{material.name}</p>
					<div className="flex flex-wrap gap-1 mt-1.5">
						{material.category && (
							<Badge variant="outline" className="text-[10px] px-1.5 py-0">{material.category}</Badge>
						)}
						{showStation && material.station?.name && (
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0">{material.station.name}</Badge>
						)}
						{material.supplier && (
							<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">{material.supplier}</Badge>
						)}
					</div>
				</div>
				<div className="flex gap-0.5 shrink-0">
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Kopieren">
						<Copy className="h-3.5 w-3.5" />
					</Button>
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-border/50">
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						Bestellt ({material.unit}) <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
					</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineEditCell
							value={String(toBaseQuantity(material.ordered_quantity, material) ?? 0)}
							onSave={(v) =>
								onUpdateField('ordered_quantity', v ? fromBaseQuantity(Number(v), material) : 0)
							}
							type="number"
							inputClassName="h-6 w-full text-sm px-1"
						/>
					</div>
					{formatRequiredPackaging(material.ordered_quantity, material) && (
						<span className="text-[10px] text-muted-foreground">
							→ {formatRequiredPackaging(material.ordered_quantity, material)}
						</span>
					)}
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						Verbraucht ({material.unit}) <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
					</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineEditCell
							value={
								material.actual_quantity != null
									? String(toBaseQuantity(material.actual_quantity, material) ?? '')
									: ''
							}
							onSave={(v) =>
								onUpdateField(
									'actual_quantity',
									v ? fromBaseQuantity(Number(v), material) : null
								)
							}
							type="number"
							placeholder="–"
							inputClassName="h-6 w-full text-sm px-1"
						/>
					</div>
					{material.actual_quantity != null && formatRequiredPackaging(material.actual_quantity, material) && (
						<span className="text-[10px] text-muted-foreground">
							→ {formatRequiredPackaging(material.actual_quantity, material)}
						</span>
					)}
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">Differenz</span>
					<DeltaText material={material} className="mt-0.5 block text-sm" />
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-border/50 border-t">
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">MwSt</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineTaxSelect
							value={material.tax_rate}
							onSave={(v) => onUpdateField('tax_rate', v)}
						/>
					</div>
				</div>
				{(() => {
					const net = netPrice(material);
					const gross = grossPrice(material);
					const netIsSource = material.price_is_net || material.unit_price == null;
					const grossIsSource = !material.price_is_net || material.unit_price == null;
					return (
						<>
							<div className="bg-card px-3 py-2">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
									Netto € <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
								</span>
								<div className="text-sm font-medium mt-0.5">
									<InlineEditCell
										value={net != null ? net.toFixed(2) : ''}
										onSave={(v) =>
											onUpdateFields({
												unit_price: v ? Number(v) : null,
												price_is_net: true
											})
										}
										type="number"
										placeholder="–"
										inputClassName="h-6 w-full text-sm px-1"
										className={netIsSource ? '' : 'text-muted-foreground italic'}
									/>
								</div>
							</div>
							<div className="bg-card px-3 py-2">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
									Brutto € <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
								</span>
								<div className="text-sm font-medium mt-0.5">
									<InlineEditCell
										value={gross != null ? gross.toFixed(2) : ''}
										onSave={(v) =>
											onUpdateFields({
												unit_price: v ? Number(v) : null,
												price_is_net: false
											})
										}
										type="number"
										placeholder="–"
										inputClassName="h-6 w-full text-sm px-1"
										className={grossIsSource ? '' : 'text-muted-foreground italic'}
									/>
								</div>
							</div>
						</>
					);
				})()}
			</div>
			{rowTotal(material) != null && (
				<div className="px-3 py-1.5 border-t flex items-center justify-between text-xs">
					<span className="text-muted-foreground">{formatPackaging(material)}</span>
					<span className="font-semibold">{formatAmount(rowTotal(material)!)} €</span>
				</div>
			)}
		</div>
	);
};

/* ------------------------------------------------------------------ */
/*  Main table component                                               */
/* ------------------------------------------------------------------ */

/**
 * Positionstabelle des Gruppen-Kastens (#114): elf Spalten in Plakat-Optik,
 * **nur lesend**. Eingaben passieren im Zeilenmodus (#115) und im
 * Stammdaten-Dialog (#117) — verstreute Klick-zum-Aufklappen-Zellen machten die
 * Tabelle unruhig (Entscheid aus #66).
 *
 * Zwei Auflagen tragen den Zeilenmodus mit: `table-layout: fixed` mit gesetzten
 * Spaltenbreiten und eine feste Zeilenhöhe von 56 px. Ohne beides verschöbe das
 * Umschalten auf Eingabefelder jede Spalte und schöbe alles darunter nach unten.
 *
 * Hier steht nur das Gerüst — Kopf, Raster, Zeilenzustand und Fuß. Was *in*
 * einer Zelle steht, lesend wie in Bearbeitung, steht in `MaterialTableCells`:
 * beide Zustände bedienen dieselbe Spaltenordnung und liefen getrennt
 * unweigerlich auseinander.
 *
 * Gerechnet wird in `materialCosts` (ADR 0006), umgerechnet in
 * `materialQuantity`, gelesen in `materialRow` — die Tabelle malt nur.
 */
const MaterialTable: React.FC<MaterialTableProps> = ({ materials, showStation = true, onEdit, onDelete, onCopy, onUpdateField, onUpdateFields, rowEdit }) => {
	const isMobile = useIsMobile();

	const totalCost = sumTotals(materials);
	const hasCosts = materials.some((m) => m.unit_price != null);
	const cols = columns(showStation);

	if (materials.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 border border-dashed border-linie py-12">
				<Package className="h-8 w-8 text-tinte-soft/40" />
				<p className="text-sm text-tinte-soft">Keine Materialien vorhanden</p>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="space-y-2">
				{materials.map((m) => (
					<MaterialMobileCard
						key={m.id}
						material={m}
						showStation={showStation}
						onEdit={() => onEdit(m)}
						onDelete={() => onDelete(m.id)}
						onCopy={() => onCopy(m)}
						onUpdateField={(field, value) => onUpdateField(m.id, field, value)}
						onUpdateFields={(partial) => onUpdateFields(m.id, partial)}
					/>
				))}
				{hasCosts && (
					<div className="border bg-card p-3 flex items-center justify-between">
						<span className="font-semibold text-sm">Zwischensumme (gefiltert)</span>
						<span className="font-semibold text-sm">{formatAmount(totalCost)} €</span>
					</div>
				)}
			</div>
		);
	}

	// Rahmen und Rundung entfallen — die Tabelle sitzt im Gruppen-Kasten (#113).
	return (
		<div className="overflow-x-auto bg-white">
			<table
				className="w-full table-fixed border-collapse text-[13px]"
				style={{ minWidth: `${MIN_WIDTH_PX}px` }}
			>
				<colgroup>
					{cols.map((col) => (
						<col key={col.key} style={{ width: col.width }} />
					))}
				</colgroup>
				<thead>
					<tr>
						{cols.map((col) => (
							<th
								key={col.key}
								scope="col"
								className={cn(HEAD_CELL, col.align === 'right' && 'text-right')}
							>
								{col.key === 'actions' ? <span className="sr-only">{col.label}</span> : col.label}
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{materials.map((m) => {
						const draft = rowEdit.draftsById[m.id];
						const flash = rowEdit.savedIds.includes(m.id);
						return (
							<tr
								key={m.id}
								className={cn(
									'h-[56px] border-b border-linie',
									// Die offene Zeile trägt gelben Grund und einen Tinte-Strich
									// oben und unten — als Innenschatten, damit sie dabei keinen
									// Pixel höher wird (#114).
									draft && 'bg-gelb/25 shadow-zeile-offen',
									// Nach dem Speichern blitzt sie grün auf und verklingt.
									!draft && flash && 'animate-blitz-gruen',
									!draft && !flash && 'hover:bg-papier'
								)}
							>
								{cols.map((col) => (
									<td
										key={col.key}
										className={cn(BODY_CELL, col.align === 'right' && 'text-right')}
									>
										{draft ? (
											<EditingCell
												column={col.key}
												material={m}
												draft={draft}
												autoFocus={rowEdit.focusId === m.id}
												rowEdit={rowEdit}
											/>
										) : (
											<ReadingCell
												column={col.key}
												material={m}
												actions={{ onEdit, onCopy, onDelete }}
												onStartEdit={rowEdit.onStartEdit}
											/>
										)}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>

				{/* Der Fuß steht immer — auch wenn keine Position einen Preis trägt.
				Der Kopf des Kastens nennt dort seine 0, und zwei Zahlen desselben
				Namens dürfen nicht mal da sein und mal nicht (ADR 0006). */}
				<tfoot>
					<tr>
						{/* Beschriftung wie im Kopf des Kastens — dieselbe Zahl darf nicht
						zwei Namen haben (ADR 0006). */}
						<td
							colSpan={cols.findIndex((col) => col.key === 'total')}
							className={cn(FOOT_CELL, 'text-right')}
						>
							Zwischensumme (gefiltert)
						</td>
						<td className={cn(FOOT_CELL, 'text-right')}>
							<span className="font-display text-[15px] font-semibold">
								{formatAmount(totalCost)}
							</span>
						</td>
						<td className={FOOT_CELL} />
					</tr>
				</tfoot>
			</table>
		</div>
	);
};

export default MaterialTable;
