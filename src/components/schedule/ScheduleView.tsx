import React, { useMemo, useState, useEffect } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleActions } from './hooks/useScheduleActions';
import ScheduleToolbar from './ScheduleToolbar';
import TaskWorklist from './TaskWorklist';
import ScheduleEntryDialog, { type ScheduleEntryFormData } from './dialogs/ScheduleEntryDialog';
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

	// Die Festtage entstehen beim ersten Öffnen aus dem Fest-Datum (CONTEXT.md,
	// *Ablauf-Tag*); jeder weitere Tag wird von Hand angelegt.
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

	/** Die Tage der Werkliste in der Form der Abfrage — die Zeilen, die gerade
	am Bildschirm stehen, für den Druck der Aufgabenliste. */
	const shownDays = useMemo(() => {
		const shown = new Set(
			worklist.days.flatMap((day) =>
				day.groups.flatMap((group) => group.tasks.map((task) => task.entry.id))
			)
		);
		return days
			.map((day) => ({ ...day, entries: day.entries.filter((entry) => shown.has(entry.id)) }))
			.filter((day) => day.entries.length > 0);
	}, [days, worklist]);

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
	 * Gedruckt wird ohne Auswahl-Dialog — „was du siehst, kommt raus" (#126).
	 *
	 * Der **Programmzettel** zeigt das ganze Fest: ein Aushang kennt keinen
	 * Filter. Die **Aufgabenliste** dagegen ist die Kopie des Bildschirms und
	 * druckt genau die Zeilen der Werkliste, samt Filter und Verantwortlichem.
	 * Die zwei getrennten Papiere in Plakat-Optik baut #126.
	 */
	const handleExport = (entryTypeFilter: 'task' | 'program') => {
		const printed = entryTypeFilter === 'task' ? shownDays : days;
		exportScheduleToPdf({
			festivalName: festivalName || 'Ablaufplan',
			days: printed,
			selectedDayIds: new Set(printed.map((day) => day.id)),
			selectedPhaseIds: new Set(printed.flatMap((day) => day.phases.map((phase) => phase.id))),
			entryTypeFilter
		});
	};

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

				{/* Der Platz des zweiten Papiers. Das Papier selbst — grüner
				Halftone-Kopf, Zeilen, ⋮ und „+ PROGRAMMPUNKT" je Tag — ist #123;
				hier steht nur, wem der Platz gehört. */}
				<aside className="border-2.5 border-dashed border-linie bg-white px-4 py-4">
					<h3 className="font-display text-[15px] font-semibold uppercase tracking-[.03em] text-tinte-soft">
						Programmzettel
					</h3>
					<p className="mt-1.5 text-[13px] text-tinte-soft">
						Das zweite Papier des Ablaufplans entsteht hier. Angelegt wird ein Programmpunkt
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
				days={days}
				// Der vorbelegte Tag: beim Bearbeiten seiner, beim Anlegen der erste
				// des Fests. Gewählt wird im Dialog.
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
