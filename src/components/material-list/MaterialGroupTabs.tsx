import React from 'react';

import { cn } from '@/lib/utils';
import { SegmentedBase } from '@/components/toolkit/SegmentedBase';
import { formatEuro } from '@/lib/money';
import type { MaterialAxis, MaterialGroup } from '@/lib/materialGrouping';

export interface MaterialGroupTabsProps {
	groups: MaterialGroup[];
	axis: MaterialAxis;
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Reiter-Streifen der Arbeitsliste (#113): je Gruppe ein Reiter mit Name,
 * Anzahl, Zwischensumme und den Preislücken. Der Streifen **bricht um und
 * scrollt nicht** — dieselbe Regel wie der Ampel-Streifen aus #68; auf der
 * Lieferanten-Achse sind das real ~13 sehr ungleich gefüllte Reiter.
 *
 * Auf der Achse ALLE entfällt der Streifen, weil es dort genau einen Kasten
 * gibt. Das Auswahlverhalten (Pfeiltasten, Roving-Tabindex) kommt aus dem
 * Toolkit-Baustein `SegmentedBase` — nur das Aussehen ist hier eigen, weil ein
 * Reiter mehr trägt als eine Beschriftung.
 */
const MaterialGroupTabs: React.FC<MaterialGroupTabsProps> = ({
	groups,
	axis,
	activeGroupId,
	onSelect
}) => {
	if (axis === 'all' || groups.length === 0) return null;

	const options = groups.map((group) => ({
		value: group.id,
		label: (
			<>
				<span className="flex items-baseline justify-between gap-2.5 font-display text-sm font-semibold uppercase tracking-[.03em]">
					{group.name}
					<span className="text-xs tabular-nums">{group.count}</span>
				</span>
				<span className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] font-medium text-tinte-soft">
					<span className="tabular-nums">{formatEuro(group.total)}</span>
					{group.withoutPrice > 0 ? (
						<span className="font-bold text-rot">{group.withoutPrice} ohne Preis</span>
					) : (
						<span aria-hidden>✓</span>
					)}
				</span>
			</>
		)
	}));

	return (
		<SegmentedBase
			options={options}
			value={activeGroupId ?? ''}
			onValueChange={onSelect}
			aria-label="Gruppe der Arbeitsliste"
			className="flex flex-wrap gap-2"
			buttonClassName={(active) =>
				cn(
					'flex min-w-[158px] flex-1 flex-col border-2 border-tinte px-3.5 pb-2 pt-2.5 text-left sm:flex-none',
					'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb shadow-versatz' : 'bg-white hover:bg-papier-getoent'
				)
			}
		/>
	);
};

export default MaterialGroupTabs;
