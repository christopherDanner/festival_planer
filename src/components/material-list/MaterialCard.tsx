import React from 'react';
import { Check, MoreVertical, Pencil, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import { MissingValue } from '@/components/toolkit/PaperTable';
import { KEINE } from '@/lib/materialDialogForm';
import { formatAmount } from '@/lib/money';
import { grossPrice, netPrice, rowTotal } from '@/lib/materialCosts';
import { deltaCell, taxCell, TAX_RATES } from '@/lib/materialRow';
import {
	formatPackaging,
	formatQuantity,
	formatRequiredPackaging,
	toBaseQuantity
} from '@/lib/materialQuantity';
import { rowDraftPreview, type RowDraft, type RowField } from '@/lib/materialRowEdit';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

import { DELTA_TONE, PackagingHint, PriceGap } from './MaterialMarks';

export interface MaterialCardProps {
	material: FestivalMaterialWithStation;
	/** Station als eigene Angabe — im Stations-Kasten wäre sie redundant (#113). */
	showStation: boolean;
	/** Gesetzt heißt: diese Karte ist im Zeilenmodus. Der Entwurf kommt von
	außen, weil mehrere Karten gleichzeitig offen sein dürfen und die
	Sammel-Fußleiste sie alle zählt (#116). */
	draft: RowDraft | null;
	onStartEdit: () => void;
	onDraftChange: (field: RowField, value: string) => void;
	onSave: () => void;
	onCancel: () => void;
	/** ⋮ → Stammdaten-Dialog (#117). */
	onEdit: () => void;
	onCopy: () => void;
	onDelete: () => void;
}

/**
 * Eine Material-Position am Handy (#116): **Karte statt querscrollender
 * Tabelle**. Die elf Spalten aus #114 brauchen gemessene ~1.085 px — bei 390 px
 * wären das drei Bildschirmbreiten Wischen, und die bearbeitete Zeile läge
 * teils außerhalb des Sichtfelds. Bewusste Abweichung von DESIGN-VISION §6
 * („Tabellen scrollen horizontal im eigenen Rahmen"), begründet am Scroll-Weg —
 * dieselbe Art Abweichung wie „am Handy bleibt die Schublade" in #68.
 *
 * ✎ macht die fünf Wert-Kacheln zu Eingabefeldern, ✓/✕ stehen dann in der
 * Kopfzeile. Die Regeln dahinter (Netto ⇄ Brutto, Δ und Gesamt live, was
 * Speichern übernimmt) stehen in `materialRowEdit` — die Karte malt nur.
 */
const MaterialCard: React.FC<MaterialCardProps> = ({
	material: m,
	showStation,
	draft,
	onStartEdit,
	onDraftChange,
	onSave,
	onCancel,
	onEdit,
	onCopy,
	onDelete
}) => {
	const editing = draft != null;
	const preview = draft ? rowDraftPreview(draft, m) : null;
	const delta = preview?.delta ?? deltaCell(m);
	const total = preview ? preview.total : rowTotal(m);
	const tile = editing ? 'bg-gelb' : 'bg-white';

	// Enter speichert, Esc bricht ab — dieselbe Tastatur wie in der Zeile (#115).
	const keys = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			onSave();
		}
		if (e.key === 'Escape') onCancel();
	};

	return (
		<div className={cn('border-2 border-tinte', editing ? 'bg-gelb' : 'bg-white')}>
			<div className="flex items-start gap-2 border-b border-linie px-3 py-2.5">
				<div className="min-w-0 flex-1">
					<p className="break-words font-bold leading-tight">{m.name}</p>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-tinte-soft">
						{m.category && (
							<span className="bg-papier-getoent px-1.5 font-bold">{m.category}</span>
						)}
						{showStation && m.station?.name && <span>{m.station.name}</span>}
						{m.supplier && <span>{m.supplier}</span>}
					</div>
				</div>
				<div className="flex shrink-0 gap-1">
					{editing ? (
						<>
							<IconButton label={`Werte von ${m.name} speichern`} onClick={onSave} tone="ink">
								<Check className="h-4 w-4" />
							</IconButton>
							<IconButton label={`Bearbeiten von ${m.name} abbrechen`} onClick={onCancel}>
								<X className="h-4 w-4" />
							</IconButton>
						</>
					) : (
						<>
							<IconButton label={`Werte von ${m.name} bearbeiten`} onClick={onStartEdit}>
								<Pencil className="h-4 w-4" />
							</IconButton>
							<DropdownMenu>
								<DropdownMenuTrigger
									aria-label={`Menü für ${m.name}`}
									className={cn(
										'inline-flex min-h-10 min-w-10 items-center justify-center border-1.5 border-tinte bg-white text-tinte-soft hover:text-tinte',
										'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte'
									)}>
									<MoreVertical className="h-4 w-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={onEdit}>Bearbeiten</DropdownMenuItem>
									<DropdownMenuItem onSelect={onCopy}>Kopieren</DropdownMenuItem>
									<DropdownMenuItem className="text-rot" onSelect={onDelete}>
										Entfernen
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					)}
				</div>
			</div>

			<div className="grid grid-cols-3 gap-px bg-linie">
				<Tile label={`Bestellt (${m.unit})`} className={tile}>
					{draft ? (
						<NumberField
							label={`Bestellt (${m.unit}) für ${m.name}`}
							value={draft.ordered}
							onChange={(value) => onDraftChange('ordered', value)}
							onKeyDown={keys}
						/>
					) : (
						<Quantity stored={m.ordered_quantity} material={m} />
					)}
					<PackagingHint hint={preview ? preview.orderedPackaging : formatRequiredPackaging(m.ordered_quantity, m)} />
				</Tile>
				<Tile label={`Verbraucht (${m.unit})`} className={tile}>
					{draft ? (
						<NumberField
							label={`Verbraucht (${m.unit}) für ${m.name}`}
							value={draft.consumed}
							onChange={(value) => onDraftChange('consumed', value)}
							onKeyDown={keys}
						/>
					) : (
						<Quantity stored={m.actual_quantity} material={m} />
					)}
					<PackagingHint hint={preview ? preview.consumedPackaging : formatRequiredPackaging(m.actual_quantity, m)} />
				</Tile>
				{/* Δ wird gerechnet, nicht getippt — auch im Zeilenmodus (#115). */}
				<Tile label="Δ" className={tile}>
					<span className={DELTA_TONE[delta.tone]}>{delta.text}</span>
				</Tile>
			</div>

			<div className="grid grid-cols-3 gap-px border-t border-linie bg-linie">
				<Tile label="MwSt" className={tile}>
					{draft ? (
						<TaxField
							name={m.name}
							value={draft.taxRate}
							onChange={(value) => onDraftChange('taxRate', value)}
						/>
					) : (
						<TaxValue material={m} />
					)}
				</Tile>
				<PriceTile
					label="Netto €"
					className={tile}
					value={netPrice(m)}
					field="net"
					material={m}
					draft={draft}
					onDraftChange={onDraftChange}
					onKeyDown={keys}
				/>
				<PriceTile
					label="Brutto €"
					className={tile}
					value={grossPrice(m)}
					field="gross"
					material={m}
					draft={draft}
					onDraftChange={onDraftChange}
					onKeyDown={keys}
				/>
			</div>

			<div className="flex items-baseline justify-between gap-3 border-t border-linie px-3 py-2 text-[12px]">
				<span className="text-tinte-soft">{formatPackaging(m)}</span>
				<span className="flex items-baseline gap-2">
					<span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
						Gesamt €
					</span>
					{/* Ohne Preis keine Zeilensumme — die Position verfälscht keine Summe. */}
					{total == null ? (
						<MissingValue />
					) : (
						<b className="font-display text-[15px] font-semibold tabular-nums">
							{formatAmount(total)}
						</b>
					)}
				</span>
			</div>
		</div>
	);
};

