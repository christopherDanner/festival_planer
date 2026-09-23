import React, { useMemo, useState, useEffect } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleActions } from './hooks/useScheduleActions';
import ScheduleToolbar from './ScheduleToolbar';
import TaskWorklist from './TaskWorklist';
import ScheduleEntryDialog, { type ScheduleEntryFormData } from './dialogs/ScheduleEntryDialog';
import { Poster } from '@/components/toolkit/Poster';
import { exportScheduleToPdf } from '@/lib/scheduleExportService';
import { buildWorklist, type TaskFilter } from '@/lib/scheduleWorklist';
import type { ScheduleEntryWithHelper } from '@/lib/scheduleService';

// `type: 'none'` statt `null`: das Projekt kompiliert ohne strictNullChecks,
// dort trägt `null` keine Unterscheidungskraft und die Fallunterscheidung unten
// würde still nichts verengen.
type DialogState =
	| { type: 'none' }
	| { type: 'entry'; entry?: ScheduleEntryWithHelper; defaultType: 'task' | 'program' };

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

	// Auto-initialize days from festival dates on first load
	useEffect(() => {
		if (!initialized && !isLoading && days.length === 0 && festivalStartDate) {
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

	const programCount = days.reduce(
		(sum, day) => sum + day.entries.filter((entry) => entry.type === 'program').length,
		0
	);

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

	/**
	 * Beide Papiere aufs Papier. Ausgewählt wird nichts mehr — „was du siehst,
	 * kommt raus"; die zwei getrennten Exporte in Plakat-Optik samt dem Filter
	 * der Werkliste baut #126.
	 */
	const handleExport = (entryTypeFilter: 'task' | 'program') => {
		exportScheduleToPdf({
			festivalName: festivalName || 'Ablaufplan',
			days,
			selectedDayIds: new Set(days.map((day) => day.id)),
			selectedPhaseIds: new Set(days.flatMap((day) => day.phases.map((phase) => phase.id))),
			entryTypeFilter
		});
	};

	// Loading state
	if (isLoading || !initialized) {
		return (
			<div className="space-y-4">
				<div className="h-10 animate-pulse bg-linie/40" />
				<div className="h-16 animate-pulse bg-linie/40" />
				<div className="h-16 animate-pulse bg-linie/40" />
			</div>
		);
	}

	// No festival dates set
	if (!festivalStartDate) {
		return (
			<div className="py-12 text-center text-tinte-soft">
				Bitte zuerst Start- und Enddatum des Festes festlegen.
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4">
			<ScheduleToolbar
				counts={worklist.counts}
				onAddTask={() => setDialogState({ type: 'entry', defaultType: 'task' })}
				onAddProgram={() => setDialogState({ type: 'entry', defaultType: 'program' })}
				onExportProgram={() => handleExport('program')}
				onExportTasks={() => handleExport('task')}
			/>

			{/* Der Schreibtisch: Werkliste 1.5fr, Programmzettel 1fr. Unter 900px
			bleibt eine Spalte — den Zettel unter die Werkliste zu legen ist der
			Schnitt von #125. */}
			<div className="grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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

				{/* Das rechte Papier. Bedienbar — mit Zeilen, ⋮ und „+ PROGRAMMPUNKT"
				je Tag — wird es in #123; bis dahin sagt es, was es trägt, statt den
				Platz leer zu lassen. */}
				<aside className="border-2.5 border-tinte bg-white min-[900px]:sticky min-[900px]:top-3">
					<Poster className="border-0 border-b-2 px-4 py-3.5 text-center">
						<span className="font-display text-[11.5px] font-semibold uppercase tracking-[.1em] text-gelb">
							{festivalName}
						</span>
						<h3 className="font-display text-[21px] font-semibold uppercase tracking-[.03em]">
							Programm
						</h3>
					</Poster>
					<p className="px-4 py-4 text-[13px] text-tinte-soft">
						{programCount === 0
							? 'Noch kein Programmpunkt erfasst.'
							: `${programCount} ${programCount === 1 ? 'Programmpunkt' : 'Programmpunkte'} erfasst.`}{' '}
						Der Programmzettel wird hier zum druckfertigen Aushang; angelegt wird ein Punkt
						vorerst über „+ PROGRAMMPUNKT" in der Werkzeugleiste.
					</p>
				</aside>
			</div>

			<ScheduleEntryDialog
				open={dialogState.type === 'entry'}
				onOpenChange={(open) => {
					if (!open) setDialogState(CLOSED);
				}}
				entry={dialogState.type === 'entry' ? dialogState.entry : null}
				defaultType={dialogState.type === 'entry' ? dialogState.defaultType : 'task'}
				// Der Eintrag gehört einem Tag (ADR 0007); solange der Dialog kein
				// Tag-Auswahlfeld hat, nimmt er den ersten Tag des Fests. Das Feld
				// über alle Ablauf-Tage baut #124.
				scheduleDayId={
					dialogState.type === 'entry' && dialogState.entry
						? dialogState.entry.schedule_day_id
						: days[0]?.id ?? ''
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
