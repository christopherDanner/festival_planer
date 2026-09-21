import React from 'react';
import { Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { NO_STATION } from '@/lib/materialGrouping';
import { handoverStamp } from '@/lib/materialHandover';
import type { MatchRow } from '@/lib/materialMatcher';
import type { SaveState } from '@/lib/materialSaveOrchestrator';
import { formatPackaging, formatRequiredPackaging, fromBaseQuantity } from '@/lib/materialQuantity';

import HandoverStampMark from './HandoverStampMark';

/**
 * Was eine einzelne Zeile der Übernahme zum Arbeiten braucht — Tabelle und
 * Karte reichen es unverändert durch. Ein eigener Typ, weil die fünf Werte
 * ohnehin immer zusammen reisen.
 */
export interface HandoverRowControls {
	/** Die getippten Wunschmengen, je Zeilenschlüssel (Basiseinheiten). */
	desiredByKey: Record<string, string>;
	/** Speicherzustände aus dem `materialSaveOrchestrator`. */
	statesByKey: Record<string, SaveState>;
	onDesiredChange: (row: MatchRow, value: string) => void;
	/** Auto-Save: beim Verlassen des Felds. */
	onCommit: (row: MatchRow) => void;
	onRetry: (row: MatchRow) => void;
	onDelete: (row: MatchRow) => void;
}

export interface HandoverTableProps extends HandoverRowControls {
	rows: MatchRow[];
	/** Zeilen desselben Namens über alle Stationen — für die „2×"-Marke. */
	siblingsByName: Map<string, MatchRow[]>;
}

const HEAD_CELL = 'border-b-2 border-tinte bg-papier-getoent px-2.5 py-2 text-[11px] font-bold uppercase tracking-[.05em] text-tinte';
const CELL = 'border-b border-linie px-2.5 py-2 align-top tabular-nums';
/** Die Spalten des Quellfests stehen getönt — sie sind Referenz, nicht Eingabe. */
const REFERENCE_CELL = 'bg-papier-getoent';

/**
 * Die Tabelle der Material-Übernahme (#118): links das **Quellfest als getönte
 * Referenzspalten** (Bestellt/Verbraucht), rechts die Wunschmenge fürs Zielfest
 * als gelbes Eingabefeld und der Auto-Save-Stempel.
 *
 * Gesteuert: Werte und Speicherzustände kommen herein, gespeichert wird im
 * `materialSaveOrchestrator` der Seite — die Tabelle löst nur aus.
 */
const HandoverTable: React.FC<HandoverTableProps> = ({ rows, siblingsByName, ...controls }) => (
	// Die Tabelle scrollt im eigenen Rahmen, nie die Seite (DESIGN-VISION §6).
	<div className="overflow-x-auto bg-white">
		<table className="w-full min-w-[720px] border-collapse text-[13px]">
			<thead>
				<tr>
					<th rowSpan={2} className={cn(HEAD_CELL, 'text-left')}>
						Material
					</th>
					<th rowSpan={2} className={cn(HEAD_CELL, 'text-left')}>
						Gebinde
					</th>
					<th colSpan={2} className={cn(HEAD_CELL, 'border-b border-tinte text-center')}>
						Quellfest (Referenz)
					</th>
					<th colSpan={2} className={cn(HEAD_CELL, 'border-b border-tinte text-center')}>
						Zielfest
					</th>
					<th rowSpan={2} className={HEAD_CELL}>
						<span className="sr-only">Handgriffe</span>
					</th>
				</tr>
				<tr>
					<th className={cn(HEAD_CELL, 'text-right')}>Bestellt</th>
					<th className={cn(HEAD_CELL, 'text-right')}>Verbraucht</th>
					<th className={cn(HEAD_CELL, 'text-right')}>Wunschmenge</th>
					<th className={cn(HEAD_CELL, 'text-left')}>Status</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r) => (
					<HandoverRow
						key={r.key}
						row={r}
						siblings={siblingsByName.get(r.normalizedName) ?? [r]}
						{...controls}
					/>
				))}
			</tbody>
		</table>
	</div>
);

interface HandoverRowProps extends HandoverRowControls {
	row: MatchRow;
	siblings: MatchRow[];
}

