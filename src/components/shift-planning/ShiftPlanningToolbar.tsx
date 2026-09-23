import React from 'react';

import { Button } from '@/components/ui/button';
import { Toolbar, ToolbarMetric } from '@/components/toolkit/Toolbar';
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
 * Rahmen und Kennzahl kommen seit #122 aus `toolkit/Toolbar` — der Ablaufplan
 * trägt dieselbe Leiste, und zwei Kopien liefen sonst auseinander (ADR 0003).
 */
const ShiftPlanningToolbar: React.FC<ShiftPlanningToolbarProps> = ({
	metric,
	onAddStation,
	onAutoAssign,
	onShare
}) => (
	<Toolbar>
		<ToolbarMetric label="Besetzt" value={metric.besetzt} max={metric.gesamt} />
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
	</Toolbar>
);

export default ShiftPlanningToolbar;
