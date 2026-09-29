import React from 'react';

import { cn } from '@/lib/utils';
import { Poster } from '@/components/toolkit/Poster';
import { NameChip } from '@/components/toolkit/NameChip';
import { ARMED_SURFACE, OpenSlot } from '@/components/toolkit/OpenSlot';
import { RejectPulse } from '@/components/toolkit/RejectPulse';
import FocusBoxMenu from './FocusBoxMenu';
import { rejectText, targetKey, type AssignTarget } from '@/lib/shiftAssignment';
import type { AssignmentPicker, AssignmentPickerSnapshot } from '@/lib/shiftAssignmentPicker';
import type { BoardRow, StationBoard } from '@/lib/shiftBoard';
import { shiftDeletionMessage, stationDeletionMessage } from '@/lib/shiftDeletion';
import type { StationShift } from '@/lib/shiftService';

/**
 * Die drei Griffe, die ein Ziel braucht (#104). Als Ausschnitt des Stores und
 * nicht als eigene Schnittstelle: Ziehen und Antippen sind **ein** Vorgang, und
 * eine zweite Beschreibung desselben Vorgangs liefe irgendwann auseinander. Der
 * Ausschnitt hält zugleich fest, was der Kasten *nicht* darf — eine Marke
 * wählen oder ein Ziehen beginnen tut die Helferliste.
 */
export type TargetHandles = Pick<AssignmentPicker, 'dragOver' | 'dragLeave' | 'assign'>;

export interface StationFocusBoxProps {
	board: StationBoard;
	/** Wie weit die Zuteil-Geste ist: gewählt, überfahren, abgelehnt. */
	gesture: AssignmentPickerSnapshot;
	picker: TargetHandles;
	/** Öffnet die Auto-Zuteilung eingeschränkt auf diese Station (#108). */
	onAutoFill: () => void;
	onEditStation: () => void;
	/** Wird erst nach der Rückfrage des ⋮-Menüs gerufen — sie steht dort, weil
	 * nur das Menü weiß, ob sie schon bejaht wurde. */
	onDeleteStation: () => void;
	onAddShift: () => void;
	onEditShift: (shift: StationShift) => void;
	onDeleteShift: (shiftId: string) => void;
	onRemoveFromShift: (stationShiftId: string, helperId: string) => void;
	onRemoveFromStation: (helperId: string) => void;
}

/** Kleiner Versalien-Zähler — Tages-Meta und Zeilen-Status tragen ihn. */
const COUNTER_TEXT = 'text-[11px] font-extrabold uppercase tracking-[.05em] tabular-nums';

