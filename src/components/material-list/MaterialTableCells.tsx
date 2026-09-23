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
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { cn } from '@/lib/utils';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { grossPrice, netPrice, rowTotal } from '@/lib/materialCosts';
import {
	formatBaseAmount,
	formatPackaging,
	formatQuantity,
	formatRequiredPackaging,
	toBaseQuantity
} from '@/lib/materialQuantity';
import { deltaCell, taxCell, type DeltaTone } from '@/lib/materialRow';
import {
	previewCell,
	storedQuantity,
	type CellMove,
	type CellRef,
	type InputUnit,
	type InputUnits,
	type QuantityColumn
} from '@/lib/materialCellEdit';
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
	// Die zwei Mengenspalten kommen aus `materialCellEdit` — sie sind dort das
	// Vokabular der Zellbearbeitung (#216) und dürfen nicht zweimal dastehen.
	| QuantityColumn
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

/**
 * Die Zellbearbeitung der Mengen, wie die Tabelle sie braucht (#216, ADR 0013).
 * Den Zustand hält der `materialCellEditor` — die Tabelle malt ihn und meldet,
 * was geklickt und getippt wurde. `onCommit` bekommt die Taste, die das
 * Verlassen ausgelöst hat; welche Zelle das trifft, weiß der Store.
 */
