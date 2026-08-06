import React from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/toolkit/ModeToggle';

/** Die zwei Modi des Bereichs Material: die Arbeitsliste selbst und die
Material-Übernahme aus einem Quellfest. */
export type MaterialMode = 'arbeitsliste' | 'uebernahme';

const MODES = [
	{ value: 'arbeitsliste' as const, label: 'ARBEITSLISTE' },
	{ value: 'uebernahme' as const, label: 'ÜBERNAHME' }
];

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
 * Werkzeugleiste des Material-Bereichs (#113):
 * `[ARBEITSLISTE | ÜBERNAHME] [Suche …] [MATERIALLISTE] [BESTELLLISTE] [+ POSITION]`.
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
	<div className="flex flex-wrap items-center gap-2 border-2.5 border-tinte bg-white px-3 py-2.5 sm:gap-2.5 sm:px-4">
		<ModeToggle
			options={MODES}
			value={mode}
			onValueChange={onModeChange}
			aria-label="Material-Modus"
		/>
		<div className="relative order-last w-full min-w-[170px] flex-1 sm:order-none sm:w-auto">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
			<Input
				value={searchTerm}
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder={`Suche in ${positionCount} Positionen …`}
				aria-label="Material suchen"
				className="h-9 pl-9 text-[13px]"
			/>
		</div>
		<Button variant="outline" size="sm" className="text-[12.5px]" onClick={onExport}>
			MATERIALLISTE
		</Button>
		<Button variant="outline" size="sm" className="text-[12.5px]" onClick={onExportOrderList}>
			BESTELLLISTE
		</Button>
		<Button size="sm" className="text-[12.5px]" onClick={onAddMaterial}>
			+ POSITION
		</Button>
	</div>
);

export default MaterialListHeader;
