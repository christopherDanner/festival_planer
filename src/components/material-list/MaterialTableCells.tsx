import React from 'react';
import { MoreVertical, Pencil } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MissingValue } from '@/components/toolkit/PaperTable';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { cn } from '@/lib/utils';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { grossPrice, netPrice, rowTotal } from '@/lib/materialCosts';
import {
	formatPackaging,
	formatQuantity,
	formatRequiredPackaging,
	toBaseQuantity
} from '@/lib/materialQuantity';
import { deltaCell, taxCell, type DeltaTone } from '@/lib/materialRow';
import {
	draftPreview,
	taxOptions,
	type RowDraft,
	type RowDraftField
} from '@/lib/materialRowDraft';
import { formatAmount } from '@/lib/money';

/**
 * Die Zellen der Positionstabelle — **lesend** (#114) und **in Bearbeitung**
 * (#115) nebeneinander, weil beide dieselbe Spaltenordnung bedienen und sonst
 * unweigerlich auseinanderliefen.
 *
 * Gerechnet wird nirgends hier: `materialCosts` (ADR 0006), `materialQuantity`
 * und `materialRow` liefern die Zahlen, `materialRowDraft` den Entwurf.
 */

export type ColumnKey =
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

/**
 * Der Zeilenmodus, wie ihn die Tabelle braucht (#115). Den Zustand hält der
 * `materialRowEditor` — die Tabelle malt ihn und meldet, was getippt wurde.
 */
export interface RowEditControls {
	/** Die offenen Zeilen mit ihren Entwürfen, nach Position-ID. */
	draftsById: Record<string, RowDraft>;
	/** Eben gespeicherte Zeilen — der kurze grüne Blitz. */
	savedIds: string[];
	/** Die eben einzeln geöffnete Zeile; ihr erstes Feld bekommt den Fokus. */
	focusId: string | null;
	onStartEdit: (material: FestivalMaterialWithStation) => void;
	onDraftChange: (id: string, field: RowDraftField, value: string) => void;
	onSaveRow: (id: string) => void;
	onCancelRow: (id: string) => void;
}

/** Die drei Handgriffe des ⋮-Menüs; sie reisen immer zusammen. */
export interface RowActions {
	onEdit: (material: FestivalMaterialWithStation) => void;
	onCopy: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
}

const DELTA_TONE: Record<DeltaTone, string> = {
	// Mehr verbraucht als bestellt hat mehr gekostet als geplant.
	over: 'font-bold text-rot',
	under: 'font-bold text-gruen',
	zero: 'text-tinte-soft',
	none: 'text-tinte-soft/60'
};

/** Δ samt seiner Farbe. Exportiert als *Komponente*, nicht als Klassentabelle:
die Handy-Karte braucht dieselbe Entscheidung, und ein zweiter Ort für „welcher
Ton gehört zu welchem Δ" liefe unweigerlich auseinander. */
export const DeltaText: React.FC<{
	material: FestivalMaterialWithStation;
	className?: string;
}> = ({ material, className }) => {
	const delta = deltaCell(material);
	return <span className={cn(DELTA_TONE[delta.tone], className)}>{delta.text}</span>;
};

/** Preislücke: rot gestrichelt statt still leer — die Position zählt in keine
Summe und das muss man in der Zeile sehen (#114).

Bewusst kein `<OpenSlot>`: der trägt dieselbe Grafik, ist aber ein Knopf zum
Besetzen. In der lesenden Zeile führt die Zelle nirgendwohin — erst der
Zeilenmodus macht sie zum Eingabefeld (#115). */
const PriceGap = () => (
	<span className="inline-block border-1.5 border-dashed border-rot px-1.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-rot">
		Fehlt
	</span>
);

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

/** Knöpfe in der Aktionsspalte — klein genug für die 5 %-Spalte, mit dem
Fokus-Ring des Toolkits (DESIGN-VISION §6). */
const ROW_BUTTON = cn(
	'border-2 bg-white px-1.5 py-0.5 font-extrabold leading-tight text-tinte hover:bg-gelb',
	FOCUS_INK
);

/** Eingabefeld einer offenen Zeile: rechtsbündig, tabellarische Ziffern, im
Fokus die 2px-Tinte-Outline mit Versatz. */
const ROW_INPUT = cn(
	'h-7 w-full border-2 border-tinte bg-white px-1.5 text-right text-[13px] font-bold tabular-nums text-tinte',
	'focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-tinte'
);

/**
 * Der Inhalt einer **lesenden** Zelle — je Spalte an einer Stelle, damit Kopf,
 * Raster und Zeile nicht auseinanderlaufen können (#114).
 *
 * Ohne `actions` bleibt die Aktionsspalte leer: die Zeile in Bearbeitung
 * borgt sich diese Zellen für Δ und Gesamt und trägt dort ihre eigenen Knöpfe.
 */
