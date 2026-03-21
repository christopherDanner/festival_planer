import ScheduleEntryRow from './ScheduleEntryRow';
import ScheduleEntryCard from './ScheduleEntryCard';
import type { ScheduleEntryWithMember } from '@/lib/scheduleService';

interface ScheduleEntryTableProps {
	entries: ScheduleEntryWithMember[];
	onEdit: (entry: ScheduleEntryWithMember) => void;
	onDelete: (id: string) => void;
	onToggleStatus: (entry: ScheduleEntryWithMember) => void;
	onReorder: (orderedIds: string[]) => void;
	isMobile: boolean;
}

const ScheduleEntryTable = ({
	entries,
	onEdit,
	onDelete,
	onToggleStatus,
	onReorder,
	isMobile,
}: ScheduleEntryTableProps) => {
	const moveEntry = (index: number, direction: 'up' | 'down') => {
		const newOrder = [...entries];
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newOrder.length) return;
		const [moved] = newOrder.splice(index, 1);
		newOrder.splice(targetIndex, 0, moved);
		onReorder(newOrder.map(e => e.id));
	};

	const formatTime = (entry: ScheduleEntryWithMember) => {
		if (!entry.start_time) return null;
		const start = entry.start_time.slice(0, 5);
		if (entry.end_time) {
			const end = entry.end_time.slice(0, 5);
			return `${start} - ${end}`;
		}
		return start;
	};

	if (entries.length === 0) {
		return null;
	}

	if (isMobile) {
		return (
			<div className="space-y-2">
				{entries.map((entry, index) => (
					<ScheduleEntryCard
						key={entry.id}
						entry={entry}
						onEdit={onEdit}
						onDelete={onDelete}
						onToggleStatus={onToggleStatus}
						isFirst={index === 0}
						isLast={index === entries.length - 1}
						onMoveUp={() => moveEntry(index, 'up')}
						onMoveDown={() => moveEntry(index, 'down')}
					/>
				))}
			</div>
		);
	}

	return (
		<div>
			{/* Timeline layout */}
			<div className="relative">
				{entries.map((entry, index) => {
					const time = formatTime(entry);
					return (
						<div key={entry.id} className="flex items-stretch">
							{/* Time column */}
							<div className="w-[70px] shrink-0 pt-3 pr-3 text-right">
								{time ? (
									<span className="font-mono text-xs text-muted-foreground font-medium">
										{time}
									</span>
								) : (
									<span className="font-mono text-xs text-muted-foreground/40">--:--</span>
								)}
							</div>

							{/* Timeline dot + line */}
							<div className="relative flex flex-col items-center shrink-0 w-5">
								{/* Line above dot */}
								{index > 0 && (
									<div className="w-px flex-1 bg-border" />
								)}
								{index === 0 && <div className="flex-1" />}
								{/* Dot */}
								<div className="relative z-10 h-2 w-2 rounded-full bg-primary/40 ring-2 ring-background shrink-0 my-1" />
								{/* Line below dot */}
								{index < entries.length - 1 && (
									<div className="w-px flex-1 bg-border" />
								)}
								{index === entries.length - 1 && <div className="flex-1" />}
							</div>

							{/* Entry card */}
							<div className="flex-1 py-1 pl-3">
								<ScheduleEntryRow
									entry={entry}
									onEdit={onEdit}
									onDelete={onDelete}
									onToggleStatus={onToggleStatus}
									isFirst={index === 0}
									isLast={index === entries.length - 1}
									onMoveUp={() => moveEntry(index, 'up')}
									onMoveDown={() => moveEntry(index, 'down')}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default ScheduleEntryTable;
