import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import ScheduleEntryTable from './ScheduleEntryTable';
import type { SchedulePhaseWithEntries, ScheduleEntryWithMember } from '@/lib/scheduleService';

interface SchedulePhaseSectionProps {
	phase: SchedulePhaseWithEntries;
	onEditPhase: (phase: SchedulePhaseWithEntries) => void;
	onDeletePhase: (id: string) => void;
	onEditEntry: (entry: ScheduleEntryWithMember) => void;
	onDeleteEntry: (id: string) => void;
	onToggleEntryStatus: (entry: ScheduleEntryWithMember) => void;
	onAddEntry: (phaseId: string) => void;
	onReorderEntries: (phaseId: string, orderedIds: string[]) => void;
	isMobile: boolean;
	isFirst: boolean;
	isLast: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

const SchedulePhaseSection = ({
	phase,
	onEditPhase,
	onDeletePhase,
	onEditEntry,
	onDeleteEntry,
	onToggleEntryStatus,
	onAddEntry,
	onReorderEntries,
	isMobile,
	isFirst,
	isLast,
	onMoveUp,
	onMoveDown,
}: SchedulePhaseSectionProps) => {
	const tasks = phase.entries.filter((e) => e.type === 'task');
	const doneTasks = tasks.filter((e) => e.status === 'done');
	const hasProgress = tasks.length > 0;

	return (
		<div className="relative">
			{/* Phase header — prominent banner */}
			<div className="group flex items-center gap-3 mb-3">
				{/* Left accent dot on the day's border line */}
				<div className="hidden sm:block absolute -left-[calc(1rem+5.5px)] sm:-left-[calc(1.25rem+5.5px)] w-3 h-3 rounded-full bg-primary/30 border-2 border-background" />

				{/* Phase banner */}
				<div className="flex-1 flex items-center justify-between rounded-lg bg-muted/80 border border-border/50 px-2.5 py-1.5 sm:px-4 sm:py-2.5">
					<div className="flex items-center gap-2.5">
						<span className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wide">{phase.name}</span>
						{hasProgress && (
							<Badge
								variant="outline"
								className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 font-semibold"
							>
								{doneTasks.length}/{tasks.length} erledigt
							</Badge>
						)}
						<span className="hidden sm:inline text-xs text-muted-foreground">
							{phase.entries.length} {phase.entries.length === 1 ? 'Eintrag' : 'Einträge'}
						</span>
					</div>

					{/* Action buttons */}
					<div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
						<Button
							variant="ghost"
							size="icon"
							className={`h-7 w-7 ${isFirst ? 'invisible' : ''}`}
							onClick={onMoveUp}
						>
							<ChevronUp className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={`h-7 w-7 ${isLast ? 'invisible' : ''}`}
							onClick={onMoveDown}
						>
							<ChevronDown className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddEntry(phase.id)}>
							<Plus className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditPhase(phase)}>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-destructive/70 hover:text-destructive"
							onClick={() => onDeletePhase(phase.id)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Entries */}
			<div className="ml-1">
				<ScheduleEntryTable
					entries={phase.entries}
					onEdit={onEditEntry}
					onDelete={onDeleteEntry}
					onToggleStatus={onToggleEntryStatus}
					onReorder={(orderedIds) => onReorderEntries(phase.id, orderedIds)}
					isMobile={isMobile}
				/>
			</div>
		</div>
	);
};

export default SchedulePhaseSection;
