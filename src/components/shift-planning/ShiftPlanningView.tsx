import React, { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useShiftPlanningData } from './hooks/useShiftPlanningData';
import { useShiftPlanningActions } from './hooks/useShiftPlanningActions';
import ShiftPlanningToolbar from './ShiftPlanningToolbar';
import StationTabStrip from './StationTabStrip';
import StationFocusBox from './StationFocusBox';
import NoStationsNotice from './NoStationsNotice';
import HelperRoster from './HelperRoster';
import type { HelperListProps } from './HelperRosterBody';
import HelperDrawer from './HelperDrawer';
import HelperSelectionBar from './HelperSelectionBar';
import StationDialog from './dialogs/StationDialog';
import StationShiftDialog from './dialogs/StationShiftDialog';
import HelperDialog from './dialogs/HelperDialog';
import AutoAssignDialog from './dialogs/AutoAssignDialog';
import ShareDialog from './dialogs/ShareDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportToExcel, exportToPdf } from '@/lib/exportService';
import { buildStationBoard, buildStationTabs, resolveFocusStationId } from '@/lib/shiftBoard';
import { autoAssignScope } from '@/lib/autoAssignScope';
import { buildHelperRoster, type HelperFilter } from '@/lib/helperRoster';
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
 * Unter 900px hat die Werkbank eine zweite Gestalt (#105): die Helferliste
 * liegt in einer **Schublade** hinter einem FAB, und ein **Auswahl-Streifen**
 * klebt oben, solange ein Helfer gewählt ist. Gerechnet wird nichts anders —
 * es sind dieselben Griffe in anderer Verpackung.
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
	const [helperSearch, setHelperSearch] = useState('');
	const [helperFilter, setHelperFilter] = useState<HelperFilter>('all');
	const [draggedHelper, setDraggedHelper] = useState<Helper | null>(null);
	const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
	const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

	const tabs = useMemo(
		() => buildStationTabs(data.stations, data.stationShifts, data.assignments, data.stationHelpers),
		[data.stations, data.stationShifts, data.assignments, data.stationHelpers]
	);
	// Beim ersten Rendern und nach dem Löschen der gewählten Station übernimmt
	// der erste Reiter.
	const activeStationId = resolveFocusStationId(tabs, focusStationId);
	const focusStation = tabs.find((t) => t.station.id === activeStationId)?.station ?? null;
	const board = useMemo(
		() =>
			focusStation
				? buildStationBoard(focusStation, data.stationShifts, data.assignments, data.stationHelpers)
				: null,
		[focusStation, data.stationShifts, data.assignments, data.stationHelpers]
	);
	const metric = useMemo(
		() =>
			deriveShiftsMetric(data.stations, data.stationShifts, data.assignments, data.stationHelpers),
		[data.stations, data.stationShifts, data.assignments, data.stationHelpers]
	);
	// Der Umfang des nächsten Laufs: ohne Station das ganze Fest, mit Station nur
	// deren Schichten („NUR DIESE STATION AUTO-FÜLLEN").
	const autoFillStation =
		dialogState.type === 'autoAssign' ? dialogState.station ?? null : null;
	const assignmentScope = useMemo(
		() => autoAssignScope(autoFillStation, data.stationShifts, data.assignments),
		[autoFillStation, data.stationShifts, data.assignments]
	);
	// Die Gruppierung hängt an der Fokus-Station: wechselt der Reiter, ordnet
	// sich die Liste nach der neuen Wunsch-Passung.
	const roster = useMemo(
		() =>
			buildHelperRoster({
				helpers: data.helpers,
				assignments: data.assignments,
				stationHelpers: data.stationHelpers,
				focusStationId: activeStationId,
				search: helperSearch,
				filter: helperFilter
			}),
		[data.helpers, data.assignments, data.stationHelpers, activeStationId, helperSearch, helperFilter]
	);

	/** Noch einmal auf dieselbe Marke heißt „doch nicht" — die gelbe Marke ist
	die einzige Anzeige der Auswahl, also muss sie sich auch zurücknehmen lassen. */
	const handleSelectHelper = (helper: Helper) =>
		setSelectedHelper((current) => (current?.id === helper.id ? null : helper));

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

	/**
	 * Die Helferliste hat zwei Gestalten und **einen** Satz Griffe: die
	 * 264px-Spalte am Desktop, die Schublade am Handy (#105). Dass beide
	 * dieselben Props nehmen, ist die Zusage „Inhalt ist dieselbe Helferliste".
	 */
	const rosterHandles: HelperListProps = {
		roster,
		focusStationName: focusStation?.name ?? null,
		search: helperSearch,
		onSearchChange: setHelperSearch,
		filter: helperFilter,
		onFilterChange: setHelperFilter,
		selectedHelperId: selectedHelper?.id ?? null,
		onSelectHelper: handleSelectHelper,
		onDragStart: setDraggedHelper,
		onDragEnd: () => setDraggedHelper(null),
		onAddHelper: () => setDialogState({ type: 'helper' }),
		onEditHelper: (helper) => setDialogState({ type: 'helper', helper }),
		onRemoveHelper: (helper) => {
			// Entfernen nimmt die Zuteilungen mit (ADR 0005) — die Rückfrage
			// benennt das, sonst sähe die Geste aus wie „ausblenden".
			if (confirm(removeHelperMessage(helper))) {
				actions.deleteHelper.mutate(helper.id);
				// Sonst bliebe ein gelöschter Helfer ausgewählt und ließe sich
				// auf einen freien Platz setzen.
				setSelectedHelper((current) => (current?.id === helper.id ? null : current));
			}
		}
	};

	return (
		<div className="space-y-3 sm:space-y-4">
			{/* Am Handy steht die gewählte Marke in der zugeschobenen Schublade —
			der Streifen ist dort die einzige Anzeige der Auswahl und klebt darum
			oben (#105). Am Desktop sagt die gelbe Marke in der Spalte dasselbe. */}
			{isMobile && (
				<HelperSelectionBar helper={selectedHelper} onCancel={() => setSelectedHelper(null)} />
			)}

			<ShiftPlanningToolbar
				metric={metric}
				onAddStation={() => setDialogState({ type: 'station' })}
				onAutoAssign={() => setDialogState({ type: 'autoAssign' })}
				onShare={() => setIsShareDialogOpen(true)}
			/>

			{/* Werkbank: Fokus links, Helferliste rechts in 264px (#103). Unter
			900px bleibt eine Spalte — die Liste steht dort in der Schublade (#105). */}
			<div className="grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_264px]">
				<div className="min-w-0 space-y-3 sm:space-y-4">
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
									// Die freien Plätze stehen scharf, sobald jemand bereitsteht
									// (#105) — sonst sagt der Auswahl-Streifen nur, *wen* man
									// gewählt hat, und nichts sagt *wohin*.
									armed={selectedHelper !== null}
									onAutoFill={() =>
										setDialogState({ type: 'autoAssign', station: board.station })
									}
									onEditStation={() =>
										setDialogState({ type: 'station', station: board.station })
									}
									// Die Rückfrage stellt das ⋮-Menü — sie kennt dort die
									// Tragweite, die der Fokus-Kasten zeigt (#106).
									onDeleteStation={() => actions.deleteStation.mutate(board.station.id)}
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
									onDeleteShift={(shiftId) => actions.deleteStationShift.mutate(shiftId)}
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

				{!isMobile && <HelperRoster {...rosterHandles} />}
			</div>

			{/* Der FAB liegt fest am Fensterrand über der Tab-Leiste — darum außerhalb
			des Werkbank-Rasters. */}
			{isMobile && <HelperDrawer {...rosterHandles} />}

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
							updates: formData
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

			{/* Ein Blatt für Stammdaten und Wünsche (#107) — den zweiten Dialog gab
			es nur, solange die Wünsche in einer eigenen Tabelle lagen (ADR 0005). */}
			<HelperDialog
				open={dialogState.type === 'helper'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				helper={dialogState.type === 'helper' ? dialogState.helper : null}
				stations={data.stations}
				stationShifts={data.stationShifts}
				onSave={(formData) => {
					if (dialogState.type === 'helper' && dialogState.helper) {
						actions.updateHelper.mutate({ id: dialogState.helper.id, updates: formData });
					} else {
						actions.createHelper.mutate(formData);
					}
				}}
			/>

			<AutoAssignDialog
				open={dialogState.type === 'autoAssign'}
				onOpenChange={(open) => !open && setDialogState({ type: 'none' })}
				scope={assignmentScope}
				onAssign={(config) => {
					// Einschränken heißt: dasselbe Verfahren über ein gefiltertes
					// Schicht-Array (Entscheid 6 aus #68) — der Service bleibt unberührt.
					if (
						assignmentScope.shifts.length === 0 ||
						data.stations.length === 0 ||
						data.helpers.length === 0
					) {
						toast({
							title: 'Fehler',
							description: 'Es müssen Schichten, Stationen und Helfer vorhanden sein.',
							variant: 'destructive'
						});
						return;
					}
					actions.autoAssign.mutate(
						{
							stationShifts: assignmentScope.shifts,
							stations: data.stations,
							helpers: data.helpers,
							config,
							stationPreferences: data.stationPreferences
						},
						// Erst wenn der Lauf durch ist — bis dahin steht „Zuteilen…"
						// auf dem Knopf, statt dass der Zettel im Nichts verschwindet.
						{ onSettled: () => setDialogState({ type: 'none' }) }
					);
				}}
				onClear={(stationId) => actions.clearAssignments.mutate({ stationId })}
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
