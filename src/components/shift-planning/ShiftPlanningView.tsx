import React, { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShiftPlanningData } from './hooks/useShiftPlanningData';
import { useShiftPlanningActions } from './hooks/useShiftPlanningActions';
import ShiftPlanningToolbar from './ShiftPlanningToolbar';
import StationTabStrip from './StationTabStrip';
import StationFocusBox from './StationFocusBox';
import NoStationsNotice from './NoStationsNotice';
import HelperSidebar from './HelperSidebar';
import StationDialog from './dialogs/StationDialog';
import StationShiftDialog from './dialogs/StationShiftDialog';
import HelperDialog from './dialogs/HelperDialog';
import PreferenceDialog from './dialogs/PreferenceDialog';
import AutoAssignDialog from './dialogs/AutoAssignDialog';
import ShareDialog from './dialogs/ShareDialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { exportToExcel, exportToPdf } from '@/lib/exportService';
import { buildStationBoard, buildStationTabs, resolveFocusStationId } from '@/lib/shiftBoard';
import { deriveShiftsMetric } from '@/lib/staffing';
import type { Station, StationShift, ShiftAssignmentWithHelper } from '@/lib/shiftService';
import { removeHelperMessage, type Helper } from '@/lib/helperService';

/** Welcher Dialog offen ist. Der geschlossene Zustand heißt `'none'` und nicht
`null`: das Projekt läuft ohne `strictNullChecks`, und dort unterscheidet `null`
die Fälle nicht — TypeScript verlöre an jedem Zugriff die Verengung. */
type DialogState =
	| { type: 'none' }
	| { type: 'station'; station?: Station }
	| { type: 'stationShift'; station: Station; stationShift?: StationShift }
	| { type: 'helper'; helper?: Helper }
	| { type: 'preferences'; helper: Helper }
	// Ohne Station läuft die Zuteilung übers ganze Fest, mit Station nur über
	// deren Schichten („NUR DIESE STATION AUTO-FÜLLEN").
	| { type: 'autoAssign'; station?: Station };

interface ShiftPlanningViewProps {
	festivalId: string;
	festivalName?: string;
	festivalDate?: string;
}

/**
 * Der Schichtplan als **Fokus-Werkbank** (#102, Variante E der DESIGN-VISION):
 * Werkzeugleiste mit KPI-Maßband, darunter der Ampel-Reiter-Streifen aller
 * Stationen und **eine** Station im Fokus. Die Stationen stehen nicht mehr als
 * schmale Spalten nebeneinander — damit ist auch der Vollbild-Modus weg, der
 * nur dem Platzdruck dieser Spalten geschuldet war (Entscheid 9 aus #68).
 *
 * Gerechnet und gegliedert wird in `shiftBoard` bzw. `staffing`; diese Ansicht
 * hält den Zustand (Fokus-Station, Filter, Dialoge) und verdrahtet die Griffe.
 */
