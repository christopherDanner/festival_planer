import React, { useMemo, useState, useEffect } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleActions } from './hooks/useScheduleActions';
import ScheduleToolbar from './ScheduleToolbar';
import TaskWorklist from './TaskWorklist';
import ProgramSheet from './ProgramSheet';
import ScheduleDayDialog from './dialogs/ScheduleDayDialog';
import ScheduleEntryDialog from './dialogs/ScheduleEntryDialog';
import SchedulePhaseDialog from './dialogs/SchedulePhaseDialog';
import { exportProgramSheetToPdf, exportTaskListToPdf } from '@/lib/scheduleExportService';
import {
	dayPayload,
	dayUpdate,
	entryPayload,
	phasePayload,
	phasesOfDay,
	phaseUpdate,
	type EntryPrefill,
	type EntryType,
	type ScheduleDayForm,
	type ScheduleEntryForm,
	type SchedulePhaseForm
} from '@/lib/scheduleDialogForm';
import { movePhase, type PhaseDirection } from '@/lib/schedulePhaseOrder';
import { buildProgramSheet } from '@/lib/scheduleProgramSheet';
import { buildWorklist, scheduleDayTitle, type TaskFilter } from '@/lib/scheduleWorklist';
import {
	shouldInitializeScheduleDays,
	type ScheduleDayWithEntries,
	type ScheduleEntryWithHelper,
	type SchedulePhase
} from '@/lib/scheduleService';

// `type: 'none'` statt `null`: das Projekt kompiliert ohne strictNullChecks,
// dort trägt `null` keine Unterscheidungskraft und die Fallunterscheidung unten
// würde still nichts verengen.
type DialogState =
	| { type: 'none' }
	| { type: 'entry'; entry?: ScheduleEntryWithHelper; prefill: EntryPrefill }
	| { type: 'day'; day?: ScheduleDayWithEntries }
	| { type: 'phase'; phase?: SchedulePhase; scheduleDayId: string };

const CLOSED: DialogState = { type: 'none' };

interface ScheduleViewProps {
	festivalId: string;
	festivalName?: string;
	festivalStartDate?: string;
	festivalEndDate?: string;
}

/**
 * Der Ablaufplan als **Schreibtisch** (#122, Variante C der DESIGN-VISION):
 * Werkzeugleiste mit KPI-Maßband, darunter zwei Papiere nebeneinander — links
 * die Aufgaben-Werkliste über alle Tage, rechts der Programmzettel.
 *
 * Das Akkordeon aus Tag → Phase → Tabelle ist damit weg, samt seinem Drag &
 * Drop: gereiht wird nach Uhrzeit (ADR 0007). Gezählt und gegliedert wird in
 * `scheduleWorklist`; diese Ansicht hält den Zustand (Filter, Dialog) und
 * verdrahtet die Griffe.
 */
