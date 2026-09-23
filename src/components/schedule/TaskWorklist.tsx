import React from 'react';

import { cn } from '@/lib/utils';
import { ActionMenu } from '@/components/toolkit/ActionMenu';
import { NameChip } from '@/components/toolkit/NameChip';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { FOCUS_INK } from '@/components/toolkit/PaperSheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type { ScheduleEntryWithHelper } from '@/lib/scheduleService';
import type { TaskFilter, Worklist, WorklistTask } from '@/lib/scheduleWorklist';

export interface TaskWorklistProps {
	worklist: Worklist;
	filter: TaskFilter;
	onFilterChange: (filter: TaskFilter) => void;
	/** `null` heißt „Verantwortlich: alle". */
	responsibleId: string | null;
	onResponsibleChange: (responsibleId: string | null) => void;
	onToggleTask: (entry: ScheduleEntryWithHelper) => void;
	onEditTask: (entry: ScheduleEntryWithHelper) => void;
	onDeleteTask: (entry: ScheduleEntryWithHelper) => void;
}

/** Aufschrift eines Zählers: klein, fett, Versalien, Ziffern in fester Breite. */
const COUNTER = 'text-[10.5px] font-extrabold uppercase tracking-[.05em] tabular-nums';

/** Der Wert des Verantwortlichen-Felds für „alle" — ein leerer `value` ist im
Radix-Select der Platzhalter und damit kein wählbarer Eintrag. */
const ALL_RESPONSIBLES = '__all__';

/**
 * Die **Aufgaben-Werkliste**, das linke Papier des Schreibtischs (#122,
 * Variante C der DESIGN-VISION in der Gliederung des Entscheid-Prototyps
 * `entscheid-ablaufplan-phasen.html`): Kopf mit den beiden Filtern, darunter
 * die Aufgaben nach Tag → Phase, am Fuß die drei Zahlen des Fests.
 *
 * Gezählt und gruppiert wird in `scheduleWorklist`; dieses Papier zeichnet nur
 * und meldet Abhaken, Bearbeiten und Löschen nach oben.
 */
