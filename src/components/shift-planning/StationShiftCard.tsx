import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StationShift, ShiftAssignmentWithMember } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface StationShiftCardProps {
	stationShift: StationShift;
	assignments: ShiftAssignmentWithMember[];
	selectedMember?: Member | null;
	onTapAssign?: (stationShiftId: string) => void;
	onEdit: () => void;
	onDelete: () => void;
	onRemoveMember: (memberId: string) => void;
	onDrop: (stationShiftId: string, e: React.DragEvent) => void;
}

const formatShiftTime = (stationShift: StationShift): string => {
	const startDate = new Date(stationShift.start_date).toLocaleDateString('de-AT', {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit'
	});

	const endDate = stationShift.end_date;
	if (endDate && endDate !== stationShift.start_date) {
		const endDateFormatted = new Date(endDate).toLocaleDateString('de-AT', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		});
		return `${startDate} ${stationShift.start_time} – ${endDateFormatted} ${stationShift.end_time}`;
	}

	return `${startDate} ${stationShift.start_time}–${stationShift.end_time}`;
};

const StationShiftCard: React.FC<StationShiftCardProps> = ({
	stationShift,
	assignments,
	selectedMember,
	onTapAssign,
	onEdit,
	onDelete,
	onRemoveMember,
	onDrop
}) => {
	const filled = assignments.length;
	const required = stationShift.required_people;
	const isFull = filled >= required;
	const progressPercent = required > 0 ? Math.min((filled / required) * 100, 100) : 0;

	return (
		<div
			className="border rounded-lg bg-card"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => onDrop(stationShift.id, e)}>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="text-sm font-medium truncate">{stationShift.name}</span>
					<Button
						size="sm"
						variant="ghost"
						className="h-5 w-5 p-0 shrink-0 hover:bg-muted"
						onClick={onEdit}>
						<Edit className="h-4 w-4" />
					</Button>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-xs font-medium text-muted-foreground">
						{filled}/{required}
					</span>
					<Button
						size="sm"
						variant="ghost"
						className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
						onClick={onDelete}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
			{/* Progress bar */}
			<div className="h-1 bg-muted">
				{filled > 0 && (
					<div
						className={cn(
							'h-full transition-all',
							isFull ? 'bg-status-complete-border' : 'bg-status-partial-border'
						)}
						style={{ width: `${progressPercent}%` }}
					/>
				)}
			</div>
			{/* Time */}
			<div className="px-3 py-1 text-xs text-muted-foreground bg-muted/20">
				{formatShiftTime(stationShift)}
			</div>
			{/* Members drop zone */}
			<div
				className={cn(
					'min-h-[36px] bg-muted/30 rounded-b-md transition-colors',
					assignments.length === 0 && 'px-3 py-2 flex items-center',
					assignments.length > 0 && 'divide-y divide-border/30',
					selectedMember && 'ring-2 ring-primary/40 cursor-pointer'
				)}
				onClick={selectedMember && onTapAssign ? () => onTapAssign(stationShift.id) : undefined}>
				{assignments.length > 0 ? (
					assignments.map((a) => (
						<div
							key={a.id}
							className="flex items-center justify-between px-3 py-1 text-xs">
							<span>{a.member?.last_name} {a.member?.first_name}</span>
							<button
								className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5 shrink-0"
								onClick={() => a.member_id && onRemoveMember(a.member_id)}>
								<X className="h-3 w-3" />
							</button>
						</div>
					))
				) : (
					<p className="text-xs text-muted-foreground/60 text-center mx-auto">
						Person hierher ziehen
					</p>
				)}
			</div>
		</div>
	);
};

export default StationShiftCard;
