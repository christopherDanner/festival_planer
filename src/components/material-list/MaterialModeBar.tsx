import React from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/toolkit/ModeToggle';

/** Die zwei Modi des Bereichs Material: die Arbeitsliste selbst und die
Material-Übernahme aus einem Quellfest. */
export type MaterialMode = 'arbeitsliste' | 'uebernahme';

const MODES = [
	{ value: 'arbeitsliste' as const, label: 'ARBEITSLISTE' },
	{ value: 'uebernahme' as const, label: 'ÜBERNAHME' }
];

export interface MaterialModeBarProps {
	mode: MaterialMode;
	onModeChange: (mode: MaterialMode) => void;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	searchPlaceholder: string;
	searchLabel: string;
	/** Die Werkzeuge des jeweiligen Modus, rechts in der Leiste. */
	children?: React.ReactNode;
}

/**
 * Werkzeugleiste des Material-Bereichs: `[ARBEITSLISTE | ÜBERNAHME] [Suche …]`
 * und rechts die Werkzeuge des Modus.
 *
 * Beide Modi tragen dieselbe Leiste (#118) — der Umschalter **navigiert** in
 * beide Richtungen (Entscheid aus #66: die Übernahme bleibt eine eigene Route).
 * Deshalb liegt der Rahmen hier und nicht in einem der zwei Köpfe: sonst wäre
 * die eine Leiste zweimal gebaut und liefe auseinander.
 */
const MaterialModeBar: React.FC<MaterialModeBarProps> = ({
	mode,
	onModeChange,
	searchTerm,
	onSearchChange,
	searchPlaceholder,
	searchLabel,
	children
}) => (
	<div className="flex flex-wrap items-center gap-2 border-2.5 border-tinte bg-white px-3 py-2.5 min-[900px]:gap-2.5 min-[900px]:px-4">
		<ModeToggle
			options={MODES}
			value={mode}
			onValueChange={onModeChange}
			aria-label="Material-Modus"
		/>
		{/* Unter 900px rutscht die Suche in eine eigene Zeile, damit die Knöpfe
		nebeneinander bleiben (DESIGN-VISION §6, ein Breakpoint). */}
		<div className="relative order-last w-full min-w-[170px] flex-1 min-[900px]:order-none min-[900px]:w-auto">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
			<Input
				value={searchTerm}
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder={searchPlaceholder}
				aria-label={searchLabel}
				className="h-9 pl-9 text-[13px] max-[899px]:h-10"
			/>
		</div>
		{children}
	</div>
);

export default MaterialModeBar;