/** Tippziel ≥ 40px am Handy (DESIGN-VISION §6). */
const TOUCH_TARGET = 'max-[899px]:min-h-10 max-[899px]:min-w-10';

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
 * **Zuteilen** (#104): jede Zeile ist ein Ziel, das gezogen **und** angetippt
 * werden kann. Was angenommen wird, entscheidet dieser Kasten nicht — er zeigt
 * nur, was scharf ist, und meldet das Ziel zurück.
 */
const StationFocusBox: React.FC<StationFocusBoxProps> = ({
	board,
	gesture,
	picker,
	onAutoFill,
	onEditStation,
	onDeleteStation,
	onAddShift,
	onEditShift,
	onDeleteShift,
	onRemoveFromShift,
	onRemoveFromStation
}) => {
	const { station, place, responsible } = board;
	const stationTarget: AssignTarget = { kind: 'station', stationId: station.id };

	/**
	 * Die Griffe eines Ziels. Zeile und Mitglieder-Fußzeile tragen dieselben —
	 * beide sind ein Ziel, und beide nehmen dasselbe entgegen.
	 */
	const dropProps = (target: AssignTarget) => ({
		onDragOver: (e: React.DragEvent) => {
			// Nur auf einem Ziel, das wirklich annimmt: `preventDefault` ist das
			// einzige, woran der Cursor „geht" von „geht nicht" unterscheidet. Ein
			// abgelehntes Ziel bekommt darum gar kein `drop` — hier sagt der Cursor
			// die Ablehnung, der Rot-Puls sagt sie dem Antippen.
			if (picker.dragOver(target)) e.preventDefault();
		},
		onDragLeave: (e: React.DragEvent) => {
			// `dragleave` feuert auch beim Wechsel zwischen den Kindern der Zeile —
			// ohne diese Prüfung flackerte die Hervorhebung über jedem Platz.
			if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
			picker.dragLeave(target);
		},
		onDrop: (e: React.DragEvent) => {
			e.preventDefault();
			picker.assign(target);
		}
	});

	/** Ob dieses Ziel gerade rot pulst. */
	const rejects = (key: string) => gesture.rejected?.key === key;

	/**
	 * **Scharf**: gewählt macht den ganzen Kasten scharf, Ziehen nur das Ziel
	 * unterm Zeiger (das unterscheidet schon der Store).
	 *
	 * Scharf heißt „hier kann etwas hin", nicht „hier geht es sicher durch": auch
	 * ein Platz in einer Schicht, in der der gewählte Helfer schon steht, wird
	 * scharf. Das ist die Spec („alle freien Plätze") — und zugleich der einzige
	 * Weg, auf dem die Doppelzuweisung überhaupt noch auftreten und rot pulsen
	 * kann; beim Ziehen fängt sie der Cursor vorher ab.
	 */
	const isSharp = (key: string) => gesture.armed || gesture.overKey === key;

	// Die Mitglieder-Fußzeile ist dasselbe Ziel wie die Pseudo-Zeile „GANZES
	// FEST"; die beiden treten nie gemeinsam auf.
	const stationKey = targetKey(stationTarget);

	/** Zeile zeichnen — die Schicht-Zeilen und die Pseudo-Zeile sind dasselbe Bild. */
	const renderRow = (row: BoardRow) => {
		const shift = row.shift;
		return (
			<div
				key={row.id}
				className="relative border-b border-linie px-3 py-3 last:border-b-0 min-[900px]:px-[18px]"
				{...dropProps(row.target)}
			>
				{rejects(row.id) && <RejectPulse key={gesture.rejected.nonce} />}
				<div className="mb-2 flex flex-wrap items-baseline gap-2.5">
					<time className="font-display text-lg font-semibold tracking-[.02em]">{row.time}</time>
					<span className="text-xs font-semibold text-tinte-soft">{row.subtitle}</span>
					<span className={cn('ml-auto', COUNTER_TEXT, row.open > 0 ? 'text-rot' : 'text-gruen')}>
						{row.open > 0 ? `${row.open} OFFEN` : 'VOLL'}
					</span>
					{shift && (
						<FocusBoxMenu
							subject="Schicht"
							label={`Menü der Schicht ${row.time}`}
							deleteMessage={shiftDeletionMessage(shift, row.assigned)}
							onEdit={() => onEditShift(shift)}
							onDelete={() => onDeleteShift(shift.id)}
						/>
					)}
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[7px]">
					{row.slots.map((slot) =>
						// Belegt ist der Platz am Namen, nicht am `helperId` — sonst
						// stünde eine Zuteilung ohne Helfer-Verweis als frei da.
						slot.name ? (
							<span
								key={slot.position}
								className="flex items-center gap-[7px] border-1.5 border-tinte bg-papier px-2.5 py-[7px] text-[12.5px] font-semibold"
							>
								<span className="font-display text-[11px] font-semibold text-tinte-soft">
									{slot.position}
								</span>
								<span className="min-w-0 flex-1 truncate">{slot.name}</span>
								{slot.helperId && (
									<button
										type="button"
										aria-label={`${slot.name} von diesem Platz entfernen`}
										onClick={() =>
											shift
												? onRemoveFromShift(shift.id, slot.helperId)
												: onRemoveFromStation(slot.helperId)
										}
										className={cn(
											'-my-1 -mr-1.5 flex items-center justify-center px-1.5 py-1 font-bold text-tinte-soft hover:text-rot focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
											TOUCH_TARGET
										)}
									>
										×
									</button>
								)}
							</span>
						) : (
							<OpenSlot
								key={slot.position}
								armed={isSharp(row.id)}
								className={cn('w-full justify-start gap-[7px]', TOUCH_TARGET)}
								onClick={() => picker.assign(row.target)}
							>
								<span className="font-display text-[11px] font-semibold">{slot.position}</span>+
								HELFER HIER EINTRAGEN
							</OpenSlot>
						)
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="border-2.5 border-tinte bg-white">
			{/* Der Rot-Puls ist fürs Auge; diesen Satz bekommt, wer ihn nicht sieht.
			Der Bereich steht **dauerhaft** und bekommt nur seinen Text gewechselt:
			eine Live-Region, die mitsamt ihrem Inhalt entsteht und nach einer halben
			Sekunde wieder verschwindet, sagen Screenreader in der Regel nicht an. */}
			<p role="status" aria-live="polite" className="sr-only">
				{gesture.rejected ? rejectText(gesture.rejected.reason, gesture.rejected.kind) : ''}
			</p>

			{/* Der Kasten trägt den Rahmen — der Kopf nur die Trennlinie. */}
			<Poster className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2 border-0 border-b-2.5 px-3 py-3.5 min-[900px]:px-[18px]">
				<h3 className="font-display text-2xl font-semibold uppercase tracking-[.02em]">
					{station.name}
				</h3>
				<span className="text-[12.5px] text-papier">
					{place && <>{place} · </>}
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
					<FocusBoxMenu
						subject="Station"
						label="Menü der Station"
						deleteMessage={stationDeletionMessage(board)}
						onEdit={onEditStation}
						onDelete={onDeleteStation}
						onPoster
					/>
				</div>
			</Poster>

			{board.days.map((day, i) => (
				<React.Fragment key={day.date}>
					<div
						className={cn(
							'flex flex-wrap items-baseline gap-2.5 border-b border-linie bg-fusszeile px-3 py-[9px] min-[900px]:px-[18px]',
							// Der Plakat-Kopf bringt seine eigene Kante mit.
							i > 0 && 'border-t-2 border-t-tinte'
						)}
					>
						<h4 className="font-display text-[15px] font-semibold uppercase tracking-[.04em] text-gruen">
							{day.title}
						</h4>
						<span className={cn(COUNTER_TEXT, 'text-tinte-soft')}>
							{day.shiftCount} {day.shiftCount === 1 ? 'Schicht' : 'Schichten'}
						</span>
						<span className={cn(COUNTER_TEXT, day.open > 0 ? 'text-rot' : 'text-gruen')}>
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
				className="block w-full border-t border-linie bg-white px-4 py-[11px] text-center text-xs font-bold uppercase tracking-[.04em] text-tinte-soft hover:bg-fusszeile hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tinte"
			>
				+ Schicht anlegen
				{!board.hasShifts && ' — Station in Zeitfenster aufteilen'}
			</button>

			{/* Nur mit Schichten: ohne sie sind dieselben Leute schon das Raster. */}
			{board.hasShifts && (
				<div
					className={cn(
						'relative flex flex-wrap items-center gap-2 border-t-2 border-tinte bg-fusszeile px-3 py-2.5 min-[900px]:px-[18px]',
						// Die Fußzeile ist ein Ziel wie jede Zeile — sie nimmt vom scharfen
						// Zustand nur den Innenschein: ihren Rahmen bringt der Kasten mit.
						isSharp(stationKey) && ARMED_SURFACE
					)}
					{...dropProps(stationTarget)}
				>
					{rejects(stationKey) && <RejectPulse key={gesture.rejected.nonce} />}
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
						onClick={() => picker.assign(stationTarget)}
						className="px-2 py-1 text-[11px] font-bold text-tinte-soft max-[899px]:min-h-10 hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
					>
						+ hinzufügen
					</button>
				</div>
			)}
		</div>
	);
};

export default StationFocusBox;