/** Eine Wert-Kachel: Versalien-Kleinlabel, darunter der Wert oder sein Feld. */
const Tile: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
	label,
	className,
	children
}) => (
	<div className={cn('px-3 py-2', className)}>
		<p className="text-[10px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">{label}</p>
		<div className="mt-1 text-[13px] font-medium tabular-nums">{children}</div>
	</div>
);

/** Menge in Basiseinheiten samt Einheit; „–", solange nichts erfasst ist. */
const Quantity: React.FC<{ stored: number | null; material: FestivalMaterialWithStation }> = ({
	stored,
	material
}) => {
	if (stored == null) return <MissingValue />;
	return <span>{formatQuantity(toBaseQuantity(stored, material) ?? 0)}</span>;
};

const TaxValue: React.FC<{ material: FestivalMaterialWithStation }> = ({ material }) => {
	const tax = taxCell(material);
	return <span className={tax.muted ? 'text-tinte-soft' : undefined}>{tax.text}</span>;
};

/** Netto- oder Brutto-Kachel: lesend der Betrag (oder die Preislücke), im
Zeilenmodus das Feld. Beide Seiten hängen an denselben Regeln — darum ein
Baustein für beide statt zweier fast gleicher. */
const PriceTile: React.FC<{
	label: string;
	className?: string;
	value: number | null;
	field: Extract<RowField, 'net' | 'gross'>;
	material: FestivalMaterialWithStation;
	draft: RowDraft | null;
	onDraftChange: (field: RowField, value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ label, className, value, field, material, draft, onDraftChange, onKeyDown }) => (
	<Tile label={label} className={className}>
		{draft ? (
			<NumberField
				label={`${label} für ${material.name}`}
				value={draft[field]}
				onChange={(next) => onDraftChange(field, next)}
				onKeyDown={onKeyDown}
			/>
		) : value == null ? (
			<PriceGap />
		) : (
			<span>{formatAmount(value)}</span>
		)}
	</Tile>
);

