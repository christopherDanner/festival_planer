import React, { useState, useEffect, useCallback } from 'react';
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
	UserPlus,
	UserMinus,
	Save,
	X,
	Zap,
	Settings,
	Heart,
	Star,
	FileSpreadsheet,
	ChevronLeft,
	ChevronRight,
	Maximize,
	Minimize
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
	getStations,
	createStation,
	updateStation,
	deleteStation,
	getStationShifts,
	getStationShiftsByStation,
	createStationShift,
	updateStationShift,
	deleteStationShift,
	assignMemberToShift,
	removeMemberFromShift,
	type Station,
	type StationShift
} from '@/lib/shiftService';
import {
	getMembers,
	updateMemberStationPreferences,
	updateMemberPreferences,
	getAllFestivalMemberPreferences,
	createMember,
	updateMember,
	deleteMember,
	type Member
} from '@/lib/memberService';
import { exportToExcel, type ExportData } from '@/lib/exportService';

interface StationShiftMatrixProps {
	festivalId: string;
}

interface StationShiftAssignment {
	id: string;
	festival_id: string;
	station_shift_id: string;
	member_id?: string;
	position: number;
	created_at: string;
	updated_at: string;
	member?: {
		id: string;
		first_name: string;
		last_name: string;
	};
}

const StationShiftMatrix: React.FC<StationShiftMatrixProps> = ({ festivalId }) => {
	const { toast } = useToast();
	const [stations, setStations] = useState<Station[]>([]);
	const [stationShifts, setStationShifts] = useState<StationShift[]>([]);
	const [assignments, setAssignments] = useState<StationShiftAssignment[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);

	// Dialog states
	const [showStationDialog, setShowStationDialog] = useState(false);
	const [showStationShiftDialog, setShowStationShiftDialog] = useState(false);
	const [showMemberDialog, setShowMemberDialog] = useState(false);
	const [showStationPreferenceDialog, setShowStationPreferenceDialog] = useState(false);
	const [selectedMemberForPreference, setSelectedMemberForPreference] = useState<Member | null>(
		null
	);
	const [selectedStation, setSelectedStation] = useState<Station | null>(null);

	// Form states
	const [stationForm, setStationForm] = useState({
		name: '',
		required_people: 1,
		description: ''
	});

	const [stationShiftForm, setStationShiftForm] = useState({
		name: '',
		start_date: '',
		start_time: '',
		end_date: '',
		end_time: '',
		required_people: 1
	});

	const [memberForm, setMemberForm] = useState({
		first_name: '',
		last_name: '',
		phone: '',
		email: '',
		notes: '',
		is_active: true
	});

	// Station and shift preferences state
	const [stationPreferences, setStationPreferences] = useState<Record<string, string[]>>({});

	// Member management state
	const [editingMember, setEditingMember] = useState<Member | null>(null);
	const [editingStation, setEditingStation] = useState<Station | null>(null);
	const [editingStationShift, setEditingStationShift] = useState<StationShift | null>(null);

	// Drag and drop state
	const [draggedMember, setDraggedMember] = useState<Member | null>(null);

	// Filter state
	const [nameFilter, setNameFilter] = useState('');
	const [stationFilter, setStationFilter] = useState<string>('all');

	// UI state
	const [isFullscreen, setIsFullscreen] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [stationsData, stationShiftsData, membersData] = await Promise.all([
				getStations(festivalId),
				getStationShifts(festivalId),
				getMembers()
			]);

			setStations(stationsData);
			setStationShifts(stationShiftsData);
			setMembers(membersData.filter((m) => m.is_active));

			// Load station preferences
			const stationPrefs = await getAllFestivalMemberPreferences(festivalId);
			setStationPreferences(stationPrefs);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Daten konnten nicht geladen werden.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [festivalId, toast]);

	useEffect(() => {
		loadData();
	}, [loadData]);

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

	const handleCreateStationShift = async () => {
		if (
			!stationShiftForm.name ||
			!stationShiftForm.start_date ||
			!stationShiftForm.start_time ||
			!stationShiftForm.end_time ||
			!selectedStation
		) {
			toast({
				title: 'Fehler',
				description: 'Bitte füllen Sie alle Pflichtfelder aus.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await createStationShift({
				festival_id: festivalId,
				station_id: selectedStation.id,
				...stationShiftForm
			});

			setStationShiftForm({
				name: '',
				start_date: '',
				start_time: '',
				end_date: '',
				end_time: '',
				required_people: 1
			});
			setShowStationShiftDialog(false);
			setSelectedStation(null);
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

	const getStationShiftsForStation = (stationId: string): StationShift[] => {
		return stationShifts.filter((shift) => shift.station_id === stationId);
	};

	const getAssignmentsForStationShift = (stationShiftId: string): StationShiftAssignment[] => {
		return assignments.filter((assignment) => assignment.station_shift_id === stationShiftId);
	};

	const getMemberAssignments = (memberId: string) => {
		return assignments.filter((a) => a.member_id === memberId);
	};

	const getMemberAvailability = (memberId: string): 'free' | 'partial' | 'full' => {
		const memberAssignments = getMemberAssignments(memberId);
		const totalShifts = stationShifts.length;
		const assignedShifts = memberAssignments.length;

		if (assignedShifts === 0) return 'free';
		if (assignedShifts < totalShifts) return 'partial';
		return 'full';
	};

	const getFilteredMembers = () => {
		return members.filter((member) => {
			// Name filter
			if (
				nameFilter &&
				!`${member.first_name} ${member.last_name}`.toLowerCase().includes(nameFilter.toLowerCase())
			) {
				return false;
			}

			// Station filter
			if (stationFilter !== 'all') {
				const memberStationPrefs = getMemberStationPreferences(member.id);
				if (!memberStationPrefs.includes(stationFilter)) {
					return false;
				}
			}

			return true;
		});
	};

	const getMemberStationPreferences = (memberId: string): string[] => {
		return stationPreferences[memberId] || [];
	};

	const handleDragStart = (member: Member) => {
		setDraggedMember(member);
	};

	const handleDragEnd = () => {
		setDraggedMember(null);
	};

	const handleDrop = async (stationShiftId: string, e: React.DragEvent) => {
		e.preventDefault();

		if (!draggedMember) return;

		try {
			const stationShift = stationShifts.find((shift) => shift.id === stationShiftId);
			if (!stationShift) return;

			const currentAssignments = getAssignmentsForStationShift(stationShiftId);
			if (currentAssignments.length >= stationShift.required_people) {
				toast({
					title: 'Hinweis',
					description: 'Diese Schicht ist bereits vollständig besetzt.',
					variant: 'destructive'
				});
				return;
			}

			// Check if member is already assigned to this station shift
			const isAlreadyAssigned = currentAssignments.some(
				(assignment) => assignment.member_id === draggedMember.id
			);
			if (isAlreadyAssigned) {
				toast({
					title: 'Hinweis',
					description: `${draggedMember.first_name} ${draggedMember.last_name} ist bereits dieser Schicht zugewiesen.`,
					variant: 'destructive'
				});
				return;
			}

			// Find the next available position
			const usedPositions = currentAssignments.map((a) => a.position).sort((a, b) => a - b);
			let nextPosition = 1;
			for (const pos of usedPositions) {
				if (nextPosition === pos) {
					nextPosition++;
				} else {
					break;
				}
			}

			// TODO: Implement assignMemberToStationShift function
			// await assignMemberToStationShift(festivalId, stationShiftId, draggedMember.id, nextPosition);
			loadData();

			toast({
				title: 'Erfolg',
				description: `${draggedMember.first_name} ${draggedMember.last_name} wurde zugewiesen.`
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht erstellt werden.',
				variant: 'destructive'
			});
		}

		setDraggedMember(null);
	};

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

	if (loading) {
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
			{/* Header with controls */}
			<div className="flex items-center justify-between p-6 border-b bg-background">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<Calendar className="h-6 w-6" />
						Station-spezifische Schichtplan Matrix
					</h2>
					<p className="text-muted-foreground">
						Jede Station kann ihre eigenen Schichten mit unterschiedlichen Zeiten haben.
					</p>
				</div>

				<div className="flex gap-2 items-center">
					<div className="h-8 w-px bg-border mx-2"></div>

					{/* Fullscreen toggle */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsFullscreen(!isFullscreen)}
						className="flex items-center gap-2">
						{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
						{isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
					</Button>

					<div className="h-8 w-px bg-border mx-2"></div>

					{/* Station management buttons */}
					<Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm">
								<MapPin className="h-4 w-4 mr-2" />
								Station hinzufügen
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
										onChange={(e) => setStationForm((prev) => ({ ...prev, name: e.target.value }))}
										placeholder="z.B. Grill, Kassa, Bar"
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
											setStationForm((prev) => ({
												...prev,
												required_people: parseInt(e.target.value) || 1
											}))
										}
									/>
								</div>
								<div>
									<Label htmlFor="station-description">Beschreibung (optional)</Label>
									<Textarea
										id="station-description"
										value={stationForm.description}
										onChange={(e) =>
											setStationForm((prev) => ({ ...prev, description: e.target.value }))
										}
										placeholder="Zusätzliche Informationen..."
										rows={3}
									/>
								</div>
								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => setShowStationDialog(false)}>
										Abbrechen
									</Button>
									<Button onClick={handleCreateStation}>Erstellen</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

					<div className="h-8 w-px bg-border mx-2"></div>

					{/* Member management buttons */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setEditingMember(null);
							setMemberForm({
								first_name: '',
								last_name: '',
								phone: '',
								email: '',
								notes: '',
								is_active: true
							});
							setShowMemberDialog(true);
						}}
						className="flex items-center gap-2">
						<UserPlus className="h-4 w-4" />
						Mitglied hinzufügen
					</Button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Side - Stations and their shifts */}
				<div className="flex-1 overflow-auto p-6">
					{stations.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center text-muted-foreground">
								<p>Erstellen Sie zuerst Stationen, um die Matrix zu sehen.</p>
							</div>
						</div>
					) : (
						<div className="space-y-6">
							{stations.map((station) => {
								const stationShiftsForStation = getStationShiftsForStation(station.id);

								return (
									<Card key={station.id} className="w-full">
										<CardHeader>
											<CardTitle className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<MapPin className="h-5 w-5" />
													{station.name}
													<Badge variant="outline">{station.required_people} Personen</Badge>
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setSelectedStation(station);
															setStationShiftForm({
																name: '',
																start_date: '',
																start_time: '',
																end_date: '',
																end_time: '',
																required_people: station.required_people
															});
															setShowStationShiftDialog(true);
														}}>
														<Plus className="h-4 w-4 mr-2" />
														Schicht hinzufügen
													</Button>
												</div>
											</CardTitle>
											{station.description && (
												<p className="text-sm text-muted-foreground">{station.description}</p>
											)}
										</CardHeader>
										<CardContent>
											{stationShiftsForStation.length === 0 ? (
												<div className="text-center text-muted-foreground py-8">
													<p>Keine Schichten für diese Station.</p>
													<p className="text-sm">
														Klicken Sie auf "Schicht hinzufügen" um eine Schicht zu erstellen.
													</p>
												</div>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													{stationShiftsForStation.map((stationShift) => {
														const shiftAssignments = getAssignmentsForStationShift(stationShift.id);
														const remaining =
															stationShift.required_people - shiftAssignments.length;

														return (
															<Card key={stationShift.id} className="border-2">
																<CardHeader className="pb-2">
																	<CardTitle className="text-lg flex items-center justify-between">
																		{stationShift.name}
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
																	</CardTitle>
																	<p className="text-sm text-muted-foreground">
																		{formatStationShiftTime(stationShift)}
																	</p>
																</CardHeader>
																<CardContent>
																	<div
																		className="min-h-[100px] border-2 border-dashed border-muted rounded-lg p-3 space-y-2"
																		onDragOver={(e) => e.preventDefault()}
																		onDrop={(e) => handleDrop(stationShift.id, e)}>
																		{shiftAssignments.length > 0 ? (
																			<div className="space-y-1">
																				{shiftAssignments.map((assignment) => (
																					<div
																						key={assignment.id}
																						className="flex items-center justify-between bg-background rounded px-2 py-1 text-sm">
																						<span className="font-medium">
																							{assignment.member?.first_name}{' '}
																							{assignment.member?.last_name}
																						</span>
																						<Button
																							size="sm"
																							variant="ghost"
																							className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
																							onClick={() => {
																								// TODO: Implement removeMemberFromStationShift
																								// handleRemoveMember(stationShift.id, assignment.member_id!);
																							}}>
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
													})}
												</div>
											)}
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</div>

				{/* Right Side - Members List */}
				<div className="w-80 border-l bg-muted/20 flex flex-col">
					<div className="p-4 border-b bg-background">
						<h3 className="font-semibold flex items-center gap-2">
							<Users className="h-4 w-4" />
							Mitglieder ({getFilteredMembers().length})
						</h3>

						{/* Name Filter */}
						<div className="mt-3">
							<Input
								placeholder="Nach Namen suchen..."
								value={nameFilter}
								onChange={(e) => setNameFilter(e.target.value)}
								className="text-xs h-8"
							/>
						</div>

						{/* Station Filter */}
						<div className="mt-3">
							<Select value={stationFilter} onValueChange={setStationFilter}>
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
						{getFilteredMembers().map((member) => {
							const memberAssignments = getMemberAssignments(member.id);
							const availability = getMemberAvailability(member.id);

							return (
								<div
									key={member.id}
									className={cn(
										'p-3 rounded-lg border cursor-move hover:bg-accent/50 transition-colors',
										availability === 'free' && 'bg-red-50 border-red-200',
										availability === 'partial' && 'bg-yellow-50 border-yellow-200',
										availability === 'full' && 'bg-green-50 border-green-200'
									)}
									draggable
									onDragStart={() => handleDragStart(member)}
									onDragEnd={handleDragEnd}>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="font-medium text-sm">
												{member.first_name} {member.last_name}
											</span>
											<Badge
												variant={
													availability === 'free'
														? 'destructive'
														: availability === 'partial'
														? 'secondary'
														: 'default'
												}
												className="text-xs">
												{memberAssignments.length}/{stationShifts.length}
											</Badge>
										</div>

										{memberAssignments.length > 0 && (
											<div className="text-xs text-muted-foreground">
												{memberAssignments.map((assignment, index) => {
													const stationShift = stationShifts.find(
														(shift) => shift.id === assignment.station_shift_id
													);
													if (!stationShift) return null;

													return (
														<div key={assignment.id} className="flex items-center gap-1">
															<Badge variant="secondary" className="text-xs">
																{stationShift.name}
															</Badge>
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Station Shift Dialog */}
			<Dialog open={showStationShiftDialog} onOpenChange={setShowStationShiftDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Neue Schicht für {selectedStation?.name} erstellen</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="shift-name">Name</Label>
							<Input
								id="shift-name"
								value={stationShiftForm.name}
								onChange={(e) => setStationShiftForm((prev) => ({ ...prev, name: e.target.value }))}
								placeholder="z.B. Frühschicht, Spätschicht"
							/>
						</div>
						<div>
							<Label htmlFor="shift-date">Datum</Label>
							<Input
								id="shift-date"
								type="date"
								value={stationShiftForm.start_date}
								onChange={(e) =>
									setStationShiftForm((prev) => ({ ...prev, start_date: e.target.value }))
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="start-time">Von</Label>
								<Input
									id="start-time"
									type="time"
									value={stationShiftForm.start_time}
									onChange={(e) =>
										setStationShiftForm((prev) => ({ ...prev, start_time: e.target.value }))
									}
								/>
							</div>
							<div>
								<Label htmlFor="end-time">Bis</Label>
								<Input
									id="end-time"
									type="time"
									value={stationShiftForm.end_time}
									onChange={(e) =>
										setStationShiftForm((prev) => ({ ...prev, end_time: e.target.value }))
									}
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="end-date">
								Enddatum (optional - für tagesübergreifende Schichten)
							</Label>
							<Input
								id="end-date"
								type="date"
								value={stationShiftForm.end_date}
								onChange={(e) =>
									setStationShiftForm((prev) => ({ ...prev, end_date: e.target.value }))
								}
							/>
						</div>

						<div>
							<Label htmlFor="required-people">Benötigte Personen</Label>
							<Input
								id="required-people"
								type="number"
								min="1"
								value={stationShiftForm.required_people}
								onChange={(e) =>
									setStationShiftForm((prev) => ({
										...prev,
										required_people: parseInt(e.target.value) || 1
									}))
								}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setShowStationShiftDialog(false)}>
								Abbrechen
							</Button>
							<Button onClick={handleCreateStationShift}>Erstellen</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default StationShiftMatrix;
