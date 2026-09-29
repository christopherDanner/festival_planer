import React, { useMemo, useState, useEffect } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleActions } from './hooks/useScheduleActions';
import ScheduleToolbar from './ScheduleToolbar';
import TaskWorklist from './TaskWorklist';
import ProgramSheet from './ProgramSheet';
import ScheduleEntryDialog, { type ScheduleEntryFormData } from './dialogs/ScheduleEntryDialog';
import { exportProgramSheetToPdf, exportTaskListToPdf } from '@/lib/scheduleExportService';
import { buildProgramSheet } from '@/lib/scheduleProgramSheet';
import { buildWorklist, type TaskFilter } from '@/lib/scheduleWorklist';
import {
	shouldInitializeScheduleDays,
	type ScheduleEntryWithHelper
} from '@/lib/scheduleService';

// `type: 'none'` statt `null`: das Projekt kompiliert ohne strictNullChecks,
// dort trägt `null` keine Unterscheidungskraft und die Fallunterscheidung unten
// würde still nichts verengen.
type DialogState =
	| { type: 'none' }
	| {
			type: 'entry';
			entry?: ScheduleEntryWithHelper;
			defaultType: 'task' | 'program';
			/**
			 * Der Tag, den der Griff schon kannte: „+ PROGRAMMPUNKT" am Tagesblock des
			 * Zettels legt für genau diesen an (#123). Ohne ihn — von der
			 * Werkzeugleiste aus — wählt man den Tag im Dialog.
			 */
			dayId?: string;
	  };

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

	const handleSaveEntry = (data: ScheduleEntryFormData) => {
		if (dialogState.type === 'entry' && dialogState.entry) {
			actions.editEntry.mutate({
				id: dialogState.entry.id,
				updates: {
					title: data.title,
					type: data.type,
					start_time: data.start_time,
					end_time: data.end_time,
					responsible_helper_id: data.responsible_helper_id,
					status: data.status,
					description: data.description
				}
			});
		} else {
			// Die Uhrzeit reiht (ADR 0007) — beim Anlegen ist nichts einzusortieren.
			actions.createEntry.mutate(data);
		}
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
				onAddTask={() => setDialogState({ type: 'entry', defaultType: 'task' })}
				onAddProgram={() => setDialogState({ type: 'entry', defaultType: 'program' })}
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
					onEditTask={(entry) => setDialogState({ type: 'entry', entry, defaultType: 'task' })}
					onDeleteTask={(entry) => actions.removeEntry.mutate(entry.id)}
				/>

				<ProgramSheet
					sheet={programSheet}
					festivalName={festivalName}
					onAddProgram={(dayId) =>
						setDialogState({ type: 'entry', defaultType: 'program', dayId })
					}
					onEditProgram={(entry) =>
						setDialogState({ type: 'entry', entry, defaultType: 'program' })
					}
					onDeleteProgram={(entry) => actions.removeEntry.mutate(entry.id)}
				/>
			</div>

			<ScheduleEntryDialog
				open={dialogState.type === 'entry'}
				onOpenChange={(open) => {
					if (!open) setDialogState(CLOSED);
				}}
				entry={dialogState.type === 'entry' ? dialogState.entry : null}
				defaultType={dialogState.type === 'entry' ? dialogState.defaultType : 'task'}
				days={days}
				// Der vorbelegte Tag: beim Bearbeiten seiner, beim tagesbezogenen
				// Anlegen der des Tagesblocks, sonst der erste des Fests.
				scheduleDayId={
					dialogState.type === 'entry'
						? dialogState.entry?.schedule_day_id ?? dialogState.dayId ?? days[0]?.id ?? ''
						: ''
				}
				// Nur der tagesbezogene Griff kennt den Tag schon; beim Bearbeiten
				// bleibt er wählbar, damit ein Eintrag den Tag wechseln kann (#122).
				dayLocked={
					dialogState.type === 'entry' && !dialogState.entry && !!dialogState.dayId
				}
				schedulePhaseId={
					dialogState.type === 'entry' && dialogState.entry
						? dialogState.entry.schedule_phase_id
						: null
				}
				festivalId={festivalId}
				helpers={helpers}
				onSave={handleSaveEntry}
			/>
		</div>
	);
}
