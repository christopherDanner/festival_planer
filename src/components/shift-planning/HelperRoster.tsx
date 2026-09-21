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

export interface HelperRosterProps {
	roster: Roster;
	/** Steht im Kopf; ohne Station im Fokus heißt die Liste schlicht „Helfer". */
	focusStationName: string | null;
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

/** Aufschrift einer Gruppe: klein, fett, Versalien. */
const CAPTION = 'text-[10.5px] font-extrabold uppercase tracking-[.06em]';

/**
 * Die **Helferliste** rechts an der Werkbank (#103, Variante C des Prototyps
 * `entscheid-schichtplan-helferliste.html`): Suche, Segment-Filter mit Zählern,
 * Gruppierung nach Wunsch-Passung zur fokussierten Station und je Helfer eine
 * Marke mit Zähler-Plakette und ⋮.
 *
 * Nach ADR 0005 ist sie zugleich der einzige Ort, an dem Helfer entstehen und
 * verschwinden — daher der Anlege-Knopf am Fuß und das Entfernen im ⋮-Menü.
 *
 * Gerechnet und gruppiert wird in `helperRoster`; diese Spalte zeichnet nur.
 * Sie **hält sich unter 900px selbst verborgen**: die Liste am Handy ist ein
 * eigener Schnitt (#105, Schublade statt Spalte), und bis dahin wäre eine
 * 264px-Spalte unter dem Fokus-Kasten nur im Weg.
 */
const HelperRoster: React.FC<HelperRosterProps> = ({
	roster,
	focusStationName,
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
	// Die Spalte klebt oben und **scrollt in sich**: bei 40 Helfern liefe sie
	// sonst unter den Fensterrand und nähme den Anlege-Knopf mit (DESIGN-VISION
	// §6 — was scrollt, scrollt im eigenen Rahmen).
	<aside className="hidden sticky top-3 max-h-[calc(100vh-1.5rem)] flex-col border-2.5 border-tinte bg-white min-[900px]:flex">
		<h3 className="shrink-0 border-b-2 border-tinte bg-papier-getoent px-3 py-2.5 text-xs font-extrabold uppercase tracking-[.07em]">
			{focusStationName ? `Helfer für ${focusStationName}` : 'Helfer'}
		</h3>
		{/* Suche und Schalter bleiben stehen — sie sind der Weg zurück, wenn die
		Marken unten scrollen. */}
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
						<h4 className={cn('mt-1', CAPTION, group.id === 'wish' ? 'text-gruen' : 'text-tinte-soft')}>
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
	</aside>
);

/**
 * Eine Marke: Stanzloch-Punkt, Name, Zähler-Plakette, ⋮ — Variante C aus #68.
 *
 * Der Name ist ein **button** (WCAG 2.1.1): das Zuteilen per Tastatur hängt in
 * #104 daran. Das ⋮ steht daneben statt darin — ein Knopf im Knopf wäre kein
 * gültiges HTML — und ist **dauerhaft sichtbar**, weil es am Touchgerät sonst
 * unauffindbar ist (Auflage zu Variante C).
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
					{/* Stammdaten und Wünsche sind seit ADR 0005 dasselbe Blatt; zu
					einem Dialog verschmolzen werden sie in #107. */}
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

export default HelperRoster;
