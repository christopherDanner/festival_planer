import React from 'react';

import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { MATERIAL_AXES, type MaterialAxis } from '@/lib/materialGrouping';

export interface MaterialAxisBarProps {
	axis: MaterialAxis;
	onAxisChange: (axis: MaterialAxis) => void;
}

/**
 * Achsen-Umschalter (#113, Entscheid aus #66): STATION zum Planen, LIEFERANT
 * zum Bestellen (die Achse der Bestellliste aus CONTEXT.md), KATEGORIE zum
 * Kostenprüfen, ALLE für ein einziges Papier.
 */
const MaterialAxisBar: React.FC<MaterialAxisBarProps> = ({ axis, onAxisChange }) => (
	<div className="flex flex-wrap items-center gap-3">
		<span className="text-[11px] font-extrabold uppercase tracking-[.07em] text-tinte-soft">
			Sortiert nach
		</span>
		<SegmentedControl
			options={MATERIAL_AXES}
			value={axis}
			onValueChange={onAxisChange}
			aria-label="Achse der Arbeitsliste"
			className="w-auto"
		/>
	</div>
);

export default MaterialAxisBar;
