import React from 'react';

import { cn } from '@/lib/utils';
import { SegmentedBase } from '@/components/toolkit/SegmentedBase';
import { StatusBar } from '@/components/toolkit/StatusBar';
import type { StationTab } from '@/lib/shiftBoard';

export interface StationTabStripProps {
	tabs: StationTab[];
	activeStationId: string | null;
	onSelect: (stationId: string) => void;
}

/**
 * Ampel-Reiter-Streifen des Schichtplans (#102, Entscheid 3 aus #68): je
 * Station ein Reiter mit Oswald-Name, `11/14` und Mini-Maßband in Ampel-Farbe.
 *
 * Der Streifen **bricht um und scrollt nicht**. Nach dem Wechsel auf die
 * Fokus-Werkbank ist er die einzige Gesamtübersicht — was hinter einem Rand
 * liegt, sieht niemand mehr; Höhe ist billiger als eine unsichtbare Lücke.
 * Das Auswahlverhalten (Pfeiltasten, Roving-Tabindex) kommt aus `SegmentedBase`,
 * eigen ist nur das Aussehen: ein Reiter trägt mehr als eine Beschriftung.
 */
const StationTabStrip: React.FC<StationTabStripProps> = ({ tabs, activeStationId, onSelect }) => {
	if (tabs.length === 0) return null;

	const options = tabs.map((tab) => ({
		value: tab.station.id,
		label: (
			<>
				<span className="flex items-baseline justify-between gap-2 font-display text-sm font-semibold uppercase tracking-[.03em]">
					<span className="truncate">{tab.station.name}</span>
					<span className="flex-none text-xs tabular-nums">
						{tab.assigned}/{tab.required}
					</span>
				</span>
				{/* Die Zahl steht schon daneben — das Maßband ist Bild, kein zweiter
				Vorlesetext. */}
				<span aria-hidden className="mt-[7px] block">
					<StatusBar assigned={tab.assigned} required={tab.required} />
				</span>
			</>
		)
	}));

	return (
		<SegmentedBase
			options={options}
			value={activeStationId ?? ''}
			onValueChange={onSelect}
			aria-label="Station im Fokus"
			// Mobil zweispaltig, darüber das umbrechende Raster des Prototyps.
			className="grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]"
			buttonClassName={(active) =>
				cn(
					'block border-2 border-tinte px-3 pb-[9px] pt-2.5 text-left',
					'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb shadow-versatz' : 'bg-white hover:bg-papier-getoent'
				)
			}
		/>
	);
};

export default StationTabStrip;
