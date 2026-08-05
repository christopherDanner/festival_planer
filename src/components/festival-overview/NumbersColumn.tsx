import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ruler } from '@/components/toolkit/Ruler';
import type { AmpelStatus } from '@/components/toolkit/status';
import type { FestivalTab } from '@/components/festival/FestivalTabBar';
import type { Station, StationShift, ShiftAssignment, StationMember } from '@/lib/shiftService';
import type { FestivalMaterial } from '@/lib/materialService';
import type { SponsoringWithDetails } from '@/lib/sponsorService';
import {
	deriveShiftsMetric,
	deriveMaterialOrdered,
	deriveMaterialConsumed,
	deriveSponsoringMetric,
	formatDeltaEuro,
	type DeltaTone
} from './numberBoxes';
import { formatEuro } from '@/lib/money';

interface NumbersColumnProps {
	stations: Station[];
	shifts: StationShift[];
	assignments: ShiftAssignment[];
	stationMembers: StationMember[];
	materials: FestivalMaterial[];
	sponsorings: SponsoringWithDetails[];
	/** Absprung in einen Fest-Tab (Pfeil je Kasten). */
	onTabChange: (tab: FestivalTab) => void;
}

/** Ampel-Farbe des Werts (§4). Gelb (L 0.86) ist auf Papier als Text nicht
lesbar — teilbesetzt bleibt daher in Tinte, das Gelb trägt das Maßband
darunter; leer/voll färben den Wert (rot/grün, beide lesbar). */
const ampelTextClass: Record<AmpelStatus, string> = {
	empty: 'text-rot',
	partial: 'text-tinte',
	complete: 'text-gruen'
};

const deltaTextClass: Record<DeltaTone, string> = {
	under: 'text-gruen',
	over: 'text-rot',
	equal: 'text-tinte-soft'
};

/** Ein Kennzahl-Kasten (`num`) in Werkzeug-Plakat-Handschrift: 2px Tinte-Rahmen,
Label mit Absprung-Pfeil, Wert in Akzentschrift, optional Maßband + Subzeile. */
function NumBox({
	label,
	value,
	valueClassName,
	onJump,
	jumpLabel,
	ruler,
	children
}: {
	label: string;
	value: string;
	valueClassName?: string;
	onJump: () => void;
	jumpLabel: string;
	ruler?: { value: number; max: number };
	children?: React.ReactNode;
}) {
	return (
		<div className="border-2 border-tinte bg-white px-3.5 py-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
					{label}
				</span>
				<button
					type="button"
					onClick={onJump}
					aria-label={jumpLabel}
					className="flex-none text-tinte-soft hover:text-tinte">
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
			<div
				className={cn(
					'font-display mt-1 text-[22px] font-semibold leading-none tabular-nums',
					valueClassName
				)}>
				{value}
			</div>
			{ruler && <Ruler size="small" value={ruler.value} max={ruler.max} className="mt-2" />}
			{children && <div className="mt-1.5 text-[11.5px] text-tinte-soft">{children}</div>}
		</div>
	);
}

/**
 * „Zahlen"-Spalte (rechts) des Dashboards (DESIGN-VISION §5, Fächer Variante C):
 * ein Stapel Kennzahl-Kästen mit Mini-Maßband, Ampel-Farben und Absprüngen in
 * die jeweiligen Fest-Tabs. Alle Werte rechnen live aus den geladenen Daten.
 */
const NumbersColumn: React.FC<NumbersColumnProps> = ({
	stations,
	shifts,
	assignments,
	stationMembers,
	materials,
	sponsorings,
	onTabChange
}) => {
	const schichten = deriveShiftsMetric(stations, shifts, assignments, stationMembers);
	const bestellt = deriveMaterialOrdered(materials);
	const verbraucht = deriveMaterialConsumed(materials);
	const sponsoring = deriveSponsoringMetric(sponsorings);
	const delta = formatDeltaEuro(verbraucht.delta);

	return (
		<div className="min-w-0">
			<h4 className="text-xs font-bold uppercase tracking-[.07em] text-tinte-soft">Zahlen</h4>
			<div className="mt-2 space-y-2.5">
				{/* 1 — Schichten besetzt */}
				<NumBox
					label="Schichten besetzt"
					value={schichten.isEmpty ? '—' : `${schichten.besetzt}/${schichten.gesamt}`}
					valueClassName={schichten.isEmpty ? 'text-tinte-soft' : ampelTextClass[schichten.status]}
					onJump={() => onTabChange('shifts')}
					jumpLabel="Zum Schichtplan"
					ruler={schichten.isEmpty ? undefined : { value: schichten.besetzt, max: schichten.gesamt }}>
					{schichten.isEmpty ? 'Noch keine Schichten' : `${schichten.fehlen} fehlen`}
				</NumBox>

				{/* 2 — Material bestellt */}
				<NumBox
					label="Material bestellt"
					value={bestellt.isEmpty ? '—' : formatEuro(bestellt.total)}
					valueClassName={bestellt.isEmpty ? 'text-tinte-soft' : undefined}
					onJump={() => onTabChange('materials')}
					jumpLabel="Zur Materialliste"
					ruler={bestellt.isEmpty ? undefined : { value: bestellt.withPrice, max: bestellt.positions }}>
					{bestellt.isEmpty ? (
						'Noch keine Positionen'
					) : (
						<>
							{bestellt.positions} Positionen
							{bestellt.withoutPrice > 0 && (
								<>
									{' · '}
									<span className="text-rot">{bestellt.withoutPrice} ohne Preis</span>
								</>
							)}
						</>
					)}
				</NumBox>

				{/* 3 — Verbraucht (Ist) */}
				<NumBox
					label="Verbraucht (Ist)"
					value={verbraucht.isEmpty ? '—' : formatEuro(verbraucht.consumed)}
					valueClassName={verbraucht.isEmpty ? 'text-tinte-soft' : undefined}
					onJump={() => onTabChange('materials')}
					jumpLabel="Zur Materialliste">
					{verbraucht.isEmpty ? (
						'Noch keine Positionen'
					) : (
						<>
							erfasst bei {verbraucht.recorded}/{verbraucht.positions}
							{' · '}
							<span className={deltaTextClass[delta.tone]}>{delta.text}</span>
						</>
					)}
				</NumBox>

				{/* 4 — Sponsoring */}
				<NumBox
					label="Sponsoring"
					value={sponsoring.isEmpty ? '—' : formatEuro(sponsoring.total)}
					valueClassName={sponsoring.isEmpty ? 'text-tinte-soft' : undefined}
					onJump={() => onTabChange('sponsoring')}
					jumpLabel="Zum Sponsoring">
					{sponsoring.isEmpty
						? 'Noch keine Sponsoren'
						: `${sponsoring.count} ${sponsoring.count === 1 ? 'Sponsor' : 'Sponsoren'}`}
				</NumBox>
			</div>
		</div>
	);
};

export default NumbersColumn;
