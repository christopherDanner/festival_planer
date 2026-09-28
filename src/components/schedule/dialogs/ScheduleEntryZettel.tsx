import React, { type ElementType } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields,
	PaperSheetNote
} from '@/components/toolkit/PaperSheet';
import {
	canSaveEntry,
	changeDay,
	KEIN_VERANTWORTLICHER,
	OHNE_PHASE,
	phasesOfDay,
	showsResponsible,
	timeProblem,
	type EntryType,
	type ScheduleEntryForm
} from '@/lib/scheduleDialogForm';
import { scheduleDayTitle } from '@/lib/scheduleWorklist';
import { helperName } from '@/lib/helperService';
import type { Helper } from '@/lib/helperService';
import type { ScheduleDay, SchedulePhase } from '@/lib/scheduleService';

/** Die Tage zur Wahl samt ihren Phasen — genau das, was `getScheduleDays`
liefert. */
export type EntryDayOption = Pick<ScheduleDay, 'id' | 'date' | 'label'> & {
	phases?: SchedulePhase[];
};

export interface ScheduleEntryZettelProps {
	mode: 'create' | 'edit';
	form: ScheduleEntryForm;
	/** Gesteuert wie `StationZettel` und `MaterialZettel`: der Zettel meldet den
	 * Flicken, der Rahmen hält den Zustand. */
	onChange: (patch: Partial<ScheduleEntryForm>) => void;
	/** Alle Ablauf-Tage des Fests — auch die ohne Eintrag. */
	days: EntryDayOption[];
	/** Die Verantwortlichen sind die Helfer dieses Fests (ADR 0005). */
	helpers: Helper[];
	onCancel: () => void;
	onSave: () => void;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

/**
 * Der Eintrag-Zettel (#124): dasselbe Papier wie Station (#106) und Position
 * (#117) — Papier-Grund, Tinte-Rahmen, Versatz-Schatten, grüner Halftone-Kopf,
 * gelber Primärknopf.
 *
 * Der Feldschnitt kommt aus #124: Titel, **Art** als Segment-Schalter (nicht
 * als Select — die Wahl ist binär und entscheidet, was darunter steht), Tag,
 * Phase, Start/Ende, Verantwortlicher und Beschreibung. Der Verantwortliche
 * steht **nur bei einer Aufgabe** im Blatt; beim Programmpunkt räumt
 * `entryPayload` ihn samt Status ab (ADR 0007).
 *
 * Der Zettel ist gesteuert — er hält keinen eigenen Zustand; die Regeln liegen
 * in `scheduleDialogForm`.
 */
const ScheduleEntryZettel: React.FC<ScheduleEntryZettelProps> = ({
	mode,
	form,
	onChange,
	days,
	helpers,
	onCancel,
	onSave,
	TitleTag = 'h2'
}) => {
	const phasen = phasesOfDay(days, form.schedule_day_id);
	const problem = timeProblem(form);
	const verantwortlicher = helpers.find((h) => h.id === form.responsible_helper_id);

	return (
		<PaperSheet
			title={mode === 'edit' ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
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
						disabled={!canSaveEntry(form)}>
						{mode === 'edit' ? 'Speichern' : 'Anlegen'}
					</Button>
				</>
			}>
			<PaperSheetFields>
				<PaperSheetField wide label="Titel" htmlFor="entry-title">
					<Input
						id="entry-title"
						className={FOCUS_INK}
						value={form.title}
						onChange={(e) => onChange({ title: e.target.value })}
						placeholder="z.B. Fassanstich, Zelt-Anlieferung"
					/>
				</PaperSheetField>

				{/* Zwei Arten, zwei Papiere (CONTEXT.md, *Ablauf-Eintrag*) — ein
				Segment-Schalter zeigt beide nebeneinander, ein Select verstecke die
				zweite hinter einem Klick. */}
				<PaperSheetField
					wide
					label="Art"
					hint="Aufgaben stehen in der Werkliste, Programmpunkte auf dem Zettel.">
					<SegmentedControl<EntryType>
						aria-label="Art"
						className="w-max"
						value={form.type}
						onValueChange={(type) => onChange({ type })}
						options={[
							{ value: 'task', label: 'Aufgabe' },
							{ value: 'program', label: 'Programmpunkt' }
						]}
					/>
				</PaperSheetField>

				<PaperSheetField label="Tag" htmlFor="entry-day">
					<Select
						value={form.schedule_day_id}
						onValueChange={(value) => onChange(changeDay(form, value))}>
						<SelectTrigger id="entry-day" className={FOCUS_INK}>
							<SelectValue placeholder="Tag wählen" />
						</SelectTrigger>
						<SelectContent>
							{days.map((day) => (
								<SelectItem key={day.id} value={day.id}>
									{scheduleDayTitle(day)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PaperSheetField>

				{/* „Ohne Phase" steht oben: sie ist der optionale Feinschnitt und der
				Normalfall (ADR 0007). Zur Wahl stehen nur die Phasen des gewählten
				Tages — eine fremde gehört ihrem Tag. */}
				<PaperSheetField
					label="Phase"
					htmlFor="entry-phase"
					hint={
						phasen.length === 0
							? 'Dieser Tag hat noch keine Phase.'
							: 'Optional — nur in der Werkliste sichtbar.'
					}>
					<Select
						value={form.schedule_phase_id || OHNE_PHASE}
						onValueChange={(value) =>
							onChange({ schedule_phase_id: value === OHNE_PHASE ? '' : value })
						}>
						<SelectTrigger id="entry-phase" className={FOCUS_INK}>
							<SelectValue placeholder="Ohne Phase" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={OHNE_PHASE}>Ohne Phase</SelectItem>
							{phasen.map((phase) => (
								<SelectItem key={phase.id} value={phase.id}>
									{phase.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PaperSheetField>

				<PaperSheetField label="Start" htmlFor="entry-start" hint="Die Zeit reiht die Zeilen.">
					<Input
						id="entry-start"
						type="time"
						className={FOCUS_INK}
						value={form.start_time}
						onChange={(e) => onChange({ start_time: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField label="Ende" htmlFor="entry-end" hint="Optional">
					<Input
						id="entry-end"
						type="time"
						className={FOCUS_INK}
						value={form.end_time}
						onChange={(e) => onChange({ end_time: e.target.value })}
					/>
				</PaperSheetField>

				{showsResponsible(form) && (
					<PaperSheetField wide label="♛ Verantwortlich" htmlFor="entry-responsible">
						<Select
							value={form.responsible_helper_id || KEIN_VERANTWORTLICHER}
							onValueChange={(value) =>
								onChange({
									responsible_helper_id: value === KEIN_VERANTWORTLICHER ? '' : value
								})
							}>
							<SelectTrigger id="entry-responsible" className={FOCUS_INK}>
								<SelectValue placeholder="Kein Verantwortlicher">
									{verantwortlicher ? helperName(verantwortlicher) : 'Kein Verantwortlicher'}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={KEIN_VERANTWORTLICHER}>Kein Verantwortlicher</SelectItem>
								{helpers.map((helper) => (
									<SelectItem key={helper.id} value={helper.id}>
										{helperName(helper)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</PaperSheetField>
				)}

				<PaperSheetField wide label="Beschreibung" htmlFor="entry-description">
					<Textarea
						id="entry-description"
						rows={2}
						className={FOCUS_INK}
						value={form.description}
						onChange={(e) => onChange({ description: e.target.value })}
						placeholder="Erscheint als leise Zeile unter dem Titel"
					/>
				</PaperSheetField>

				{problem && (
					<PaperSheetNote wide ton="warnung">
						{problem}
					</PaperSheetNote>
				)}
			</PaperSheetFields>
		</PaperSheet>
	);
};

export default ScheduleEntryZettel;
