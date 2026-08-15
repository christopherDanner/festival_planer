import React from 'react';

import { cn } from '@/lib/utils';
import { SegmentedBase } from '@/components/toolkit/SegmentedBase';
import type { HandoverGroup } from '@/lib/materialHandover';

export interface HandoverGroupTabsProps {
	groups: HandoverGroup[];
	activeGroupId: string | null;
	onSelect: (groupId: string) => void;
}

/**
 * Reiter-Streifen der Übernahme (#118): je Station ein Reiter mit Name, Anzahl
 * und den Positionen, die neu angelegt würden. Optik und Verhalten wie in der
 * Arbeitsliste (#113) — der Streifen **bricht um und scrollt nicht**, der aktive
 * Reiter ist gelb mit Versatz-Schatten.
 *
 * Wo die Arbeitsliste die Zwischensumme trägt, steht hier „n neu": die Übernahme
 * setzt Mengen, sie rechnet kein Geld.
 */
const HandoverGroupTabs: React.FC<HandoverGroupTabsProps> = ({
	groups,
	activeGroupId,
	onSelect
}) => {
	if (groups.length === 0) return null;

	const options = groups.map((group) => ({
		value: group.id,
		label: (
			<>
				<span className="flex items-baseline justify-between gap-2.5 font-display text-sm font-semibold uppercase tracking-[.03em]">
					{group.name}
					<span className="text-xs tabular-nums">{group.count}</span>
				</span>
				<span className="mt-0.5 flex items-baseline justify-end text-[11px] font-medium text-tinte-soft">
					{group.newCount > 0 ? (
						<span className="font-bold text-gruen">{group.newCount} neu</span>
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
			aria-label="Station der Übernahme"
			className="flex flex-wrap gap-2"
			buttonClassName={(active) =>
				cn(
					// Ein Breakpoint für die ganze App (DESIGN-VISION §6).
					'flex min-w-[158px] flex-1 flex-col border-2 border-tinte px-3.5 pb-2 pt-2.5 text-left min-[900px]:flex-none',
					'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb shadow-versatz' : 'bg-white hover:bg-papier-getoent'
				)
			}
		/>
	);
};

export default HandoverGroupTabs;
