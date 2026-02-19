import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
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

const formatStationShiftTime = (stationShift: StationShift): string => {
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
		return `${startDate} ${stationShift.start_time} - ${endDateFormatted} ${stationShift.end_time}`;
	}

	return `${startDate} ${stationShift.start_time}-${stationShift.end_time}`;
};

const getFillColor = (fillPercentage: number) => {
	if (fillPercentage === 0) return { dot: 'bg-gray-400', bar: 'bg-gray-400 w-0', border: 'border-gray-300 bg-gray-50' };
	if (fillPercentage < 50) return { dot: 'bg-red-500', bar: 'bg-red-500', border: 'border-red-300 bg-red-50' };
	if (fillPercentage < 100) return { dot: 'bg-yellow-500', bar: 'bg-yellow-500', border: 'border-yellow-300 bg-yellow-50' };
	return { dot: 'bg-green-500', bar: 'bg-green-500', border: 'border-green-300 bg-green-50' };
};

const StationShiftCard: React.FC<StationShiftCardProps> = ({
	stationShift,
	assignments,
	onEdit,
	onDelete,
	onRemoveMember,
	onDrop
}) => {
	const remaining = stationShift.required_people - assignments.length;
	const fillPercentage = (assignments.length / stationShift.required_people) * 100;
	const colors = getFillColor(fillPercentage);

	return (
		<Card className="border-2">
			<CardHeader className="pb-2">
				<CardTitle className="text-lg flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span>{stationShift.name}</span>
						<Button
							size="sm"
							variant="ghost"
							className="h-4 w-4 p-0 hover:bg-blue-100 hover:text-blue-600"
							onClick={onEdit}>
							<Edit className="h-3 w-3" />
						</Button>
					</div>
					<div className="flex items-center gap-1">
						<Badge
							variant={
								remaining === 0
									? 'default'
									: remaining < stationShift.required_people / 2
									? 'secondary'
									: 'destructive'
							}>
							{remaining > 0 ? `${remaining} fehlt` : 'Vollständig'}
						</Badge>
						<Button
							size="sm"
							variant="ghost"
							className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
							onClick={onDelete}>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</CardTitle>
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{formatStationShiftTime(stationShift)}
					</p>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1 text-xs">
							<span className="text-muted-foreground">
								{assignments.length}/{stationShift.required_people}
							</span>
							<div className={cn('w-2 h-2 rounded-full', colors.dot)} />
						</div>
						<div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
							<div
								className={cn('h-full transition-all duration-300', colors.bar)}
								style={{ width: `${Math.min(fillPercentage, 100)}%` }}
							/>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div
					className={cn(
						'min-h-[100px] border-2 border-dashed rounded-lg p-3 space-y-2 transition-all duration-200',
						colors.border
					)}
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => onDrop(stationShift.id, e)}>
					{assignments.length > 0 ? (
						<div className="space-y-1">
							{assignments.map((assignment) => (
								<div
									key={assignment.id}
									className="flex items-center justify-between bg-background rounded px-2 py-1 text-sm">
									<span className="font-medium">
										{assignment.member?.first_name} {assignment.member?.last_name}
									</span>
									<Button
										size="sm"
										variant="ghost"
										className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
										onClick={() => assignment.member_id && onRemoveMember(assignment.member_id)}>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					) : (
						<div className="text-xs text-muted-foreground text-center">
							Person hier ablegen
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default StationShiftCard;
