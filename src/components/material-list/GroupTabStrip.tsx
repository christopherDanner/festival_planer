import React from 'react';

import { cn } from '@/lib/utils';
import { SegmentedBase, type SegmentedOption } from '@/components/toolkit/SegmentedBase';

export interface GroupTabStripProps {
	options: readonly SegmentedOption[];
	activeId: string | null;
	onSelect: (id: string) => void;
	/** Pflicht: Gruppenname für Screenreader, z. B. „Gruppe der Arbeitsliste". */
	'aria-label': string;
}

/**
 * Der Reiter-Streifen des Material-Bereichs (#113): je Gruppe ein Reiter, der
 * mehr trägt als eine Beschriftung — Name, Anzahl und die Kennzahl der Gruppe.
 * Der Streifen **bricht um und scrollt nicht** (Regel des Ampel-Streifens aus
 * #68); der aktive Reiter ist gelb mit Versatz-Schatten.
 *
 * Arbeitsliste und Übernahme (#118) tragen denselben Streifen und füllen nur
 * die Reiter verschieden — zwei Fassungen des Rezepts liefen auseinander.
 * Das Auswahlverhalten (Pfeiltasten, Roving-Tabindex) kommt aus `SegmentedBase`.
 */
const GroupTabStrip: React.FC<GroupTabStripProps> = ({
	options,
	activeId,
	onSelect,
	'aria-label': ariaLabel
}) => {
	if (options.length === 0) return null;

	return (
		<SegmentedBase
			options={options}
			value={activeId ?? ''}
			onValueChange={onSelect}
			aria-label={ariaLabel}
			className="flex flex-wrap gap-2"
			buttonClassName={(active) =>
				cn(
					// Ein Breakpoint für die ganze App (DESIGN-VISION §6): unter 900px
					// teilen sich die Reiter die Zeile, darüber tragen sie ihre Breite.
					'flex min-w-[158px] flex-1 flex-col border-2 border-tinte px-3.5 pb-2 pt-2.5 text-left min-[900px]:flex-none',
					'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb shadow-versatz' : 'bg-white hover:bg-papier-getoent'
				)
			}
		/>
	);
};

/** Die Kopfzeile eines Reiters: Gruppenname links, Anzahl rechts. */
export const GroupTabTitle: React.FC<{ name: string; count: number }> = ({ name, count }) => (
	<span className="flex items-baseline justify-between gap-2.5 font-display text-sm font-semibold uppercase tracking-[.03em]">
		{name}
		<span className="text-xs tabular-nums">{count}</span>
	</span>
);

/** Die Fußzeile eines Reiters: die Kennzahlen der Gruppe. */
export const GroupTabFigures: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className
}) => (
	<span
		className={cn(
			'mt-0.5 flex items-baseline justify-between gap-2 text-[11px] font-medium text-tinte-soft',
			className
		)}>
		{children}
	</span>
);

export default GroupTabStrip;
