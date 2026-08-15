import React from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Poster } from '@/components/toolkit/Poster';
import { NameChip } from '@/components/toolkit/NameChip';
import { OpenSlot } from '@/components/toolkit/OpenSlot';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { BoardRow, StationBoard } from '@/lib/shiftBoard';
import type { StationShift } from '@/lib/shiftService';

export interface StationFocusBoxProps {
	board: StationBoard;
	/** Ein Helfer ist ausgewählt — die Ablageflächen sind scharf gestellt. */
	isSelecting?: boolean;
	/** Nur diese Station auto-füllen; verdrahtet wird der Knopf in #108. */
	onAutoFill: () => void;
	onEditStation: () => void;
	onDeleteStation: () => void;
	onAddShift: () => void;
	onEditShift: (shift: StationShift) => void;
	onDeleteShift: (shiftId: string) => void;
	onAssignToShift: (stationShiftId: string) => void;
	onAssignToStation: () => void;
	onDropOnShift: (stationShiftId: string, e: React.DragEvent) => void;
	onDropOnStation: (e: React.DragEvent) => void;
	onRemoveFromShift: (stationShiftId: string, helperId: string) => void;
	onRemoveFromStation: (helperId: string) => void;
}

const OFFEN_TON = 'text-[11px] font-extrabold uppercase tracking-[.05em] tabular-nums';

/**
 * Fokus-Kasten des Schichtplans (#102): **eine** Station in voller Breite —
 * grüner Halftone-Kopf, Tages-Zwischentitel, Schicht-Zeilen mit Platz-Raster,
 * darunter der Griff für eine neue Schicht und die Fußzeile der
 * Stationsmitglieder.
 *
 * Eine Station **ohne** Schichten bekommt dasselbe Bild eine Ebene tiefer: eine
 * Pseudo-Zeile „GANZES FEST" über `required_people` (Entscheid 1 aus #68) —
 * gleiche Optik, gleiche Geste, damit die Zählregel des Dashboards auch
 * sichtbar wahr wird.
 *
 * Zuteilen baut dieser Schnitt nicht (#104): die bestehenden Griffe — Ziehen
 * auf die Zeile, Antippen bei ausgewähltem Helfer, × am belegten Platz —
 * hängen unverändert an den neuen Plätzen, damit der Bereich zwischen #102 und
 * #104 nicht funktionslos ist.
 */
