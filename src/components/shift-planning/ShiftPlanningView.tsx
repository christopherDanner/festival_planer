import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useShiftPlanningData } from './hooks/useShiftPlanningData';
import { useShiftPlanningActions } from './hooks/useShiftPlanningActions';
import ShiftPlanningHeader from './ShiftPlanningHeader';
import StationCard from './StationCard';
import MemberSidebar from './MemberSidebar';
import StationDialog from './dialogs/StationDialog';
import StationShiftDialog from './dialogs/StationShiftDialog';
import MemberDialog from './dialogs/MemberDialog';
import PreferenceDialog from './dialogs/PreferenceDialog';
import AutoAssignDialog from './dialogs/AutoAssignDialog';
import type { Station, StationShift, ShiftAssignmentWithMember } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

type DialogState =
	| { type: null }
	| { type: 'station'; station?: Station }
	| { type: 'stationShift'; station: Station; stationShift?: StationShift }
	| { type: 'member'; member?: Member }
	| { type: 'preferences'; member: Member }
	| { type: 'autoAssign' };

interface ShiftPlanningViewProps {
	festivalId: string;
}

const ShiftPlanningView: React.FC<ShiftPlanningViewProps> = ({ festivalId }) => {
	const { toast } = useToast();
	const data = useShiftPlanningData(festivalId);
	const actions = useShiftPlanningActions(festivalId);

	const [isFullscreen, setIsFullscreen] = useState(false);
	const [nameFilter, setNameFilter] = useState('');
	const [stationFilter, setStationFilter] = useState('all');
	const [assignmentFilter, setAssignmentFilter] = useState('all');
	const [draggedMember, setDraggedMember] = useState<Member | null>(null);
	const [dialogState, setDialogState] = useState<DialogState>({ type: null });

	const getAssignmentsForStationShift = (stationShiftId: string): ShiftAssignmentWithMember[] => {
		return data.assignments.filter((a) => a.station_shift_id === stationShiftId);
	};

	const handleDrop = async (stationShiftId: string, e: React.DragEvent) => {
		e.preventDefault();
		if (!draggedMember) return;

		const stationShift = data.stationShifts.find((s) => s.id === stationShiftId);
		if (!stationShift) return;

		const currentAssignments = getAssignmentsForStationShift(stationShiftId);
		if (currentAssignments.length >= stationShift.required_people) {
			toast({
				title: 'Hinweis',
				description: 'Diese Schicht ist bereits vollständig besetzt.',
				variant: 'destructive'
			});
			setDraggedMember(null);
			return;
		}

		if (currentAssignments.some((a) => a.member_id === draggedMember.id)) {
			toast({
				title: 'Hinweis',
				description: `${draggedMember.first_name} ${draggedMember.last_name} ist bereits dieser Schicht zugewiesen.`,
				variant: 'destructive'
			});
			setDraggedMember(null);
			return;
		}

		const usedPositions = currentAssignments.map((a) => a.position).sort((a, b) => a - b);
		let nextPosition = 1;
		for (const pos of usedPositions) {
			if (nextPosition === pos) nextPosition++;
			else break;
		}

		actions.assignMember.mutate(
			{ stationShiftId, memberId: draggedMember.id, position: nextPosition },
			{
				onSuccess: () => {
					toast({
						title: 'Erfolg',
						description: `${draggedMember.first_name} ${draggedMember.last_name} wurde zugewiesen.`
					});
				}
			}
		);
		setDraggedMember(null);
	};

	const handleDropOnStation = async (stationId: string, e: React.DragEvent) => {
		e.preventDefault();
		if (!draggedMember) return;

		const station = data.stations.find((s) => s.id === stationId);
		if (!station) return;

		const currentStationMembers = data.stationMembers.filter(
			(sm) => sm.station_id === stationId
		);

		if (currentStationMembers.some((sm) => sm.member_id === draggedMember.id)) {
			toast({
				title: 'Hinweis',
				description: `${draggedMember.first_name} ${draggedMember.last_name} ist bereits dieser Station zugewiesen.`,
				variant: 'destructive'
			});
			setDraggedMember(null);
			return;
		}

		actions.assignMemberToStation.mutate(
			{ stationId, memberId: draggedMember.id },
			{
				onSuccess: () => {
					toast({
						title: 'Erfolg',
						description: `${draggedMember.first_name} ${draggedMember.last_name} wurde der Station zugewiesen.`
					});
				}
			}
		);
		setDraggedMember(null);
	};

	if (data.isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-lg">Lade Schichtplan...</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex flex-col',
				isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-screen'
			)}>
			<ShiftPlanningHeader
				isFullscreen={isFullscreen}
				onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
				onAddStation={() => setDialogState({ type: 'station' })}
				onAutoAssign={() => setDialogState({ type: 'autoAssign' })}
				onAddMember={() => setDialogState({ type: 'member' })}
			/>

			<div className="flex-1 flex overflow-hidden">
				<div className="flex-1 overflow-auto p-6">
					{data.stations.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center text-muted-foreground">
								<p>Erstellen Sie zuerst Stationen, um die Matrix zu sehen.</p>
							</div>
						</div>
					) : (
						<div className="space-y-6">
							{data.stations.map((station) => (
								<StationCard
									key={station.id}
									station={station}
									stationShifts={data.stationShifts.filter(
										(s) => s.station_id === station.id
									)}
									stationMembers={data.stationMembers.filter(
										(sm) => sm.station_id === station.id
									)}
									members={data.members}
									getAssignments={getAssignmentsForStationShift}
									onEditStation={() => setDialogState({ type: 'station', station })}
									onDeleteStation={() => {
										if (
											confirm(
												'Sind Sie sicher, dass Sie diese Station löschen möchten? Alle zugehörigen Schichten werden ebenfalls gelöscht.'
											)
										) {
											actions.deleteStation.mutate(station.id);
										}
									}}
									onAddShift={() => setDialogState({ type: 'stationShift', station })}
									onEditShift={(shift) =>
										setDialogState({ type: 'stationShift', station, stationShift: shift })
									}
									onDeleteShift={(shiftId) => {
										if (
											confirm('Sind Sie sicher, dass Sie diese Schicht löschen möchten?')
										) {
											actions.deleteStationShift.mutate(shiftId);
										}
									}}
									onRemoveMember={(stationShiftId, memberId) => {
										actions.removeMember.mutate({ stationShiftId, memberId });
									}}
									onDrop={handleDrop}
									onDropOnStation={handleDropOnStation}
									onRemoveStationMember={(stationId, memberId) => {
										actions.removeMemberFromStation.mutate({ stationId, memberId });
									}}
								/>
							))}
						</div>
					)}
				</div>

				<MemberSidebar
					members={data.members}
					stations={data.stations}
					stationShifts={data.stationShifts}
					assignments={data.assignments}
					stationMembers={data.stationMembers}
					stationPreferences={data.stationPreferences}
					shiftPreferences={data.shiftPreferences}
					nameFilter={nameFilter}
					stationFilter={stationFilter}
					assignmentFilter={assignmentFilter}
					onNameFilterChange={setNameFilter}
					onStationFilterChange={setStationFilter}
					onAssignmentFilterChange={setAssignmentFilter}
					onDragStart={setDraggedMember}
					onDragEnd={() => setDraggedMember(null)}
					onEditPreferences={(member) => setDialogState({ type: 'preferences', member })}
					onEditMember={(member) => setDialogState({ type: 'member', member })}
					onDeleteMember={(member) => {
						if (
							confirm(
								`Möchten Sie ${member.first_name} ${member.last_name} wirklich löschen?`
							)
						) {
							actions.deleteMember.mutate(member.id);
						}
					}}
				/>
			</div>

			{/* Dialogs */}
			<StationDialog
				open={dialogState.type === 'station'}
				onOpenChange={(open) => !open && setDialogState({ type: null })}
				station={dialogState.type === 'station' ? dialogState.station : null}
				members={data.members}
				onSave={(formData) => {
					if (dialogState.type === 'station' && dialogState.station) {
						actions.updateStation.mutate({
							id: dialogState.station.id,
							updates: formData
						});
					} else {
						actions.createStation.mutate({
							festival_id: festivalId,
							...formData
						});
					}
				}}
			/>

			<StationShiftDialog
				open={dialogState.type === 'stationShift'}
				onOpenChange={(open) => !open && setDialogState({ type: null })}
				stationShift={
					dialogState.type === 'stationShift' ? dialogState.stationShift : null
				}
				station={dialogState.type === 'stationShift' ? dialogState.station : null}
				onSave={(formData) => {
					if (dialogState.type === 'stationShift' && dialogState.stationShift) {
						actions.updateStationShift.mutate({
							id: dialogState.stationShift.id,
							updates: {
								name: formData.name,
								start_date: formData.start_date,
								start_time: formData.start_time,
								end_date: formData.end_date || null,
								end_time: formData.end_time,
								required_people: formData.required_people
							}
						});
					} else if (dialogState.type === 'stationShift') {
						actions.createStationShift.mutate({
							festival_id: festivalId,
							station_id: dialogState.station.id,
							...formData
						});
					}
				}}
			/>

			<MemberDialog
				open={dialogState.type === 'member'}
				onOpenChange={(open) => !open && setDialogState({ type: null })}
				member={dialogState.type === 'member' ? dialogState.member : null}
				onSave={(formData) => {
					if (dialogState.type === 'member' && dialogState.member) {
						actions.updateMember.mutate({ id: dialogState.member.id, updates: formData });
					} else {
						actions.createMember.mutate(formData);
					}
				}}
			/>

			<PreferenceDialog
				open={dialogState.type === 'preferences'}
				onOpenChange={(open) => !open && setDialogState({ type: null })}
				member={dialogState.type === 'preferences' ? dialogState.member : null}
				stations={data.stations}
				stationShifts={data.stationShifts}
				stationPreferences={data.stationPreferences}
				shiftPreferences={data.shiftPreferences}
				onSave={(memberId, stationPrefs, shiftPrefs) => {
					actions.savePreferences.mutate({ memberId, stationPrefs, shiftPrefs });
				}}
			/>

			<AutoAssignDialog
				open={dialogState.type === 'autoAssign'}
				onOpenChange={(open) => !open && setDialogState({ type: null })}
				onAssign={(config) => {
					if (
						data.stationShifts.length === 0 ||
						data.stations.length === 0 ||
						data.members.length === 0
					) {
						toast({
							title: 'Fehler',
							description:
								'Es müssen Schichten, Stationen und Mitglieder vorhanden sein.',
							variant: 'destructive'
						});
						return;
					}
					actions.autoAssign.mutate({
						stationShifts: data.stationShifts,
						stations: data.stations,
						members: data.members.filter((m) => m.is_active),
						config,
						stationPreferences: data.stationPreferences
					});
				}}
				onClear={() => actions.clearAssignments.mutate()}
				isLoading={actions.autoAssign.isPending}
			/>
		</div>
	);
};

export default ShiftPlanningView;
