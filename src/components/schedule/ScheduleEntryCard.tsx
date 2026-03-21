import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ScheduleEntryWithMember } from '@/lib/scheduleService';

interface ScheduleEntryCardProps {
	entry: ScheduleEntryWithMember;
	onEdit: (entry: ScheduleEntryWithMember) => void;
	onDelete: (id: string) => void;
	onToggleStatus: (entry: ScheduleEntryWithMember) => void;
	isFirst: boolean;
	isLast: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

const ScheduleEntryCard = ({ entry, onEdit, onDelete, onToggleStatus, isFirst, isLast, onMoveUp, onMoveDown }: ScheduleEntryCardProps) => {
	const isMobile = useIsMobile();

	const formatTime = () => {
		if (!entry.start_time) return null;
		const start = entry.start_time.slice(0, 5);
		if (entry.end_time) {
			const end = entry.end_time.slice(0, 5);
			return `${start} - ${end}`;
		}
		return start;
	};

	const time = formatTime();
	const isDone = entry.status === 'done';
	const borderClass = entry.type === 'task'
		? 'border-l-4 border-l-emerald-500'
		: 'border-l-4 border-l-violet-500';

	if (isMobile) {
		return (
			<div className={`rounded-lg border bg-card p-2 ${borderClass}`}>
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5 mb-0.5">
							{entry.type === 'task' ? (
								<Badge
									variant="outline"
									className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
								>
									A
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
								>
									P
								</Badge>
							)}
							{time && <span className="text-[11px] font-mono text-muted-foreground">{time}</span>}
						</div>
						<div className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
							{entry.title}
						</div>
					</div>
					<div className="flex items-center gap-0.5 shrink-0">
						{entry.type === 'task' && (
							<Checkbox
								checked={isDone}
								onCheckedChange={() => onToggleStatus(entry)}
								className="h-4 w-4"
							/>
						)}
						<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(entry)}>
							<Pencil className="h-3 w-3" />
						</Button>
					</div>
				</div>
				{entry.responsible_member && (
					<div className="text-[11px] text-muted-foreground mt-0.5">
						{entry.responsible_member.last_name} {entry.responsible_member.first_name}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={`rounded-lg border bg-card p-3 ${borderClass}`}>
			{/* Top row: time badge, move buttons, action buttons */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					{/* Move buttons */}
					<div className="flex flex-col -my-1">
						<Button
							variant="ghost"
							size="icon"
							className={`h-5 w-5 ${isFirst ? 'invisible' : ''}`}
							onClick={onMoveUp}
						>
							<ChevronUp className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={`h-5 w-5 ${isLast ? 'invisible' : ''}`}
							onClick={onMoveDown}
						>
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>

					{/* Type badge */}
					{entry.type === 'task' ? (
						<Badge
							variant="outline"
							className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
						>
							Aufgabe
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
						>
							Programm
						</Badge>
					)}

					{/* Time badge */}
					{time && (
						<span className="font-mono text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
							{time}
						</span>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-destructive/70 hover:text-destructive"
						onClick={() => onDelete(entry.id)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Title */}
			<div className={`font-medium text-foreground ${isDone ? 'line-through text-muted-foreground' : ''}`}>
				{entry.title}
			</div>

			{/* Bottom row: responsible + description/status */}
			{(entry.responsible_member || entry.type === 'task' || entry.description) && (
				<div className="flex items-center justify-between mt-2 text-sm">
					<span className="text-muted-foreground">
						{entry.responsible_member
							? `${entry.responsible_member.last_name} ${entry.responsible_member.first_name}`
							: ''}
					</span>
					<div className="flex items-center gap-2">
						{entry.description && (
							<Info
								className="h-3.5 w-3.5 text-muted-foreground/60"
								title={entry.description}
							/>
						)}
						{entry.type === 'task' && (
							<Checkbox
								checked={isDone}
								onCheckedChange={() => onToggleStatus(entry)}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default ScheduleEntryCard;
