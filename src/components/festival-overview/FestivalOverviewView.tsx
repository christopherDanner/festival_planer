import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	getStations,
	getStationShifts,
	getShiftAssignments,
	getStationHelpers
} from '@/lib/shiftService';
import { getMaterials } from '@/lib/materialService';
import { getScheduleDays } from '@/lib/scheduleService';
import { getSponsorings } from '@/lib/sponsorService';
import type { FestivalTab } from '@/components/festival/FestivalTabBar';
import Festplakat from './Festplakat';
import NumbersColumn from './NumbersColumn';
import GapColumn from './GapColumn';

interface FestivalOverviewViewProps {
	festivalId: string;
	festival: {
		id: string;
		name: string;
		start_date: string;
		end_date?: string;
		location?: string;
	};
	/** Absprung in einen anderen Fest-Tab (z. B. Ablaufplan). */
	onTabChange: (tab: FestivalTab) => void;
}

/** Leere Platzhalter-Spalte — Kopf steht, Inhalt folgt (#85 Zahlen). */
function PlaceholderColumn({ title }: { title: string }) {
	return (
		<div className="min-w-0">
			<h4 className="text-xs font-bold uppercase tracking-[.07em] text-tinte-soft">{title}</h4>
			<p className="mt-2 text-[12.5px] text-tinte-soft">folgt</p>
		</div>
	);
}

/**
 * Dashboard-Tab (`overview`) in Werkzeug-Plakat-Handschrift, Variante C „Festplakat"
 * (DESIGN-VISION §5): drei Spalten — Lücken (#86) · Festplakat · Zahlen (#85).
 * Dieses Gerüst baut Layout + Plakat; links/rechts sind Platzhalter. Die
 * Datenlade-Hooks bleiben erhalten und werden von #85/#86 genutzt.
 */
const FestivalOverviewView: React.FC<FestivalOverviewViewProps> = ({
	festivalId,
	festival,
	onTabChange
}) => {
	// Datenquellen für Lücken- und Zahlen-Spalten (#85/#86) — bereits hier geladen.
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

	const { data: stationHelpers = [] } = useQuery({
		queryKey: ['stationHelpers', festivalId],
		queryFn: () => getStationHelpers(festivalId)
	});

	const { data: materials = [] } = useQuery({
		queryKey: ['materials', festivalId],
		queryFn: () => getMaterials(festivalId)
	});

	const { data: scheduleDays = [] } = useQuery({
		queryKey: ['scheduleDays', festivalId],
		queryFn: () => getScheduleDays(festivalId)
	});

	const { data: sponsorings = [] } = useQuery({
		queryKey: ['sponsorings', festivalId],
		queryFn: () => getSponsorings(festivalId)
	});

	return (
		<div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
			{/* Links: Lücken (#86) — mobil nach dem Plakat */}
			<div className="order-2 min-[900px]:order-none">
				<GapColumn
					stations={stations}
					shifts={shifts}
					assignments={assignments}
					stationHelpers={stationHelpers}
					scheduleDays={scheduleDays}
					materials={materials}
					onTabChange={onTabChange}
				/>
			</div>

			{/* Mitte: Festplakat — mobil zuerst */}
			<div className="order-1 min-[900px]:order-none">
				<Festplakat
					festival={festival}
					scheduleDays={scheduleDays}
					onOpenSchedule={() => onTabChange('schedule')}
				/>
			</div>

			{/* Rechts: Zahlen (#85) — mobil nach den Lücken */}
			<div className="order-3 min-[900px]:order-none">
				<NumbersColumn
					stations={stations}
					shifts={shifts}
					assignments={assignments}
					stationHelpers={stationHelpers}
					materials={materials}
					sponsorings={sponsorings}
					onTabChange={onTabChange}
				/>
			</div>
		</div>
	);
};

export default FestivalOverviewView;