export const ReadingCell: React.FC<{
	column: ColumnKey;
	material: FestivalMaterialWithStation;
	actions?: RowActions;
	/** ✎ — öffnet Mengen und Preise dieser Zeile (#115). */
	onStartEdit?: (material: FestivalMaterialWithStation) => void;
}> = ({ column, material: m, actions, onStartEdit }) => {
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
		case 'delta':
			return <DeltaText material={m} />;
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
			if (!actions) return null;
			return (
				<div className="flex items-center justify-end gap-0.5">
					{/* Zwei Wege aus der Zeile: ✎ öffnet Mengen und Preise *hier* (#115),
					⋮ führt zu den Stammdaten im Dialog (#117). */}
					{onStartEdit && (
						<button
							type="button"
							aria-label={`Mengen und Preise von ${m.name}`}
							title="Mengen & Preise dieser Zeile"
							onClick={() => onStartEdit(m)}
							className={cn(ROW_BUTTON, 'border-tinte')}
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Menü für ${m.name}`}
							className={cn('px-1 py-1 text-tinte-soft hover:text-tinte', FOCUS_INK)}
						>
							<MoreVertical className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={() => actions.onEdit(m)}>Bearbeiten</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => actions.onCopy(m)}>Kopieren</DropdownMenuItem>
							<DropdownMenuItem className="text-rot" onSelect={() => actions.onDelete(m.id)}>
								Entfernen
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
	}
};

/**
 * Der Inhalt einer Zelle **in Bearbeitung** (#115). Tippbar sind genau fünf:
 * Bestellt, Verbraucht, MwSt, Netto und Brutto. Alles andere — auch Δ und
 * Gesamt — kommt vom lesenden Zwilling, gefüttert mit dem Entwurf statt mit
 * dem gespeicherten Stand: so rechnet die Zeile beim Tippen mit, ohne dass
 * dieselbe Spalte zwei Formeln bekäme.
 */
export const EditingCell: React.FC<{
	column: ColumnKey;
	material: FestivalMaterialWithStation;
	draft: RowDraft;
	autoFocus: boolean;
	rowEdit: RowEditControls;
}> = ({ column, material: m, draft, autoFocus, rowEdit }) => {
	const field = (name: RowDraftField, label: string, value: string, extra?: React.ReactNode) => (
		<>
			<input
				type="number"
				step="any"
				value={value}
				autoFocus={autoFocus && name === 'ordered'}
				aria-label={`${label} von ${m.name}`}
				placeholder="–"
				onChange={(e) => rowEdit.onDraftChange(m.id, name, e.target.value)}
				onKeyDown={(e) => onRowKey(e, m.id, rowEdit)}
				className={ROW_INPUT}
			/>
			{extra}
		</>
	);

	switch (column) {
		case 'material':
			// Statt der Kategorie-Marke steht hier, was die Zeile jetzt kann — die
			// Tastaturhilfe gehört dorthin, wo getippt wird.
			return (
				<>
					<div className="truncate font-bold leading-tight">{m.name}</div>
					<span className="mt-0.5 block truncate text-[10px] leading-tight text-tinte-soft">
						Mengen &amp; Preise — Enter speichert · Esc bricht ab
					</span>
				</>
			);
		case 'ordered':
			return field(
				'ordered',
				'Bestellt',
				draft.ordered,
				<PackagingHint draft={draft} material={m} which="ordered" />
			);
		case 'consumed':
			return field(
				'actual',
				'Verbraucht',
				draft.actual,
				<PackagingHint draft={draft} material={m} which="actual" />
			);
		case 'tax':
			return (
				<select
					value={draft.tax}
					aria-label={`MwSt von ${m.name}`}
					onChange={(e) => rowEdit.onDraftChange(m.id, 'tax', e.target.value)}
					onKeyDown={(e) => onRowKey(e, m.id, rowEdit)}
					className={cn(ROW_INPUT, 'text-left')}
				>
					{taxOptions(m.tax_rate).map((option) => (
						<option key={option} value={option}>
							{option === '' ? 'keine' : `${option} %`}
						</option>
					))}
				</select>
			);
		case 'net':
			return field('net', 'Netto', draft.net);
		case 'gross':
			return field('gross', 'Brutto', draft.gross);
		case 'actions':
			return (
				<div className="flex items-center justify-end gap-0.5">
					<button
						type="button"
						aria-label={`Zeile ${m.name} speichern`}
						onClick={() => rowEdit.onSaveRow(m.id)}
						className={cn(ROW_BUTTON, 'border-tinte bg-gelb')}
					>
						✓
					</button>
					<button
						type="button"
						aria-label={`Zeile ${m.name} abbrechen`}
						onClick={() => rowEdit.onCancelRow(m.id)}
						className={cn(ROW_BUTTON, 'border-tinte')}
					>
						✕
					</button>
				</div>
			);
		default:
			return <ReadingCell column={column} material={draftPreview(draft, m)} />;
	}
};

/** Enter speichert die Zeile, Esc bricht sie ab. Tab bleibt unangetastet — er
soll in der Tabellenreihenfolge weiterspringen (#115). */
function onRowKey(event: React.KeyboardEvent<HTMLElement>, id: string, rowEdit: RowEditControls) {
	if (event.key === 'Enter') {
		event.preventDefault();
		rowEdit.onSaveRow(id);
	}
	if (event.key === 'Escape') {
		event.preventDefault();
		rowEdit.onCancelRow(id);
	}
}

/** Die Gebinde-Umrechnung unter dem Eingabefeld — sie rechnet beim Tippen mit. */
const PackagingHint: React.FC<{
	draft: RowDraft;
	material: FestivalMaterialWithStation;
	which: 'ordered' | 'actual';
}> = ({ draft, material, which }) => {
	const preview = draftPreview(draft, material);
	const stored = which === 'ordered' ? preview.ordered_quantity : preview.actual_quantity;
	const hint = formatRequiredPackaging(stored, material);
	return hint ? (
		<span className="block text-[10px] leading-tight text-tinte-soft">{`→ ${hint}`}</span>
	) : null;
};
