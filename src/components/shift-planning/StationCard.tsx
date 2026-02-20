import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Crown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import StationShiftCard from './StationShiftCard';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface StationCardProps {
	station: Station;
	stationShifts: StationShift[];
	stationMembers: StationMemberWithDetails[];
	members: Member[];
	getAssignments: (stationShiftId: string) => ShiftAssignmentWithMember[];
	onEditStation: () => void;
	onDeleteStation: () => void;
	onAddShift: () => void;
	onEditShift: (shift: StationShift) => void;
	onDeleteShift: (shiftId: string) => void;
	onRemoveMember: (stationShiftId: string, memberId: string) => void;
	onDrop: (stationShiftId: string, e: React.DragEvent) => void;
	onDropOnStation: (stationId: string, e: React.DragEvent) => void;
	onRemoveStationMember: (stationId: string, memberId: string) => void;
}

const getAccentColor = (count: number, required: number) => {
	if (count === 0) return 'border-l-muted-foreground/40';
	if (count < required) return 'border-l-yellow-400';
	return 'border-l-green-500';
};

const StationCard: React.FC<StationCardProps> = ({
	station,
	stationShifts,
	stationMembers,
	members,
	getAssignments,
	onEditStation,
	onDeleteStation,
	onAddShift,
	onEditShift,
	onDeleteShift,
	onRemoveMember,
	onDrop,
	onDropOnStation,
	onRemoveStationMember
}) => {
	const responsibleName = station.responsible_member
		? `${station.responsible_member.first_name} ${station.responsible_member.last_name}`
		: null;

	const hasShifts = stationShifts.length > 0;

	return (
		<div className={cn(
			'rounded-lg border border-l-4 bg-card shadow-sm',
			getAccentColor(stationMembers.length, station.required_people)
		)}>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="flex items-center gap-3 min-w-0">
					<h3 className="font-semibold text-base">{station.name}</h3>
					<Button
						size="sm"
						variant="ghost"
						className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
						onClick={onEditStation}>
						<Edit className="h-3.5 w-3.5" />
					</Button>
					<Badge variant="outline" className="text-xs shrink-0">
						{stationMembers.length}/{station.required_people} Personen
					</Badge>
					{responsibleName && (
						<Badge variant="secondary" className="text-xs shrink-0 gap-1">
							<Crown className="h-3 w-3" />
							{responsibleName}
						</Badge>
					)}
					{station.description && (
						<span className="text-xs text-muted-foreground truncate hidden md:inline">
							{station.description}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddShift}>
						<Plus className="h-3.5 w-3.5 mr-1" />
						Schicht
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
						onClick={onDeleteStation}>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="px-4 py-3 space-y-3">
				{/* Station members drop zone */}
				<div
					className={cn(
						'rounded-md border-2 border-dashed px-3 py-2 min-h-[40px] flex flex-wrap items-center gap-1.5 transition-colors',
						stationMembers.length === 0 && 'border-border bg-muted/50',
						stationMembers.length > 0 && stationMembers.length < station.required_people && 'border-yellow-300 bg-yellow-50/30',
						stationMembers.length >= station.required_people && 'border-green-300 bg-green-50/30'
					)}
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => onDropOnStation(station.id, e)}>
					{stationMembers.length > 0 ? (
						stationMembers.map((sm) => (
							<span
								key={sm.id}
								className="inline-flex items-center gap-1 bg-background rounded-md px-2 py-0.5 text-sm border shadow-sm">
								{sm.member?.first_name} {sm.member?.last_name}
								<button
									className="text-muted-foreground hover:text-destructive transition-colors"
									onClick={() => onRemoveStationMember(station.id, sm.member_id)}>
									<X className="h-3 w-3" />
								</button>
							</span>
						))
					) : (
						<span className="text-xs text-muted-foreground mx-auto">
							Mitglied hierher ziehen um es der Station zuzuweisen
						</span>
					)}
				</div>

				{/* Shifts grid */}
				{hasShifts && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{stationShifts.map((shift) => (
							<StationShiftCard
								key={shift.id}
								stationShift={shift}
								assignments={getAssignments(shift.id)}
								onEdit={() => onEditShift(shift)}
								onDelete={() => onDeleteShift(shift.id)}
								onRemoveMember={(memberId) => onRemoveMember(shift.id, memberId)}
								onDrop={onDrop}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default StationCard;