const ShiftPlanningView: React.FC<ShiftPlanningViewProps> = ({ festivalId, festivalName, festivalDate }) => {
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const data = useShiftPlanningData(festivalId);
	const actions = useShiftPlanningActions(festivalId);

	const [focusStationId, setFocusStationId] = useState<string | null>(null);
	const [nameFilter, setNameFilter] = useState('');
	const [stationFilter, setStationFilter] = useState('all');
	const [assignmentFilter, setAssignmentFilter] = useState('all');
	const [draggedHelper, setDraggedHelper] = useState<Helper | null>(null);
	const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
	const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
	const [isHelperDrawerOpen, setIsHelperDrawerOpen] = useState(false);

	const tabs = useMemo(
		() => buildStationTabs(data.stations, data.stationShifts, data.assignments, data.stationHelpers),
		[data.stations, data.stationShifts, data.assignments, data.stationHelpers]
	);
	// Beim ersten Rendern und nach dem Löschen der gewählten Station übernimmt
	// der erste Reiter.
	const activeStationId = resolveFocusStationId(tabs, focusStationId);
	const focusStation = tabs.find((t) => t.station.id === activeStationId)?.station ?? null;
	const board = focusStation
		? buildStationBoard(focusStation, data.stationShifts, data.assignments, data.stationHelpers)
		: null;
	const metric = deriveShiftsMetric(
		data.stations,
		data.stationShifts,
		data.assignments,
		data.stationHelpers
	);

	const handleTapSelect = (helper: Helper) => {
		setSelectedHelper(helper);
		setIsHelperDrawerOpen(false);
		toast({
			title: `${helper.last_name} ${helper.first_name} ausgewählt`,
			description: 'Tippe auf eine Station oder Schicht zum Zuweisen. Tippe erneut auf den Button um abzubrechen.',
		});
	};

	const handleTapAssignToShift = (stationShiftId: string) => {
		if (!selectedHelper) return;
		const stationShift = data.stationShifts.find((s) => s.id === stationShiftId);
		if (!stationShift) return;

		const currentAssignments = getAssignmentsForStationShift(stationShiftId);
		if (currentAssignments.length >= stationShift.required_people) {
			toast({ title: 'Hinweis', description: 'Diese Schicht ist bereits vollständig besetzt.', variant: 'destructive' });
			setSelectedHelper(null);
			return;
		}
		if (currentAssignments.some((a) => a.helper_id === selectedHelper.id)) {
			toast({ title: 'Hinweis', description: `${selectedHelper.last_name} ${selectedHelper.first_name} ist bereits dieser Schicht zugewiesen.`, variant: 'destructive' });
			setSelectedHelper(null);
			return;
		}

		const helper = selectedHelper;
		actions.assignHelper.mutate(
			{ stationShiftId, helperId: helper.id, position: nextFreePosition(currentAssignments) },
			{ onSuccess: () => toast({ title: 'Erfolg', description: `${helper.last_name} ${helper.first_name} wurde zugewiesen.` }) }
		);
		setSelectedHelper(null);
	};

	const handleTapAssignToStation = (stationId: string) => {
		if (!selectedHelper) return;

		const currentStationHelpers = data.stationHelpers.filter((sm) => sm.station_id === stationId);
		if (currentStationHelpers.some((sm) => sm.helper_id === selectedHelper.id)) {
			toast({ title: 'Hinweis', description: `${selectedHelper.last_name} ${selectedHelper.first_name} ist bereits dieser Station zugewiesen.`, variant: 'destructive' });
			setSelectedHelper(null);
			return;
		}

		const helper = selectedHelper;
		actions.assignHelperToStation.mutate(
			{ stationId, helperId: helper.id },
			{ onSuccess: () => toast({ title: 'Erfolg', description: `${helper.last_name} ${helper.first_name} wurde der Station zugewiesen.` }) }
		);
		setSelectedHelper(null);
	};

	const getAssignmentsForStationShift = (stationShiftId: string): ShiftAssignmentWithHelper[] => {
		return data.assignments.filter((a) => a.station_shift_id === stationShiftId);
	};

	/** Kleinste freie Platznummer einer Schicht. */
	const nextFreePosition = (currentAssignments: ShiftAssignmentWithHelper[]): number => {
		const usedPositions = currentAssignments.map((a) => a.position).sort((a, b) => a - b);
		let nextPosition = 1;
		for (const pos of usedPositions) {
			if (nextPosition === pos) nextPosition++;
			else break;
		}
		return nextPosition;
	};

	const handleDrop = async (stationShiftId: string, e: React.DragEvent) => {
		e.preventDefault();
		if (!draggedHelper) return;

		const stationShift = data.stationShifts.find((s) => s.id === stationShiftId);
		if (!stationShift) return;

		const currentAssignments = getAssignmentsForStationShift(stationShiftId);
		if (currentAssignments.length >= stationShift.required_people) {
			toast({
				title: 'Hinweis',
				description: 'Diese Schicht ist bereits vollständig besetzt.',
				variant: 'destructive'
			});
			setDraggedHelper(null);
			return;
		}

		if (currentAssignments.some((a) => a.helper_id === draggedHelper.id)) {
			toast({
				title: 'Hinweis',
				description: `${draggedHelper.last_name} ${draggedHelper.first_name} ist bereits dieser Schicht zugewiesen.`,
				variant: 'destructive'
			});
			setDraggedHelper(null);
			return;
		}

		actions.assignHelper.mutate(
			{ stationShiftId, helperId: draggedHelper.id, position: nextFreePosition(currentAssignments) },
			{
				onSuccess: () => {
					toast({
						title: 'Erfolg',
						description: `${draggedHelper.last_name} ${draggedHelper.first_name} wurde zugewiesen.`
					});
				}
			}
		);
		setDraggedHelper(null);
	};

	const handleDropOnStation = async (stationId: string, e: React.DragEvent) => {
		e.preventDefault();
		if (!draggedHelper) return;

		const station = data.stations.find((s) => s.id === stationId);
		if (!station) return;

		const currentStationHelpers = data.stationHelpers.filter(
			(sm) => sm.station_id === stationId
		);

		if (currentStationHelpers.some((sm) => sm.helper_id === draggedHelper.id)) {
			toast({
				title: 'Hinweis',
				description: `${draggedHelper.last_name} ${draggedHelper.first_name} ist bereits dieser Station zugewiesen.`,
				variant: 'destructive'
			});
			setDraggedHelper(null);
			return;
		}

		actions.assignHelperToStation.mutate(
			{ stationId, helperId: draggedHelper.id },
			{
				onSuccess: () => {
					toast({
						title: 'Erfolg',
						description: `${draggedHelper.last_name} ${draggedHelper.first_name} wurde der Station zugewiesen.`
					});
				}
			}
		);
		setDraggedHelper(null);
	};

	const handleExport = (exportFn: typeof exportToExcel | typeof exportToPdf) => {
		exportFn({
			festivalName: festivalName || 'Schichtplan',
			festivalDate: festivalDate || '',
			stations: data.stations,
			stationShifts: data.stationShifts,
			assignments: data.assignments,
			stationHelpers: data.stationHelpers,
		});
	};

	if (data.isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-lg">Lade Schichtplan...</div>
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4">
			<ShiftPlanningToolbar
				metric={metric}
				onAddStation={() => setDialogState({ type: 'station' })}
				onAutoAssign={() => setDialogState({ type: 'autoAssign' })}
				onShare={() => setIsShareDialogOpen(true)}
			/>

			{/* Mobile: Banner des ausgewählten Helfers */}
			{isMobile && selectedHelper && (
				<div className="flex items-center justify-between border-2 border-tinte bg-gelb px-3 py-2">
					<span className="text-sm font-semibold">
						{selectedHelper.last_name} {selectedHelper.first_name} — tippe auf einen freien Platz
					</span>
					<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedHelper(null)}>
						Abbrechen
					</Button>
				</div>
			)}

			<div className="flex items-start gap-4">
				<div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
					{data.stations.length === 0 ? (
						<NoStationsNotice onAddStation={() => setDialogState({ type: 'station' })} />
					) : (
						<>
							<StationTabStrip
								tabs={tabs}
								activeStationId={activeStationId}
								onSelect={setFocusStationId}
							/>
							{board && (
								<StationFocusBox
									board={board}
									isSelecting={Boolean(selectedHelper)}
									onAutoFill={() =>
										setDialogState({ type: 'autoAssign', station: board.station })
									}
									onEditStation={() =>
										setDialogState({ type: 'station', station: board.station })
									}
									onDeleteStation={() => {
										if (
											confirm(
												'Sind Sie sicher, dass Sie diese Station löschen möchten? Alle zugehörigen Schichten werden ebenfalls gelöscht.'
											)
										) {
											actions.deleteStation.mutate(board.station.id);
										}
									}}
									onAddShift={() =>
										setDialogState({ type: 'stationShift', station: board.station })
									}
									onEditShift={(shift) =>
										setDialogState({
											type: 'stationShift',
											station: board.station,
											stationShift: shift
										})
									}
									onDeleteShift={(shiftId) => {
										if (confirm('Sind Sie sicher, dass Sie diese Schicht löschen möchten?')) {
											actions.deleteStationShift.mutate(shiftId);
										}
									}}
									onAssignToShift={handleTapAssignToShift}
									onAssignToStation={() => handleTapAssignToStation(board.station.id)}
									onDropOnShift={handleDrop}
									onDropOnStation={(e) => handleDropOnStation(board.station.id, e)}
									onRemoveFromShift={(stationShiftId, helperId) =>
										actions.removeHelper.mutate({ stationShiftId, helperId })
									}
									onRemoveFromStation={(helperId) =>
										actions.removeHelperFromStation.mutate({
											stationId: board.station.id,
											helperId
										})
									}
								/>
							)}
						</>
					)}
				</div>

				{/* Desktop sidebar */}
				{!isMobile && (
					<div className="sticky top-4 flex max-h-[calc(100vh-7rem)] shrink-0">
						<HelperSidebar
							helpers={data.helpers}
							stations={data.stations}
							stationShifts={data.stationShifts}
							assignments={data.assignments}
							stationHelpers={data.stationHelpers}
							stationPreferences={data.stationPreferences}
							shiftPreferences={data.shiftPreferences}
							nameFilter={nameFilter}
							stationFilter={stationFilter}
							assignmentFilter={assignmentFilter}
							onNameFilterChange={setNameFilter}
							onStationFilterChange={setStationFilter}
							onAssignmentFilterChange={setAssignmentFilter}
							onDragStart={setDraggedHelper}
							onDragEnd={() => setDraggedHelper(null)}
							onAddHelper={() => setDialogState({ type: 'helper' })}
							onEditPreferences={(helper) => setDialogState({ type: 'preferences', helper })}
							onEditHelper={(helper) => setDialogState({ type: 'helper', helper })}
							onDeleteHelper={(helper) => {
								if (confirm(removeHelperMessage(helper))) {
									actions.deleteHelper.mutate(helper.id);
								}
							}}
						/>
					</div>
				)}
			</div>

			{/* Mobile FAB + Drawer */}
			{isMobile && (
				<>
					<Button
						className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 bg-primary hover:bg-primary/90"
						onClick={() => setIsHelperDrawerOpen(true)}
					>
						<Users className="h-6 w-6 text-primary-foreground" />
					</Button>
					<Drawer open={isHelperDrawerOpen} onOpenChange={setIsHelperDrawerOpen}>
						<DrawerContent className="max-h-[85vh]">
							<DrawerHeader className="pb-0">
								<DrawerTitle>Helfer</DrawerTitle>
							</DrawerHeader>
							<HelperSidebar
								variant="drawer"
								helpers={data.helpers}
								stations={data.stations}
								stationShifts={data.stationShifts}
								assignments={data.assignments}
								stationHelpers={data.stationHelpers}
								stationPreferences={data.stationPreferences}
								shiftPreferences={data.shiftPreferences}
								nameFilter={nameFilter}
								stationFilter={stationFilter}
								assignmentFilter={assignmentFilter}
								onNameFilterChange={setNameFilter}
								onStationFilterChange={setStationFilter}
								onAssignmentFilterChange={setAssignmentFilter}
								onDragStart={setDraggedHelper}
								onDragEnd={() => setDraggedHelper(null)}
								onTapSelect={handleTapSelect}
								onAddHelper={() => setDialogState({ type: 'helper' })}
								onEditPreferences={(helper) => setDialogState({ type: 'preferences', helper })}
								onEditHelper={(helper) => setDialogState({ type: 'helper', helper })}
								onDeleteHelper={(helper) => {
									if (confirm(removeHelperMessage(helper))) {
										actions.deleteHelper.mutate(helper.id);
									}
								}}
							/>
						</DrawerContent>
					</Drawer>
				</>
			)}

			{/* Dialogs */}
			<StationDialog
				open={dialogState.type === 'station'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				station={dialogState.type === 'station' ? dialogState.station : null}
				helpers={data.helpers}
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
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
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

			<HelperDialog
				open={dialogState.type === 'helper'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				helper={dialogState.type === 'helper' ? dialogState.helper : null}
				onSave={(formData) => {
					if (dialogState.type === 'helper' && dialogState.helper) {
						actions.updateHelper.mutate({ id: dialogState.helper.id, updates: formData });
					} else {
						actions.createHelper.mutate(formData);
					}
				}}
			/>

			<PreferenceDialog
				open={dialogState.type === 'preferences'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				helper={dialogState.type === 'preferences' ? dialogState.helper : null}
				stations={data.stations}
				stationShifts={data.stationShifts}
				stationPreferences={data.stationPreferences}
				shiftPreferences={data.shiftPreferences}
				onSave={(helperId, stationPrefs, shiftPrefs) => {
					actions.savePreferences.mutate({ helperId, stationPrefs, shiftPrefs });
				}}
			/>

			<AutoAssignDialog
				open={dialogState.type === 'autoAssign'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				onAssign={(config) => {
					// „Nur diese Station auto-füllen" heißt: dasselbe Verfahren über ein
					// gefiltertes Schicht-Array (Entscheid 6 aus #68). Die Regler zählen
					// weiter übers ganze Fest — sonst sammelt jemand in fünf Stationen je
					// drei Schichten. Der eigene Dialog dafür kommt in #108.
					const station = dialogState.type === 'autoAssign' ? dialogState.station : undefined;
					const stationShifts = station
						? data.stationShifts.filter((s) => s.station_id === station.id)
						: data.stationShifts;

					if (stationShifts.length === 0 || data.stations.length === 0 || data.helpers.length === 0) {
						toast({
							title: 'Fehler',
							description: 'Es müssen Schichten, Stationen und Helfer vorhanden sein.',
							variant: 'destructive'
						});
						return;
					}
					actions.autoAssign.mutate({
						stationShifts,
						stations: data.stations,
						helpers: data.helpers,
						config,
						stationPreferences: data.stationPreferences
					});
				}}
				onClear={() => actions.clearAssignments.mutate()}
				isLoading={actions.autoAssign.isPending}
			/>

			<ShareDialog
				open={isShareDialogOpen}
				onOpenChange={setIsShareDialogOpen}
				festivalName={festivalName || 'Schichtplan'}
				festivalDate={festivalDate || ''}
				stations={data.stations}
				stationShifts={data.stationShifts}
				assignments={data.assignments}
				stationHelpers={data.stationHelpers}
				helpers={data.helpers}
				onExportPdf={() => handleExport(exportToPdf)}
				onExportExcel={() => handleExport(exportToExcel)}
			/>
		</div>
	);
};

export default ShiftPlanningView;