export default function ScheduleView({
	festivalId,
	festivalName,
	festivalStartDate,
	festivalEndDate
}: ScheduleViewProps) {
	const { days, helpers, isLoading } = useScheduleData(festivalId);
	const actions = useScheduleActions(festivalId);
	const [filter, setFilter] = useState<TaskFilter>('all');
	const [responsibleId, setResponsibleId] = useState<string | null>(null);
	const [dialogState, setDialogState] = useState<DialogState>(CLOSED);
	const [initialized, setInitialized] = useState(false);
	/** Der zuletzt benutzte Tag — er belegt den Dialog vor, wenn der Griff selbst
	keinen mitbringt („+ AUFGABE" der Werkzeugleiste, #124). Wer eine Aufgabe nach
	der anderen notiert, bleibt so am selben Tag. */
	const [lastDayId, setLastDayId] = useState<string | null>(null);

	// Die Festtage entstehen beim ersten Öffnen aus dem Fest-Datum (CONTEXT.md,
	// *Ablauf-Tag*); jeder weitere Tag wird von Hand angelegt. Wann das greift,
	// entscheidet `shouldInitializeScheduleDays` — ein aus einer Vorlage
	// übernommener Ablaufplan bringt seine Tage schon mit (#127).
	useEffect(() => {
		if (!initialized && shouldInitializeScheduleDays({ days, isLoading, festivalStartDate })) {
			actions.initDays.mutate(
				{ startDate: festivalStartDate, endDate: festivalEndDate },
				{ onSuccess: () => setInitialized(true) }
			);
		} else if (!initialized) {
			setInitialized(true);
		}
	}, [isLoading, days.length, festivalStartDate]);

	const worklist = useMemo(
		() =>
			buildWorklist({
				days,
				filter,
				responsibleId,
				festivalStart: festivalStartDate,
				festivalEnd: festivalEndDate
			}),
		[days, filter, responsibleId, festivalStartDate, festivalEndDate]
	);

	/** Der Programmzettel kennt keinen Filter — ein Aushang zeigt das ganze Fest. */
	const programSheet = useMemo(() => buildProgramSheet(days), [days]);

	/** Der vorbelegte Tag eines Griffs ohne eigenen Tagesbezug: der zuletzt
	benutzte, sonst der erste des Fests. */
	const defaultDayId = lastDayId ?? days[0]?.id ?? '';

	/** Die Aufschrift eines Tages, wie sie im Zwischentitel steht. */
	const dayTitleOf = (scheduleDayId: string) => {
		const day = days.find((d) => d.id === scheduleDayId);
		return day ? scheduleDayTitle(day) : undefined;
	};

	/** Alle drei Dialoge schließen über denselben Griff — offen ist immer nur
	einer. */
	const closeDialog = (open: boolean) => {
		if (!open) setDialogState(CLOSED);
	};

	/** Den Eintrag-Dialog öffnen — für einen neuen Eintrag mit dem, was der
	Griff schon weiß (#124). */
	const openEntry = (prefill: Partial<EntryPrefill> & { type: EntryType }) =>
		setDialogState({
			type: 'entry',
			prefill: { schedule_day_id: defaultDayId, ...prefill }
		});

	/**
	 * Der Dialog gibt sein Formular ab; die Nutzlast baut `entryPayload`.
	 *
	 * Beim **Programmpunkt** räumt sie Status und Verantwortlichen auf `null` —
	 * auch dann, wenn der Eintrag eben noch eine abgehakte Aufgabe war
	 * (ADR 0007). Darum geht beim Ändern die *ganze* Nutzlast weg und nicht nur
	 * die sichtbaren Felder: ein `null` muss auch ankommen.
	 */
	const handleSaveEntry = (form: ScheduleEntryForm) => {
		const entry = dialogState.type === 'entry' ? dialogState.entry : null;
		const payload = entryPayload(form, {
			festivalId,
			status: entry?.status ?? null
		});
		setLastDayId(form.schedule_day_id);

		if (entry) {
			actions.editEntry.mutate({ id: entry.id, updates: payload });
		} else {
			// Die Uhrzeit reiht (ADR 0007) — beim Anlegen ist nichts einzusortieren.
			actions.createEntry.mutate(payload);
		}
	};

	/** Ein neuer Tag hängt sich hinten an; gereiht wird die Liste ohnehin nach
	Datum (`getScheduleDays`). */
	const handleSaveDay = (form: ScheduleDayForm) => {
		const day = dialogState.type === 'day' ? dialogState.day : null;
		if (day) {
			actions.editDay.mutate({ id: day.id, updates: dayUpdate(form) });
		} else {
			actions.createDay.mutate(dayPayload(form, { festivalId, sortOrder: days.length }));
		}
	};

	const handleSavePhase = (form: SchedulePhaseForm) => {
		if (dialogState.type !== 'phase') return;
		const { phase, scheduleDayId } = dialogState;
		if (phase) {
			actions.editPhase.mutate({ id: phase.id, updates: phaseUpdate(form) });
		} else {
			actions.createPhase.mutate(
				phasePayload(form, {
					festivalId,
					scheduleDayId,
					// Eine neue Phase steht hinten — verschoben wird sie im ⋮.
					sortOrder: phasesOfDay(days, scheduleDayId).length
				})
			);
		}
	};

	/** Phasen reiht die Hand, nicht die Uhr (ADR 0007). `movePhase` rechnet die
	neue Ordnung der ganzen Reihe aus; am Rand gibt es nichts zu schreiben. */
	const handleMovePhase = (phase: SchedulePhase, direction: PhaseDirection) => {
		const day = days.find((d) => d.id === phase.schedule_day_id);
		const order = movePhase(day?.phases ?? [], phase.id, direction);
		if (order.length > 0) actions.reorderPhases.mutate(order);
	};

	/** Abhaken wirkt sofort auf alle Zähler: die Mutation lädt den Tag neu, und
	`buildWorklist` rechnet Maßband, Gruppenköpfe und Fußzeile daraus (Vision §5). */
	const handleToggleTask = (entry: ScheduleEntryWithHelper) => {
		actions.editEntry.mutate({
			id: entry.id,
			updates: { status: entry.status === 'done' ? 'open' : 'done' }
		});
	};

	/** Der Festname im Plakat-Kopf beider Papiere; ohne ihn steht dort der
	Bereich, damit das Blatt überhaupt eine Aufschrift trägt. */
	const posterTitle = festivalName || 'Ablaufplan';

	if (isLoading || !initialized) {
		return (
			<div className="space-y-4">
				<div className="h-10 animate-pulse bg-linie/40" />
				<div className="h-16 animate-pulse bg-linie/40" />
				<div className="h-16 animate-pulse bg-linie/40" />
			</div>
		);
	}

	// Ohne Fest-Datum gibt es keine Tage, an denen ein Eintrag hängen könnte.
	if (!festivalStartDate) {
		return (
			<div className="py-12 text-center text-tinte-soft">
				Bitte zuerst Start- und Enddatum des Festes festlegen.
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4">
			{/* Gedruckt wird ohne Auswahl-Dialog — „was du siehst, kommt raus" (#126):
			beide Papiere bekommen genau das Objekt, das ihr Gegenstück am Bildschirm
			zeichnet. Ein zweiter Auswahlweg könnte sonst anders wählen als die Ansicht. */}
			<ScheduleToolbar
				counts={worklist.counts}
				onAddTask={() => openEntry({ type: 'task' })}
				onAddProgram={() => openEntry({ type: 'program' })}
				onExportProgram={() =>
					exportProgramSheetToPdf({ festivalName: posterTitle, sheet: programSheet })
				}
				onExportTasks={() => exportTaskListToPdf({ festivalName: posterTitle, worklist })}
			/>

			{/* Der Schreibtisch: Werkliste 1.5fr, Programmzettel 1fr. Unter 900px
			eine Spalte, der Zettel unter der Werkliste (#125) — ausdrücklich
			`minmax(0, 1fr)` statt der stillen Vorgabe `auto`, sonst sprengt eine
			breite Zeile das Gitter (DESIGN-VISION §6). Geklebt wird nichts: der
			Zettel ist gestapelt kein Randstreifen mehr. */}
			<div className="grid items-start gap-4 grid-cols-[minmax(0,1fr)] min-[900px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
				<TaskWorklist
					worklist={worklist}
					filter={filter}
					onFilterChange={setFilter}
					responsibleId={responsibleId}
					onResponsibleChange={setResponsibleId}
					onToggleTask={handleToggleTask}
					onEditTask={(entry) =>
						setDialogState({
							type: 'entry',
							entry,
							prefill: { type: entry.type, schedule_day_id: entry.schedule_day_id }
						})
					}
					onDeleteTask={(entry) => actions.removeEntry.mutate(entry.id)}
					dayActions={{
						onEdit: (day) => setDialogState({ type: 'day', day }),
						onAddPhase: (day) => setDialogState({ type: 'phase', scheduleDayId: day.id }),
						onAddTask: (day) => openEntry({ type: 'task', schedule_day_id: day.id }),
						onDelete: (day) => actions.removeDay.mutate(day.id)
					}}
					phaseActions={{
						onRename: (phase) =>
							setDialogState({ type: 'phase', phase, scheduleDayId: phase.schedule_day_id }),
						onMove: handleMovePhase,
						onDelete: (phase) => actions.removePhase.mutate(phase.id)
					}}
					onAddDay={() => setDialogState({ type: 'day' })}
				/>

				<ProgramSheet
					sheet={programSheet}
					festivalName={festivalName}
					// „+ PROGRAMMPUNKT" am Tagesblock kennt den Tag schon und sperrt ihn
					// im Dialog (#123); die Werkzeugleiste lässt ihn wählen.
					onAddProgram={(dayId) =>
						openEntry({ type: 'program', schedule_day_id: dayId, dayLocked: true })
					}
					onEditProgram={(entry) =>
						setDialogState({
							type: 'entry',
							entry,
							prefill: { type: entry.type, schedule_day_id: entry.schedule_day_id }
						})
					}
					onDeleteProgram={(entry) => actions.removeEntry.mutate(entry.id)}
				/>
			</div>

			<ScheduleEntryDialog
				open={dialogState.type === 'entry'}
				onOpenChange={closeDialog}
				entry={dialogState.type === 'entry' ? dialogState.entry : null}
				prefill={
					dialogState.type === 'entry'
						? dialogState.prefill
						: { type: 'task', schedule_day_id: defaultDayId }
				}
				days={days}
				helpers={helpers}
				onSave={handleSaveEntry}
			/>

			<ScheduleDayDialog
				open={dialogState.type === 'day'}
				onOpenChange={closeDialog}
				day={dialogState.type === 'day' ? dialogState.day : null}
				onSave={handleSaveDay}
			/>

			<SchedulePhaseDialog
				open={dialogState.type === 'phase'}
				onOpenChange={closeDialog}
				phase={dialogState.type === 'phase' ? dialogState.phase : null}
				dayTitle={
					dialogState.type === 'phase' ? dayTitleOf(dialogState.scheduleDayId) : undefined
				}
				onSave={handleSavePhase}
			/>
		</div>
	);
}
