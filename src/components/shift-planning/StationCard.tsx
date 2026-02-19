import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Edit, Crown } from 'lucide-react';
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

	const stationMemberCount = stationMembers.length;
	const fillPercentage = station.required_people > 0
		? (stationMemberCount / station.required_people) * 100
		: 0;

	const getFillBorderClass = () => {
		if (stationMemberCount === 0) return 'border-gray-300 bg-gray-50';
		if (fillPercentage < 50) return 'border-red-300 bg-red-50';
		if (fillPercentage < 100) return 'border-yellow-300 bg-yellow-50';
		return 'border-green-300 bg-green-50';
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<MapPin className="h-5 w-5" />
						<div className="flex items-center gap-2">
							<span>{station.name}</span>
							<Button
								size="sm"
								variant="ghost"
								className="h-4 w-4 p-0 hover:bg-blue-100 hover:text-blue-600"
								onClick={onEditStation}>
								<Edit className="h-3 w-3" />
							</Button>
						</div>
						<Badge variant="outline">{station.required_people} Personen</Badge>
						{responsibleName && (
							<Badge variant="secondary" className="flex items-center gap-1">
								<Crown className="h-3 w-3" />
								{responsibleName}
							</Badge>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={onAddShift}>
							<Plus className="h-4 w-4 mr-2" />
							Schicht hinzufügen
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="hover:bg-red-100 hover:text-red-600"
							onClick={onDeleteStation}>
							<Trash2 className="h-4 w-4 mr-2" />
							Löschen
						</Button>
					</div>
				</CardTitle>
				{station.description && (
					<p className="text-sm text-muted-foreground">{station.description}</p>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Direkte Mitglieder-Zuweisung */}
				<div>
					<p className="text-sm font-medium mb-2">
						Zugewiesene Mitglieder ({stationMemberCount}/{station.required_people})
					</p>
					<div
						className={cn(
							'min-h-[60px] border-2 border-dashed rounded-lg p-3 space-y-2 transition-all duration-200',
							getFillBorderClass()
						)}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => onDropOnStation(station.id, e)}>
						{stationMembers.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								{stationMembers.map((sm) => (
									<div
										key={sm.id}
										className="flex items-center gap-1 bg-background rounded-md px-2 py-1 text-sm border">
										<span className="font-medium">
											{sm.member?.first_name} {sm.member?.last_name}
										</span>
										<Button
											size="sm"
											variant="ghost"
											className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
											onClick={() => onRemoveStationMember(station.id, sm.member_id)}>
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
				</div>

				{/* Schichten */}
				{stationShifts.length === 0 ? (
					<div className="text-center text-muted-foreground py-4">
						<p className="text-sm">Keine Schichten vorhanden.</p>
					</div>
				) : (
					<div>
						<p className="text-sm font-medium mb-2">Schichten</p>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default StationCard;
