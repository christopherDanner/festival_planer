import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, ListPlus } from 'lucide-react';
import SchedulePhaseSection from './SchedulePhaseSection';
import ScheduleEntryTable from './ScheduleEntryTable';
import { groupEntriesByPhase } from './scheduleGrouping';
import type {
	ScheduleDayWithEntries,
	SchedulePhase,
	ScheduleEntryWithHelper,
} from '@/lib/scheduleService';

interface ScheduleDayAccordionProps {
	day: ScheduleDayWithEntries;
	onEditDay: (day: ScheduleDayWithEntries) => void;
	onDeleteDay: (id: string) => void;
	onEditPhase: (phase: SchedulePhase) => void;
	onDeletePhase: (id: string) => void;
	onAddPhase: (dayId: string) => void;
	onEditEntry: (entry: ScheduleEntryWithHelper) => void;
	onDeleteEntry: (id: string) => void;
	onToggleEntryStatus: (entry: ScheduleEntryWithHelper) => void;
	/** `phaseId === null` legt den Eintrag direkt am Tag an (ADR 0007). */
	onAddEntry: (dayId: string, phaseId: string | null) => void;
	onReorderPhases: (dayId: string, orderedIds: string[]) => void;
	isMobile: boolean;
}

const ScheduleDayAccordion = ({
	day,
	onEditDay,
	onDeleteDay,
	onEditPhase,
	onDeletePhase,
	onAddPhase,
	onEditEntry,
	onDeleteEntry,
	onToggleEntryStatus,
	onAddEntry,
	onReorderPhases,
	isMobile,
}: ScheduleDayAccordionProps) => {
	const totalEntries = day.entries.length;
	const groups = groupEntriesByPhase(day);
	// Einträge ohne Phase stehen direkt unter dem Tag — die Gruppierung macht die
	// Ansicht, nicht die Abfrage.
	const ungrouped = groups.find((group) => group.phase === null);
	const phaseGroups = groups.filter((group) => group.phase !== null);

	const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('de-AT', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

	const movePhase = (index: number, direction: 'up' | 'down') => {
		const newOrder = [...day.phases];
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newOrder.length) return;
		const [moved] = newOrder.splice(index, 1);
		newOrder.splice(targetIndex, 0, moved);
		onReorderPhases(day.id, newOrder.map(p => p.id));
	};

	return (
		<div className="relative">
			{/* Day header — prominent card */}
			<div className="group bg-muted border border-primary/20 px-3 py-2.5 sm:px-5 sm:py-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h3 className="text-base sm:text-2xl font-extrabold text-foreground tracking-tight capitalize">
							{formattedDate}
						</h3>
						<div className="flex items-center gap-2 mt-2">
							{day.label && (
								<span className="hidden sm:inline-flex items-center rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
									{day.label}
								</span>
							)}
							<span className="hidden sm:inline text-xs text-muted-foreground">
								{day.phases.length} {day.phases.length === 1 ? 'Phase' : 'Phasen'} · {totalEntries} {totalEntries === 1 ? 'Eintrag' : 'Einträge'}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Eintrag hinzufügen" onClick={() => onAddEntry(day.id, null)}>
							<ListPlus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Phase hinzufügen" onClick={(e) => { e.stopPropagation(); onAddPhase(day.id); }}>
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Tag bearbeiten" onClick={() => onEditDay(day)}>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" aria-label="Tag löschen" onClick={() => onDeleteDay(day.id)}>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Einträge ohne Phase — direkt unter dem Tag, ohne Zwischentitel */}
			{ungrouped && (
				<div className="mt-1 ml-1 sm:ml-4 pl-2 sm:pl-5 border-l-2 border-primary/15 py-2 sm:py-3">
					<ScheduleEntryTable
						entries={ungrouped.entries}
						onEdit={onEditEntry}
						onDelete={onDeleteEntry}
						onToggleStatus={onToggleEntryStatus}
						isMobile={isMobile}
					/>
				</div>
			)}

			{/* Phases content — indented with left accent line */}
			{phaseGroups.length > 0 && (
			<div className="mt-1 ml-1 sm:ml-4 pl-2 sm:pl-5 border-l-2 border-primary/15 space-y-3 sm:space-y-6 py-2 sm:py-4">
				{phaseGroups.map((group, index) => (
					<SchedulePhaseSection
						key={group.phase.id}
						phase={group.phase}
						entries={group.entries}
						onEditPhase={onEditPhase}
						onDeletePhase={onDeletePhase}
						onEditEntry={onEditEntry}
						onDeleteEntry={onDeleteEntry}
						onToggleEntryStatus={onToggleEntryStatus}
						onAddEntry={onAddEntry}
						isMobile={isMobile}
						isFirst={index === 0}
						isLast={index === phaseGroups.length - 1}
						onMoveUp={() => movePhase(index, 'up')}
						onMoveDown={() => movePhase(index, 'down')}
					/>
				))}
			</div>
			)}
		</div>
	);
};

export default ScheduleDayAccordion;
