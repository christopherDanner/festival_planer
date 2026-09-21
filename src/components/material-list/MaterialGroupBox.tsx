import React from 'react';

import { cn } from '@/lib/utils';
import { Poster } from '@/components/toolkit/Poster';
import { Stamp } from '@/components/toolkit/Stamp';
import { formatEuro } from '@/lib/money';
import { sumTotals, withoutPrice } from '@/lib/materialCosts';
import {
	categoryChipLabel,
	type GroupableMaterial,
	type MaterialAxis,
	type MaterialGroup
} from '@/lib/materialGrouping';

export interface MaterialGroupBoxProps {
	group: MaterialGroup;
	axis: MaterialAxis;
	/**
	 * Die sichtbaren Positionen der Gruppe — vom Kategorie-Chip schon gefiltert.
	 * Über sie rechnet der Kopf, *nicht* über `group.materials`.
	 */
	visibleMaterials: GroupableMaterial[];
	/** Kategorie-Chips der ganzen Gruppe (nicht der gefilterten Sicht). */
	categories: string[];
	activeCategory: string | null;
	onCategoryChange: (category: string | null) => void;
	onAddPosition: () => void;
	children: React.ReactNode;
}

/**
 * Gruppen-Kasten der Arbeitsliste (#113): grüner Halftone-Kopf mit Gruppenname,
 * Anzahl, Zwischensumme und Preislücken, darunter die Kategorie-Chips als
 * Filter *innerhalb* der Gruppe und die Positionstabelle (#114).
 *
 * Die Zahlen des Kopfs rechnen über die **sichtbaren** Positionen und heißen
 * genauso wie der Tabellenfuß darunter — der alte Widerspruch „Kopf summiert
 * alle, Fuß die gefilterten, bei fast gleichem Namen" ist damit weg (ADR 0006).
 */
const MaterialGroupBox: React.FC<MaterialGroupBoxProps> = ({
	group,
	axis,
	visibleMaterials,
	categories,
	activeCategory,
	onCategoryChange,
	onAddPosition,
	children
}) => {
	const gaps = withoutPrice(visibleMaterials);
	// Auf der Kategorie-Achse ist der Chip die Gruppe selbst; ein einzelner Chip
	// filtert nichts. In beiden Fällen bleibt die Zeile weg.
	const showChips = axis !== 'category' && categories.length > 1;

	return (
		<div className="border-2.5 border-tinte bg-white">
			{/* Der Kasten selbst trägt den Rahmen — der Kopf nur die Trennlinie. */}
			<Poster className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-0 border-b-2 px-4 py-2.5">
				<h3 className="font-display text-lg font-semibold uppercase tracking-[.02em]">
					{group.name}
				</h3>
				<span className="text-xs text-papier">
					{visibleMaterials.length}{' '}
					{visibleMaterials.length === 1 ? 'Position' : 'Positionen'}
					{/* Gleiche Beschriftung wie der Tabellenfuß — dieselbe Zahl darf
					nicht zwei Namen haben (ADR 0006). */}
					{' · Zwischensumme (gefiltert) '}
					<b className="font-display font-semibold tabular-nums text-gelb">
						{formatEuro(sumTotals(visibleMaterials))}
					</b>
				</span>
				{gaps > 0 && (
					// Rot auf grüner Fläche wäre unlesbar — der Stempel trägt das Rot
					// auf Weiß.
					<Stamp tone="red" size="sm" tilt="none">
						{gaps} ohne Preis
					</Stamp>
				)}
				<button
					type="button"
					onClick={onAddPosition}
					className="ml-auto bg-gelb px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte max-[899px]:min-h-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papier"
				>
					{addPositionLabel(group, axis)}
				</button>
			</Poster>

			{showChips && (
				<div className="flex flex-wrap items-center gap-1.5 border-b border-linie px-4 py-2.5">
					<span className="mr-1 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-tinte-soft">
						Kategorie
					</span>
					{categories.map((category) => {
						const active = category === activeCategory;
						return (
							<button
								key={category}
								type="button"
								data-chip={category}
								aria-pressed={active}
								onClick={() => onCategoryChange(active ? null : category)}
								className={cn(
									'border-1.5 border-tinte px-2.5 py-0.5 text-[11.5px] font-bold',
									// Tippziel ≥ 40px am Handy (DESIGN-VISION §6), wie im Toolkit.
									'max-[899px]:min-h-10 max-[899px]:px-3.5',
									'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
									active ? 'bg-tinte text-white' : 'bg-white text-tinte'
								)}
							>
								{categoryChipLabel(category)}
							</button>
						);
					})}
				</div>
			)}

			{children}
		</div>
	);
};

/** „+ POSITION FÜR AUSSCHANK" — nur wo die Gruppe für eine Zuordnung steht.
Die Restgruppe und die Achse ALLE stehen für keine, dort bleibt es „+ POSITION". */
function addPositionLabel(group: MaterialGroup, axis: MaterialAxis): string {
	if (axis === 'all' || group.unassigned) return '+ POSITION';
	return `+ POSITION FÜR ${group.name.toLocaleUpperCase('de')}`;
}

export default MaterialGroupBox;
