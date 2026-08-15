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
import HelperCard from './HelperCard';
import type { Station, StationShift, ShiftAssignmentWithHelper, StationHelperWithDetails } from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';

interface HelperSidebarProps {
	variant?: 'sidebar' | 'drawer';
	helpers: Helper[];
	stations: Station[];
	stationShifts: StationShift[];
	assignments: ShiftAssignmentWithHelper[];
	stationHelpers: StationHelperWithDetails[];
	stationPreferences: Record<string, string[]>;
	shiftPreferences: Record<string, string[]>;
	nameFilter: string;
	stationFilter: string;
	assignmentFilter: string;
	onNameFilterChange: (value: string) => void;
	onStationFilterChange: (value: string) => void;
	onAssignmentFilterChange: (value: string) => void;
	onDragStart: (helper: Helper) => void;
	onDragEnd: () => void;
	onTapSelect?: (helper: Helper) => void;
	/** „+ Neuen Helfer anlegen" am Fuß der Liste — hier hin ist der Knopf aus
	der Werkzeugleiste gewandert (#102); den Feinschliff der Liste macht #103. */
	onAddHelper?: () => void;
	onEditPreferences: (helper: Helper) => void;
	onEditHelper: (helper: Helper) => void;
	onDeleteHelper: (helper: Helper) => void;
}

/**
 * Die Helferliste des Fests (ADR 0005) — zugleich der einzige Ort, an dem
 * Helfer entstehen und verschwinden. Es gibt keinen Aktiv-Filter mehr: wer
 * nicht mitmacht, steht hier gar nicht erst.
 */
const HelperSidebar: React.FC<HelperSidebarProps> = ({
	variant = 'sidebar',
	helpers,
	stations,
	stationShifts,
	assignments,
	stationHelpers,
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
	onTapSelect,
	onAddHelper,
	onEditPreferences,
	onEditHelper,
	onDeleteHelper
}) => {
	const isDrawer = variant === 'drawer';
	const getHelperAssignments = (helperId: string) =>
		assignments.filter((a) => a.helper_id === helperId);

	const getHelperStationAssignments = (helperId: string) =>
		stationHelpers.filter((sm) => sm.helper_id === helperId);

	const isHelperAssigned = (helperId: string) =>
		getHelperAssignments(helperId).length > 0 || getHelperStationAssignments(helperId).length > 0;

	const filteredHelpers = helpers.filter((helper) => {
		if (
			nameFilter &&
			!`${helper.last_name} ${helper.first_name}`.toLowerCase().includes(nameFilter.toLowerCase())
		) {
			return false;
		}
		if (stationFilter !== 'all') {
			const helperPrefs = stationPreferences[helper.id] || [];
			if (!helperPrefs.includes(stationFilter)) return false;
		}
		if (assignmentFilter === 'free' && isHelperAssigned(helper.id)) return false;
		if (assignmentFilter === 'assigned' && !isHelperAssigned(helper.id)) return false;
		return true;
	});

	const freeCount = helpers.filter((h) => !isHelperAssigned(h.id)).length;
	const assignedCount = helpers.length - freeCount;

	return (
		<div className={isDrawer ? 'flex flex-col' : 'w-80 border-l bg-card flex flex-col'}>
			<div className={isDrawer ? 'px-4 pb-3 space-y-2' : 'p-4 border-b bg-background'}>
				{!isDrawer && (
					<h3 className="font-semibold flex items-center gap-2">
						<Users className="h-4 w-4" />
						Helfer ({filteredHelpers.length})
					</h3>
				)}
				<div className={isDrawer ? '' : 'mt-3'}>
					<Input
						placeholder="Nach Namen suchen..."
						value={nameFilter}
						onChange={(e) => onNameFilterChange(e.target.value)}
						className="text-xs h-8"
					/>
				</div>
				<div className={isDrawer ? 'grid grid-cols-2 gap-2' : 'mt-3 space-y-3'}>
					<Select value={assignmentFilter} onValueChange={onAssignmentFilterChange}>
						<SelectTrigger className="text-xs h-8">
							<SelectValue placeholder="Zuweisungsstatus..." />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle ({helpers.length})</SelectItem>
							<SelectItem value="free">Frei ({freeCount})</SelectItem>
							<SelectItem value="assigned">Zugeteilt ({assignedCount})</SelectItem>
						</SelectContent>
					</Select>
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
			<div className={isDrawer
				? 'overflow-y-auto px-4 pb-4 space-y-2 max-h-[50vh]'
				: 'flex-1 overflow-y-auto p-4 space-y-2'
			}>
				{filteredHelpers.map((helper) => (
					<HelperCard
						key={helper.id}
						helper={helper}
						assignments={getHelperAssignments(helper.id)}
						stationAssignments={getHelperStationAssignments(helper.id)}
						totalShifts={stationShifts.length}
						stationShifts={stationShifts}
						stations={stations}
						stationPreferences={stationPreferences[helper.id] || []}
						shiftPreferences={shiftPreferences[helper.id] || []}
						onDragStart={() => onDragStart(helper)}
						onDragEnd={onDragEnd}
						onTapSelect={onTapSelect ? () => onTapSelect(helper) : undefined}
						onEditPreferences={() => onEditPreferences(helper)}
						onEditHelper={() => onEditHelper(helper)}
						onDeleteHelper={() => onDeleteHelper(helper)}
					/>
				))}
			</div>
			{/* Helfer entstehen in dieser Liste (ADR 0005) — seit #102 auch der
			Knopf dafür, der vorher in der Werkzeugleiste stand. */}
			{onAddHelper && (
				<button
					type="button"
					onClick={onAddHelper}
					className="block w-full border-t-2 border-tinte bg-white px-4 py-3 text-center text-xs font-bold uppercase tracking-[.04em] text-tinte-soft hover:bg-papier-getoent hover:text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tinte">
					+ Neuen Helfer anlegen
				</button>
			)}
		</div>
	);
};

export default HelperSidebar;
