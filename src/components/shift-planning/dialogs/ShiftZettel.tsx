import React, { type ElementType } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields,
	PaperSheetNote
} from '@/components/toolkit/PaperSheet';
import { shiftTimeLabel } from '@/lib/shiftBoard';
import {
	canSaveShift,
	crossesMidnight,
	endDateProblem,
	type ShiftForm
} from '@/lib/shiftDialogForm';

export interface ShiftZettelProps {
	mode: 'create' | 'edit';
	form: ShiftForm;
	/** Für den Plakat-Kopf: eine neue Schicht entsteht immer *an* einer Station. */
	stationName: string;
	onChange: (patch: Partial<ShiftForm>) => void;
	onCancel: () => void;
	onSave: () => void;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

/**
 * Der Schicht-Zettel (#106) — dasselbe Papier wie der Station-Zettel
 * (`PaperSheet`), Felder nach Ticket: Name, Startdatum, Startzeit, Enddatum,
 * Endzeit, Soll-Personen.
 *
 * Das Enddatum ist **nur** für die Schicht über Mitternacht da. Weicht es vom
 * Starttag ab, zeigt der Zettel vorab die Aufschrift, die die Zeile im
 * Fokus-Kasten tragen wird (`23–02 +1`) — gerechnet mit derselben Funktion
 * (`shiftTimeLabel`), damit Vorschau und Zeile nicht auseinanderlaufen können.
 */
const ShiftZettel: React.FC<ShiftZettelProps> = ({
	mode,
	form,
	stationName,
	onChange,
	onCancel,
	onSave,
	TitleTag = 'h2'
}) => {
	const ueberMitternacht = crossesMidnight(form);
	const problem = endDateProblem(form);

	return (
		<PaperSheet
			title={mode === 'edit' ? 'Schicht bearbeiten' : `Neue Schicht für ${stationName}`}
			TitleTag={TitleTag}
			onClose={onCancel}
			footer={
				<>
					<Button variant="outline" className={FOCUS_INK} onClick={onCancel}>
						Abbrechen
					</Button>
					<Button
						data-zettel="speichern"
						className={FOCUS_INK}
						onClick={onSave}
						disabled={!canSaveShift(form)}>
						{mode === 'edit' ? 'Speichern' : 'Anlegen'}
					</Button>
				</>
			}>
			<PaperSheetFields>
				<PaperSheetField wide label="Name" htmlFor="shift-name">
					<Input
						id="shift-name"
						className={FOCUS_INK}
						value={form.name}
						onChange={(e) => onChange({ name: e.target.value })}
						placeholder="z.B. Frühschoppen, Spätschicht"
					/>
				</PaperSheetField>

				<PaperSheetField label="Startdatum" htmlFor="shift-start-date">
					<Input
						id="shift-start-date"
						type="date"
						className={FOCUS_INK}
						value={form.start_date}
						onChange={(e) => onChange({ start_date: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField label="Startzeit" htmlFor="shift-start-time">
					<Input
						id="shift-start-time"
						type="time"
						className={cn('tabular-nums', FOCUS_INK)}
						value={form.start_time}
						onChange={(e) => onChange({ start_time: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField
					label="Enddatum"
					htmlFor="shift-end-date"
					hint="Nur für Schichten über Mitternacht — sonst leer lassen">
					<Input
						id="shift-end-date"
						type="date"
						min={form.start_date || undefined}
						className={FOCUS_INK}
						value={form.end_date}
						onChange={(e) => onChange({ end_date: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField label="Endzeit" htmlFor="shift-end-time">
					<Input
						id="shift-end-time"
						type="time"
						className={cn('tabular-nums', FOCUS_INK)}
						value={form.end_time}
						onChange={(e) => onChange({ end_time: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField label="Soll-Personen" htmlFor="shift-required">
					<Input
						id="shift-required"
						type="number"
						min="1"
						className={cn('tabular-nums', FOCUS_INK)}
						value={form.required_people}
						onChange={(e) => onChange({ required_people: e.target.value })}
					/>
				</PaperSheetField>

				{/* Die Auskunft steht neben dem Feld, das sie auslöst — im Fokus-Kasten
				sieht man erst nach dem Speichern, wo die Schicht gelandet ist. Stimmt
				das Datum nicht, gilt der Fehler: eine Vorschau auf eine Zeile, die so
				nie entsteht, wäre schlimmer als gar keine. */}
				{problem ? (
					<PaperSheetNote ton="warnung">{problem}</PaperSheetNote>
				) : (
					ueberMitternacht && (
						<PaperSheetNote>
							Läuft über Mitternacht: Die Schicht steht beim <b>Starttag</b> und trägt dort{' '}
							<b className="font-display tracking-[.02em]">{shiftTimeLabel(form)}</b>.
						</PaperSheetNote>
					)
				)}
			</PaperSheetFields>
		</PaperSheet>
	);
};

export default ShiftZettel;
