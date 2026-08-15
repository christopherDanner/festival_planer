import React from 'react';

import { formatEuro } from '@/lib/money';
import type { MaterialAxis, MaterialGroup } from '@/lib/materialGrouping';

import GroupTabStrip, { GroupTabFigures, GroupTabTitle } from './GroupTabStrip';

export interface MaterialGroupTabsProps {
	groups: MaterialGroup[];
	axis: MaterialAxis;
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Reiter-Streifen der Arbeitsliste (#113): je Gruppe ein Reiter mit Name,
 * Anzahl, Zwischensumme und den Preislücken. Streifen und Verhalten kommen aus
 * `GroupTabStrip` — die Übernahme (#118) trägt denselben.
 *
 * Auf der Achse ALLE entfällt der Streifen, weil es dort genau einen Kasten gibt.
 */
const MaterialGroupTabs: React.FC<MaterialGroupTabsProps> = ({
	groups,
	axis,
	activeGroupId,
	onSelect
}) => {
	if (axis === 'all') return null;

	const options = groups.map((group) => ({
		value: group.id,
		label: (
			<>
				<GroupTabTitle name={group.name} count={group.count} />
				<GroupTabFigures>
					<span className="tabular-nums">{formatEuro(group.total)}</span>
					{group.withoutPrice > 0 ? (
						<span className="font-bold text-rot">{group.withoutPrice} ohne Preis</span>
					) : (
						<span aria-hidden>✓</span>
					)}
				</GroupTabFigures>
			</>
		)
	}));

	return (
		<GroupTabStrip
			options={options}
			activeId={activeGroupId}
			onSelect={onSelect}
			aria-label="Gruppe der Arbeitsliste"
		/>
	);
};

export default MaterialGroupTabs;
