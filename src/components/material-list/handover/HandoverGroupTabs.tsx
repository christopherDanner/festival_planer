import React from 'react';

import GroupTabStrip, { GroupTabFigures, GroupTabTitle } from '../GroupTabStrip';
import type { HandoverGroup } from '@/lib/materialHandover';

export interface HandoverGroupTabsProps {
	groups: HandoverGroup[];
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Reiter-Streifen der Übernahme (#118): je Station ein Reiter mit Name, Anzahl
 * und den Positionen, die es bisher nur im Quellfest gibt. Streifen und
 * Verhalten kommen aus `GroupTabStrip`, genau wie in der Arbeitsliste (#113).
 *
 * Wo die Arbeitsliste die Zwischensumme trägt, steht hier „n nur Quelle": die
 * Übernahme setzt Mengen, sie rechnet kein Geld. Angelegt wird davon nur, was
 * eine Wunschmenge bekommt — der Reiter sagt darum, wo etwas zu holen wäre,
 * und verspricht keine Anlagen.
 */
const HandoverGroupTabs: React.FC<HandoverGroupTabsProps> = ({
	groups,
	activeGroupId,
	onSelect
}) => {
	const options = groups.map((group) => ({
		value: group.id,
		label: (
			<>
				<GroupTabTitle name={group.name} count={group.count} />
				<GroupTabFigures className="justify-end">
					{group.sourceOnlyCount > 0 ? (
						<span className="font-bold text-gruen">{group.sourceOnlyCount} nur Quelle</span>
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
			aria-label="Station der Übernahme"
		/>
	);
};

export default HandoverGroupTabs;