const StationFocusBox: React.FC<StationFocusBoxProps> = ({
	board,
	isSelecting = false,
	onAutoFill,
	onEditStation,
	onDeleteStation,
	onAddShift,
	onEditShift,
	onDeleteShift,
	onAssignToShift,
	onAssignToStation,
	onDropOnShift,
	onDropOnStation,
	onRemoveFromShift,
	onRemoveFromStation
}) => {
	const { station } = board;
	const responsible = station.responsible_helper
		? `${station.responsible_helper.last_name} ${station.responsible_helper.first_name}`
		: null;
	// Ohne Ort sagt der Kopf wenigstens, auf welcher Ebene diese Station plant.
	const where = station.description || (board.hasShifts ? null : 'Ohne Schichten');

	/** Zeile zeichnen — die Schicht-Zeilen und die Pseudo-Zeile sind dasselbe Bild. */
	const renderRow = (row: BoardRow) => {
		const shift = row.shift;
		return (
			<div
				key={row.id}
				className={cn(
					'border-b border-linie px-3 py-3 last:border-b-0 min-[900px]:px-[18px]',
					isSelecting && 'cursor-pointer bg-gelb/10'
				)}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => (shift ? onDropOnShift(shift.id, e) : onDropOnStation(e))}
			>
				<div className="mb-2 flex flex-wrap items-baseline gap-2.5">
					<time className="font-display text-lg font-semibold tracking-[.02em]">{row.time}</time>
					<span className="text-xs font-semibold text-tinte-soft">{row.subtitle}</span>
					<span className={cn('ml-auto', OFFEN_TON, row.open > 0 ? 'text-rot' : 'text-gruen')}>
						{row.open > 0 ? `${row.open} OFFEN` : 'VOLL'}
					</span>
					{shift && (
						<RowMenu
							label={`Menü der Schicht ${row.time}`}
							onEdit={() => onEditShift(shift)}
							onDelete={() => onDeleteShift(shift.id)}
							editLabel="Schicht bearbeiten"
							deleteLabel="Schicht löschen"
						/>
					)}
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[7px]">
					{row.slots.map((slot) =>
						slot.helperId ? (
							<span
								key={slot.position}
								className="flex items-center gap-[7px] border-1.5 border-tinte bg-papier px-2.5 py-[7px] text-[12.5px] font-semibold"
							>
								<span className="font-display text-[11px] font-semibold text-tinte-soft">
									{slot.position}
								</span>
								<span className="min-w-0 flex-1 truncate">{slot.name}</span>
								<button
									type="button"
									aria-label={`${slot.name} von diesem Platz entfernen`}
									onClick={() =>
										shift
											? onRemoveFromShift(shift.id, slot.helperId!)
											: onRemoveFromStation(slot.helperId!)
									}
									className="-my-1 -mr-1.5 px-1.5 py-1 font-bold text-tinte-soft hover:text-rot focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
								>
									×
								</button>
							</span>
						) : (
							<OpenSlot
								key={slot.position}
								className="w-full justify-start gap-[7px]"
								onClick={() => (shift ? onAssignToShift(shift.id) : onAssignToStation())}
							>
								<span className="font-display text-[11px] font-semibold">{slot.position}</span>+
								HELFER HIERHER ZIEHEN
							</OpenSlot>
						)
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="border-2.5 border-tinte bg-white">
			{/* Der Kasten trägt den Rahmen — der Kopf nur die Trennlinie. */}
			<Poster className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2 border-0 border-b-2.5 px-3 py-3.5 min-[900px]:px-[18px]">
				<h3 className="font-display text-2xl font-semibold uppercase tracking-[.02em]">
					{station.name}
				</h3>
				<span className="text-[12.5px] text-papier">
					{where && <>{where} · </>}
					{responsible && (
						<>
							<span aria-hidden className="text-gelb">
								♛
							</span>{' '}
							{responsible} ·{' '}
						</>
					)}
					<b className="font-semibold text-gelb">
						{board.open > 0 ? `${board.open} Plätze offen` : 'voll besetzt'}
					</b>
				</span>
				<div className="ml-auto flex items-center gap-1.5">
					<button
						type="button"
						onClick={onAutoFill}
						className="bg-gelb px-3 py-1.5 text-[12px] font-bold uppercase tracking-[.02em] text-tinte max-[899px]:min-h-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papier"
					>
						Nur diese Station auto-füllen
					</button>
					<RowMenu
						label="Menü der Station"
						onEdit={onEditStation}
						onDelete={onDeleteStation}
						editLabel="Station bearbeiten"
						deleteLabel="Station löschen"
						onPoster
					/>
				</div>
			</Poster>

			{board.days.map((day, i) => (
				<React.Fragment key={day.date}>
					<div
						className={cn(
							'flex flex-wrap items-baseline gap-2.5 border-b border-linie bg-papier-getoent px-3 py-[9px] min-[900px]:px-[18px]',
							// Der Plakat-Kopf bringt seine eigene Kante mit.
							i > 0 && 'border-t-2 border-t-tinte'
						)}
					>
						<h4 className="font-display text-[15px] font-semibold uppercase tracking-[.04em] text-gruen">
							{day.title}
						</h4>
						<span className={cn(OFFEN_TON, 'text-tinte-soft')}>
							{day.shiftCount} {day.shiftCount === 1 ? 'Schicht' : 'Schichten'}
						</span>
						<span className={cn(OFFEN_TON, day.open > 0 ? 'text-rot' : 'text-gruen')}>
							{day.open > 0 ? `${day.open} offen` : 'voll besetzt'}
						</span>
					</div>
					{day.rows.map(renderRow)}
				</React.Fragment>
			))}

			{board.wholeFestRow && renderRow(board.wholeFestRow)}

			<button
				type="button"
				onClick={onAddShift}
				className="block w-full border-t border-linie bg-white px-4 py-[11px] text-center text-xs font-bold uppercase tracking-[.04em] text-tinte-soft hover:bg-papier-getoent hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tinte"
			>
				+ Schicht anlegen
				{!board.hasShifts && ' — Station in Zeitfenster aufteilen'}
			</button>

			{/* Nur mit Schichten: ohne sie sind dieselben Leute schon das Raster. */}
			{board.hasShifts && (
				<div
					className="flex flex-wrap items-center gap-2 border-t-2 border-tinte bg-papier-getoent px-3 py-2.5 min-[900px]:px-[18px]"
					onDragOver={(e) => e.preventDefault()}
					onDrop={onDropOnStation}
				>
					<b className="text-[10.5px] font-extrabold uppercase tracking-[.05em] text-tinte-soft">
						Stationsmitglieder ohne Schicht:
					</b>
					{board.members.map((m) => (
						<NameChip
							key={m.id}
							onRemove={() => onRemoveFromStation(m.helperId)}
							removeLabel={`${m.name} aus der Station entfernen`}
						>
							{m.name}
						</NameChip>
					))}
					<button
						type="button"
						onClick={onAssignToStation}
						className="px-2 py-1 text-[11px] font-bold text-tinte-soft hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
					>
						+ hinzufügen
					</button>
				</div>
			)}
		</div>
	);
};

/** Das ⋮-Menü von Station und Schicht (Entscheid 5 aus #68): Zerstörerisches
liegt eine Ebene tiefer, die Zeilen bleiben ruhig. Die Einträge sind die
bestehenden Griffe; ihre Dialoge bekommen in #106 die Plakat-Optik. */
function RowMenu({
	label,
	onEdit,
	onDelete,
	editLabel,
	deleteLabel,
	onPoster = false
}: {
	label: string;
	onEdit: () => void;
	onDelete: () => void;
	editLabel: string;
	deleteLabel: string;
	onPoster?: boolean;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={label}
					className={cn(
						'flex h-8 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
						onPoster
							? 'text-white hover:bg-white/15 focus-visible:outline-papier'
							: 'text-tinte-soft hover:text-tinte focus-visible:outline-tinte'
					)}
				>
					<MoreVertical className="h-4 w-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem className="gap-2" onClick={onEdit}>
					<Pencil className="h-4 w-4" />
					{editLabel}
				</DropdownMenuItem>
				<DropdownMenuItem className="gap-2 text-rot" onClick={onDelete}>
					<Trash2 className="h-4 w-4" />
					{deleteLabel}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default StationFocusBox;
