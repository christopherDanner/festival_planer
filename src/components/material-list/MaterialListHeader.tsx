import React from 'react';

import { Button } from '@/components/ui/button';
import MaterialModeBar, { type MaterialMode } from './MaterialModeBar';

export type { MaterialMode };

export interface MaterialListHeaderProps {
	mode: MaterialMode;
	onModeChange: (mode: MaterialMode) => void;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	/** Positionen des Fests — steht im Platzhalter der Suche. */
	positionCount: number;
	onAddMaterial: () => void;
	onExport: () => void;
	onExportOrderList: () => void;
}

/**
 * Werkzeugleiste der Arbeitsliste (#113):
 * `[ARBEITSLISTE | ÜBERNAHME] [Suche …] [MATERIALLISTE] [BESTELLLISTE] [+ POSITION]`.
 *
 * Leiste, Umschalter und Suche kommen aus `MaterialModeBar` — die Übernahme
 * trägt dieselbe (#118); hier stehen nur die Werkzeuge dieses Modus.
 *
 * Die drei Filter-Dropdowns von früher sind weg — die Achse (`MaterialAxisBar`)
 * ersetzt sie, die Suche bleibt.
 */
const MaterialListHeader: React.FC<MaterialListHeaderProps> = ({
	mode,
	onModeChange,
	searchTerm,
	onSearchChange,
	positionCount,
	onAddMaterial,
	onExport,
	onExportOrderList
}) => (
	<MaterialModeBar
		mode={mode}
		onModeChange={onModeChange}
		searchTerm={searchTerm}
		onSearchChange={onSearchChange}
		searchPlaceholder={`Suche in ${positionCount} Positionen …`}
		searchLabel="Material suchen"
	>
		<Button variant="outline" size="sm" className="text-[12.5px] max-[899px]:min-h-10" onClick={onExport}>
			MATERIALLISTE
		</Button>
		<Button variant="outline" size="sm" className="text-[12.5px] max-[899px]:min-h-10" onClick={onExportOrderList}>
			BESTELLLISTE
		</Button>
		{/* Tippziele ≥ 40px am Handy (DESIGN-VISION §6); `size="sm"` ist 36px hoch. */}
		<Button size="sm" className="text-[12.5px] max-[899px]:min-h-10" onClick={onAddMaterial}>
			+ POSITION
		</Button>
	</MaterialModeBar>
);

export default MaterialListHeader;
