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
	selectedMember?: Member | null;
	onTapAssignToShift?: (stationShiftId: string) => void;
	onTapAssignToStation?: (stationId: string) => void;
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
	if (count === 0) return 'border-l-status-empty-border';
	if (count < required) return 'border-l-status-partial-border';
	return 'border-l-status-complete-border';
};

const StationCard: React.FC<StationCardProps> = ({
	station,
	stationShifts,
	stationMembers,
	members,
	getAssignments,
	selectedMember,
	onTapAssignToShift,
	onTapAssignToStation,
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
		? `${station.responsible_member.last_name} ${station.responsible_member.first_name}`
		: null;

	const hasShifts = stationShifts.length > 0;
	const fillRatio = station.required_people > 0
		? Math.min(stationMembers.length / station.required_people, 1)
		: 0;
	const isComplete = stationMembers.length >= station.required_people && station.required_people > 0;

	return (
		<div className={cn(
			'rounded-lg border border-l-4 bg-card shadow-sm',
			getAccentColor(stationMembers.length, station.required_people)
		)}>
			{/* Header */}
			<div className="px-3 py-2 border-b">
				<div className="flex items-center justify-between gap-1">
					<h3 className="font-semibold text-sm md:text-base leading-tight">{station.name}</h3>
					<div className="flex items-center gap-0.5 shrink-0">
						<Button
							size="sm"
							variant="ghost"
							className="h-6 w-6 p-0 hover:bg-muted"
							onClick={onEditStation}>
							<Edit className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
							onClick={onDeleteStation}>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="text-xs text-muted-foreground">
						{stationMembers.length}/{station.required_people} Personen
					</span>
					{responsibleName && (
						<Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
							<Crown className="h-2.5 w-2.5" />
							<span className="truncate max-w-[120px]">{responsibleName}</span>
						</Badge>
					)}
				</div>
			</div>

			{/* Progress bar */}
			<div className="h-1 bg-status-empty">
				<div
					className={cn(
						'h-full transition-all',
						isComplete ? 'bg-status-complete-border' : 'bg-status-partial-border'
					)}
					style={{ width: `${fillRatio * 100}%` }}
				/>
			</div>

			{/* Content */}
			<div className="px-3 py-2 space-y-3">
				{/* Station members */}
				<div
					className={cn(
						'rounded-md min-h-[40px] transition-colors',
						stationMembers.length === 0 && 'bg-muted/30 px-3 py-2.5 flex items-center',
						stationMembers.length > 0 && 'divide-y divide-border/40',
						selectedMember && 'ring-2 ring-primary/40 bg-primary/5 cursor-pointer'
					)}
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => onDropOnStation(station.id, e)}
					onClick={selectedMember && onTapAssignToStation ? () => onTapAssignToStation(station.id) : undefined}>
					{stationMembers.length > 0 ? (
						stationMembers.map((sm) => (
							<div
								key={sm.id}
								className="flex items-center justify-between px-2 py-1.5 text-sm">
								<span className="font-medium">{sm.member?.last_name} {sm.member?.first_name}</span>
								<button
									className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5 shrink-0"
									onClick={(e) => { e.stopPropagation(); onRemoveStationMember(station.id, sm.member_id); }}>
									<X className="h-3 w-3" />
								</button>
							</div>
						))
					) : (
						<span className="text-xs text-muted-foreground/60 mx-auto">
							Mitglied hierher ziehen oder per Tap zuweisen
						</span>
					)}
				</div>

				{/* Shifts */}
				{hasShifts && (
					<div>
						<div className="flex items-center gap-1.5 mb-1.5">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schichten</span>
							<span className="text-xs text-muted-foreground">({stationShifts.length})</span>
						</div>
						<div className="space-y-2">
							{stationShifts.map((shift) => (
								<StationShiftCard
									key={shift.id}
									stationShift={shift}
									assignments={getAssignments(shift.id)}
									selectedMember={selectedMember}
									onTapAssign={onTapAssignToShift}
									onEdit={() => onEditShift(shift)}
									onDelete={() => onDeleteShift(shift.id)}
									onRemoveMember={(memberId) => onRemoveMember(shift.id, memberId)}
									onDrop={onDrop}
								/>
							))}
						</div>
					</div>
				)}

				{/* Add shift button at bottom */}
				<button
					onClick={onAddShift}
					className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30 transition-colors">
					<Plus className="h-3 w-3" />
					Schicht hinzufügen
				</button>
			</div>
		</div>
	);
};

export default StationCard;
