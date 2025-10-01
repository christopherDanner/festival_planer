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
	getShifts,
	getStations,
	getShiftAssignments,
	getStationShiftAssignments,
	toggleStationShiftAssignment,
	createShift,
	updateShift,
	deleteShift,
	createStation,
	updateStation,
	deleteStation,
	assignMemberToShift,
	removeMemberFromShift,
	type Shift,
	type Station,
	type ShiftAssignmentWithMember,
	type StationShiftAssignment
} from '@/lib/shiftService';
import {
	getMembers,
	updateMemberStationPreferences,
	updateMemberShiftPreferences,
	updateMemberPreferences,
	getAllFestivalMemberPreferences,
	getMemberShiftPreferences as getMemberShiftPreferencesFromService,
	createMember,
	updateMember,
	deleteMember,
	type Member
} from '@/lib/memberService';
import {
	performAutomaticAssignment,
	clearAllAssignments,
	type AutoAssignmentConfig,
	type AssignmentResult
} from '@/lib/automaticAssignmentService';
import { exportToExcel, type ExportData } from '@/lib/exportService';

interface ShiftMatrixProps {
	festivalId: string;
}

interface MatrixCell {
	shiftId: string;
	stationId: string;
	assignments: ShiftAssignmentWithMember[];
	requiredPeople: number;
}

