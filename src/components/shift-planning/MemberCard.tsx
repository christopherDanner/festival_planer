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
	onEditPreferences,
	onEditMember,
	onDeleteMember
}) => {
	const totalAssignments = assignments.length + stationAssignments.length;
	const isAssigned = totalAssignments > 0;

	return (
		<div
			className={cn(
				'p-3 rounded-lg border cursor-move hover:bg-accent/50 transition-colors',
				!isAssigned && 'bg-red-50 border-red-200',
				isAssigned && 'bg-green-50 border-green-200'
			)}
			draggable
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-medium text-sm">
						{member.first_name} {member.last_name}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onEditPreferences();
							}}
							className="h-6 w-6 p-0 hover:bg-purple-100"
							title="Alle Präferenzen bearbeiten">
							<Settings
								className={cn(
									'h-3 w-3',
									stationPreferences.length > 0 || shiftPreferences.length > 0
										? 'text-purple-500'
										: 'text-muted-foreground/60'
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
							className="h-6 w-6 p-0 hover:bg-green-100"
							title="Mitglied bearbeiten">
							<Edit className="h-3 w-3 text-green-600" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteMember();
							}}
							className="h-6 w-6 p-0 hover:bg-red-100"
							title="Mitglied löschen">
							<UserMinus className="h-3 w-3 text-red-600" />
						</Button>
						{isAssigned ? (
							<Badge variant="default" className="text-xs">
								{totalAssignments}x
							</Badge>
						) : (
							<Badge variant="destructive" className="text-xs">
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
									className="text-xs bg-pink-50 border-pink-200 text-pink-700">
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
									className="text-xs bg-blue-50 border-blue-200 text-blue-700">
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
