import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	Plus,
	Calendar,
	Clock,
	MapPin,
	Users,
	Trash2,
	Edit,
	Filter,
	X,
	Zap,
	Settings,
	Heart,
	Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
	getStationShifts,
	getStations,
	getShiftAssignments,
	createStationShift,
	createStation,
	assignMemberToStationShift,
	removeMemberFromStationShift,
	type StationShift,
	type Station,
	type ShiftAssignmentWithMember
} from '@/lib/shiftService';
import { getMembers, updateMemberStationPreferences, type Member } from '@/lib/memberService';
import {
	performAutomaticAssignment,
	clearAllAssignments,
	type AutoAssignmentConfig,
	type AssignmentResult
} from '@/lib/automaticAssignmentService';

interface ShiftMatrixProps {
	festivalId: string;
}

const ShiftMatrix: React.FC<ShiftMatrixProps> = ({ festivalId }) => {
	const { toast } = useToast();
	const [stationShifts, setStationShifts] = useState<StationShift[]>([]);
	const [stations, setStations] = useState<Station[]>([]);
	const [assignments, setAssignments] = useState<ShiftAssignmentWithMember[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);

	// Dialog states
	const [showShiftDialog, setShowShiftDialog] = useState(false);
	const [showStationDialog, setShowStationDialog] = useState(false);
	const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
	const [showStationPreferenceDialog, setShowStationPreferenceDialog] = useState(false);
	const [selectedMemberForPreference, setSelectedMemberForPreference] = useState<Member | null>(
		null
	);
	const [selectedStationForShift, setSelectedStationForShift] = useState<Station | null>(null);
	const [autoAssignLoading, setAutoAssignLoading] = useState(false);

	// Form states
	const [shiftForm, setShiftForm] = useState({
		name: '',
		start_date: '',
		start_time: '',
		end_time: ''
	});

	const [stationForm, setStationForm] = useState({
		name: '',
		required_people: 1,
		description: ''
	});

	const [autoAssignConfig, setAutoAssignConfig] = useState<AutoAssignmentConfig>({
		minShiftsPerMember: 1,
		maxShiftsPerMember: 3,
		respectPreferences: true
	});

	// Station preferences state
	const [stationPreferences, setStationPreferences] = useState<Record<string, string[]>>({});

	// Drag and drop state
	const [draggedMember, setDraggedMember] = useState<Member | null>(null);

	// Filter state
	const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'free' | 'partial' | 'full'>(
		'all'
	);

	useEffect(() => {
		loadData();
	}, [festivalId]);

	const loadData = async () => {
		try {
			const [stationShiftsData, stationsData, assignmentsData, membersData] = await Promise.all([
				getStationShifts(festivalId),
				getStations(festivalId),
				getShiftAssignments(festivalId),
				getMembers()
			]);

			setStationShifts(stationShiftsData.map(s => ({
				id: s.id,
				station_id: s.station_id,
				festival_id: s.festival_id,
				name: s.name,
				start_date: s.start_date,
				start_time: s.start_time,
				end_time: s.end_time,
				created_at: s.created_at,
				updated_at: s.updated_at
			})));
			setStations(stationsData);
			setAssignments(assignmentsData);
			setMembers(membersData.filter((m) => m.is_active));

			// Load station preferences from member data
			const preferences: Record<string, string[]> = {};
			membersData.forEach((member) => {
				if (member.station_preferences && member.station_preferences.length > 0) {
					preferences[member.id] = member.station_preferences;
				}
			});
			setStationPreferences(preferences);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Daten konnten nicht geladen werden.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	};

	const handleCreateShift = async () => {
		if (!shiftForm.name || !shiftForm.start_date || !shiftForm.start_time || !shiftForm.end_time || !selectedStationForShift) {
			toast({
				title: 'Fehler',
				description: 'Bitte füllen Sie alle Felder aus und wählen Sie eine Station.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await createStationShift({
				station_id: selectedStationForShift.id,
				festival_id: festivalId,
				...shiftForm
			});

			setShiftForm({ name: '', start_date: '', start_time: '', end_time: '' });
			setSelectedStationForShift(null);
			setShowShiftDialog(false);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Schicht wurde erstellt.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}
	};

	const handleCreateStation = async () => {
		if (!stationForm.name) {
			toast({
				title: 'Fehler',
				description: 'Bitte geben Sie einen Namen ein.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await createStation({
				festival_id: festivalId,
				...stationForm
			});

			setStationForm({ name: '', required_people: 1, description: '' });
			setShowStationDialog(false);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Station wurde erstellt.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}
	};

	const handleDrop = async (stationShiftId: string, memberId: string) => {
		if (!draggedMember) return;

		try {
			const position = 
				assignments.filter((a) => a.station_shift_id === stationShiftId && a.member_id).length + 1;

			await assignMemberToStationShift(festivalId, stationShiftId, memberId, position);
			loadData();

			toast({
				title: 'Erfolg',
				description: `${draggedMember.first_name} ${draggedMember.last_name} wurde zugewiesen.`
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisung fehlgeschlagen.',
				variant: 'destructive'
			});
		} finally {
			setDraggedMember(null);
		}
	};

	const handleRemoveMember = async (stationShiftId: string, memberId: string) => {
		try {
			await removeMemberFromStationShift(festivalId, stationShiftId, memberId);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Mitglied wurde entfernt.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Entfernung fehlgeschlagen.',
				variant: 'destructive'
			});
		}
	};

	const handleAutoAssign = async () => {
		try {
			setAutoAssignLoading(true);
			const result = await performAutomaticAssignment(
				festivalId,
				stationShifts,
				stations,
				members,
				autoAssignConfig,
				stationPreferences
			);

			if (result.success) {
				loadData();
				setShowAutoAssignDialog(false);

				toast({
					title: 'Automatische Zuweisung abgeschlossen',
					description: `${result.assignmentsCreated} Zuweisungen erstellt.`
				});
			}
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Automatische Zuweisung fehlgeschlagen.',
				variant: 'destructive'
			});
		} finally {
			setAutoAssignLoading(false);
		}
	};

	const handleClearAssignments = async () => {
		try {
			const success = await clearAllAssignments(festivalId);
			if (success) {
				loadData();
				toast({
					title: 'Erfolg',
					description: 'Alle Zuweisungen wurden entfernt.'
				});
			}
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisungen konnten nicht entfernt werden.',
				variant: 'destructive'
			});
		}
	};

	const handleUpdateMemberPreferences = async (memberId: string, preferences: string[]) => {
		try {
			await updateMemberStationPreferences(memberId, preferences);
			
			// Update local state
			setStationPreferences(prev => ({
				...prev,
				[memberId]: preferences
			}));

			toast({
				title: 'Erfolg',
				description: 'Präferenzen wurden aktualisiert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Präferenzen konnten nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	};

	const getStationShiftsForStation = (stationId: string) => {
		return stationShifts.filter(shift => shift.station_id === stationId);
	};

	const getAssignmentsForStationShift = (stationShiftId: string) => {
		return assignments.filter(a => a.station_shift_id === stationShiftId);
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center py-8">Lade Schichtplan...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with controls */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold">Schichtplan</h2>
					<p className="text-muted-foreground">
						Verwalten Sie Schichten und weisen Sie Mitglieder zu Stationen zu.
					</p>
				</div>
				<div className="flex gap-2">
					<Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Station
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Neue Station erstellen</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div>
									<Label htmlFor="station-name">Name</Label>
									<Input
										id="station-name"
										value={stationForm.name}
										onChange={(e) =>
											setStationForm({ ...stationForm, name: e.target.value })
										}
										placeholder="z.B. Eingang, Bar, Küche"
									/>
								</div>
								<div>
									<Label htmlFor="required-people">Benötigte Personen</Label>
									<Input
										id="required-people"
										type="number"
										min="1"
										value={stationForm.required_people}
										onChange={(e) =>
											setStationForm({
												...stationForm,
												required_people: parseInt(e.target.value) || 1
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="station-description">Beschreibung (optional)</Label>
									<Textarea
										id="station-description"
										value={stationForm.description}
										onChange={(e) =>
											setStationForm({ ...stationForm, description: e.target.value })
										}
										placeholder="Zusätzliche Informationen..."
									/>
								</div>
								<div className="flex gap-2 justify-end">
									<Button
										variant="outline"
										onClick={() => setShowStationDialog(false)}
									>
										Abbrechen
									</Button>
									<Button onClick={handleCreateStation}>Erstellen</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

					<Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
						<DialogTrigger asChild>
							<Button variant="default" size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Schicht
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>Neue Schicht erstellen</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div>
									<Label htmlFor="shift-station">Station</Label>
									<Select 
										value={selectedStationForShift?.id || ''} 
										onValueChange={(stationId) => {
											const station = stations.find(s => s.id === stationId);
											setSelectedStationForShift(station || null);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Station auswählen" />
										</SelectTrigger>
										<SelectContent>
											{stations.map((station) => (
												<SelectItem key={station.id} value={station.id}>
													{station.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="shift-name">Name</Label>
									<Input
										id="shift-name"
										value={shiftForm.name}
										onChange={(e) =>
											setShiftForm({ ...shiftForm, name: e.target.value })
										}
										placeholder="z.B. Frühschicht, Spätschicht"
									/>
								</div>
								<div>
									<Label htmlFor="shift-date">Datum</Label>
									<Input
										id="shift-date"
										type="date"
										value={shiftForm.start_date}
										onChange={(e) =>
											setShiftForm({ ...shiftForm, start_date: e.target.value })
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<Label htmlFor="start-time">Startzeit</Label>
										<Input
											id="start-time"
											type="time"
											value={shiftForm.start_time}
											onChange={(e) =>
												setShiftForm({ ...shiftForm, start_time: e.target.value })
											}
										/>
									</div>
									<div>
										<Label htmlFor="end-time">Endzeit</Label>
										<Input
											id="end-time"
											type="time"
											value={shiftForm.end_time}
											onChange={(e) =>
												setShiftForm({ ...shiftForm, end_time: e.target.value })
											}
										/>
									</div>
								</div>
								<div className="flex gap-2 justify-end">
									<Button
										variant="outline"
										onClick={() => setShowShiftDialog(false)}
									>
										Abbrechen
									</Button>
									<Button onClick={handleCreateShift}>Erstellen</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

					<Dialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
						<DialogTrigger asChild>
							<Button variant="secondary" size="sm">
								<Zap className="h-4 w-4 mr-2" />
								Auto-Zuweisung
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Automatische Zuweisung</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label>Min. Schichten pro Person</Label>
										<Input
											type="number"
											min="0"
											value={autoAssignConfig.minShiftsPerMember}
											onChange={(e) =>
												setAutoAssignConfig({
													...autoAssignConfig,
													minShiftsPerMember: parseInt(e.target.value) || 0
												})
											}
										/>
									</div>
									<div>
										<Label>Max. Schichten pro Person</Label>
										<Input
											type="number"
											min="1"
											value={autoAssignConfig.maxShiftsPerMember}
											onChange={(e) =>
												setAutoAssignConfig({
													...autoAssignConfig,
													maxShiftsPerMember: parseInt(e.target.value) || 1
												})
											}
										/>
									</div>
								</div>
								<div className="flex gap-2 justify-end">
									<Button
										variant="outline"
										onClick={() => setShowAutoAssignDialog(false)}
									>
										Abbrechen
									</Button>
									<Button 
										variant="outline" 
										onClick={handleClearAssignments}
									>
										Alle löschen
									</Button>
									<Button 
										onClick={handleAutoAssign} 
										disabled={autoAssignLoading}
									>
										{autoAssignLoading ? 'Zuweisen...' : 'Zuweisen'}
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Members sidebar */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<div className="lg:col-span-1 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<Users className="h-5 w-5" />
								Mitglieder ({members.length})
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 max-h-96 overflow-y-auto">
							{members.map((member) => (
								<div
									key={member.id}
									draggable
									onDragStart={() => setDraggedMember(member)}
									onDragEnd={() => setDraggedMember(null)}
									className={cn(
										'p-2 rounded border cursor-move hover:bg-muted/50 transition-colors',
										stationPreferences[member.id]?.length > 0 && 'border-primary/50'
									)}
								>
									<div className="font-medium text-sm">
										{member.first_name} {member.last_name}
									</div>
									{stationPreferences[member.id]?.length > 0 && (
										<div className="flex items-center gap-1 mt-1">
											<Heart className="h-3 w-3 text-primary" />
											<div className="text-xs text-muted-foreground">
												{stationPreferences[member.id].length} Präferenzen
											</div>
										</div>
									)}
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				{/* Station shifts matrix */}
				<div className="lg:col-span-3">
					<Card>
						<CardHeader>
							<CardTitle>Schichtplan nach Stationen</CardTitle>
						</CardHeader>
						{stations.length === 0 ? (
							<CardContent>
								<div className="text-center py-8 text-muted-foreground">
									Keine Stationen vorhanden. Erstellen Sie zunächst eine Station.
								</div>
							</CardContent>
						) : (
							<CardContent className="p-0">
								<div className="space-y-6 p-6">
									{stations.map((station) => {
										const stationShiftsForStation = getStationShiftsForStation(station.id);
										
										return (
											<div key={station.id} className="border rounded-lg p-4">
												<div className="flex items-center justify-between mb-4">
													<div>
														<h3 className="font-semibold text-lg">{station.name}</h3>
														<p className="text-sm text-muted-foreground">
															{station.required_people} Personen benötigt
														</p>
													</div>
													<Badge variant="outline">
														{stationShiftsForStation.length} Schichten
													</Badge>
												</div>
												
												{stationShiftsForStation.length === 0 ? (
													<div className="text-center py-8 text-muted-foreground">
														Keine Schichten für diese Station vorhanden.
													</div>
												) : (
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
														{stationShiftsForStation.map((stationShift) => {
															const shiftAssignments = getAssignmentsForStationShift(stationShift.id);
															const filledSlots = shiftAssignments.filter(a => a.member_id).length;
															
															return (
																<div
																	key={stationShift.id}
																	className="border rounded p-3 bg-card"
																	onDrop={(e) => {
																		e.preventDefault();
																		if (draggedMember) {
																			handleDrop(stationShift.id, draggedMember.id);
																		}
																	}}
																	onDragOver={(e) => e.preventDefault()}
																>
																	<div className="mb-2">
																		<div className="font-medium">{stationShift.name}</div>
																		<div className="text-xs text-muted-foreground flex items-center gap-2">
																			<Calendar className="h-3 w-3" />
																			{stationShift.start_date}
																		</div>
																		<div className="text-xs text-muted-foreground flex items-center gap-2">
																			<Clock className="h-3 w-3" />
																			{stationShift.start_time} - {stationShift.end_time}
																		</div>
																	</div>
																	
																	<div className="space-y-1">
																		{Array.from({ length: station.required_people }).map((_, index) => {
																			const assignment = shiftAssignments.find(a => a.position === index + 1);
																			const member = assignment?.member;
																			
																			return (
																				<div
																					key={index}
																					className={cn(
																						'p-2 rounded text-xs border-2 border-dashed min-h-[2rem] flex items-center',
																						member 
																							? 'border-primary bg-primary/5 text-foreground' 
																							: 'border-muted-foreground/20 bg-muted/20'
																					)}
																				>
																					{member ? (
																						<div className="flex items-center justify-between w-full">
																							<span>
																								{member.first_name} {member.last_name}
																							</span>
																							<Button
																								size="sm"
																								variant="ghost"
																								className="h-4 w-4 p-0"
																								onClick={() => handleRemoveMember(stationShift.id, member.id)}
																							>
																								<X className="h-3 w-3" />
																							</Button>
																						</div>
																					) : (
																						<span className="text-muted-foreground">
																							Position {index + 1}
																						</span>
																					)}
																				</div>
																			);
																		})}
																	</div>
																	
																	<div className="mt-2 flex items-center gap-2">
																		<Badge
																			variant={filledSlots === station.required_people ? 'default' : 'secondary'}
																			className="text-xs"
																		>
																			{filledSlots}/{station.required_people}
																		</Badge>
																	</div>
																</div>
															);
														})}
													</div>
												)}
											</div>
										);
									})}
								</div>
							</CardContent>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
};

export default ShiftMatrix;