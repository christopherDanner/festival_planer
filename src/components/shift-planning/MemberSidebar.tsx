import React from 'react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import MemberCard from './MemberCard';
import type { Station, StationShift, ShiftAssignmentWithMember, StationMemberWithDetails } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface MemberSidebarProps {
	members: Member[];
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
	stationPreferences: Record<string, string[]>;
	shiftPreferences: Record<string, string[]>;
	nameFilter: string;
	stationFilter: string;
	assignmentFilter: string;
	onNameFilterChange: (value: string) => void;
	onStationFilterChange: (value: string) => void;
	onAssignmentFilterChange: (value: string) => void;
	onDragStart: (member: Member) => void;
	onDragEnd: () => void;
	onEditPreferences: (member: Member) => void;
	onEditMember: (member: Member) => void;
	onDeleteMember: (member: Member) => void;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({
	members,
	stations,
	stationShifts,
	assignments,
	stationMembers,
	stationPreferences,
	shiftPreferences,
	nameFilter,
	stationFilter,
	assignmentFilter,
	onNameFilterChange,
	onStationFilterChange,
	onAssignmentFilterChange,
	onDragStart,
	onDragEnd,
	onEditPreferences,
	onEditMember,
	onDeleteMember
}) => {
	const getMemberAssignments = (memberId: string) =>
		assignments.filter((a) => a.member_id === memberId);

	const getMemberStationAssignments = (memberId: string) =>
		stationMembers.filter((sm) => sm.member_id === memberId);

	const isMemberAssigned = (memberId: string) =>
		getMemberAssignments(memberId).length > 0 || getMemberStationAssignments(memberId).length > 0;

	const filteredMembers = members.filter((member) => {
		if (
			nameFilter &&
			!`${member.first_name} ${member.last_name}`.toLowerCase().includes(nameFilter.toLowerCase())
		) {
			return false;
		}
		if (stationFilter !== 'all') {
			const memberPrefs = stationPreferences[member.id] || [];
			if (!memberPrefs.includes(stationFilter)) return false;
		}
		if (assignmentFilter === 'free' && isMemberAssigned(member.id)) return false;
		if (assignmentFilter === 'assigned' && !isMemberAssigned(member.id)) return false;
		return true;
	});

	const freeCount = members.filter((m) => !isMemberAssigned(m.id)).length;
	const assignedCount = members.length - freeCount;

	return (
		<div className="w-80 border-l bg-muted/20 flex flex-col">
			<div className="p-4 border-b bg-background">
				<h3 className="font-semibold flex items-center gap-2">
					<Users className="h-4 w-4" />
					Mitglieder ({filteredMembers.length})
				</h3>
				<div className="mt-3">
					<Input
						placeholder="Nach Namen suchen..."
						value={nameFilter}
						onChange={(e) => onNameFilterChange(e.target.value)}
						className="text-xs h-8"
					/>
				</div>
				<div className="mt-3">
					<Select value={assignmentFilter} onValueChange={onAssignmentFilterChange}>
						<SelectTrigger className="text-xs h-8">
							<SelectValue placeholder="Zuweisungsstatus..." />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle ({members.length})</SelectItem>
							<SelectItem value="free">Frei ({freeCount})</SelectItem>
							<SelectItem value="assigned">Zugeteilt ({assignedCount})</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="mt-3">
					<Select value={stationFilter} onValueChange={onStationFilterChange}>
						<SelectTrigger className="text-xs h-8">
							<SelectValue placeholder="Station filtern..." />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Stationen</SelectItem>
							{stations.map((station) => (
								<SelectItem key={station.id} value={station.id}>
									{station.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-2">
				{filteredMembers.map((member) => (
					<MemberCard
						key={member.id}
						member={member}
						assignments={getMemberAssignments(member.id)}
						stationAssignments={getMemberStationAssignments(member.id)}
						totalShifts={stationShifts.length}
						stationShifts={stationShifts}
						stations={stations}
						stationPreferences={stationPreferences[member.id] || []}
						shiftPreferences={shiftPreferences[member.id] || []}
						onDragStart={() => onDragStart(member)}
						onDragEnd={onDragEnd}
						onEditPreferences={() => onEditPreferences(member)}
						onEditMember={() => onEditMember(member)}
						onDeleteMember={() => onDeleteMember(member)}
					/>
				))}
			</div>
		</div>
	);
};

export default MemberSidebar;
