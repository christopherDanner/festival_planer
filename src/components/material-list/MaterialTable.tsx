import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { sumTotals } from '@/lib/materialCosts';
import { formatAmount } from '@/lib/money';
import {
	PAPER_TABLE_BODY_CELL,
	PAPER_TABLE_FOOT_CELL,
	PAPER_TABLE_HEAD_CELL
} from '@/components/toolkit/PaperTable';
import {
	EditCell,
	QuantityUnitToggle,
	ReadingCell,
	type CellEditControls,
	type ColumnKey
} from './MaterialTableCells';
import { isEditableColumn, isQuantityColumn, previewCell } from '@/lib/materialCellEdit';

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
	cellEdit: CellEditControls;
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
/*  Main table component                                               */
/* ------------------------------------------------------------------ */

/**
 * Positionstabelle des Gruppen-Kastens (#114): elf Spalten in Plakat-Optik.
 * Fünf davon führen in die **Zellbearbeitung** (ADR 0013) — Bestellt,
 * Verbraucht, MwSt, Netto, Brutto; die Stammdaten einer Position gehören dem
 * Dialog hinter ⋮ (#117).
 *
 * Zwei Auflagen tragen die Zellbearbeitung mit: `table-layout: fixed` mit
 * gesetzten Spaltenbreiten und eine feste Zeilenhöhe von 56 px. Ohne beides
 * verschöbe das Umschalten auf ein Eingabefeld jede Spalte und schöbe alles
 * darunter nach unten.
 *
 * Hier steht nur das Gerüst — Kopf, Raster, Zeilenzustand und Fuß. Was *in*
 * einer Zelle steht, lesend wie in Bearbeitung, steht in `MaterialTableCells`:
 * beide Zustände bedienen dieselbe Spaltenordnung und liefen getrennt
 * unweigerlich auseinander.
 *
 * Gerechnet wird in `materialCosts` (ADR 0006), umgerechnet in
 * `materialQuantity`, gelesen in `materialRow` — die Tabelle malt nur.
 */
const MaterialTable: React.FC<MaterialTableProps> = ({ materials, showStation = true, onEdit, onDelete, onCopy, cellEdit }) => {
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
								{/* Nur die Mengenspalten tragen den Einheiten-Umschalter (#218):
								umgeschaltet wird die Spalte, nicht die einzelne Zelle. */}
								{isQuantityColumn(col.key) && (
									<QuantityUnitToggle
										column={col.key}
										unit={cellEdit.units[col.key]}
										onChange={cellEdit.onUnitChange}
									/>
								)}
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{materials.map((m) => {
						const flash = cellEdit.savedIds.includes(m.id);
						// Die Zeile mit der offenen Zelle rechnet mit dem Getippten: die
						// Gegenseite des Preises, Δ und Gesamt folgen ihm, noch bevor
						// gespeichert ist (#217). Die Regel dafür steht in
						// `materialCellEdit`, nicht hier.
						const open = cellEdit.editing?.id === m.id ? cellEdit.editing.column : null;
						const preview = open
							? previewCell(open, cellEdit.value, m, cellEdit.unit, cellEdit.touched)
							: m;
						return (
							<tr
								key={m.id}
								className={cn(
									'h-[56px] border-b border-linie',
									// Nach dem Speichern blitzt die Zeile grün auf und verklingt.
									flash ? 'animate-blitz-gruen' : 'hover:bg-papier'
								)}
							>
								{cols.map((col) => (
									<td
										key={col.key}
										className={cn(BODY_CELL, col.align === 'right' && 'text-right')}
									>
										{isEditableColumn(col.key) ? (
											<EditCell
												column={col.key}
												material={m}
												preview={preview}
												cellEdit={cellEdit}
											/>
										) : (
											<ReadingCell
												column={col.key}
												material={preview}
												// Das ⋮-Menü führt zu den **Stammdaten** der gespeicherten
												// Position (#117) — nie zu einem halb getippten
												// Zwischenstand, den nur die Zelle kennt.
												actions={{
													onEdit: () => onEdit(m),
													onCopy: () => onCopy(m),
													onDelete
												}}
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
