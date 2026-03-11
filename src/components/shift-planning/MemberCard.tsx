import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, UserMinus, Settings, Heart, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface MemberCardProps {
	member: Member;
	assignments: ShiftAssignmentWithMember[];
	stationAssignments: StationMemberWithDetails[];
	totalShifts: number;
	stationShifts: StationShift[];
	stations: Station[];
	stationPreferences: string[];
	shiftPreferences: string[];
	onDragStart: () => void;
	onDragEnd: () => void;
	onTapSelect?: () => void;
	onEditPreferences: () => void;
	onEditMember: () => void;
	onDeleteMember: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({
	member,
	assignments,
	stationAssignments,
	totalShifts,
	stationShifts,
	stations,
	stationPreferences,
	shiftPreferences,
	onDragStart,
	onDragEnd,
	onTapSelect,
	onEditPreferences,
	onEditMember,
	onDeleteMember
}) => {
	const totalAssignments = assignments.length + stationAssignments.length;
	const isAssigned = totalAssignments > 0;

	return (
		<div
			className={cn(
				'bg-card border rounded-lg p-3 transition-colors',
				onTapSelect ? 'cursor-pointer active:bg-accent/70' : 'cursor-move',
				'hover:bg-muted/50'
			)}
			draggable={!onTapSelect}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onClick={onTapSelect ? (e) => {
				// Don't trigger tap-select when clicking action buttons
				if ((e.target as HTMLElement).closest('button')) return;
				onTapSelect();
			} : undefined}>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-medium text-sm flex items-center">
						<span className={cn(
							'w-2 h-2 rounded-full inline-block mr-2',
							isAssigned ? 'bg-primary' : 'bg-muted-foreground/30'
						)} />
						{member.last_name} {member.first_name}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onEditPreferences();
							}}
							className="h-6 w-6 p-0 hover:bg-muted"
							title="Alle Präferenzen bearbeiten">
							<Settings
								className={cn(
									'h-3 w-3',
									stationPreferences.length > 0 || shiftPreferences.length > 0
										? 'text-muted-foreground'
										: 'text-muted-foreground/40'
								)}
							/>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onEditMember();
							}}
							className="h-6 w-6 p-0 hover:bg-muted"
							title="Mitglied bearbeiten">
							<Edit className="h-3 w-3 text-muted-foreground" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteMember();
							}}
							className="h-6 w-6 p-0 hover:bg-destructive/10"
							title="Mitglied löschen">
							<UserMinus className="h-3 w-3 text-destructive/70" />
						</Button>
						{isAssigned ? (
							<Badge variant="secondary" className="text-xs">
								{totalAssignments}x
							</Badge>
						) : (
							<Badge variant="outline" className="text-xs">
								Frei
							</Badge>
						)}
					</div>
				</div>

				{stationPreferences.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{stationPreferences.map((stationId) => {
							const station = stations.find((s) => s.id === stationId);
							if (!station) return null;
							return (
								<Badge
									key={stationId}
									variant="outline"
									className="text-xs bg-muted text-muted-foreground border-border">
									<Heart className="h-2 w-2 mr-1 fill-current" />
									{station.name}
								</Badge>
							);
						})}
					</div>
				)}

				{shiftPreferences.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{shiftPreferences.map((shiftId) => {
							const stationShift = stationShifts.find((s) => s.id === shiftId);
							if (!stationShift) return null;
							return (
								<Badge
									key={shiftId}
									variant="outline"
									className="text-xs bg-muted text-muted-foreground border-border">
									<Clock className="h-2 w-2 mr-1" />
									{stationShift.name}
								</Badge>
							);
						})}
					</div>
				)}

				{stationAssignments.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{stationAssignments.map((sa) => {
							const station = stations.find((s) => s.id === sa.station_id);
							if (!station) return null;
							return (
								<Badge
									key={sa.id}
									variant="secondary"
									className="text-xs">
									<MapPin className="h-2 w-2 mr-1" />
									{station.name}
								</Badge>
							);
						})}
					</div>
				)}

				{assignments.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{assignments.map((assignment) => {
							const stationShift = stationShifts.find(
								(shift) => shift.id === assignment.station_shift_id
							);
							if (!stationShift) return null;
							return (
								<Badge key={assignment.id} variant="secondary" className="text-xs">
									<Clock className="h-2 w-2 mr-1" />
									{stationShift.name}
								</Badge>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default MemberCard;
