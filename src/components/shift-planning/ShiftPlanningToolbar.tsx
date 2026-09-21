import React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Ruler } from '@/components/toolkit/Ruler';
import type { ShiftsMetric } from '@/lib/staffing';

export interface ShiftPlanningToolbarProps {
	/** Besetzung über **alle** Stationen — dieselbe Zahl wie im Dashboard. */
	metric: ShiftsMetric;
	onAddStation: () => void;
	onAutoAssign: () => void;
	onShare: () => void;
}

/**
 * Werkzeugleiste des Schichtplans (#102):
 * `[BESETZT 41/52 ▬▬▬] [+ STATION] [AUTO-ZUTEILUNG] [Teilen / Export]`.
 *
 * Ersatzlos weg sind der **Vollbild-Modus** (die Fokus-Werkbank hat den
 * Platzdruck nicht mehr, der ihn nötig machte), **„+ Mitglied"** (steht am Fuß
 * der Helferliste) und **„Präferenzen"** (liegt im ⋮-Menü des Helfers) —
 * Entscheid 9 aus #68.
 *
 * Der Rahmen läuft rundum, obwohl der Prototyp die Leiste an die Tab-Leiste
 * schweißt: die Fest-Hülle setzt einen Abstand dazwischen, und am Handy gibt es
 * die Tab-Leiste gar nicht — eine fehlende Oberkante wäre dort ein offener
 * Kasten.
 */
const ShiftPlanningToolbar: React.FC<ShiftPlanningToolbarProps> = ({
	metric,
	onAddStation,
	onAutoAssign,
	onShare
}) => (
	<div className="flex flex-wrap items-center gap-3 border-2.5 border-tinte bg-white px-3 py-2.5 min-[900px]:gap-3.5 min-[900px]:px-4">
		<div className="flex min-w-[250px] flex-1 items-center gap-2.5">
			<b className="whitespace-nowrap text-xs font-bold uppercase tracking-[.06em]">Besetzt</b>
			<span
				className={cn(
					'whitespace-nowrap font-display text-base font-semibold tabular-nums tracking-[.02em]',
					// Ampel am Wert: rot solange Lücken, grün bei voll. Gelb wäre als
					// Text nicht lesbar — die Zwischenstufe trägt das Maßband.
					metric.fehlen > 0 ? 'text-rot' : 'text-gruen'
				)}
			>
				{metric.besetzt}/{metric.gesamt}
			</span>
			<Ruler value={metric.besetzt} max={metric.gesamt} className="min-w-[90px] flex-1" />
		</div>
		{/* Tippziele ≥ 40px am Handy (DESIGN-VISION §6); `size="sm"` ist 36px hoch. */}
		<Button
			variant="outline"
			size="sm"
			className="text-[12.5px] max-[899px]:min-h-10"
			onClick={onAddStation}
		>
			+ STATION
		</Button>
		<Button
			variant="outline"
			size="sm"
			className="text-[12.5px] max-[899px]:min-h-10"
			onClick={onAutoAssign}
		>
			AUTO-ZUTEILUNG
		</Button>
		<Button
			variant="ghost"
			size="sm"
			className="text-[12.5px] text-tinte-soft max-[899px]:min-h-10"
			onClick={onShare}
		>
			Teilen / Export
		</Button>
	</div>
);

export default ShiftPlanningToolbar;
