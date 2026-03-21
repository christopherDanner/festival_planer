import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, MapPin, Users, Package, CalendarClock, AlertCircle } from 'lucide-react';
import { getStations, getStationShifts, getShiftAssignments, getStationMembers } from '@/lib/shiftService';
import { getMaterials } from '@/lib/materialService';
import { getScheduleDays } from '@/lib/scheduleService';
import { getMembers } from '@/lib/memberService';

interface FestivalOverviewViewProps {
	festivalId: string;
	festival: {
		id: string;
		name: string;
		start_date: string;
		end_date?: string;
		location?: string;
	};
	onEditFestival: () => void;
}

function StatsCard({ title, icon, value, subtitle, progress }: {
	title: string;
	icon: React.ReactNode;
	value: string;
	subtitle: string;
	progress?: number;
}) {
	return (
		<div className="rounded-xl border bg-card p-4">
			<div className="flex items-center gap-2 text-muted-foreground mb-2">
				<span className="h-4 w-4">{icon}</span>
				<span className="text-xs font-medium uppercase tracking-wide">{title}</span>
			</div>
			<div className="text-2xl font-bold">{value}</div>
			<div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
			{progress !== undefined && (
				<div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
					<div
						className="h-full bg-primary rounded-full transition-all"
						style={{ width: `${Math.min(progress * 100, 100)}%` }}
					/>
				</div>
			)}
		</div>
	);
}

const FestivalOverviewView: React.FC<FestivalOverviewViewProps> = ({
	festivalId,
	festival,
	onEditFestival
}) => {
	const { data: stations = [] } = useQuery({
		queryKey: ['stations', festivalId],
		queryFn: () => getStations(festivalId)
	});

	const { data: shifts = [] } = useQuery({
		queryKey: ['stationShifts', festivalId],
		queryFn: () => getStationShifts(festivalId)
	});

	const { data: assignments = [] } = useQuery({
		queryKey: ['assignments', festivalId],
		queryFn: () => getShiftAssignments(festivalId)
	});

	const { data: stationMembers = [] } = useQuery({
		queryKey: ['stationMembers', festivalId],
		queryFn: () => getStationMembers(festivalId)
	});

	const { data: materials = [] } = useQuery({
		queryKey: ['materials', festivalId],
		queryFn: () => getMaterials(festivalId)
	});

	const { data: scheduleDays = [] } = useQuery({
		queryKey: ['scheduleDays', festivalId],
		queryFn: () => getScheduleDays(festivalId)
	});

	const { data: members = [] } = useQuery({
		queryKey: ['members'],
		queryFn: () => getMembers(),
		select: (data) => data.filter((m) => m.is_active)
	});

	// Date string
	const dateString = new Date(festival.start_date).toLocaleDateString('de-AT') +
		(festival.end_date && festival.end_date !== festival.start_date
			? ` – ${new Date(festival.end_date).toLocaleDateString('de-AT')}`
			: '');

	// Stats: Stations — count stations where ALL required positions are filled
	const totalStations = stations.length;
	const fullyStaffedStations = stations.filter(station => {
		const stationShifts = shifts.filter(s => s.station_id === station.id);
		if (stationShifts.length === 0) {
			// Station without shifts: check station-level members vs required_people
			const stationLevelCount = stationMembers.filter(sm => sm.station_id === station.id).length;
			return stationLevelCount >= station.required_people;
		}
		// Station with shifts: every shift must be fully staffed
		return stationShifts.every(shift => {
			const shiftAssigned = assignments.filter(a => a.station_shift_id === shift.id).length;
			return shiftAssigned >= shift.required_people;
		});
	}).length;

	// Stats: Members — count unique members assigned to shifts OR stations
	const assignedMemberIds = new Set<string>();
	assignments.forEach(a => { if (a.member_id) assignedMemberIds.add(a.member_id); });
	stationMembers.forEach(sm => { if (sm.member_id) assignedMemberIds.add(sm.member_id); });
	const assignedMembers = assignedMemberIds.size;
	const totalMembers = members.length;
	const freeMembers = Math.max(0, totalMembers - assignedMembers);

	// Stats: Materials
	const totalMaterials = materials.length;
	const totalCost = materials.reduce((sum, m) => {
		if (m.unit_price != null) {
			return sum + m.unit_price * m.ordered_quantity;
		}
		return sum;
	}, 0);

	// Stats: Schedule
	const allEntries = scheduleDays.flatMap(day => day.phases?.flatMap(phase => phase.entries || []) || []);
	const totalTasks = allEntries.filter(e => e.type === 'task').length;
	const doneTasks = allEntries.filter(e => e.type === 'task' && e.status === 'done').length;

	// Action Items
	const actionItems: { text: string; severity: 'warning' | 'info' }[] = [];

	stations.forEach(station => {
		const stationShifts = shifts.filter(s => s.station_id === station.id);
		const totalNeeded = stationShifts.reduce((sum, s) => sum + s.required_people, 0);
		const shiftAssigned = assignments.filter(a => stationShifts.some(s => s.id === a.station_shift_id)).length;
		const stationLevelAssigned = stationMembers.filter(sm => sm.station_id === station.id).length;
		const totalAssigned = shiftAssigned + stationLevelAssigned;
		const needed = Math.max(0, (totalNeeded || station.required_people) - totalAssigned);
		if (needed > 0) {
			actionItems.push({ text: `${station.name}: ${needed} Personen fehlen noch`, severity: 'warning' });
		}
	});

	const openTasks = allEntries.filter(e => e.type === 'task' && e.status === 'open');
	if (openTasks.length > 0) {
		actionItems.push({ text: `${openTasks.length} Aufgaben im Ablaufplan noch offen`, severity: 'info' });
	}

	const noPriceMaterials = materials.filter(m => m.unit_price == null);
	if (noPriceMaterials.length > 0) {
		actionItems.push({ text: `${noPriceMaterials.length} Materialien ohne Preis`, severity: 'info' });
	}

	return (
		<div className="space-y-6">
			{/* Stats Grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					title="Stationen"
					icon={<MapPin />}
					value={`${fullyStaffedStations}/${totalStations}`}
					subtitle={`voll besetzt · ${totalStations - fullyStaffedStations} offen`}
					progress={totalStations > 0 ? fullyStaffedStations / totalStations : 0}
				/>
				<StatsCard
					title="Mitglieder"
					icon={<Users />}
					value={assignedMembers.toString()}
					subtitle={`eingeteilt \u00b7 ${freeMembers} frei`}
					progress={totalMembers > 0 ? assignedMembers / totalMembers : 0}
				/>
				<StatsCard
					title="Materialien"
					icon={<Package />}
					value={totalMaterials.toString()}
					subtitle={`Positionen \u00b7 \u20ac${totalCost.toLocaleString('de-AT')}`}
				/>
				<StatsCard
					title="Ablaufplan"
					icon={<CalendarClock />}
					value={`${doneTasks}/${totalTasks}`}
					subtitle="Aufgaben erledigt"
					progress={totalTasks > 0 ? doneTasks / totalTasks : 0}
				/>
			</div>

			{/* Action Items */}
			<div className="rounded-xl border bg-card p-5">
				<h3 className="font-semibold mb-3 flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-amber-500" />
					Handlungsbedarf
				</h3>
				<div className="space-y-2">
					{actionItems.map((item, i) => (
						<div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0">
							<span className={`h-2 w-2 rounded-full ${item.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
							<span className="text-foreground/80">{item.text}</span>
						</div>
					))}
					{actionItems.length === 0 && (
						<p className="text-sm text-muted-foreground">Alles erledigt!</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default FestivalOverviewView;