/**
 * Ein Zahlenfeld des Zeilenmodus: rechtsbündig mit tabellarischen Ziffern
 * (#115), Antippziel ≥ 40 px (DESIGN-VISION §6).
 *
 * Bewusst `type="text"` mit `inputMode="decimal"`: ein Zahlenfeld gibt für
 * „2," und „12." den leeren Text zurück, und die gekoppelte Preisseite fiele
 * beim Tippen jedes Kommas kurz auf leer. Der Entwurf ist Text, gerade damit
 * ein halb getippter Wert stehen bleibt (`materialRowEdit`); die Tastatur des
 * Handys bleibt trotzdem die Zehnertastatur.
 */
const NumberField: React.FC<{
	label: string;
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ label, value, onChange, onKeyDown }) => (
	<Input
		type="text"
		inputMode="decimal"
		aria-label={label}
		value={value}
		onChange={(e) => onChange(e.target.value)}
		onKeyDown={onKeyDown}
		placeholder="–"
		className={cn(
			'h-10 w-full border-2 border-tinte bg-white px-2 text-right text-[13px] font-bold tabular-nums text-tinte',
			FOCUS_INK
		)}
	/>
);

/**
 * Das MwSt-Feld der Karte. Die Sätze kommen aus `materialRow`, damit ein neuer
 * Satz nicht an zwei Stellen nachgetragen werden muss; ein gespeicherter Satz
 * außerhalb der Liste steht trotzdem in der Auswahl, sonst zeigte das Feld für
 * ihn nichts an.
 *
 * `KEINE` ist der Sentinel des Stammdaten-Dialogs: Radix kennt keinen leeren
 * Wert, und zwei Sentinel für dieselbe Leere wären einer zu viel.
 */
const TaxField: React.FC<{
	name: string;
	value: string;
	onChange: (value: string) => void;
}> = ({ name, value, onChange }) => {
	const rates = TAX_RATES.map(({ rate }) => String(rate));
	const offered = value && !rates.includes(value) ? [...rates, value] : rates;

	return (
		<Select value={value || KEINE} onValueChange={(next) => onChange(next === KEINE ? '' : next)}>
			<SelectTrigger
				aria-label={`MwSt für ${name}`}
				className={cn('h-10 border-2 border-tinte bg-white px-2 text-[13px] font-bold', FOCUS_INK)}>
				<SelectValue placeholder="keine" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={KEINE}>keine</SelectItem>
				{offered.map((rate) => (
					<SelectItem key={rate} value={rate}>
						{rate} %
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

const IconButton: React.FC<{
	label: string;
	onClick: () => void;
	tone?: 'ink';
	children: React.ReactNode;
}> = ({ label, onClick, tone, children }) => (
	<button
		type="button"
		onClick={onClick}
		aria-label={label}
		className={cn(
			'inline-flex min-h-10 min-w-10 items-center justify-center border-1.5 border-tinte',
			'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
			tone === 'ink' ? 'bg-tinte text-white' : 'bg-white text-tinte'
		)}>
		{children}
	</button>
);

export default MaterialCard;