const ShiftMatrix: React.FC<ShiftMatrixProps> = ({ festivalId }) => {
	const { toast } = useToast();
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [stations, setStations] = useState<Station[]>([]);
	const [assignments, setAssignments] = useState<ShiftAssignmentWithMember[]>([]);
	const [stationShiftAssignments, setStationShiftAssignments] = useState<StationShiftAssignment[]>(
		[]
	);
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
	const [autoAssignLoading, setAutoAssignLoading] = useState(false);

	// Form states
	const [shiftForm, setShiftForm] = useState({
		name: '',
		start_date: '',
		start_time: '',
		end_date: '',
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
		respectPreferences: true // Always true, checkbox removed
	});

	// Station and shift preferences state
	const [stationPreferences, setStationPreferences] = useState<Record<string, string[]>>({});
	const [shiftPreferences, setShiftPreferences] = useState<Record<string, string[]>>({});

	// Member management state
	const [showMemberDialog, setShowMemberDialog] = useState(false);
	const [editingMember, setEditingMember] = useState<Member | null>(null);
	const [memberForm, setMemberForm] = useState({
		first_name: '',
		last_name: '',
		phone: '',
		email: '',
		notes: '',
		is_active: true
	});

	// Drag and drop state
	const [draggedMember, setDraggedMember] = useState<Member | null>(null);

	// Filter state
	const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'free' | 'partial' | 'full'>(
		'all'
	);
	const [nameFilter, setNameFilter] = useState('');
	const [stationFilter, setStationFilter] = useState<string>('all');
	const [shiftFilter, setShiftFilter] = useState<string>('all');

	// Inline editing state
	const [editingShift, setEditingShift] = useState<string | null>(null);
	const [editingStation, setEditingStation] = useState<string | null>(null);
	const [editingShiftForm, setEditingShiftForm] = useState({
		name: '',
		start_date: '',
		start_time: '',
		end_date: '',
		end_time: ''
	});
	const [editingStationForm, setEditingStationForm] = useState({
		name: '',
		required_people: 1,
		description: ''
	});

	// UI state for collapsible member list and fullscreen
	const [isMemberListCollapsed, setIsMemberListCollapsed] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [shiftsData, stationsData, assignmentsData, stationShiftAssignmentsData, membersData] =
				await Promise.all([
					getShifts(festivalId),
					getStations(festivalId),
					getShiftAssignments(festivalId),
					getStationShiftAssignments(festivalId),
					getMembers()
				]);

			setShifts(shiftsData);
			setStations(stationsData);
			setAssignments(assignmentsData);
			setStationShiftAssignments(stationShiftAssignmentsData);
			setMembers(membersData.filter((m) => m.is_active));

			// Load station preferences
			const stationPrefs = await getAllFestivalMemberPreferences(festivalId);
			setStationPreferences(stationPrefs);

			// Load shift preferences - use existing service but with error handling
			const shiftPrefs: Record<string, string[]> = {};
			try {
				// Try to load shift preferences for all members in parallel
				const memberIds = membersData.filter((m) => m.is_active).map((m) => m.id);
				const shiftPrefPromises = memberIds.map(async (memberId) => {
					try {
						const prefs = await getMemberShiftPreferencesFromService(festivalId, memberId);
						return { memberId, preferences: prefs };
					} catch (error) {
						return { memberId, preferences: [] };
					}
				});

				const shiftPrefResults = await Promise.all(shiftPrefPromises);
				shiftPrefResults.forEach(({ memberId, preferences }) => {
					shiftPrefs[memberId] = preferences;
				});
			} catch (error) {
				// If loading fails, use empty preferences
				console.warn('Failed to load shift preferences:', error);
			}
			setShiftPreferences(shiftPrefs);
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

	const handleCreateShift = async () => {
		if (!shiftForm.name || !shiftForm.start_date || !shiftForm.start_time || !shiftForm.end_time) {
			toast({
				title: 'Fehler',
				description: 'Bitte füllen Sie alle Pflichtfelder aus.',
				variant: 'destructive'
			});
			return;
		}

		try {
			await createShift({
				festival_id: festivalId,
				...shiftForm
			});

			setShiftForm({ name: '', start_date: '', start_time: '', end_date: '', end_time: '' });
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

	const isStationAssignedToShift = (stationId: string, shiftId: string): boolean => {
		return stationShiftAssignments.some(
			(assignment) => assignment.station_id === stationId && assignment.shift_id === shiftId
		);
	};

	const handleToggleStationShiftAssignment = async (stationId: string, shiftId: string) => {
		const isAssigned = isStationAssignedToShift(stationId, shiftId);

		try {
			await toggleStationShiftAssignment(festivalId, stationId, shiftId, !isAssigned);
			await loadData(); // Reload data to update the UI

			toast({
				title: 'Erfolg',
				description: `Station wurde ${!isAssigned ? 'zugewiesen' : 'entfernt'}.`
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht geändert werden.',
				variant: 'destructive'
			});
		}
	};

	const getMatrixCell = (shiftId: string, stationId: string): MatrixCell => {
		const station = stations.find((s) => s.id === stationId);
		const cellAssignments = assignments.filter(
			(a) => a.shift_id === shiftId && a.station_id === stationId && a.member_id
		);

		return {
			shiftId,
			stationId,
			assignments: cellAssignments,
			requiredPeople: station?.required_people || 1
		};
	};

	const getCellColor = (cell: MatrixCell, isAssigned: boolean): string => {
		if (!isAssigned) return 'bg-muted/20 border-muted opacity-50';

		const assigned = cell.assignments.length;
		const required = cell.requiredPeople;

		if (assigned >= required) return 'bg-success/20 border-success';
		if (assigned > 0) return 'bg-warning/20 border-warning';
		return 'bg-destructive/20 border-destructive';
	};

	const getRemainingBadgeVariant = (
		cell: MatrixCell
	): 'default' | 'secondary' | 'destructive' | 'outline' => {
		const remaining = cell.requiredPeople - cell.assignments.length;
		if (remaining === 0) return 'default';
		if (remaining < cell.requiredPeople / 2) return 'secondary';
		return 'destructive';
	};

	const handleDragStart = (member: Member) => {
		setDraggedMember(member);
	};

	const handleDragEnd = () => {
		setDraggedMember(null);
	};

	const handleDrop = async (shiftId: string, stationId: string, e: React.DragEvent) => {
		e.preventDefault();

		if (!draggedMember) return;

		try {
			const cell = getMatrixCell(shiftId, stationId);
			if (cell.assignments.length >= cell.requiredPeople) {
				toast({
					title: 'Hinweis',
					description: 'Diese Station ist bereits vollständig besetzt.',
					variant: 'destructive'
				});
				return;
			}

			await assignMemberToShift(
				festivalId,
				shiftId,
				stationId,
				draggedMember.id,
				cell.assignments.length + 1
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

	const handleRemoveMember = async (shiftId: string, stationId: string, memberId: string) => {
		try {
			await removeMemberFromShift(festivalId, shiftId, stationId, memberId);
			loadData();

			toast({
				title: 'Erfolg',
				description: 'Zuweisung wurde entfernt.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Zuweisung konnte nicht entfernt werden.',
				variant: 'destructive'
			});
		}
	};

	const getMemberAssignments = (memberId: string) => {
		return assignments.filter((a) => a.member_id === memberId);
	};

	const getMemberAvailability = (memberId: string): 'free' | 'partial' | 'full' => {
		const memberAssignments = getMemberAssignments(memberId);
		const totalShifts = shifts.length;
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

			// Shift filter
			if (shiftFilter !== 'all') {
				const memberShiftPrefs = getMemberShiftPreferences(member.id);
				if (!memberShiftPrefs.includes(shiftFilter)) {
					return false;
				}
			}

			// Availability filter
			if (availabilityFilter !== 'all') {
				const availability = getMemberAvailability(member.id);
				return availability === availabilityFilter;
			}

			return true;
		});
	};

	const getAvailabilityStats = () => {
		const free = members.filter((m) => getMemberAvailability(m.id) === 'free').length;
		const partial = members.filter((m) => getMemberAvailability(m.id) === 'partial').length;
		const full = members.filter((m) => getMemberAvailability(m.id) === 'full').length;

		return { free, partial, full, total: members.length };
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

	const getMemberStationPreferences = (memberId: string): string[] => {
		return stationPreferences[memberId] || [];
	};

	const getMemberShiftPreferences = (memberId: string): string[] => {
		return shiftPreferences[memberId] || [];
	};

	// Temporary preferences for dialog editing
	const [tempStationPreferences, setTempStationPreferences] = useState<Record<string, string[]>>(
		{}
	);
	const [tempShiftPreferences, setTempShiftPreferences] = useState<Record<string, string[]>>({});

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

	const handleToggleShiftPreference = (memberId: string, shiftId: string) => {
		const currentPreferences =
			tempShiftPreferences[memberId] || getMemberShiftPreferences(memberId);
		const isSelected = currentPreferences.includes(shiftId);

		const newPreferences = isSelected
			? currentPreferences.filter((id) => id !== shiftId)
			: [...currentPreferences, shiftId];

		setTempShiftPreferences((prev) => ({
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
		setTempShiftPreferences((prev) => ({
			...prev,
			[member.id]: getMemberShiftPreferences(member.id)
		}));
		setShowStationPreferenceDialog(true);
	};

	const handleSaveStationPreferencesFromDialog = async () => {
		if (!selectedMemberForPreference) return;

		const stationPrefs = tempStationPreferences[selectedMemberForPreference.id] || [];
		const shiftPrefs = tempShiftPreferences[selectedMemberForPreference.id] || [];

		try {
			await updateMemberPreferences(
				festivalId,
				selectedMemberForPreference.id,
				stationPrefs,
				shiftPrefs
			);

			// Update local state
			setStationPreferences((prev) => ({
				...prev,
				[selectedMemberForPreference.id]: stationPrefs
			}));
			setShiftPreferences((prev) => ({
				...prev,
				[selectedMemberForPreference.id]: shiftPrefs
			}));

			toast({
				title: 'Präferenzen gespeichert',
				description: 'Stations- und Schichtwünsche wurden erfolgreich gespeichert.'
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

	const handleDeleteShift = async (shiftId: string) => {
		const shift = shifts.find((s) => s.id === shiftId);
		if (!shift) return;

		if (
			confirm(
				`Schicht "${shift.name}" wirklich löschen? Alle Zuweisungen werden ebenfalls gelöscht.`
			)
		) {
			try {
				await deleteShift(shiftId);
				await loadData();
				toast({
					title: 'Schicht gelöscht',
					description: `Schicht "${shift.name}" wurde gelöscht.`
				});
			} catch (error) {
				toast({
					title: 'Fehler',
					description: 'Schicht konnte nicht gelöscht werden.',
					variant: 'destructive'
				});
			}
		}
	};

	const handleDeleteStation = async (stationId: string) => {
		const station = stations.find((s) => s.id === stationId);
		if (!station) return;

		if (
			confirm(
				`Station "${station.name}" wirklich löschen? Alle Zuweisungen werden ebenfalls gelöscht.`
			)
		) {
			try {
				await deleteStation(stationId);
				await loadData();
				toast({
					title: 'Station gelöscht',
					description: `Station "${station.name}" wurde gelöscht.`
				});
			} catch (error) {
				toast({
					title: 'Fehler',
					description: 'Station konnte nicht gelöscht werden.',
					variant: 'destructive'
				});
			}
		}
	};

	// Inline editing functions
	const handleStartEditShift = (shift: Shift) => {
		setEditingShift(shift.id);
		setEditingShiftForm({
			name: shift.name,
			start_date: shift.start_date,
			start_time: shift.start_time,
			end_date: (shift as Shift & { end_date?: string }).end_date || '',
			end_time: shift.end_time
		});
	};

	const handleStartEditStation = (station: Station) => {
		setEditingStation(station.id);
		setEditingStationForm({
			name: station.name,
			required_people: station.required_people,
			description: station.description || ''
		});
	};

	const handleSaveEditShift = async () => {
		if (!editingShift) return;

		try {
			await updateShift(editingShift, editingShiftForm);
			toast({
				title: 'Schicht aktualisiert',
				description: 'Die Schicht wurde erfolgreich aktualisiert.'
			});
			setEditingShift(null);
			await loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Schicht konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	};

	const handleSaveEditStation = async () => {
		if (!editingStation) return;

		try {
			await updateStation(editingStation, editingStationForm);
			toast({
				title: 'Station aktualisiert',
				description: 'Die Station wurde erfolgreich aktualisiert.'
			});
			setEditingStation(null);
			await loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Station konnte nicht aktualisiert werden.',
				variant: 'destructive'
			});
		}
	};

	const handleCancelEdit = () => {
		setEditingShift(null);
		setEditingStation(null);
	};

	const handleAutomaticAssignment = async () => {
		if (shifts.length === 0 || stations.length === 0 || members.length === 0) {
			toast({
				title: 'Fehler',
				description: 'Es müssen Schichten, Stationen und Mitglieder vorhanden sein.',
				variant: 'destructive'
			});
			return;
		}

		setAutoAssignLoading(true);

		try {
			const result: AssignmentResult = await performAutomaticAssignment(
				festivalId,
				shifts,
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

	// Export functions
	const handleExportToExcel = () => {
		try {
			const exportData: ExportData = {
				shifts,
				stations,
				assignments,
				stationShiftAssignments,
				members,
				festivalName: 'Festival', // You might want to get this from props or context
				festivalDates: 'Datum' // You might want to get this from props or context
			};

			exportToExcel(exportData);
			toast({
				title: 'Excel Export',
				description: 'Schichtplan wurde als Excel-Datei exportiert.'
			});
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Excel Export fehlgeschlagen.',
				variant: 'destructive'
			});
		}
	};

	const getMemberAssignmentInfo = (memberId: string) => {
		const memberAssignments = getMemberAssignments(memberId);
		if (memberAssignments.length === 0) return 'Frei';

		return memberAssignments
			.map((assignment) => {
				const shift = shifts.find((s) => s.id === assignment.shift_id);
				const station = stations.find((s) => s.id === assignment.station_id);
				if (!shift || !station) return '';

				const date = new Date(shift.start_date).toLocaleDateString('de-AT', {
					weekday: 'short',
					day: '2-digit',
					month: '2-digit'
				});
				return `${station.name} (${date} ${shift.start_time}-${shift.end_time})`;
			})
			.join(', ');
	};

	const formatShiftTime = (shift: Shift): string => {
		const startDate = new Date(shift.start_date).toLocaleDateString('de-AT', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		});

		const endDate = (shift as Shift & { end_date?: string }).end_date;
		if (endDate && endDate !== shift.start_date) {
			const endDateFormatted = new Date(endDate).toLocaleDateString('de-AT', {
				weekday: 'short',
				day: '2-digit',
				month: '2-digit'
			});
			return `${startDate} ${shift.start_time} - ${endDateFormatted} ${shift.end_time}`;
		}

		return `${startDate} ${shift.start_time}-${shift.end_time}`;
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
						Schichtplan Matrix
					</h2>
					<p className="text-muted-foreground">
						Ziehen Sie Mitglieder aus der rechten Liste in die gewünschten Schichten
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

					{/* Export buttons */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportToExcel}
						className="flex items-center gap-2">
						<FileSpreadsheet className="h-4 w-4" />
						Excel Export
					</Button>

					<div className="h-8 w-px bg-border mx-2"></div>

					{/* Member management buttons */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleAddMember}
						className="flex items-center gap-2">
						<UserPlus className="h-4 w-4" />
						Mitglied hinzufügen
					</Button>

					<div className="h-8 w-px bg-border mx-2"></div>

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

					<Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm">
								<Clock className="h-4 w-4 mr-2" />
								Schicht hinzufügen
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Neue Schicht erstellen</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div>
									<Label htmlFor="shift-name">Name</Label>
									<Input
										id="shift-name"
										value={shiftForm.name}
										onChange={(e) => setShiftForm((prev) => ({ ...prev, name: e.target.value }))}
										placeholder="z.B. Freitag Abend"
									/>
								</div>
								<div>
									<Label htmlFor="shift-date">Datum</Label>
									<Input
										id="shift-date"
										type="date"
										value={shiftForm.start_date}
										onChange={(e) =>
											setShiftForm((prev) => ({ ...prev, start_date: e.target.value }))
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="start-time">Von</Label>
										<Input
											id="start-time"
											type="time"
											value={shiftForm.start_time}
											onChange={(e) =>
												setShiftForm((prev) => ({ ...prev, start_time: e.target.value }))
											}
										/>
									</div>
									<div>
										<Label htmlFor="end-time">Bis</Label>
										<Input
											id="end-time"
											type="time"
											value={shiftForm.end_time}
											onChange={(e) =>
												setShiftForm((prev) => ({ ...prev, end_time: e.target.value }))
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
										value={shiftForm.end_date}
										onChange={(e) =>
											setShiftForm((prev) => ({ ...prev, end_date: e.target.value }))
										}
									/>
								</div>
								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => setShowShiftDialog(false)}>
										Abbrechen
									</Button>
									<Button onClick={handleCreateShift}>Erstellen</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>

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
				</div>
			</div>

			{/* Main Content - Split Layout */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Side - Matrix */}
				<div
					id="shift-matrix-container"
					className={cn('overflow-auto', isMemberListCollapsed ? 'flex-1' : 'flex-1')}>
					{shifts.length === 0 || stations.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center text-muted-foreground">
								{shifts.length === 0 && stations.length === 0 && (
									<p>Erstellen Sie zuerst Schichten und Stationen, um die Matrix zu sehen.</p>
								)}
								{shifts.length === 0 && stations.length > 0 && (
									<p>Erstellen Sie Schichten, um die Matrix zu sehen.</p>
								)}
								{shifts.length > 0 && stations.length === 0 && (
									<p>Erstellen Sie Stationen, um die Matrix zu sehen.</p>
								)}
							</div>
						</div>
					) : (
						<div className="p-6">
							<div className="overflow-x-auto relative">
								<table className="w-full min-w-max">
									<thead>
										<tr className="border-b bg-muted/50">
											<th className="p-4 text-left font-medium min-w-[150px] sticky left-0 top-0 bg-muted/50 z-20">
												Station
											</th>
											{shifts.map((shift) => (
												<th
													key={shift.id}
													className="p-4 text-center font-medium min-w-[200px] sticky top-0 bg-muted/50 z-10">
													{editingShift === shift.id ? (
														<div className="space-y-2">
															<Input
																value={editingShiftForm.name}
																onChange={(e) =>
																	setEditingShiftForm((prev) => ({ ...prev, name: e.target.value }))
																}
																placeholder="Schichtname"
																className="text-sm"
															/>
															<div className="grid grid-cols-2 gap-1">
																<Input
																	type="date"
																	value={editingShiftForm.start_date}
																	onChange={(e) =>
																		setEditingShiftForm((prev) => ({
																			...prev,
																			start_date: e.target.value
																		}))
																	}
																	className="text-xs"
																/>
																<Input
																	type="time"
																	value={editingShiftForm.start_time}
																	onChange={(e) =>
																		setEditingShiftForm((prev) => ({
																			...prev,
																			start_time: e.target.value
																		}))
																	}
																	className="text-xs"
																/>
															</div>
															<div className="grid grid-cols-2 gap-1">
																<Input
																	type="date"
																	value={editingShiftForm.end_date}
																	onChange={(e) =>
																		setEditingShiftForm((prev) => ({
																			...prev,
																			end_date: e.target.value
																		}))
																	}
																	placeholder="Enddatum (optional)"
																	className="text-xs"
																/>
																<Input
																	type="time"
																	value={editingShiftForm.end_time}
																	onChange={(e) =>
																		setEditingShiftForm((prev) => ({
																			...prev,
																			end_time: e.target.value
																		}))
																	}
																	className="text-xs"
																/>
															</div>
															<div className="flex gap-1">
																<Button
																	size="sm"
																	onClick={handleSaveEditShift}
																	className="text-xs h-6">
																	<Save className="h-3 w-3" />
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={handleCancelEdit}
																	className="text-xs h-6">
																	<X className="h-3 w-3" />
																</Button>
															</div>
														</div>
													) : (
														<div className="space-y-1 group">
															<div className="font-semibold flex items-center justify-center gap-2">
																{shift.name}
																<div className="flex gap-1">
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
																		onClick={() => handleStartEditShift(shift)}
																		title="Schicht bearbeiten">
																		<Edit className="h-3 w-3" />
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100"
																		onClick={() => handleDeleteShift(shift.id)}
																		title="Schicht löschen">
																		<Trash2 className="h-3 w-3 text-red-600" />
																	</Button>
																</div>
															</div>
															<div className="text-xs text-muted-foreground">
																{formatShiftTime(shift)}
															</div>
														</div>
													)}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{stations.map((station) => (
											<tr key={station.id} className="border-b">
												<td className="p-4 font-medium sticky left-0 bg-background z-10 min-w-[150px]">
													{editingStation === station.id ? (
														<div className="space-y-2">
															<Input
																value={editingStationForm.name}
																onChange={(e) =>
																	setEditingStationForm((prev) => ({
																		...prev,
																		name: e.target.value
																	}))
																}
																placeholder="Stationname"
																className="text-sm"
															/>
															<Input
																type="number"
																min="1"
																value={editingStationForm.required_people}
																onChange={(e) =>
																	setEditingStationForm((prev) => ({
																		...prev,
																		required_people: parseInt(e.target.value) || 1
																	}))
																}
																placeholder="Personen"
																className="text-xs"
															/>
															<Textarea
																value={editingStationForm.description}
																onChange={(e) =>
																	setEditingStationForm((prev) => ({
																		...prev,
																		description: e.target.value
																	}))
																}
																placeholder="Beschreibung (optional)"
																rows={2}
																className="text-xs"
															/>
															<div className="flex gap-1">
																<Button
																	size="sm"
																	onClick={handleSaveEditStation}
																	className="text-xs h-6">
																	<Save className="h-3 w-3" />
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={handleCancelEdit}
																	className="text-xs h-6">
																	<X className="h-3 w-3" />
																</Button>
															</div>
														</div>
													) : (
														<div className="space-y-1 group">
															<div className="flex items-center gap-2">
																<span>{station.name}</span>
																<div className="flex gap-1">
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
																		onClick={() => handleStartEditStation(station)}
																		title="Station bearbeiten">
																		<Edit className="h-3 w-3" />
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100"
																		onClick={() => handleDeleteStation(station.id)}
																		title="Station löschen">
																		<Trash2 className="h-3 w-3 text-red-600" />
																	</Button>
																</div>
															</div>
															<div className="text-xs text-muted-foreground flex items-center gap-1">
																<Users className="h-3 w-3" />
																{station.required_people} Personen
															</div>
														</div>
													)}
												</td>
												{shifts.map((shift) => {
													const isAssigned = isStationAssignedToShift(station.id, shift.id);
													const cell = getMatrixCell(shift.id, station.id);
													const remaining = cell.requiredPeople - cell.assignments.length;

													return (
														<td key={`${shift.id}-${station.id}`} className="p-2">
															<div
																className={cn(
																	'min-h-[120px] border-2 rounded-lg p-2 space-y-2 transition-colors relative group',
																	isAssigned
																		? getCellColor(cell, isAssigned)
																		: 'bg-muted/10 border-muted/30 hover:border-muted/50 cursor-pointer',
																	!isAssigned && 'hover:bg-muted/20'
																)}
																onClick={() => {
																	if (!isAssigned) {
																		handleToggleStationShiftAssignment(station.id, shift.id);
																	}
																}}
																onDragOver={(e) => e.preventDefault()}
																onDrop={(e) => handleDrop(shift.id, station.id, e)}>
																{/* Assignment Status Indicator */}
																<div className="flex justify-between items-start">
																	{isAssigned && (
																		<Badge
																			variant={getRemainingBadgeVariant(cell)}
																			className="text-xs">
																			{remaining > 0 ? `${remaining} fehlt` : 'Vollständig'}
																		</Badge>
																	)}

																	{/* Remove Assignment Button - only visible on hover */}
																	{isAssigned && (
																		<Button
																			size="sm"
																			variant="ghost"
																			className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
																			onClick={(e) => {
																				e.stopPropagation();
																				handleToggleStationShiftAssignment(station.id, shift.id);
																			}}
																			title="Zuweisung entfernen">
																			<X className="h-3 w-3" />
																		</Button>
																	)}
																</div>

																{/* Assignment Content - only show if assigned */}
																{isAssigned && (
																	<>
																		<div className="space-y-1">
																			{cell.assignments.map((assignment) => (
																				<div
																					key={assignment.id}
																					className="flex items-center justify-between bg-background/80 rounded px-2 py-1 text-sm group/member">
																					<span className="font-medium">
																						{assignment.member?.first_name}{' '}
																						{assignment.member?.last_name}
																					</span>
																					<Button
																						size="sm"
																						variant="ghost"
																						className="h-4 w-4 p-0 opacity-0 group-hover/member:opacity-100 hover:bg-destructive/20 hover:text-destructive"
																						onClick={(e) => {
																							e.stopPropagation();
																							handleRemoveMember(
																								shift.id,
																								station.id,
																								assignment.member_id!
																							);
																						}}>
																						<Trash2 className="h-3 w-3" />
																					</Button>
																				</div>
																			))}
																		</div>

																		{remaining > 0 && (
																			<div className="text-xs text-muted-foreground text-center border-dashed border rounded p-2">
																				Person hier ablegen
																			</div>
																		)}
																	</>
																)}

																{/* Click hint for unassigned cells */}
																{!isAssigned && (
																	<div className="text-xs text-muted-foreground text-center border-dashed border rounded p-2">
																		Klicken zum Zuweisen
																	</div>
																)}
															</div>
														</td>
													);
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Right Side - Members List */}
				<div
					className={cn(
						'border-l bg-muted/20 flex flex-col transition-all duration-300',
						isMemberListCollapsed ? 'w-12' : 'w-80'
					)}>
					<div className="p-4 border-b bg-background">
						<div className="flex items-center justify-between mb-3">
							{!isMemberListCollapsed && (
								<h3 className="font-semibold flex items-center gap-2">
									<Users className="h-4 w-4" />
									Mitglieder ({getFilteredMembers().length})
								</h3>
							)}
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setIsMemberListCollapsed(!isMemberListCollapsed)}
									className="h-6 w-6 p-0"
									title={
										isMemberListCollapsed
											? 'Mitgliederliste einblenden'
											: 'Mitgliederliste ausblenden'
									}>
									{isMemberListCollapsed ? (
										<ChevronLeft className="h-4 w-4" />
									) : (
										<ChevronRight className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						{!isMemberListCollapsed && (
							<>
								{/* Name Filter */}
								<div className="mb-3">
									<Input
										placeholder="Nach Namen suchen..."
										value={nameFilter}
										onChange={(e) => setNameFilter(e.target.value)}
										className="text-xs h-8"
									/>
								</div>

								{/* Station Filter */}
								<div className="mb-3">
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

								{/* Shift Filter */}
								<div className="mb-3">
									<Select value={shiftFilter} onValueChange={setShiftFilter}>
										<SelectTrigger className="text-xs h-8">
											<SelectValue placeholder="Schicht filtern..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Alle Schichten</SelectItem>
											{shifts.map((shift) => (
												<SelectItem key={shift.id} value={shift.id}>
													{shift.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Filter Buttons */}
								<div className="flex gap-1 mb-3">
									<Button
										variant={availabilityFilter === 'all' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setAvailabilityFilter('all')}
										className="text-xs h-6 px-2">
										Alle
									</Button>
									<Button
										variant={availabilityFilter === 'free' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setAvailabilityFilter('free')}
										className="text-xs h-6 px-2">
										Frei
									</Button>
									<Button
										variant={availabilityFilter === 'partial' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setAvailabilityFilter('partial')}
										className="text-xs h-6 px-2">
										Teilweise
									</Button>
									<Button
										variant={availabilityFilter === 'full' ? 'default' : 'outline'}
										size="sm"
										onClick={() => setAvailabilityFilter('full')}
										className="text-xs h-6 px-2">
										Voll
									</Button>
								</div>

								{/* Clear All Filters Button */}
								{(nameFilter ||
									stationFilter !== 'all' ||
									shiftFilter !== 'all' ||
									availabilityFilter !== 'all') && (
									<div className="mb-3">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setNameFilter('');
												setStationFilter('all');
												setShiftFilter('all');
												setAvailabilityFilter('all');
											}}
											className="text-xs h-6 w-full">
											Alle Filter zurücksetzen
										</Button>
									</div>
								)}

								{/* Stats */}
								{(() => {
									const stats = getAvailabilityStats();
									return (
										<div className="flex gap-2 text-xs">
											<div className="flex items-center gap-1">
												<div className="w-2 h-2 rounded-full bg-red-500"></div>
												<span>{stats.free} frei</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="w-2 h-2 rounded-full bg-yellow-500"></div>
												<span>{stats.partial} teilweise</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="w-2 h-2 rounded-full bg-green-500"></div>
												<span>{stats.full} voll</span>
											</div>
										</div>
									);
								})()}
							</>
						)}
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-2">
						{!isMemberListCollapsed &&
							getFilteredMembers().map((member) => {
								const memberAssignments = getMemberAssignments(member.id);
								const availability = getMemberAvailability(member.id);
								const totalShifts = shifts.length;

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
														{memberAssignments.length}/{totalShifts}
													</Badge>
													<div
														className={cn(
															'w-2 h-2 rounded-full',
															availability === 'free' && 'bg-red-500',
															availability === 'partial' && 'bg-yellow-500',
															availability === 'full' && 'bg-green-500'
														)}></div>
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

											{/* Shift Preferences */}
											{getMemberShiftPreferences(member.id).length > 0 && (
												<div className="flex flex-wrap gap-1">
													{getMemberShiftPreferences(member.id).map((shiftId) => {
														const shift = shifts.find((s) => s.id === shiftId);
														if (!shift) return null;
														return (
															<Badge
																key={shiftId}
																variant="outline"
																className="text-xs bg-blue-50 border-blue-200 text-blue-700">
																<Calendar className="h-2 w-2 mr-1 fill-current" />
																{shift.name}
															</Badge>
														);
													})}
												</div>
											)}

											{memberAssignments.length > 0 && (
												<div className="text-xs text-muted-foreground">
													{memberAssignments.map((assignment, index) => {
														const shift = shifts.find((s) => s.id === assignment.shift_id);
														const station = stations.find((s) => s.id === assignment.station_id);
														if (!shift || !station) return null;

														const date = new Date(shift.start_date).toLocaleDateString('de-AT', {
															weekday: 'short',
															day: '2-digit',
															month: '2-digit'
														});

														return (
															<div key={assignment.id} className="flex items-center gap-1">
																<Badge variant="secondary" className="text-xs">
																	{station.name}
																</Badge>
																<span>{date}</span>
															</div>
														);
													})}
												</div>
											)}

											{/* Availability Progress Bar */}
											{totalShifts > 0 && (
												<div className="w-full bg-gray-200 rounded-full h-1.5">
													<div
														className={cn(
															'h-1.5 rounded-full transition-all',
															availability === 'free' && 'bg-red-500',
															availability === 'partial' && 'bg-yellow-500',
															availability === 'full' && 'bg-green-500'
														)}
														style={{
															width: `${(memberAssignments.length / totalShifts) * 100}%`
														}}></div>
												</div>
											)}
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</div>

			{/* Station Preference Dialog */}
			<Dialog open={showStationPreferenceDialog} onOpenChange={setShowStationPreferenceDialog}>
				<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle className="flex items-center gap-2">
							<Heart className="h-5 w-5 text-red-500" />
							Präferenzen für {selectedMemberForPreference?.first_name}{' '}
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

						{/* Shift Preferences */}
						<div>
							<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
								<Calendar className="h-4 w-4 text-blue-500" />
								Schichtwünsche
							</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Wählen Sie die Schichten aus, in denen {selectedMemberForPreference?.first_name}{' '}
								bevorzugt eingesetzt werden soll.
							</p>

							<div className="space-y-2">
								{shifts.map((shift) => {
									const isSelected =
										selectedMemberForPreference &&
										(
											tempShiftPreferences[selectedMemberForPreference.id] ||
											getMemberShiftPreferences(selectedMemberForPreference.id)
										).includes(shift.id);

									return (
										<div
											key={shift.id}
											className={cn(
												'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
												isSelected
													? 'bg-blue-50 border-blue-200'
													: 'hover:bg-gray-50 border-gray-200'
											)}
											onClick={() => {
												if (!selectedMemberForPreference) return;
												handleToggleShiftPreference(selectedMemberForPreference.id, shift.id);
											}}>
											<div
												className={cn(
													'w-4 h-4 rounded border-2 flex items-center justify-center',
													isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
												)}>
												{isSelected && <Calendar className="h-2 w-2 text-white fill-current" />}
											</div>
											<div className="flex-1">
												<div className="font-medium text-sm">{shift.name}</div>
												<div className="text-xs text-muted-foreground">
													{formatShiftTime(shift)}
												</div>
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

export default ShiftMatrix;
