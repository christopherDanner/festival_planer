import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Info } from 'lucide-react';
import type { ScheduleEntryWithHelper } from '@/lib/scheduleService';

interface ScheduleEntryRowProps {
	entry: ScheduleEntryWithHelper;
	onEdit: (entry: ScheduleEntryWithHelper) => void;
	onDelete: (id: string) => void;
	onToggleStatus: (entry: ScheduleEntryWithHelper) => void;
}

const ScheduleEntryRow = ({ entry, onEdit, onDelete, onToggleStatus }: ScheduleEntryRowProps) => {
	const isDone = entry.status === 'done';

	return (
		<div className="group relative flex items-start gap-4 py-1">
			{/* Card content */}
			<div className="flex-1 border bg-card p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
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
						{/* Title */}
						<span className={`font-medium text-foreground ${isDone ? 'line-through text-muted-foreground' : ''}`}>
							{entry.title}
						</span>
					</div>
					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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

				{/* Bottom row: responsible + status */}
				{(entry.responsible_helper || entry.type === 'task' || entry.description) && (
					<div className="flex items-center justify-between mt-2 text-sm">
						<span className="text-muted-foreground">
							{entry.responsible_helper
								? `${entry.responsible_helper.last_name} ${entry.responsible_helper.first_name}`
								: ''}
						</span>
						<div className="flex items-center gap-2">
							{entry.description && (
								// Der Tooltip gehört an ein HTML-Element — das SVG von
								// lucide nimmt kein `title`.
								<span title={entry.description} className="inline-flex">
									<Info className="h-3.5 w-3.5 text-muted-foreground/60" />
								</span>
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
		</div>
	);
};

export default ScheduleEntryRow;
