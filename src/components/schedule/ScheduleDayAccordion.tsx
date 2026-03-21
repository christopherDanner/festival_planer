import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus } from 'lucide-react';
import SchedulePhaseSection from './SchedulePhaseSection';
import type {
	ScheduleDayWithPhases,
	SchedulePhaseWithEntries,
	ScheduleEntryWithMember,
} from '@/lib/scheduleService';

interface ScheduleDayAccordionProps {
	day: ScheduleDayWithPhases;
	onEditDay: (day: ScheduleDayWithPhases) => void;
	onDeleteDay: (id: string) => void;
	onEditPhase: (phase: SchedulePhaseWithEntries) => void;
	onDeletePhase: (id: string) => void;
	onAddPhase: (dayId: string) => void;
	onEditEntry: (entry: ScheduleEntryWithMember) => void;
	onDeleteEntry: (id: string) => void;
	onToggleEntryStatus: (entry: ScheduleEntryWithMember) => void;
	onAddEntry: (phaseId: string) => void;
	onReorderPhases: (dayId: string, orderedIds: string[]) => void;
	onReorderEntries: (phaseId: string, orderedIds: string[]) => void;
	isMobile: boolean;
	defaultOpen?: boolean;
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
	onReorderEntries,
	isMobile,
	defaultOpen,
}: ScheduleDayAccordionProps) => {
	const totalEntries = day.phases.reduce((sum, p) => sum + p.entries.length, 0);

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
			<div className="group rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 px-3 py-2.5 sm:px-5 sm:py-4">
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
					<div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
						<Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onAddPhase(day.id); }}>
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditDay(day)}>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => onDeleteDay(day.id)}>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Phases content — indented with left accent line */}
			{day.phases.length > 0 && (
			<div className="mt-1 ml-1 sm:ml-4 pl-2 sm:pl-5 border-l-2 border-primary/15 space-y-3 sm:space-y-6 py-2 sm:py-4">
				{day.phases.map((phase, index) => (
					<SchedulePhaseSection
						key={phase.id}
						phase={phase}
						onEditPhase={onEditPhase}
						onDeletePhase={onDeletePhase}
						onEditEntry={onEditEntry}
						onDeleteEntry={onDeleteEntry}
						onToggleEntryStatus={onToggleEntryStatus}
						onAddEntry={onAddEntry}
						onReorderEntries={onReorderEntries}
						isMobile={isMobile}
						isFirst={index === 0}
						isLast={index === day.phases.length - 1}
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