const HandoverRow: React.FC<HandoverRowProps> = ({
	row,
	siblings,
	desiredByKey,
	statesByKey,
	onDesiredChange,
	onCommit,
	onRetry,
	onDelete
}) => {
	const desired = desiredByKey[row.key] ?? '';
	const stamp = handoverStamp(row, desired, statesByKey[row.key]);

	return (
		<tr>
			<td className={cn(CELL, 'text-left')}>
				<span className="font-bold">{row.name}</span>
				<SiblingMark siblings={siblings} />
				<RowSubline row={row} />
			</td>
			<td className={cn(CELL, 'text-left text-tinte-soft')}>
				{formatPackaging({
					unit: row.unit,
					packaging_unit: row.packagingUnit,
					amount_per_packaging: row.amountPerPackaging
				})}
			</td>
			<ReferenceCell value={row.srcOrderedTotal} row={row} showAggregate />
			<ReferenceCell value={row.srcActualTotal} row={row} />
			<td className={cn(CELL, 'text-right')}>
				<DesiredInput
					row={row}
					value={desired}
					onChange={(value) => onDesiredChange(row, value)}
					onCommit={() => onCommit(row)}
					className="ml-auto h-9 w-[86px] max-[899px]:h-10"
				/>
				<PackagingHint value={parseFloat(desired)} row={row} />
			</td>
			<td className={cn(CELL, 'text-left')}>
				<HandoverStampMark stamp={stamp} onRetry={() => onRetry(row)} />
			</td>
			<td className={cn(CELL, 'text-center')}>
				{row.targetMaterial && <DeleteButton onClick={() => onDelete(row)} />}
			</td>
		</tr>
	);
};

/**
 * Kategorie und Lieferant unter dem Namen statt als zwei eigene Spalten: die
 * Übernahme stellt Mengen gegenüber, und zwei weitere Spalten schöben das
 * Eingabefeld aus dem Bild. Dazu der Hinweis, wo eine Zeile herkommt.
 */
const RowSubline: React.FC<{ row: MatchRow }> = ({ row }) => {
	const parts = [row.category, row.supplier].filter(Boolean);
	if (parts.length === 0 && row.status !== 'only-source') return null;
	return (
		<span className="block text-[11px] text-tinte-soft">
			{parts.join(' · ')}
			{parts.length > 0 && row.status === 'only-source' && ' · '}
			{row.status === 'only-source' && 'gibt es im Zielfest noch nicht'}
		</span>
	);
};

/** Eine Referenzspalte des Quellfests: Menge, Einheit und die Gebinde-Zahl. */
const ReferenceCell: React.FC<{
	value: number | null;
	row: MatchRow;
	/** Nur an der Bestellt-Spalte: aus wie vielen Quellzeilen die Menge stammt. */
	showAggregate?: boolean;
}> = ({ value, row, showAggregate }) => (
	<td className={cn(CELL, REFERENCE_CELL, 'text-right')}>
		<span className={cn('font-medium', value == null && 'text-tinte-soft')}>
			{formatQuantity(value)}
		</span>{' '}
		<span className="text-[11px] text-tinte-soft">{row.unit}</span>
		{showAggregate && <AggregateMark row={row} />}
		<PackagingHint value={value} row={row} />
	</td>
);

/**
 * „Σ2" — die Referenzmenge ist im Quellfest über mehrere Stationen verteilt;
 * der Titel schlüsselt sie auf. Ohne die Marke stünde da eine Summe, deren
 * Herkunft man nicht mehr sieht.
 */
const AggregateMark: React.FC<{ row: MatchRow }> = ({ row }) => {
	if (row.srcAggregateCount < 2) return null;
	const breakdown = row.sourceDetails
		.map((d) => `${d.stationName ?? NO_STATION}: ${d.ordered}`)
		.join(', ');
	return (
		<span
			data-aggregate
			title={`Im Quellfest verteilt auf ${breakdown}`}
			className="ml-1 whitespace-nowrap border-1.5 border-tinte-soft px-1 text-[10px] font-bold text-tinte-soft">
			Σ{row.srcAggregateCount}
		</span>
	);
};

/**
 * Das gelbe Eingabefeld der Wunschmenge — an *einer* Stelle, damit Tabelle und
 * Karte dieselben Regeln haben (Auto-Save beim Verlassen, Enter verlässt).
 */
const DesiredInput: React.FC<{
	row: MatchRow;
	value: string;
	onChange: (value: string) => void;
	onCommit: () => void;
	className?: string;
}> = ({ row, value, onChange, onCommit, className }) => (
	<Input
		type="number"
		min="0"
		step="any"
		value={value}
		onChange={(e) => onChange(e.target.value)}
		onBlur={onCommit}
		onKeyDown={(e) => {
			if (e.key === 'Enter') e.currentTarget.blur();
		}}
		placeholder="—"
		aria-label={`Wunschmenge für ${row.name}`}
		className={cn(
			'border-2 border-tinte bg-gelb px-2 text-right text-[13px] font-bold tabular-nums text-tinte',
			FOCUS_INK,
			className
		)}
	/>
);

