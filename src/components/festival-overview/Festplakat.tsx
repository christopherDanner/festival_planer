import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ScheduleDayWithPhases } from '@/lib/scheduleService';
import { formatFestDateRange, festCountdown } from '@/lib/festDates';
import { Poster } from '@/components/toolkit/Poster';
import { Stamp } from '@/components/toolkit/Stamp';
import { getProgramByDay, countProgramRows } from './programBoard';

interface FestplakatProps {
	festival: {
		name: string;
		start_date: string;
		end_date?: string;
		location?: string;
	};
	scheduleDays: ScheduleDayWithPhases[];
	/** Absprung in den Ablaufplan-Tab (Programm-Aushang lebt dort). */
	onOpenSchedule: () => void;
}

/**
 * Festplakat — Dashboard-Mitte in Werkzeug-Plakat-Handschrift (DESIGN-VISION §5,
 * Fächer Variante C). Grüner Halftone-Kopf mit Eckdaten + Countdown, darunter das
 * Programm als druckfertige Vorschau. Kein eigener Export — nur Vorschau + Absprung.
 */
const Festplakat: React.FC<FestplakatProps> = ({ festival, scheduleDays, onOpenSchedule }) => {
	const year = new Date(`${festival.start_date}T00:00:00`).getFullYear();
	const dateLine = `${formatFestDateRange(festival.start_date, festival.end_date).toUpperCase()} ${year}`;
	const countdown = festCountdown(festival.start_date, festival.end_date).toUpperCase();

	const programDays = getProgramByDay(scheduleDays);
	const programCount = countProgramRows(programDays);
	const hasProgram = programCount > 0;

	return (
		<Poster className="px-5 pb-5 pt-6 text-center">
			<h3 className="font-display text-3xl font-semibold uppercase leading-tight tracking-[.02em]">
				{festival.name}
			</h3>
			<div className="font-display mt-1 text-[17px] tracking-[.04em] text-gelb">{dateLine}</div>
			{festival.location && (
				<div className="mt-0.5 text-[12.5px] text-kreide">{festival.location}</div>
			)}

			<Stamp tone="yellow" size="md" tilt="none" filled className="mt-3 tracking-[.05em]">
				{countdown}
			</Stamp>

			{hasProgram ? (
				<div className="mt-4 border-2 border-tinte bg-white text-left text-tinte">
					{programDays.map((day) => (
						<div key={day.dayId}>
							<div className="font-display px-3.5 pb-0.5 pt-2 text-xs uppercase tracking-[.05em] text-gruen">
								{day.title}
							</div>
							{day.rows.map((row) => (
								<div key={row.id} className="flex items-baseline gap-2.5 px-3.5 py-1 text-[12.5px]">
									<time className="font-display w-[46px] flex-none text-[13px] tabular-nums">
										{row.time}
									</time>
									<span className="font-semibold">{row.title}</span>
								</div>
							))}
						</div>
					))}
					<div className="mt-2 border-t-1.5 border-linie px-3.5 py-1.5 text-[10.5px] text-tinte-soft">
						{programCount} {programCount === 1 ? 'Programmpunkt' : 'Programmpunkte'} · Aushang → Ablaufplan
					</div>
				</div>
			) : (
				<div className="mt-4 border-2 border-dashed border-white/60 bg-white/5 px-4 py-6 text-center">
					<Stamp tone="red" size="md" tilt="right">
						Noch kein Programm
					</Stamp>
					<p className="mt-3 text-[12.5px] text-kreide">
						Programmpunkte pflegst du im Ablaufplan — sie erscheinen dann hier als Aushang.
					</p>
				</div>
			)}

			<button
				type="button"
				onClick={onOpenSchedule}
				className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[.04em] text-gelb hover:underline">
				Ablaufplan <ArrowRight className="h-4 w-4" />
			</button>
		</Poster>
	);
};

export default Festplakat;
