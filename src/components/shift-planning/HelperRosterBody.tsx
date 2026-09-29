import React from 'react';
import { MoreVertical, Pencil, UserMinus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { NameChip } from '@/components/toolkit/NameChip';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { HelperFilter, Roster, RosterChip } from '@/lib/helperRoster';
import type { Helper } from '@/lib/helperService';

export interface HelperRosterBodyProps {
	roster: Roster;
	search: string;
	onSearchChange: (value: string) => void;
	filter: HelperFilter;
	onFilterChange: (filter: HelperFilter) => void;
	selectedHelperId: string | null;
	onSelectHelper: (helper: Helper) => void;
	onDragStart: (helper: Helper) => void;
	onDragEnd: () => void;
	onAddHelper: () => void;
	onEditHelper: (helper: Helper) => void;
	onRemoveHelper: (helper: Helper) => void;
}

/**
 * Was **beide Gestalten** der Helferliste brauchen: der Rumpf plus die
 * Aufschrift. Der Typ steht hier und nicht bei einer der beiden, damit die
 * Schublade nicht am Desktop-Kasten hängt — geteilt wird der Rumpf, nicht die
 * Schwester.
 */
export interface HelperListProps extends HelperRosterBodyProps {
	/** Steht im Kopf; ohne Station im Fokus heißt die Liste schlicht „Helfer". */
	focusStationName: string | null;
}

/** Aufschrift einer Gruppe: klein, fett, Versalien. */
const CAPTION = 'text-[10.5px] font-extrabold uppercase tracking-[.06em]';

/**
 * Der **Rumpf der Helferliste**: Suche, Segment-Filter mit Zählern, die nach
 * Wunsch-Passung gruppierten Marken und der Anlege-Knopf am Fuß.
 *
 * Eigener Baustein, weil die Liste zwei Gestalten hat und **eine** sein muss:
 * die 264px-Spalte am Desktop (`HelperRoster`) und die Schublade am Handy
 * (`HelperDrawer`, #105 — „Inhalt ist dieselbe Helferliste wie am Desktop").
 * Zwei Kopien liefen auseinander (ADR 0003 §2).
 *
 * Er malt drei Geschwister statt eines Kastens: die Hülle bestimmt, ob sie in
 * einer klebenden Spalte oder in einer Schublade stehen. Gemeinsam ist beiden,
 * dass **nur die Marken scrollen** — Suche, Schalter und der Anlege-Knopf
 * bleiben stehen, sonst liefe der Weg zurück mit den Marken davon.
 *
 * Geprüft wird er durch beide Hüllen: `HelperRoster.test` nimmt ihn als Spalte,
 * `HelperDrawer.test` als Schublade. Eine dritte Suite für ihn allein prüfte
 * eine Gestalt, die niemand zu sehen bekommt.
 */
const HelperRosterBody: React.FC<HelperRosterBodyProps> = ({
	roster,
	search,
	onSearchChange,
	filter,
	onFilterChange,
	selectedHelperId,
	onSelectHelper,
	onDragStart,
	onDragEnd,
	onAddHelper,
	onEditHelper,
	onRemoveHelper
}) => (
	<>
		<div className="grid shrink-0 gap-2 px-3 pb-1 pt-2.5">
			<Input
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder="Name suchen …"
				aria-label="Helfer suchen"
				className="h-9 text-[13px]"
			/>
			<SegmentedControl<HelperFilter>
				options={[
					{ value: 'all', label: `Alle (${roster.counts.all})` },
					{ value: 'free', label: `Frei (${roster.counts.free})` },
					{ value: 'assigned', label: `Zugeteilt (${roster.counts.assigned})` }
				]}
				value={filter}
				onValueChange={onFilterChange}
				aria-label="Zuteilungs-Filter"
			/>
		</div>

		<div className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto px-3 py-1.5">
			{roster.groups.map((group) => (
				<React.Fragment key={group.id}>
					{group.title && (
						<h4
							className={cn(
								'mt-1',
								CAPTION,
								group.id === 'wish' ? 'text-gruen' : 'text-tinte-soft'
							)}
						>
							{group.title}
						</h4>
					)}
					<div className="flex flex-wrap gap-[5px]">
						{group.chips.map((chip) => (
							<HelperMark
								key={chip.helper.id}
								chip={chip}
								selected={chip.helper.id === selectedHelperId}
								onSelect={() => onSelectHelper(chip.helper)}
								onDragStart={() => onDragStart(chip.helper)}
								onDragEnd={onDragEnd}
								onEdit={() => onEditHelper(chip.helper)}
								onRemove={() => onRemoveHelper(chip.helper)}
							/>
						))}
					</div>
				</React.Fragment>
			))}

			{roster.groups.length === 0 && (
				<p className="py-1 text-xs text-tinte-soft">
					{roster.total === 0
						? 'Noch kein Helfer in diesem Fest.'
						: 'Kein Helfer passt zu Suche und Filter.'}
				</p>
			)}
		</div>

		{/* Helfer entstehen in dieser Liste (ADR 0005) — seit #102 auch der Knopf
		dafür, der vorher in der Werkzeugleiste stand. Er steht außerhalb des
		Scrollfelds: wer einen neuen Helfer braucht, soll ihn nicht suchen müssen. */}
		<button
			type="button"
			onClick={onAddHelper}
			className="m-3 mt-1.5 block shrink-0 border-2 border-dashed border-tinte-soft px-2.5 py-2 text-left text-xs font-bold text-tinte-soft hover:border-tinte hover:bg-fusszeile hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
		>
			+ Neuen Helfer anlegen …
		</button>
	</>
);

/**
 * Eine Marke: Stanzloch-Punkt, Name, Zähler-Plakette, ⋮ — Variante C aus #68.
 *
 * Der Name ist ein **button** (WCAG 2.1.1): daran hängt das Zuteilen per
 * Tastatur und am Handy der ganze Weg (FAB → Marke → Platz, #105). Das ⋮ steht
 * daneben statt darin — ein Knopf im Knopf wäre kein gültiges HTML — und ist
 * **dauerhaft sichtbar**, weil es am Touchgerät sonst unauffindbar ist (Auflage
 * zu Variante C).
 */
function HelperMark({
	chip,
	selected,
	onSelect,
	onDragStart,
	onDragEnd,
	onEdit,
	onRemove
}: {
	chip: RosterChip;
	selected: boolean;
	onSelect: () => void;
	onDragStart: () => void;
	onDragEnd: () => void;
	onEdit: () => void;
	onRemove: () => void;
}) {
	return (
		<NameChip
			className={cn('pr-1', selected ? 'bg-gelb shadow-versatz' : 'hover:bg-papier-getoent')}
		>
			<button
				type="button"
				draggable
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				onClick={onSelect}
				className="-my-1 cursor-grab py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
			>
				{chip.name}
			</button>
			{/* Was die Plakette zählt und was nicht, steht in `helperRoster`. */}
			{chip.shiftCount > 0 && (
				<span className="font-display bg-tinte px-[5px] py-px text-[10.5px] font-semibold tabular-nums tracking-[.03em] text-white">
					<span aria-hidden>{chip.shiftCount}</span>
					<span className="sr-only">{chip.shiftCount} Schicht-Zuteilungen</span>
				</span>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={`Menü für ${chip.name}`}
						className="-my-1 flex h-6 w-5 items-center justify-center text-tinte-soft hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
					>
						<MoreVertical className="h-3.5 w-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* Stammdaten und Wünsche sind seit ADR 0005 dieselbe Zeile und
					seit #107 dasselbe Blatt — ein Eintrag führt auf beides. */}
					<DropdownMenuItem className="gap-2" onClick={onEdit}>
						<Pencil className="h-4 w-4" />
						Bearbeiten &amp; Wünsche …
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2 text-rot" onClick={onRemove}>
						<UserMinus className="h-4 w-4" />
						Aus dem Fest entfernen
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</NameChip>
	);
}

export default HelperRosterBody;
