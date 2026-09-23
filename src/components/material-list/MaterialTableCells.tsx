import React from 'react';
import { MoreVertical } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MissingValue } from '@/components/toolkit/PaperTable';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
// Die Preislücke sieht in Tabelle und Handy-Karte gleich aus — sie steht darum
// einmal in `MaterialMarks` (ADR 0003 §2), nicht hier noch einmal.
import { PriceGap } from './MaterialMarks';
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
	isQuantityColumn,
	storedQuantity,
	taxOptions,
	type CellMove,
	type CellRef,
	type EditableColumn
} from '@/lib/materialCellEdit';
import { formatAmount } from '@/lib/money';

/**
 * Die Zellen der Positionstabelle — **lesend** (#114) und **in Bearbeitung**
 * (#216/#217) nebeneinander, weil beide dieselbe Spaltenordnung bedienen und
 * sonst unweigerlich auseinanderliefen.
 *
 * Gerechnet wird nirgends hier: `materialCosts` (ADR 0006), `materialQuantity`
 * und `materialRow` liefern die Zahlen, `materialCellEdit` die Regeln der Zelle.
 */

export type ColumnKey =
	| 'material'
	| 'station'
	| 'supplier'
	| 'packaging'
	// Die fünf tippbaren Spalten kommen aus `materialCellEdit` — sie sind dort
	// das Vokabular der Zellbearbeitung und dürfen nicht zweimal dastehen.
	| EditableColumn
	| 'delta'
	| 'total'
	| 'actions';

/**
 * Die Zellbearbeitung, wie die Tabelle sie braucht (#216/#217, ADR 0013). Den
 * Zustand hält der `materialCellEditor` — die Tabelle malt ihn und meldet, was
 * geklickt, getippt und gewählt wurde. `onCommit` bekommt die Taste, die das
 * Verlassen ausgelöst hat; welche Zelle das trifft, weiß der Store.
 */
