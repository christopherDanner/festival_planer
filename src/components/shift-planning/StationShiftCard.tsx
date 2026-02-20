import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StationShift, ShiftAssignmentWithMember } from '@/lib/shiftService';

interface StationShiftCardProps {
	stationShift: StationShift;
	assignments: ShiftAssignmentWithMember[];
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
	onEdit,
	onDelete,
	onRemoveMember,
	onDrop
}) => {
	const filled = assignments.length;
	const required = stationShift.required_people;
	const isFull = filled >= required;

	return (
		<div
			className="border rounded-lg bg-card overflow-hidden"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => onDrop(stationShift.id, e)}>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="text-sm font-medium truncate">{stationShift.name}</span>
					<Button
						size="sm"
						variant="ghost"
						className="h-5 w-5 p-0 shrink-0 hover:bg-blue-100 hover:text-blue-600"
						onClick={onEdit}>
						<Edit className="h-3 w-3" />
					</Button>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<span className={cn(
						'text-xs font-medium',
						isFull ? 'text-green-600' : 'text-muted-foreground'
					)}>
						{filled}/{required}
					</span>
					<Button
						size="sm"
						variant="ghost"
						className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
						onClick={onDelete}>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			</div>
			{/* Time */}
			<div className="px-3 py-1 text-xs text-muted-foreground bg-muted/20">
				{formatShiftTime(stationShift)}
			</div>
			{/* Members drop zone */}
			<div className={cn(
				'px-3 py-2 min-h-[44px] border-t-2 border-dashed transition-colors',
				filled === 0 && 'border-border',
				filled > 0 && !isFull && 'border-yellow-300 bg-yellow-50/30',
				isFull && 'border-green-300 bg-green-50/30'
			)}>
				{assignments.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{assignments.map((a) => (
							<span
								key={a.id}
								className="inline-flex items-center gap-1 bg-background rounded-md px-2 py-0.5 text-xs border shadow-sm">
								{a.member?.first_name} {a.member?.last_name}
								<button
									className="text-muted-foreground hover:text-destructive transition-colors"
									onClick={() => a.member_id && onRemoveMember(a.member_id)}>
									<X className="h-3 w-3" />
								</button>
							</span>
						))}
					</div>
				) : (
					<p className="text-xs text-muted-foreground text-center">
						Person hierher ziehen
					</p>
				)}
			</div>
		</div>
	);
};

export default StationShiftCard;