/** „→ 16 Fass" — nur wo die Position überhaupt in Gebinden geführt wird. */
const PackagingHint: React.FC<{ value: number | null | undefined; row: MatchRow }> = ({
	value,
	row
}) => {
	if (value == null || Number.isNaN(value) || value <= 0) return null;
	const context = { packaging_unit: row.packagingUnit, amount_per_packaging: row.amountPerPackaging };
	const hint = formatRequiredPackaging(fromBaseQuantity(value, context), context);
	if (!hint) return null;
	return <span className="block text-[11px] text-tinte-soft">→ {hint}</span>;
};

/** „2×" — dieselbe Position steht in mehreren Stationen; der Titel sagt, in
welchen. Ohne die Marke sähe man im Reiter einer Station nur einen Teil. */
const SiblingMark: React.FC<{ siblings: MatchRow[] }> = ({ siblings }) => {
	if (siblings.length < 2) return null;
	return (
		<span
			data-siblings
			title={`Steht auch in: ${siblings.map((s) => s.stationName ?? NO_STATION).join(', ')}`}
			className="ml-1.5 whitespace-nowrap border-1.5 border-tinte-soft px-1 text-[10.5px] font-bold text-tinte-soft">
			{siblings.length}×
		</span>
	);
};

const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
	<button
		type="button"
		onClick={onClick}
		aria-label="Position löschen"
		className={cn(
			'inline-flex items-center justify-center p-1.5 text-tinte-soft hover:bg-rot hover:text-white max-[899px]:min-h-10 max-[899px]:min-w-10',
			'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte'
		)}>
		<Trash2 className="h-4 w-4" />
	</button>
);

function formatQuantity(value: number | null): string {
	return value == null ? '—' : String(value);
}

export interface HandoverCardProps extends HandoverRowControls {
	row: MatchRow;
	siblings: MatchRow[];
}

/**
 * Dieselbe Zeile am Handy (#116-Idiom): **Karte statt querscrollender Tabelle** —
 * die Tabelle braucht rund drei Bildschirmbreiten, und das bearbeitete Feld läge
 * teils außerhalb des Sichtfelds.
 */
export const HandoverCard: React.FC<HandoverCardProps> = ({
	row,
	siblings,
	desiredByKey,
	statesByKey,
	onDesiredChange,
	onCommit,
	onRetry,
	onDelete
}) => {
	const desired = desiredByKey[row.key] ?? '';
	const stamp = handoverStamp(row, desired, statesByKey[row.key]);

	return (
		<div className="border-2 border-tinte bg-white">
			<div className="flex items-start gap-2 border-b border-linie px-3 py-2.5">
				<div className="min-w-0 flex-1">
					<p className="font-bold leading-tight">
						{row.name}
						<SiblingMark siblings={siblings} />
					</p>
					<p className="text-[11px] text-tinte-soft">
						{formatPackaging({
							unit: row.unit,
							packaging_unit: row.packagingUnit,
							amount_per_packaging: row.amountPerPackaging
						})}
					</p>
					<RowSubline row={row} />
				</div>
				{row.targetMaterial && <DeleteButton onClick={() => onDelete(row)} />}
			</div>

			<div className="grid grid-cols-3 gap-px bg-linie">
				<Tile label="Bestellt" tinted>
					{formatQuantity(row.srcOrderedTotal)} <Unit>{row.unit}</Unit>
					<AggregateMark row={row} />
					<PackagingHint value={row.srcOrderedTotal} row={row} />
				</Tile>
				<Tile label="Verbraucht" tinted>
					{formatQuantity(row.srcActualTotal)} <Unit>{row.unit}</Unit>
					<PackagingHint value={row.srcActualTotal} row={row} />
				</Tile>
				<Tile label="Wunschmenge">
					<DesiredInput
						row={row}
						value={desired}
						onChange={(value) => onDesiredChange(row, value)}
						onCommit={() => onCommit(row)}
						className="h-10 w-full"
					/>
					<PackagingHint value={parseFloat(desired)} row={row} />
				</Tile>
			</div>

			<div className="border-t border-linie px-3 py-2">
				<HandoverStampMark stamp={stamp} onRetry={() => onRetry(row)} />
			</div>
		</div>
	);
};

const Tile: React.FC<{ label: string; tinted?: boolean; children: React.ReactNode }> = ({
	label,
	tinted,
	children
}) => (
	<div className={cn('px-3 py-2', tinted ? 'bg-papier-getoent' : 'bg-white')}>
		<p className="text-[10px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">{label}</p>
		<div className="mt-0.5 text-[13px] font-medium tabular-nums">{children}</div>
	</div>
);

const Unit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<span className="text-[11px] text-tinte-soft">{children}</span>
);

export default HandoverTable;
