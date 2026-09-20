import React from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import {
	toBaseQuantity,
	formatPackaging,
	formatQuantity,
	formatRequiredPackaging
} from '@/lib/materialQuantity';
import { grossPrice, netPrice, rowTotal, sumTotals } from '@/lib/materialCosts';
import { deltaCell, taxCell } from '@/lib/materialRow';
import { formatAmount } from '@/lib/money';
import {
	MissingValue,
	PAPER_TABLE_BODY_CELL,
	PAPER_TABLE_FOOT_CELL,
	PAPER_TABLE_HEAD_CELL
} from '@/components/toolkit/PaperTable';

import { DELTA_TONE, PriceGap } from './MaterialMarks';

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
}

/* ------------------------------------------------------------------ */
/*  Spalten                                                            */
/* ------------------------------------------------------------------ */

type ColumnKey =
	| 'material'
	| 'station'
	| 'supplier'
	| 'packaging'
	| 'ordered'
	| 'consumed'
	| 'delta'
	| 'tax'
	| 'net'
	| 'gross'
	| 'total'
	| 'actions';

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
/*  Zellen                                                             */
/* ------------------------------------------------------------------ */

const HEAD_CELL = PAPER_TABLE_HEAD_CELL;
const BODY_CELL = PAPER_TABLE_BODY_CELL;
const FOOT_CELL = PAPER_TABLE_FOOT_CELL;

/** Menge in Basiseinheiten samt Einheit, darunter die Gebinde-Umrechnung. */
const QuantityCell: React.FC<{ stored: number | null; material: FestivalMaterialWithStation }> = ({
	stored,
	material
}) => {
	if (stored == null) return <MissingValue />;
	const hint = formatRequiredPackaging(stored, material);
	return (
		<>
			<span className="font-medium">{formatQuantity(toBaseQuantity(stored, material) ?? 0)}</span>{' '}
			<span className="text-[10.5px] text-tinte-soft">{material.unit}</span>
			{hint && (
				<span className="block text-[10px] leading-tight text-tinte-soft">{`→ ${hint}`}</span>
			)}
		</>
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
 * Gerechnet wird in `materialCosts` (ADR 0006), umgerechnet in
 * `materialQuantity`, gelesen in `materialRow` — die Tabelle malt nur.
 *
 * Am Handy steht sie nicht: dort stapelt `MaterialCardList` Karten (#116), weil
 * die elf Spalten sonst drei Bildschirmbreiten Wischen kosteten. Umgeschaltet
 * wird eine Ebene höher, in der Arbeitsliste.
 */
const MaterialTable: React.FC<MaterialTableProps> = ({ materials, showStation = true, onEdit, onDelete, onCopy }) => {
	const totalCost = sumTotals(materials);
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
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{materials.map((m) => (
						<tr key={m.id} className="h-[56px] border-b border-linie hover:bg-papier">
							{cols.map((col) => (
								<td
									key={col.key}
									className={cn(BODY_CELL, col.align === 'right' && 'text-right')}
								>
									<Cell column={col.key} material={m} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
								</td>
							))}
						</tr>
					))}
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

/** Der Inhalt einer Zelle — je Spalte an einer Stelle, damit Kopf, Raster und
Zeile nicht auseinanderlaufen können. */
const Cell: React.FC<{
	column: ColumnKey;
	material: FestivalMaterialWithStation;
	onEdit: (material: FestivalMaterialWithStation) => void;
	onCopy: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
}> = ({ column, material: m, onEdit, onCopy, onDelete }) => {
	switch (column) {
		case 'material':
			return (
				<>
					<div className="truncate font-bold leading-tight">{m.name}</div>
					{m.category && (
						<span className="mt-0.5 inline-block max-w-full truncate bg-papier-getoent px-1.5 text-[10px] font-bold leading-relaxed text-tinte-soft">
							{m.category}
						</span>
					)}
				</>
			);
		// `block`, weil die Ellipse an einem Inline-Element nicht greift: der
		// lange Lieferantenname wäre sonst hart abgeschnitten.
		case 'station':
			return m.station?.name ? (
				<span className="block truncate">{m.station.name}</span>
			) : (
				<MissingValue />
			);
		case 'supplier':
			return m.supplier ? <span className="block truncate">{m.supplier}</span> : <MissingValue />;
		case 'packaging':
			return <span className="block truncate">{formatPackaging(m)}</span>;
		case 'ordered':
			return <QuantityCell stored={m.ordered_quantity} material={m} />;
		case 'consumed':
			return <QuantityCell stored={m.actual_quantity} material={m} />;
		case 'delta': {
			const delta = deltaCell(m);
			return <span className={DELTA_TONE[delta.tone]}>{delta.text}</span>;
		}
		case 'tax': {
			const tax = taxCell(m);
			return <span className={tax.muted ? 'text-tinte-soft' : undefined}>{tax.text}</span>;
		}
		case 'net': {
			const net = netPrice(m);
			return net == null ? <PriceGap /> : <>{formatAmount(net)}</>;
		}
		case 'gross': {
			const gross = grossPrice(m);
			return gross == null ? <PriceGap /> : <>{formatAmount(gross)}</>;
		}
		case 'total': {
			const total = rowTotal(m);
			// Ohne Preis keine Zeilensumme — die Position verfälscht keine Summe.
			return total == null ? <MissingValue /> : <b>{formatAmount(total)}</b>;
		}
		case 'actions':
			return (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Menü für ${m.name}`}
							className="px-1 py-1 text-tinte-soft hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
						>
							<MoreVertical className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{/* Der Dialog trägt seit #117 nur die Stammdaten; Mengen und Preise
							bekommen mit #115 ihren ✎-Knopf in dieser Spalte. */}
							<DropdownMenuItem onSelect={() => onEdit(m)}>Bearbeiten</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => onCopy(m)}>Kopieren</DropdownMenuItem>
							<DropdownMenuItem className="text-rot" onSelect={() => onDelete(m.id)}>
								Entfernen
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
	}
};

export default MaterialTable;
