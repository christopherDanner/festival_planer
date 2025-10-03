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
import { supabase } from '@/integrations/supabase/client';
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
	getShiftAssignments,
	assignMemberToShift,
	removeMemberFromShift,
	assignMemberToStationShift,
	removeMemberFromStationShift,
	type Station,
	type StationShift,
	type ShiftAssignmentWithMember
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
import {
	performAutomaticAssignment,
	clearAllAssignments,
	type AutoAssignmentConfig,
	type AssignmentResult
} from '@/lib/automaticAssignmentService';

interface StationShiftMatrixProps {
	festivalId: string;
}

// We'll use the existing ShiftAssignmentWithMember type

const StationShiftMatrix: React.FC<StationShiftMatrixProps> = ({ festivalId }) => {
	const { toast } = useToast();
	const [stations, setStations] = useState<Station[]>([]);
	const [stationShifts, setStationShifts] = useState<StationShift[]>([]);
	const [assignments, setAssignments] = useState<ShiftAssignmentWithMember[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);

	// Dialog states
	const [showStationDialog, setShowStationDialog] = useState(false);
	const [showStationShiftDialog, setShowStationShiftDialog] = useState(false);
	const [showMemberDialog, setShowMemberDialog] = useState(false);
	const [showStationPreferenceDialog, setShowStationPreferenceDialog] = useState(false);
	const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
	const [selectedMemberForPreference, setSelectedMemberForPreference] = useState<Member | null>(
		null
	);
	const [selectedStation, setSelectedStation] = useState<Station | null>(null);
	const [selectedStationShift, setSelectedStationShift] = useState<StationShift | null>(null);
	const [autoAssignLoading, setAutoAssignLoading] = useState(false);

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

	const [autoAssignConfig, setAutoAssignConfig] = useState<AutoAssignmentConfig>({
		minShiftsPerMember: 1,
		maxShiftsPerMember: 3,
		respectPreferences: true
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
			const [stationsData, stationShiftsData, assignmentsData, membersData] = await Promise.all([
				getStations(festivalId),
				getStationShifts(festivalId),
				getShiftAssignments(festivalId),
				getMembers()
			]);

			setStations(stationsData);
			setStationShifts(stationShiftsData);
			setAssignments(assignmentsData);
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

	const handleUpdateStation = async () => {
		if (!selectedStation) return;

		if (!stationForm.name) {
			toast({
				title: 'Fehler',
				description: 'Bitte geben Sie einen Namen ein.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await updateStation(selectedStation.id, {
				name: stationForm.name,
				required_people: stationForm.required_people,
				description: stationForm.description
			});

			setStationForm({
				name: '',
				required_people: 1,
				description: ''
			});
			setShowStationDialog(false);
			setSelectedStation(null);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Station wurde aktualisiert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht aktualisiert werden.',
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

	const handleUpdateStationShift = async () => {
		if (!selectedStationShift) return;

		if (
			!stationShiftForm.name ||
			!stationShiftForm.start_date ||
			!stationShiftForm.start_time ||
			!stationShiftForm.end_time
		) {
			toast({
				title: 'Fehler',
				description: 'Bitte füllen Sie alle Pflichtfelder aus.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await updateStationShift(selectedStationShift.id, {
				name: stationShiftForm.name,
				start_date: stationShiftForm.start_date,
				start_time: stationShiftForm.start_time,
				end_date: stationShiftForm.end_date || null,
				end_time: stationShiftForm.end_time,
				required_people: stationShiftForm.required_people
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
			setSelectedStationShift(null);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Schicht wurde aktualisiert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	};

	const getStationShiftsForStation = (stationId: string): StationShift[] => {
		return stationShifts.filter((shift) => shift.station_id === stationId);
	};

	const getAssignmentsForStationShift = (stationShiftId: string): ShiftAssignmentWithMember[] => {
		// For now, we'll use the shift_id to match station shifts
		// This is a temporary solution until we fully migrate to station shifts
		return assignments.filter((assignment) => assignment.shift_id === stationShiftId);
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

	// Station preference functions
	const handleSaveStationPreference = async (memberId: string, preferredStations: string[]) => {
		try {
			// Save to database
			await updateMemberStationPreferences(festivalId, memberId, preferredStations);

			// Update local state
			setStationPreferences((prev) => ({
				...prev,
				[memberId]: preferredStations
			}));

			toast({
				title: 'Stationswünsche gespeichert',
				description: 'Die Stationswünsche wurden erfolgreich gespeichert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Stationswünsche konnten nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	};

	// Temporary preferences for dialog editing
	const [tempStationPreferences, setTempStationPreferences] = useState<Record<string, string[]>>(
		{}
	);

	const handleToggleStationPreference = (memberId: string, stationId: string) => {
		const currentPreferences =
			tempStationPreferences[memberId] || getMemberStationPreferences(memberId);
		const isSelected = currentPreferences.includes(stationId);
		const newPreferences = isSelected
			? currentPreferences.filter((id) => id !== stationId)
			: [...currentPreferences, stationId];

		setTempStationPreferences((prev) => ({
			...prev,
			[memberId]: newPreferences
		}));
	};

	const handleOpenStationPreferenceDialog = (member: Member) => {
		setSelectedMemberForPreference(member);
		// Initialize temp preferences with current preferences
		setTempStationPreferences((prev) => ({
			...prev,
			[member.id]: getMemberStationPreferences(member.id)
		}));
		setShowStationPreferenceDialog(true);
	};

	const handleSaveStationPreferencesFromDialog = async () => {
		if (!selectedMemberForPreference) return;

		const stationPrefs = tempStationPreferences[selectedMemberForPreference.id] || [];

		try {
			await updateMemberStationPreferences(
				festivalId,
				selectedMemberForPreference.id,
				stationPrefs
			);

			// Update local state
			setStationPreferences((prev) => ({
				...prev,
				[selectedMemberForPreference.id]: stationPrefs
			}));

			toast({
				title: 'Präferenzen gespeichert',
				description: 'Stationswünsche wurden erfolgreich gespeichert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Präferenzen konnten nicht gespeichert werden.',
				variant: 'destructive'
			});
		}

		setShowStationPreferenceDialog(false);
		setSelectedMemberForPreference(null);
	};

	// Member management functions
	const handleAddMember = () => {
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
	};

	const handleEditMember = (member: Member) => {
		setEditingMember(member);
		setMemberForm({
			first_name: member.first_name,
			last_name: member.last_name,
			phone: member.phone || '',
			email: member.email || '',
			notes: member.notes || '',
			is_active: member.is_active
		});
		setShowMemberDialog(true);
	};

	const handleSaveMember = async () => {
		try {
			if (editingMember) {
				// Update existing member
				await updateMember(editingMember.id, memberForm);
				toast({
					title: 'Mitglied aktualisiert',
					description: `${memberForm.first_name} ${memberForm.last_name} wurde erfolgreich aktualisiert.`
				});
			} else {
				// Create new member
				await createMember(memberForm);
				toast({
					title: 'Mitglied hinzugefügt',
					description: `${memberForm.first_name} ${memberForm.last_name} wurde erfolgreich hinzugefügt.`
				});
			}

			await loadData(); // Refresh data
			setShowMemberDialog(false);
			setEditingMember(null);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht gespeichert werden.',
				variant: 'destructive'
			});
		}
	};

	const handleDeleteMember = async (member: Member) => {
		if (!confirm(`Möchten Sie ${member.first_name} ${member.last_name} wirklich löschen?`)) {
			return;
		}

		try {
			await deleteMember(member.id);
			toast({
				title: 'Mitglied gelöscht',
				description: `${member.first_name} ${member.last_name} wurde erfolgreich gelöscht.`
			});
			await loadData(); // Refresh data
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Mitglied konnte nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
	};

	const handleAutomaticAssignment = async () => {
		if (stationShifts.length === 0 || stations.length === 0 || members.length === 0) {
			toast({
				title: 'Fehler',
				description: 'Es müssen Schichten, Stationen und Mitglieder vorhanden sein.',
				variant: 'destructive'
			});
			return;
		}

		setAutoAssignLoading(true);

		try {
			// Convert station shifts to regular shifts for the automatic assignment
			const regularShifts = stationShifts.map((shift) => ({
				id: shift.id,
				festival_id: shift.festival_id,
				name: shift.name,
				start_date: shift.start_date,
				start_time: shift.start_time,
				end_time: shift.end_time,
				created_at: shift.created_at,
				updated_at: shift.updated_at
			}));

			// Create station-shift assignments for the automatic assignment
			const stationShiftAssignments = stationShifts.map((shift) => ({
				station_id: shift.station_id,
				shift_id: shift.id
			}));

			const result: AssignmentResult = await performAutomaticAssignment(
				festivalId,
				regularShifts,
				stations,
				members.filter((m) => m.is_active),
				autoAssignConfig,
				stationPreferences,
				stationShiftAssignments
			);

			if (result.success) {
				await loadData(); // Refresh data

				let message = `${result.assignmentsCreated} Zuweisungen erstellt.`;
				if (result.unfilledPositions.length > 0) {
					message += ` ${result.unfilledPositions.length} Positionen konnten nicht besetzt werden.`;
				}

				toast({
					title: 'Automatische Zuteilung abgeschlossen',
					description: message
				});
			} else {
				throw new Error('Assignment failed');
			}
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Die automatische Zuteilung ist fehlgeschlagen.',
				variant: 'destructive'
			});
		} finally {
			setAutoAssignLoading(false);
			setShowAutoAssignDialog(false);
		}
	};

	const handleClearAllAssignments = async () => {
		try {
			const success = await clearAllAssignments(festivalId);
			if (success) {
				await loadData();
				toast({
					title: 'Erfolg',
					description: 'Alle Zuweisungen wurden gelöscht.'
				});
			} else {
				throw new Error('Clear failed');
			}
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisungen konnten nicht gelöscht werden.',
				variant: 'destructive'
			});
		}
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

			// Create a temporary shift for this station shift if it doesn't exist
			const tempShiftId = stationShiftId;

			// Check if a shift with this ID already exists
			const { data: existingShift } = await supabase
				.from('shifts')
				.select('id')
				.eq('id', stationShiftId)
				.single();

			if (!existingShift) {
				// Create a temporary shift for this station shift
				const { data: tempShift, error: tempShiftError } = await supabase
					.from('shifts')
					.insert({
						id: stationShiftId,
						festival_id: festivalId,
						name: stationShift.name,
						start_date: stationShift.start_date,
						start_time: stationShift.start_time,
						end_time: stationShift.end_time,
						end_date: stationShift.end_date
					})
					.select()
					.single();

				if (tempShiftError) {
					throw tempShiftError;
				}
			}

			// Now assign the member using the existing system
			await assignMemberToShift(
				festivalId,
				tempShiftId,
				stationShift.station_id,
				draggedMember.id,
				nextPosition
			);
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
									<Button onClick={selectedStation ? handleUpdateStation : handleCreateStation}>
										{selectedStation ? 'Aktualisieren' : 'Erstellen'}
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

					<div className="h-8 w-px bg-border mx-2"></div>

					{/* Automatic Assignment Button */}
					<Dialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
						<DialogTrigger asChild>
							<Button
								variant="default"
								size="lg"
								className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-500">
								<Zap className="h-5 w-5 mr-2" />
								Automatische Zuteilung
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Automatische Schichtzuteilung</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="min-shifts">Min. Schichten pro Person</Label>
										<Input
											id="min-shifts"
											type="number"
											min="0"
											value={autoAssignConfig.minShiftsPerMember}
											onChange={(e) =>
												setAutoAssignConfig((prev) => ({
													...prev,
													minShiftsPerMember: parseInt(e.target.value) || 0
												}))
											}
										/>
									</div>
									<div>
										<Label htmlFor="max-shifts">Max. Schichten pro Person</Label>
										<Input
											id="max-shifts"
											type="number"
											min="1"
											value={autoAssignConfig.maxShiftsPerMember}
											onChange={(e) =>
												setAutoAssignConfig((prev) => ({
													...prev,
													maxShiftsPerMember: parseInt(e.target.value) || 1
												}))
											}
										/>
									</div>
								</div>

								<div className="bg-muted p-4 rounded-lg">
									<p className="text-sm text-muted-foreground">
										Die automatische Zuteilung berücksichtigt nur Stationen, die den jeweiligen
										Schichten zugewiesen wurden. Mitglieder mit Stationswünschen werden bevorzugt
										zugewiesen, solange Schichten in ihren Wunschstationen frei sind. Die Schichten
										werden gleichmäßig verteilt.
									</p>
								</div>

								<div className="flex justify-end gap-2">
									<Button variant="destructive" onClick={handleClearAllAssignments}>
										Alle Zuweisungen löschen
									</Button>
									<Button variant="outline" onClick={() => setShowAutoAssignDialog(false)}>
										Abbrechen
									</Button>
									<Button onClick={handleAutomaticAssignment} disabled={autoAssignLoading}>
										{autoAssignLoading ? 'Zuteilen...' : 'Automatisch zuteilen'}
									</Button>
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
													<div className="flex items-center gap-2">
														<span>{station.name}</span>
														<Button
															size="sm"
															variant="ghost"
															className="h-4 w-4 p-0 hover:bg-blue-100 hover:text-blue-600"
															onClick={() => {
																setSelectedStation(station);
																setStationForm({
																	name: station.name,
																	required_people: station.required_people,
																	description: station.description || ''
																});
																setShowStationDialog(true);
															}}>
															<Edit className="h-3 w-3" />
														</Button>
													</div>
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
													<Button
														variant="outline"
														size="sm"
														className="hover:bg-red-100 hover:text-red-600"
														onClick={async () => {
															if (
																confirm(
																	'Sind Sie sicher, dass Sie diese Station löschen möchten? Alle zugehörigen Schichten werden ebenfalls gelöscht.'
																)
															) {
																try {
																	await deleteStation(station.id);
																	await loadData();
																	toast({
																		title: 'Erfolg',
																		description: 'Station wurde gelöscht.'
																	});
																} catch (error) {
																	toast({
																		title: 'Fehler',
																		description: 'Station konnte nicht gelöscht werden.',
																		variant: 'destructive'
																	});
																}
															}
														}}>
														<Trash2 className="h-4 w-4 mr-2" />
														Löschen
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
																		<div className="flex items-center gap-2">
																			<span>{stationShift.name}</span>
																			<Button
																				size="sm"
																				variant="ghost"
																				className="h-4 w-4 p-0 hover:bg-blue-100 hover:text-blue-600"
																				onClick={() => {
																					setSelectedStationShift(stationShift);
																					setStationShiftForm({
																						name: stationShift.name,
																						start_date: stationShift.start_date,
																						start_time: stationShift.start_time,
																						end_date: stationShift.end_date || '',
																						end_time: stationShift.end_time,
																						required_people: stationShift.required_people
																					});
																					setShowStationShiftDialog(true);
																				}}>
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
																				onClick={async () => {
																					if (
																						confirm(
																							'Sind Sie sicher, dass Sie diese Schicht löschen möchten?'
																						)
																					) {
																						try {
																							await deleteStationShift(stationShift.id);
																							await loadData();
																							toast({
																								title: 'Erfolg',
																								description: 'Schicht wurde gelöscht.'
																							});
																						} catch (error) {
																							toast({
																								title: 'Fehler',
																								description:
																									'Schicht konnte nicht gelöscht werden.',
																								variant: 'destructive'
																							});
																						}
																					}
																				}}>
																				<Trash2 className="h-3 w-3" />
																			</Button>
																		</div>
																	</CardTitle>
																	<div className="flex items-center justify-between">
																		<p className="text-sm text-muted-foreground">
																			{formatStationShiftTime(stationShift)}
																		</p>
																		{/* Fill level indicator */}
																		<div className="flex items-center gap-2">
																			<div className="flex items-center gap-1 text-xs">
																				<span className="text-muted-foreground">
																					{getAssignmentsForStationShift(stationShift.id).length}/
																					{stationShift.required_people}
																				</span>
																				<div
																					className={cn(
																						'w-2 h-2 rounded-full',
																						(() => {
																							const currentAssignments =
																								getAssignmentsForStationShift(stationShift.id);
																							const fillPercentage =
																								(currentAssignments.length /
																									stationShift.required_people) *
																								100;

																							if (fillPercentage === 0) {
																								return 'bg-gray-400'; // Empty
																							} else if (fillPercentage < 50) {
																								return 'bg-red-500'; // Partially filled (red)
																							} else if (fillPercentage < 100) {
																								return 'bg-yellow-500'; // Mostly filled (yellow)
																							} else {
																								return 'bg-green-500'; // Fully filled (green)
																							}
																						})()
																					)}
																				/>
																			</div>
																			{/* Progress bar */}
																			<div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
																				<div
																					className={cn(
																						'h-full transition-all duration-300',
																						(() => {
																							const currentAssignments =
																								getAssignmentsForStationShift(stationShift.id);
																							const fillPercentage =
																								(currentAssignments.length /
																									stationShift.required_people) *
																								100;

																							if (fillPercentage === 0) {
																								return 'bg-gray-400 w-0'; // Empty
																							} else if (fillPercentage < 50) {
																								return 'bg-red-500'; // Partially filled (red)
																							} else if (fillPercentage < 100) {
																								return 'bg-yellow-500'; // Mostly filled (yellow)
																							} else {
																								return 'bg-green-500'; // Fully filled (green)
																							}
																						})()
																					)}
																					style={{
																						width: `${Math.min(
																							(getAssignmentsForStationShift(stationShift.id)
																								.length /
																								stationShift.required_people) *
																								100,
																							100
																						)}%`
																					}}
																				/>
																			</div>
																		</div>
																	</div>
																</CardHeader>
																<CardContent>
																	<div
																		className={cn(
																			'min-h-[100px] border-2 border-dashed rounded-lg p-3 space-y-2 transition-all duration-200',
																			// Color coding based on fill level
																			(() => {
																				const currentAssignments = getAssignmentsForStationShift(
																					stationShift.id
																				);
																				const fillPercentage =
																					(currentAssignments.length /
																						stationShift.required_people) *
																					100;

																				if (fillPercentage === 0) {
																					return 'border-gray-300 bg-gray-50'; // Empty
																				} else if (fillPercentage < 50) {
																					return 'border-red-300 bg-red-50'; // Partially filled (red)
																				} else if (fillPercentage < 100) {
																					return 'border-yellow-300 bg-yellow-50'; // Mostly filled (yellow)
																				} else {
																					return 'border-green-300 bg-green-50'; // Fully filled (green)
																				}
																			})()
																		)}
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
																							onClick={async () => {
																								try {
																									await removeMemberFromShift(
																										festivalId,
																										stationShift.id,
																										stationShift.station_id,
																										assignment.member_id!
																									);
																									await loadData();
																									toast({
																										title: 'Erfolg',
																										description: 'Zuweisung wurde entfernt.'
																									});
																								} catch (error) {
																									toast({
																										title: 'Fehler',
																										description:
																											'Zuweisung konnte nicht entfernt werden.',
																										variant: 'destructive'
																									});
																								}
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
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														handleOpenStationPreferenceDialog(member);
													}}
													className="h-6 w-6 p-0 hover:bg-blue-100"
													title="Stationswünsche bearbeiten">
													<Heart
														className={cn(
															'h-3 w-3',
															getMemberStationPreferences(member.id).length > 0
																? 'text-red-500 fill-red-500'
																: 'text-gray-400'
														)}
													/>
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														handleEditMember(member);
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
														handleDeleteMember(member);
													}}
													className="h-6 w-6 p-0 hover:bg-red-100"
													title="Mitglied löschen">
													<UserMinus className="h-3 w-3 text-red-600" />
												</Button>
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
										</div>

										{/* Station Preferences */}
										{getMemberStationPreferences(member.id).length > 0 && (
											<div className="flex flex-wrap gap-1">
												{getMemberStationPreferences(member.id).map((stationId) => {
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

										{memberAssignments.length > 0 && (
											<div className="text-xs text-muted-foreground">
												{memberAssignments.map((assignment, index) => {
													const stationShift = stationShifts.find(
														(shift) => shift.id === assignment.shift_id
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
							<Button
								onClick={
									selectedStationShift ? handleUpdateStationShift : handleCreateStationShift
								}>
								{selectedStationShift ? 'Aktualisieren' : 'Erstellen'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Station Preference Dialog */}
			<Dialog open={showStationPreferenceDialog} onOpenChange={setShowStationPreferenceDialog}>
				<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle className="flex items-center gap-2">
							<Heart className="h-5 w-5 text-red-500" />
							Stationswünsche für {selectedMemberForPreference?.first_name}{' '}
							{selectedMemberForPreference?.last_name}
						</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto space-y-6 pr-2">
						{/* Station Preferences */}
						<div>
							<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
								<Heart className="h-4 w-4 text-red-500" />
								Stationswünsche
							</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Wählen Sie die Stationen aus, bei denen {selectedMemberForPreference?.first_name}{' '}
								bevorzugt eingesetzt werden soll.
							</p>

							<div className="space-y-2">
								{stations.map((station) => {
									const isSelected =
										selectedMemberForPreference &&
										(
											tempStationPreferences[selectedMemberForPreference.id] ||
											getMemberStationPreferences(selectedMemberForPreference.id)
										).includes(station.id);

									return (
										<div
											key={station.id}
											className={cn(
												'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
												isSelected
													? 'bg-pink-50 border-pink-200'
													: 'hover:bg-gray-50 border-gray-200'
											)}
											onClick={() => {
												if (!selectedMemberForPreference) return;
												handleToggleStationPreference(selectedMemberForPreference.id, station.id);
											}}>
											<div
												className={cn(
													'w-4 h-4 rounded border-2 flex items-center justify-center',
													isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
												)}>
												{isSelected && <Heart className="h-2 w-2 text-white fill-current" />}
											</div>
											<div className="flex-1">
												<div className="font-medium text-sm">{station.name}</div>
												{station.description && (
													<div className="text-xs text-muted-foreground">{station.description}</div>
												)}
											</div>
											<div className="text-xs text-muted-foreground">
												{station.required_people} Person{station.required_people !== 1 ? 'en' : ''}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
					<div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
						<Button variant="outline" onClick={() => setShowStationPreferenceDialog(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleSaveStationPreferencesFromDialog}>Speichern</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Member Management Dialog */}
			<Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5" />
							{editingMember ? 'Mitglied bearbeiten' : 'Neues Mitglied hinzufügen'}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="first_name">Vorname *</Label>
								<Input
									id="first_name"
									value={memberForm.first_name}
									onChange={(e) =>
										setMemberForm((prev) => ({ ...prev, first_name: e.target.value }))
									}
									placeholder="Vorname eingeben"
								/>
							</div>
							<div>
								<Label htmlFor="last_name">Nachname *</Label>
								<Input
									id="last_name"
									value={memberForm.last_name}
									onChange={(e) =>
										setMemberForm((prev) => ({ ...prev, last_name: e.target.value }))
									}
									placeholder="Nachname eingeben"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="phone">Telefon</Label>
								<Input
									id="phone"
									value={memberForm.phone}
									onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
									placeholder="Telefonnummer eingeben"
								/>
							</div>
							<div>
								<Label htmlFor="email">E-Mail</Label>
								<Input
									id="email"
									type="email"
									value={memberForm.email}
									onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
									placeholder="E-Mail eingeben"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="notes">Notizen</Label>
							<Textarea
								id="notes"
								value={memberForm.notes}
								onChange={(e) => setMemberForm((prev) => ({ ...prev, notes: e.target.value }))}
								placeholder="Notizen eingeben"
								rows={3}
							/>
						</div>

						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="is_active"
								checked={memberForm.is_active}
								onChange={(e) =>
									setMemberForm((prev) => ({ ...prev, is_active: e.target.checked }))
								}
							/>
							<Label htmlFor="is_active">Aktiv</Label>
						</div>

						<div className="flex justify-end gap-2 pt-4">
							<Button variant="outline" onClick={() => setShowMemberDialog(false)}>
								Abbrechen
							</Button>
							<Button
								onClick={handleSaveMember}
								disabled={!memberForm.first_name || !memberForm.last_name}>
								<Save className="h-4 w-4 mr-2" />
								{editingMember ? 'Aktualisieren' : 'Hinzufügen'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default StationShiftMatrix;
