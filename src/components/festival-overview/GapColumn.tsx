import React from 'react';
import { ArrowRight } from 'lucide-react';
import type {
	Station,
	StationShift,
	ShiftAssignmentWithMember,
	StationMemberWithDetails
} from '@/lib/shiftService';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { FestivalTab } from '@/components/festival/FestivalTabBar';
import { Stamp } from '@/components/toolkit/Stamp';
import { deriveGapBoard, formatDeadline, type StationGap } from './gapBoard';

interface GapColumnProps {
	stations: Station[];
	shifts: StationShift[];
	assignments: ShiftAssignmentWithMember[];
	stationMembers: StationMemberWithDetails[];
	scheduleDays: ScheduleDayWithPhases[];
	materials: FestivalMaterialWithStation[];
	/** Absprung in einen anderen Fest-Tab. */
	onTabChange: (tab: FestivalTab) => void;
}

/** Wie viele Stations-Kästen offen gezeigt werden; Rest hinter „+ n weitere". */
const TOP_STATIONS = 4;

/** Ein Lücken-Kasten: Titel (Oswald), rote Fehl-Markierung, Detailzeile, Absprung. */
function GapBox({
	title,
	marker,
	detail,
	actionLabel,
	onAction
}: {
	title: string;
	marker: string;
	detail: string;
	actionLabel: string;
	onAction: () => void;
}) {
	return (
		<div className="border-2 border-tinte bg-white p-3.5">
			<div className="flex items-baseline justify-between gap-2">
				<h5 className="font-display text-[15px] font-semibold uppercase leading-tight tracking-[.02em] text-tinte">
					{title}
				</h5>
				<span className="font-display flex-none text-[12.5px] font-semibold uppercase tracking-[.04em] text-rot">
					{marker}
				</span>
			</div>
			<p className="mt-1 text-[12.5px] leading-snug text-tinte-soft">{detail}</p>
			<button
				type="button"
				onClick={onAction}
				className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[.05em] text-gruen hover:underline">
				{actionLabel} <ArrowRight className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}

/** Detailzeile einer Station: konkrete Schichten „Sa 15–19 +1, …" bzw. Direktbesetzung. */
function stationDetail(gap: StationGap): string {
	if (gap.shiftGaps.length === 0) {
		return `Direktbesetzung — ${gap.missing} offen`;
	}
	return gap.shiftGaps.map((s) => `${s.label} +${s.missing}`).join(', ');
}

/**
 * „Da fehlt noch was"-Spalte (Dashboard links, DESIGN-VISION §5, Fächer Variante C):
 * Stapel von Lücken-Kästen — je unterbesetzte Station einer (nach Dringlichkeit,
 * Top-begrenzt), plus offene Aufgaben und Material ohne Preis. Leer → Stempel.
 */
const GapColumn: React.FC<GapColumnProps> = ({
	stations,
	shifts,
	assignments,
	stationMembers,
	scheduleDays,
	materials,
	onTabChange
}) => {
	const [expanded, setExpanded] = React.useState(false);
	const board = deriveGapBoard({ stations, shifts, assignments, stationMembers, scheduleDays, materials });

	const shownStations = expanded ? board.stationGaps : board.stationGaps.slice(0, TOP_STATIONS);
	const hiddenCount = board.stationGaps.length - shownStations.length;

	return (
		<div className="min-w-0">
			<h4 className="text-xs font-bold uppercase tracking-[.07em] text-tinte-soft">Da fehlt noch was</h4>

			{board.isEmpty ? (
				<div className="mt-3 border-2 border-dashed border-linie bg-white px-4 py-8 text-center">
					<Stamp tone="green" size="md" tilt="left" filled>
						Alles erledigt
					</Stamp>
					<p className="mt-3 text-[12.5px] text-tinte-soft">
						Alle Stationen besetzt, keine offenen Aufgaben, kein Material ohne Preis.
					</p>
				</div>
			) : (
				<div className="mt-3 space-y-3">
					{shownStations.map((gap) => (
						<GapBox
							key={gap.stationId}
							title={gap.stationName}
							marker={`${gap.missing} ${gap.missing === 1 ? 'Person' : 'Personen'}`}
							detail={stationDetail(gap)}
							actionLabel="Besetzen"
							onAction={() => onTabChange('shifts')}
						/>
					))}

					{hiddenCount > 0 && (
						<button
							type="button"
							onClick={() => setExpanded(true)}
							className="w-full border-2 border-dashed border-linie py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-tinte-soft hover:bg-muted">
							+ {hiddenCount} weitere
						</button>
					)}

					{board.openTasks && (
						<GapBox
							title="Aufgaben offen"
							marker={`${board.openTasks.count} offen`}
							detail={`Nächste Frist: ${formatDeadline(board.openTasks.deadline.date, board.openTasks.deadline.time)}`}
							actionLabel="Ablaufplan"
							onAction={() => onTabChange('schedule')}
						/>
					)}

					{board.materialsWithoutPrice > 0 && (
						<GapBox
							title="Material ohne Preis"
							marker={`${board.materialsWithoutPrice}`}
							detail={
								board.materialsWithoutPrice === 1
									? '1 Position ohne Stückpreis'
									: `${board.materialsWithoutPrice} Positionen ohne Stückpreis`
							}
							actionLabel="Material"
							onAction={() => onTabChange('materials')}
						/>
					)}
				</div>
			)}
		</div>
	);
};

export default GapColumn;