export interface CellEditControls {
	/** Die offene Zelle — höchstens eine im ganzen Kasten. */
	editing: CellRef | null;
	value: string;
	/** Ob in der offenen Zelle getippt wurde — der Preis hängt daran (siehe
	`materialCellEdit`). */
	touched: boolean;
	/** Das Speichern läuft; das Feld nimmt solange keine Zeichen an. */
	saving: boolean;
	/** Das letzte Speichern ist gescheitert — roter Rand, Wert bleibt stehen. */
	failed: boolean;
	/** Eben gespeicherte Zeilen — der kurze grüne Blitz. */
	savedIds: string[];
	onOpen: (material: FestivalMaterialWithStation, column: EditableColumn) => void;
	onType: (value: string) => void;
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

/** Die Gebinde-Umrechnung unter einer Menge: „→ 4 × Fass". Sie steht unter der
gelesenen Zelle wie unter dem Feld der offenen — eine Zeile, ein Rezept
(ADR 0003 §2). */
const PackagingLine: React.FC<{
	stored: number | null;
	material: FestivalMaterialWithStation;
}> = ({ stored, material }) => {
	const hint = formatRequiredPackaging(stored, material);
	return hint ? (
		<span className="block text-[10px] leading-tight text-tinte-soft">{`→ ${hint}`}</span>
	) : null;
};

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

/** Eingabefeld in der Tabelle: rechtsbündig, tabellarische Ziffern, im Fokus
die 2px-Outline mit Versatz. Die Rahmenfarbe kommt vom Aufrufer — die rote
Zelle eines gescheiterten Speicherns (#216) ist dasselbe Feld in anderem Ton. */
const TABLE_INPUT = cn(
	'h-7 w-full border-2 bg-white px-1.5 text-right text-[13px] font-bold tabular-nums text-tinte',
	'focus:outline focus:outline-2 focus:outline-offset-2'
);

/**
 * Der Inhalt einer **lesenden** Zelle — je Spalte an einer Stelle, damit Kopf,
 * Raster und Zeile nicht auseinanderlaufen können (#114).
 *
 * Ohne `actions` bleibt die Aktionsspalte leer: die tippbaren Zellen borgen sich
 * diesen Zwilling für ihren gelesenen Zustand.
 */
export const ReadingCell: React.FC<{
	column: ColumnKey;
	material: FestivalMaterialWithStation;
	actions?: RowActions;
}> = ({ column, material: m, actions }) => {
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
			// Nur noch ⋮: Mengen und Preise stehen in der Zelle (ADR 0013), das ✎
			// daneben war in den 5 % dieser Spalte abgeschnitten.
			return (
				<div className="flex items-center justify-end">
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

/** Die lesende Zelle einer tippbaren Spalte ist ein Knopf: sie *führt* jetzt
irgendwohin. Er nimmt die Zelle samt ihrem Innenabstand ein (negative Ränder),
damit „Klick in die Zelle" auch am Rand trifft, und bleibt mit 40 px hoch genug
(DESIGN-VISION §6). Die gelbe Tönung ist derselbe Hinweis wie am Zettel des
Sponsorings: hier lässt sich etwas eintragen. */
const CELL_BUTTON = cn(
	'-mx-2.5 block h-[40px] w-[calc(100%+1.25rem)] px-2.5 text-right leading-tight hover:bg-gelb/40',
	FOCUS_INK
);

/** Die Beschriftung der fünf tippbaren Spalten — Kopf und Vorlesehilfe nennen
sie gleich. */
/** Tasten, mit denen man in einer Auswahl *blättert*, ohne sich zu entscheiden. */
const BROWSING_KEYS = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

const CELL_LABEL: Record<EditableColumn, string> = {
	ordered: 'Bestellt',
	consumed: 'Verbraucht',
	tax: 'MwSt',
	net: 'Netto',
	gross: 'Brutto'
};

/**
 * Eine der fünf tippbaren Zellen in **Zellbearbeitung** (#216/#217, ADR 0013):
 * lesend ein Knopf, angeklickt ein Eingabefeld an genau dieser Stelle — bei der
 * MwSt eine Auswahl, die sofort speichert. Gespeichert wird beim Verlassen;
 * welche Taste wohin führt, weiß der `materialCellEditor`.
 *
 * `preview` ist die Position, wie sie mit dem Getippten aussähe: die gelesenen
 * Zellen der Zeile — auch die Gegenseite des Preises — rechnen darüber mit.
 *
 * Gescheitertes Speichern lässt das Feld stehen: roter Rand, getippter Wert,
 * und an der Stelle der Gebinde-Umrechnung die Meldung. Der Platz ist derselbe,
 * damit die Zeile dabei nicht wächst.
 */
export const EditCell: React.FC<{
	column: EditableColumn;
	material: FestivalMaterialWithStation;
	preview: FestivalMaterialWithStation;
	cellEdit: CellEditControls;
}> = ({ column, material: m, preview, cellEdit }) => {
	const label = `${CELL_LABEL[column]} von ${m.name}`;
	const open = cellEdit.editing?.id === m.id && cellEdit.editing.column === column;
	const field = React.useRef<HTMLInputElement | HTMLSelectElement>(null);
	const failed = open && cellEdit.failed;
	// Ein geschlossenes `<select>` meldet bei *jeder* Pfeiltaste ein `change`.
	// Ohne diese Notiz spränge das Blättern von 20 auf 10 unterwegs davon und
	// schriebe die 13 weg, die niemand gemeint hat. Mit der Tastatur bestätigt
	// darum erst Enter oder Tab, mit der Maus die Auswahl selbst.
	const blaettert = React.useRef(false);

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
				className={CELL_BUTTON}
			>
				<ReadingCell column={column} material={preview} />
			</button>
		);
	}

	const cell: CellRef = { id: m.id, column };
	const tone = failed ? 'border-rot focus:outline-rot' : 'border-tinte focus:outline-tinte';

	return (
		<>
			{column === 'tax' ? (
				// Ein natives `<select>`, nicht die Radix-Hülle `ui/select` (ADR 0003
				// §1 behält sie für ihr Verhalten). Hier arbeitet dieses Verhalten
				// gegen die Zelle: Radix fängt Enter, Esc und Tab für seine Liste ab
				// und rendert sie in ein Portal — genau die drei Tasten, die den
				// Tastaturfluss des Rechnungsabgleichs tragen (ADR 0013). Dasselbe
				// galt schon im Zeilenmodus, den diese Zelle ablöst.
				<select
					ref={field as React.Ref<HTMLSelectElement>}
					value={cellEdit.value}
					disabled={cellEdit.saving}
					autoFocus
					aria-label={label}
					aria-invalid={failed || undefined}
					// „Auswahl speichert sofort" (#217): eine getroffene Wahl ist fertig,
					// ein zweiter Handgriff wäre nur im Weg. Sie geht dabei weiter nach
					// Netto statt ins Leere — sonst bräche der Tastaturfluss genau hier
					// ab und der Fokus läge im Dokument statt in der Tabelle.
					onChange={(e) => {
						cellEdit.onType(e.target.value);
						if (!blaettert.current) cellEdit.onCommit('forward', cell);
					}}
					onKeyDown={(e) => {
						blaettert.current = BROWSING_KEYS.includes(e.key);
						onCellKey(e, cellEdit, cell);
					}}
					onBlur={() => cellEdit.onCommit(null, cell)}
					className={cn(TABLE_INPUT, 'text-left', tone)}
				>
					{taxOptions(m.tax_rate).map((option) => (
						<option key={option} value={option}>
							{option === '' ? 'keine' : `${option} %`}
						</option>
					))}
				</select>
			) : (
				<input
					// `text`, nicht `number`: ein Zahlenfeld verwirft das Dezimalkomma
					// still — die Zelle zeigte weiter „2,5" und speicherte „nicht
					// erfasst". `inputMode` holt am Handy trotzdem die Zifferntastatur.
					type="text"
					inputMode="decimal"
					ref={field as React.Ref<HTMLInputElement>}
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
					className={cn(TABLE_INPUT, tone)}
				/>
			)}
			{failed ? (
				<span
					role="alert"
					className="block truncate text-[10px] font-bold leading-tight text-rot"
				>
					Nicht gespeichert — Enter
				</span>
			) : (
				isQuantityColumn(column) && (
					<PackagingLine stored={storedQuantity(column, preview)} material={m} />
				)
			)}
		</>
	);
};

/**
 * Die Tastatur des Rechnungsabgleichs (#216/#217): Enter speichert und geht in
 * dieselbe Spalte der nächsten Zeile (Shift+Enter hoch), Tab läuft quer durch
 * die fünf tippbaren Zellen (Shift+Tab zurück), Esc verwirft **nur** diese
 * Zelle.
 *
 * Tab bekommt hier ein `preventDefault`: der Weg führt in die nächste tippbare
 * Zelle, nicht zum nächsten Knopf im Dokument.
 */
function onCellKey(
	event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
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