const TaskWorklist: React.FC<TaskWorklistProps> = ({
	worklist,
	filter,
	onFilterChange,
	responsibleId,
	onResponsibleChange,
	onToggleTask,
	onEditTask,
	onDeleteTask
}) => (
	<section className="border-2.5 border-tinte bg-white">
		<div className="flex flex-wrap items-center gap-2.5 border-b-2 border-tinte bg-papier-getoent px-3 py-2.5">
			<h3 className="mr-auto font-display text-[15px] font-semibold uppercase tracking-[.03em]">
				Aufgaben-Werkliste
			</h3>
			{/* Die Zahlen in den Segmenten nennen den Gesamtbestand, nicht die
			gezeigten Zeilen — siehe `scheduleWorklist`. */}
			<SegmentedControl<TaskFilter>
				options={[
					{ value: 'all', label: `Alle (${worklist.counts.all})` },
					{ value: 'open', label: `Offen (${worklist.counts.open})` },
					{ value: 'done', label: `Erledigt (${worklist.counts.done})` }
				]}
				value={filter}
				onValueChange={onFilterChange}
				aria-label="Aufgaben-Filter"
			/>
			<Select
				value={responsibleId ?? ALL_RESPONSIBLES}
				onValueChange={(value) =>
					onResponsibleChange(value === ALL_RESPONSIBLES ? null : value)
				}
			>
				<SelectTrigger
					id="worklist-responsible"
					aria-label="Verantwortlicher"
					className={cn('h-10 w-auto gap-2 border-2 border-tinte bg-white text-[12px] font-bold text-tinte', FOCUS_INK)}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_RESPONSIBLES}>Verantwortlich: alle</SelectItem>
					{worklist.responsibles.map((responsible) => (
						<SelectItem key={responsible.id} value={responsible.id}>
							{responsible.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>

		{worklist.days.map((day, index) => (
			<React.Fragment key={day.day.id}>
				<SectionHeading
					as="h4"
					className={cn(
						'gap-2.5 bg-fusszeile px-3 py-[9px] font-display text-[15px] font-semibold uppercase tracking-[.04em] text-gruen',
						// Der Kopf des Papiers bringt seine eigene Kante mit.
						index > 0 && 'border-t-2 border-tinte'
					)}
				>
					{day.title}
					<span className={cn(COUNTER, day.open > 0 ? 'text-rot' : 'text-gruen')}>
						{day.open > 0 ? `${day.open} offen` : 'fertig'}
					</span>
				</SectionHeading>

				{day.groups.map((group) => (
					<React.Fragment key={group.phase?.id ?? 'ohne-phase'}>
						{/* Einträge ohne Phase stehen direkt unter dem Tag — ohne
						Ersatztitel (ADR 0007). */}
						{group.phase && (
							<h5 className="flex items-baseline gap-2.5 border-b border-linie px-3 pb-1 pt-[7px] text-[10.5px] font-extrabold uppercase tracking-[.07em] text-tinte-soft">
								{group.phase.name}
								<span
									className={cn(
										'font-bold tabular-nums',
										group.done < group.total && 'text-rot'
									)}
								>
									{group.done}/{group.total}
								</span>
							</h5>
						)}
						{group.tasks.map((task) => (
							<TaskRow
								key={task.entry.id}
								task={task}
								onToggle={() => onToggleTask(task.entry)}
								onEdit={() => onEditTask(task.entry)}
								onDelete={() => onDeleteTask(task.entry)}
							/>
						))}
					</React.Fragment>
				))}
			</React.Fragment>
		))}

		{worklist.days.length === 0 && (
			<p className="px-3 py-4 text-[13px] text-tinte-soft">
				{worklist.counts.all === 0
					? 'Noch keine Aufgabe in diesem Fest.'
					: 'Keine Aufgabe passt zu Filter und Verantwortlichem.'}
			</p>
		)}

		<div className="flex flex-wrap gap-4 border-t-2 border-tinte px-3 py-2.5 text-xs text-tinte-soft">
			<span>
				<b className="font-bold text-rot">{worklist.footer.openBefore} offen</b> vor dem Fest
			</span>
			<span>{worklist.footer.openAfter} in der Nachbereitung</span>
			<span>
				{worklist.counts.done} von {worklist.counts.all} erledigt
			</span>
		</div>
	</section>
);

/**
 * Eine Zeile: Haken, Titel mit leiser Subzeile, Uhrzeit, Verantwortlicher, ⋮.
 *
 * Haken und Titel sind zwei Knöpfe nebeneinander statt ineinander — ein Knopf
 * im Knopf wäre kein gültiges HTML. Der Haken ist 17px groß (DESIGN-VISION §4)
 * und sitzt in einem 40px-Tippziel (§6).
 */
function TaskRow({
	task,
	onToggle,
	onEdit,
	onDelete
}: {
	task: WorklistTask;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { entry, done, time, responsible } = task;

	return (
		<div className="flex items-center gap-2.5 border-b border-linie pl-1 pr-1 text-[13px] last:border-b-0">
			<button
				type="button"
				role="checkbox"
				aria-checked={done}
				aria-label={`${entry.title} erledigt`}
				onClick={onToggle}
				className="flex h-10 w-10 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
			>
				<span
					aria-hidden
					className={cn(
						'flex h-[17px] w-[17px] items-center justify-center border-2 text-[12px] font-extrabold leading-none',
						done ? 'border-gruen bg-gruen text-white' : 'border-tinte bg-white'
					)}
				>
					{done ? '✓' : ''}
				</span>
			</button>

			{/* Der Klick auf die Zeile öffnet den Eintrag — derselbe Griff wie am
			Programmzettel (#123). */}
			<button
				type="button"
				onClick={onEdit}
				className="min-w-0 flex-1 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
			>
				<span className={cn('font-bold', done && 'text-tinte-soft line-through')}>
					{entry.title}
				</span>
				{entry.description && (
					<span className="block text-[11.5px] font-normal text-tinte-soft">
						{entry.description}
					</span>
				)}
			</button>

			{/* Feste, rechtsbündige Zeitspalte in der Akzentschrift — die Auflage
			„Uhrzeiten prominent" aus der abgenommenen Variante C. */}
			<span className="w-[62px] shrink-0 text-right leading-none">
				{time ? (
					<span className="font-display text-[17px] font-semibold tabular-nums tracking-[.02em]">
						{time}
					</span>
				) : (
					<span className="text-[11px] font-bold text-tinte-soft">ohne Zeit</span>
				)}
			</span>

			{responsible && <NameChip className="shrink-0">{responsible}</NameChip>}

			<ActionMenu
				menuLabel={`Menü der Aufgabe ${entry.title}`}
				editLabel="Bearbeiten …"
				deleteLabel="Aufgabe löschen"
				confirmTitle="Aufgabe löschen"
				confirmMessage={`„${entry.title}" wird aus dem Ablaufplan entfernt.`}
				onEdit={onEdit}
				onDelete={onDelete}
				className="h-10 w-8 shrink-0"
			/>
		</div>
	);
}

export default TaskWorklist;
