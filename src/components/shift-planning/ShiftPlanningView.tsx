import React, { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useShiftPlanningData } from './hooks/useShiftPlanningData';
import { useShiftPlanningActions } from './hooks/useShiftPlanningActions';
import ShiftPlanningToolbar from './ShiftPlanningToolbar';
import StationTabStrip from './StationTabStrip';
import StationFocusBox from './StationFocusBox';
import NoStationsNotice from './NoStationsNotice';
import HelperRoster from './HelperRoster';
import StationDialog from './dialogs/StationDialog';
import StationShiftDialog from './dialogs/StationShiftDialog';
import HelperDialog from './dialogs/HelperDialog';
import AutoAssignDialog from './dialogs/AutoAssignDialog';
import ShareDialog from './dialogs/ShareDialog';
import { exportToExcel, exportToPdf } from '@/lib/exportService';
import { buildStationBoard, buildStationTabs, resolveFocusStationId } from '@/lib/shiftBoard';
import { autoAssignScope } from '@/lib/autoAssignScope';
import { buildHelperRoster, type HelperFilter } from '@/lib/helperRoster';
import { deriveShiftsMetric } from '@/lib/staffing';
import { useAssignmentPicker } from '@/hooks/useAssignmentPicker';
import type { Station, StationShift } from '@/lib/shiftService';
import { helperName, removeHelperMessage, type Helper } from '@/lib/helperService';

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
 * Gerechnet und gegliedert wird in `shiftBoard` bzw. `staffing`; diese Ansicht
 * hält den Zustand (Fokus-Station, Filter, Dialoge) und verdrahtet die Griffe.
 */
const ShiftPlanningView: React.FC<ShiftPlanningViewProps> = ({ festivalId, festivalName, festivalDate }) => {
	const { toast } = useToast();
	const data = useShiftPlanningData(festivalId);
	const actions = useShiftPlanningActions(festivalId);

	const [focusStationId, setFocusStationId] = useState<string | null>(null);
	const [helperSearch, setHelperSearch] = useState('');
	const [helperFilter, setHelperFilter] = useState<HelperFilter>('all');
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
	/**
	 * Das **Zuteilen** (#104): Ziehen und Antippen laufen hier zusammen. Was
	 * angenommen wird, entscheidet `shiftAssignment` — eine Regel für beide
	 * Wege; abgelehnt wird am Ziel mit einem Rot-Puls, nicht mit einem Toast.
	 * Der Store prüft gegen die Listen im Augenblick des Griffs, darum stehen sie
	 * als Geber und nicht als Wert darin.
	 */
	const { picker, snapshot: gesture } = useAssignmentPicker({
		source: () => data,
		onAssign: (target, helperId, position) => {
			// Das Gelingen bleibt ein Toast — abgelöst hat der Rot-Puls nur die
			// **Ablehnung**, die am Ziel steht, weil sie dort ihren Grund hat.
			const found = data.helpers.find((h) => h.id === helperId);
			const name = found ? helperName(found) : 'Der Helfer';
			if (target.kind === 'station') {
				actions.assignHelperToStation.mutate(
					{ stationId: target.stationId, helperId },
					{
						onSuccess: () =>
							toast({ title: 'Erfolg', description: `${name} wurde der Station zugewiesen.` })
					}
				);
				return;
			}
			actions.assignHelper.mutate(
				{ stationShiftId: target.shiftId, helperId, position },
				{ onSuccess: () => toast({ title: 'Erfolg', description: `${name} wurde zugewiesen.` }) }
			);
		}
	});

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

			{/* Werkbank: Fokus links, Helferliste rechts in 264px (#103). Unter
			900px bleibt eine Spalte — die Liste zeigt sich dort gar nicht erst,
			die Schublade am Handy baut #105. */}
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
									assign={{
										armed: gesture.armed,
										overKey: gesture.overKey,
										rejected: gesture.rejected,
										onDragOver: picker.dragOver,
										onDragLeave: picker.dragLeave,
										onAssign: picker.assign
									}}
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
									// Aus dem Platz bzw. aus der Fußzeile ohne Rückfrage: beides
									// ist mit einem Griff wieder eingetragen (#104).
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

				<HelperRoster
					roster={roster}
					focusStationName={focusStation?.name ?? null}
					search={helperSearch}
					onSearchChange={setHelperSearch}
					filter={helperFilter}
					onFilterChange={setHelperFilter}
					selected={gesture.picked}
					onSelectHelper={picker.pick}
					onCancelSelection={picker.cancel}
					onDragStart={picker.dragStart}
					onDragEnd={picker.dragEnd}
					onAddHelper={() => setDialogState({ type: 'helper' })}
					onEditHelper={(helper) => setDialogState({ type: 'helper', helper })}
					onRemoveHelper={(helper) => {
						// Entfernen nimmt die Zuteilungen mit (ADR 0005) — die Rückfrage
						// benennt das, sonst sähe die Geste aus wie „ausblenden".
						if (confirm(removeHelperMessage(helper))) {
							actions.deleteHelper.mutate(helper.id);
							// Sonst bliebe ein gelöschter Helfer ausgewählt und ließe sich
							// auf einen freien Platz setzen.
							if (gesture.picked?.id === helper.id) picker.cancel();
						}
					}}
				/>
			</div>

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
