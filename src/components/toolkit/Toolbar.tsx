import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Ruler } from './Ruler';

/**
 * Die **Werkzeugleiste** eines Bereichs (Prototyp `.planbar`, DESIGN-VISION §8):
 * weiße Fläche im 2.5px-Tinte-Rahmen, links das KPI-Maßband, rechts die Griffe.
 *
 * Der Rahmen läuft rundum, obwohl der Prototyp die Leiste an die Tab-Leiste
 * schweißt: die Fest-Hülle setzt einen Abstand dazwischen, und am Handy gibt es
 * die Tab-Leiste gar nicht — eine fehlende Oberkante wäre dort ein offener
 * Kasten (Entscheid aus #102).
 */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-center gap-3 border-2.5 border-tinte bg-white px-3 py-2.5 min-[900px]:gap-3.5 min-[900px]:px-4',
				className
			)}>
			{children}
		</div>
	);
}

export interface ToolbarMetricProps {
	/** Was gezählt wird: „Besetzt", „Aufgaben". */
	label: string;
	/** Der Ist-Wert; `max` ist das Soll. */
	value: number;
	max: number;
	/** Ersetzt den abgeleiteten Vorlesetext des Maßbands. */
	valueText?: string;
}

/**
 * Die Kennzahl einer Werkzeugleiste: Aufschrift, `ist/soll` in der Akzentschrift
 * und das Maßband dahinter.
 *
 * Die **Ampel sitzt am Wert**: rot, solange etwas fehlt, grün wenn nichts mehr
 * fehlt. Gelb wäre als Text nicht lesbar — die Zwischenstufe trägt das Maßband.
 */
export function ToolbarMetric({ label, value, max, valueText }: ToolbarMetricProps) {
	return (
		<div className="flex min-w-[250px] flex-1 items-center gap-2.5">
			<b className="whitespace-nowrap text-xs font-bold uppercase tracking-[.06em]">{label}</b>
			<span
				className={cn(
					'whitespace-nowrap font-display text-base font-semibold tabular-nums tracking-[.02em]',
					value < max ? 'text-rot' : 'text-gruen'
				)}>
				{value}/{max}
			</span>
			<Ruler value={value} max={max} valueText={valueText} className="min-w-[90px] flex-1" />
		</div>
	);
}
