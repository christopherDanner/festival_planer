import React from 'react';

import { Poster } from '@/components/toolkit/Poster';
import { Stamp } from '@/components/toolkit/Stamp';
import type { HandoverGroup } from '@/lib/materialHandover';

export interface HandoverGroupBoxProps {
	group: HandoverGroup;
	children: React.ReactNode;
}

/**
 * Stations-Kasten der Übernahme (#118): grüner Halftone-Kopf mit Station und
 * Anzahl, darunter die Zeilen. Formgleich mit dem Gruppen-Kasten der
 * Arbeitsliste (#113) — nur zählt er Positionen und Neuanlagen statt Geld, denn
 * die Übernahme setzt Mengen und rechnet keine Kosten.
 */
const HandoverGroupBox: React.FC<HandoverGroupBoxProps> = ({ group, children }) => (
	<div className="border-2.5 border-tinte bg-white">
		{/* Der Kasten selbst trägt den Rahmen — der Kopf nur die Trennlinie. */}
		<Poster className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-0 border-b-2 px-4 py-2.5">
			<h3 className="font-display text-lg font-semibold uppercase tracking-[.02em]">
				{group.name}
			</h3>
			<span className="text-xs text-papier">
				{group.count} {group.count === 1 ? 'Position' : 'Positionen'}
			</span>
			{group.newCount > 0 && (
				// Auf der grünen Fläche trägt der Stempel seine Farbe auf Weiß.
				<Stamp tone="green" size="sm" tilt="none">
					{group.newCount} {group.newCount === 1 ? 'wird' : 'werden'} neu angelegt
				</Stamp>
			)}
		</Poster>

		{children}
	</div>
);

export default HandoverGroupBox;