export interface CellEditControls {
	/** Die offene Zelle — höchstens eine im ganzen Kasten. */
	editing: CellRef | null;
	value: string;
	/** Das Speichern läuft; das Feld nimmt solange keine Zeichen an. */
	saving: boolean;
	/** Das letzte Speichern ist gescheitert — roter Rand, Wert bleibt stehen. */
	failed: boolean;
	/** Eben gespeicherte Zeilen — der kurze grüne Blitz. */
	savedIds: string[];
	/**
	 * Die **Eingabe-Einheit** je Mengenspalte (#218) — die Wahl ihres
	 * Spaltenkopfs. Der `materialCellEditor` liest dieselbe Wahl; sie steht
	 * darum an *einer* Stelle in der Arbeitsliste und reist von dort in beide.
	 */
	units: InputUnits;
	onOpen: (material: FestivalMaterialWithStation, column: QuantityColumn) => void;
	onType: (value: string) => void;
	onUnitChange: (column: QuantityColumn, unit: InputUnit) => void;
	/** `from` ist die Zelle, die der Aufrufer zu verlassen glaubt (siehe Store). */
	onCommit: (move: CellMove | null, from: CellRef) => void;
	onCancel: () => void;
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

/** Die Gebinde-Umrechnung unter einer Menge: „→ 4 × Fass". Sie steht unter der
gelesenen Zelle, unter dem Feld der offenen Zeile und unter dem der offenen
Zelle — eine Zeile, ein Rezept (ADR 0003 §2). */
const PackagingLine: React.FC<{
	stored: number | null;
	material: FestivalMaterialWithStation;
}> = ({ stored, material }) => {
	const hint = formatRequiredPackaging(stored, material);
	return hint ? (
		<span className="block text-[10px] leading-tight text-tinte-soft">{`→ ${hint}`}</span>
	) : null;
};

/** Die Gegenrichtung unter dem Feld, wenn die Spalte auf **Gebinde** steht
(#218): „= 200 Liter". Sie steht auch bei Positionen ohne Gebinde — dort nennt
sie die Einheit, in der diese eine Zelle trotzdem getippt wird. Derselbe Platz
wie die `PackagingLine`, damit die Zeile beim Umschalten nicht wächst. */
const BaseLine: React.FC<{
	stored: number | null;
	material: FestivalMaterialWithStation;
}> = ({ stored, material }) => (
	<span className="block truncate text-[10px] leading-tight text-tinte-soft">
		{formatBaseAmount(stored, material)}
	</span>
);

/** Menge in Basiseinheiten samt Einheit, darunter die Gebinde-Umrechnung. */
const QuantityCell: React.FC<{ stored: number | null; material: FestivalMaterialWithStation }> = ({
	stored,
	material
}) => {
	if (stored == null) return <MissingValue />;
	return (
		<>
			<span className="font-medium">{formatQuantity(toBaseQuantity(stored, material) ?? 0)}</span>{' '}
			<span className="text-[10.5px] text-tinte-soft">{material.unit}</span>
			<PackagingLine stored={stored} material={material} />
		</>
	);
};

/** Knöpfe in der Aktionsspalte — klein genug für die 5 %-Spalte, mit dem
Fokus-Ring des Toolkits (DESIGN-VISION §6). */
const ROW_BUTTON = cn(
	'border-2 bg-white px-1.5 py-0.5 font-extrabold leading-tight text-tinte hover:bg-gelb',
	FOCUS_INK
);

/** Eingabefeld in der Tabelle: rechtsbündig, tabellarische Ziffern, im Fokus
die 2px-Outline mit Versatz. Die Rahmenfarbe kommt vom Aufrufer — die rote
Zelle eines gescheiterten Speicherns (#216) ist dasselbe Feld in anderem Ton. */
const TABLE_INPUT = cn(
	'h-7 w-full border-2 bg-white px-1.5 text-right text-[13px] font-bold tabular-nums text-tinte',
	'focus:outline focus:outline-2 focus:outline-offset-2'
);

/** Das Feld der offenen Zeile (#115) — immer Tinte. */
const ROW_INPUT = cn(TABLE_INPUT, 'border-tinte focus:outline-tinte');

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

/** Die lesende Mengenzelle ist ein Knopf: sie *führt* jetzt irgendwohin. Er
nimmt die Zelle samt ihrem Innenabstand ein (negative Ränder), damit „Klick in
die Zelle" auch am Rand trifft, und bleibt mit 40 px hoch genug (DESIGN-VISION
§6). Die gelbe Tönung ist derselbe Hinweis wie am Zettel des Sponsorings: hier
lässt sich etwas eintragen. */
const QUANTITY_BUTTON = cn(
	'-mx-2.5 block h-[40px] w-[calc(100%+1.25rem)] px-2.5 text-right leading-tight hover:bg-gelb/40',
	FOCUS_INK
);

/** Die Beschriftung der Mengenspalten — Kopf und Vorlesehilfe nennen sie
gleich. */
const QUANTITY_LABEL: Record<QuantityColumn, string> = {
	ordered: 'Bestellt',
	consumed: 'Verbraucht'
};

const UNIT_OPTIONS: readonly { value: InputUnit; label: string }[] = [
	{ value: 'base', label: 'Basis' },
	{ value: 'packaging', label: 'Gebinde' }
];

/**
 * Der Umschalter im Kopf einer Mengenspalte (#218): worin die Zellen **dieser
 * Spalte** getippt werden. Umgeschaltet wird die Spalte und nicht die einzelne
 * Zelle — eine Lieferantenrechnung ist durchgehend in einer Einheit
 * (CONTEXT.md).
 *
 * Versalien und Sperrung erbt er vom Kopf (`PAPER_TABLE_HEAD_CELL`); die
 * Sperrung nimmt er zurück, sonst passt „GEBINDE" nicht in die 9 %-Spalte.
 */
export const QuantityUnitToggle: React.FC<{
	column: QuantityColumn;
	unit: InputUnit;
	onChange: (column: QuantityColumn, unit: InputUnit) => void;
}> = ({ column, unit, onChange }) => (
	<SegmentedControl<InputUnit>
		size="sm"
		options={UNIT_OPTIONS}
		value={unit}
		onValueChange={(next) => onChange(column, next)}
		aria-label={`Eingabe-Einheit für ${QUANTITY_LABEL[column]}`}
		className="mt-1 tracking-normal"
	/>
);

/**
 * Eine Mengenzelle in **Zellbearbeitung** (#216, ADR 0013): lesend ein Knopf,
 * angeklickt ein Eingabefeld an genau dieser Stelle. Getippt wird in der
 * Eingabe-Einheit der Spalte — Basis oder Gebinde (#218) —, gespeichert beim
 * Verlassen; welche Taste wohin führt, weiß der `materialCellEditor`.
 *
 * Unter dem Feld rechnet die Zeile mit: im Basis-Modus in Gebinde („→ 4 ×
 * Fass"), im Gebinde-Modus in die Basiseinheit („= 200 Liter"). Der **lesende**
 * Knopf bleibt davon unberührt — umgeschaltet wird die Eingabe, nicht die
 * Anzeige (#218).
 *
 * Gescheitertes Speichern lässt das Feld stehen: roter Rand, getippter Wert,
 * und an der Stelle der Umrechnung die Meldung. Der Platz ist derselbe, damit
 * die Zeile dabei nicht wächst.
 */
export const QuantityEditCell: React.FC<{
	column: QuantityColumn;
	material: FestivalMaterialWithStation;
	cellEdit: CellEditControls;
}> = ({ column, material: m, cellEdit }) => {
	const label = `${QUANTITY_LABEL[column]} von ${m.name}`;
	const open = cellEdit.editing?.id === m.id && cellEdit.editing.column === column;
	const unit = cellEdit.units[column];
	const field = React.useRef<HTMLInputElement>(null);
	const failed = open && cellEdit.failed;

	// Der Fehlschlag kommt typisch aus dem Blur — der Fokus ist dann woanders,
	// und „Enter versucht es erneut" braucht ihn hier.
	React.useEffect(() => {
		if (failed) field.current?.focus();
	}, [failed]);

	if (!open) {
		return (
			<button
				type="button"
				aria-label={label}
				onClick={() => cellEdit.onOpen(m, column)}
				className={QUANTITY_BUTTON}
			>
				<QuantityCell stored={storedQuantity(column, m)} material={m} />
			</button>
		);
	}

	const preview = previewCell(column, cellEdit.value, m, unit);
	const cell: CellRef = { id: m.id, column };

	return (
		<>
			<input
				// `text`, nicht `number`: ein Zahlenfeld verwirft das Dezimalkomma
				// still — die Zelle zeigte weiter „2,5" und speicherte „nicht
				// erfasst". `inputMode` holt am Handy trotzdem die Zifferntastatur.
				type="text"
				inputMode="decimal"
				ref={field}
				value={cellEdit.value}
				// Während das Speichern läuft, nimmt das Feld keine Zeichen an — sonst
				// ginge das Getippte mit dem Sprung in die nächste Zelle verloren.
				readOnly={cellEdit.saving}
				autoFocus
				aria-label={label}
				aria-invalid={failed || undefined}
				placeholder="–"
				onChange={(e) => cellEdit.onType(e.target.value)}
				onKeyDown={(e) => onCellKey(e, cellEdit, cell)}
				onBlur={() => cellEdit.onCommit(null, cell)}
				className={cn(
					TABLE_INPUT,
					failed ? 'border-rot focus:outline-rot' : 'border-tinte focus:outline-tinte'
				)}
			/>
			{failed ? (
				<span
					role="alert"
					className="block truncate text-[10px] font-bold leading-tight text-rot"
				>
					Nicht gespeichert — Enter
				</span>
			) : unit === 'packaging' ? (
				<BaseLine stored={storedQuantity(column, preview)} material={m} />
			) : (
				<PackagingLine stored={storedQuantity(column, preview)} material={m} />
			)}
		</>
	);
};

/**
 * Die Tastatur des Rechnungsabgleichs (#216): Enter speichert und geht in
 * dieselbe Spalte der nächsten Zeile (Shift+Enter hoch), Tab läuft quer durch
 * die Mengenzellen (Shift+Tab zurück), Esc verwirft **nur** diese Zelle.
 *
 * Tab bekommt hier ein `preventDefault`, anders als im Zeilenmodus: der Weg
 * führt in die nächste *Mengen*zelle, nicht zum nächsten Knopf im Dokument.
 */
function onCellKey(
	event: React.KeyboardEvent<HTMLInputElement>,
	cellEdit: CellEditControls,
	cell: CellRef
) {
	if (event.key === 'Enter') {
		event.preventDefault();
		cellEdit.onCommit(event.shiftKey ? 'up' : 'down', cell);
	}
	if (event.key === 'Tab') {
		event.preventDefault();
		cellEdit.onCommit(event.shiftKey ? 'back' : 'forward', cell);
	}
	if (event.key === 'Escape') {
		event.preventDefault();
		cellEdit.onCancel();
	}
}

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
			// `tabIndex={-1}`: Tab soll von Feld zu Feld und in die nächste Zeile
			// gehen (#115). Zwei Knöpfe je Zeile im Pfad wären beim Nachtragen über
			// 76 Positionen 152 Stopps zwischen den Zahlen — dieselben Handgriffe
			// liegen ohnehin auf Enter und Esc.
			return (
				<div className="flex items-center justify-end gap-0.5">
					<button
						type="button"
						tabIndex={-1}
						aria-label={`Zeile ${m.name} speichern`}
						onClick={() => rowEdit.onSaveRow(m.id)}
						className={cn(ROW_BUTTON, 'border-tinte bg-gelb')}
					>
						✓
					</button>
					<button
						type="button"
						tabIndex={-1}
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

/** Die Gebinde-Umrechnung unter dem Eingabefeld der offenen Zeile — sie rechnet
beim Tippen mit und sieht aus wie überall (`PackagingLine`). */
const PackagingHint: React.FC<{
	draft: RowDraft;
	material: FestivalMaterialWithStation;
	which: 'ordered' | 'actual';
}> = ({ draft, material, which }) => {
	const preview = draftPreview(draft, material);
	const stored = which === 'ordered' ? preview.ordered_quantity : preview.actual_quantity;
	return <PackagingLine stored={stored} material={material} />;
};
