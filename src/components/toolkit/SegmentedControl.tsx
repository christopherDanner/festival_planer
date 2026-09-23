import { cn } from '@/lib/utils';

import { SegmentedBase, type SegmentedOption } from './SegmentedBase';

/** Die zwei Größen des Segment-Schalters. Ein Name für alle drei Stellen, die
sie nennen — Prop, Rezepttabelle und Aufrufer. */
export type SegmentedControlSize = 'sm' | 'md';

export interface SegmentedControlProps<T extends string = string> {
	options: readonly SegmentedOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	/** Pflicht: Gruppenname für Screenreader, z. B. „Mengenquelle" */
	'aria-label': string;
	/**
	 * `sm` für den Schalter *in* einem Tabellenkopf (#218): derselbe Schalter,
	 * nur so klein, dass er in eine 9 %-Spalte passt, und ohne das
	 * Handy-Tippziel — er steht dort, wo es ohnehin keine Handy-Sicht gibt.
	 */
	size?: SegmentedControlSize;
	className?: string;
}

const SIZE: Record<SegmentedControlSize, string> = {
	sm: 'px-1 py-0.5 text-[10px]',
	md: 'px-1 py-1.5 text-xs max-[899px]:min-h-10',
};

/** Segment-Schalter mit gelbem Aktiv-Zustand — ersetzt shadcn switch
(DESIGN-VISION.md §4, ADR 0003). Tastatur: Pfeiltasten wählen. */
export function SegmentedControl<T extends string = string>({
	options,
	value,
	onValueChange,
	size = 'md',
	className,
	'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
	return (
		<SegmentedBase
			options={options}
			value={value}
			onValueChange={(v) => onValueChange(v as T)}
			aria-label={ariaLabel}
			className={cn('flex border-2 border-tinte bg-white', className)}
			buttonClassName={(active) =>
				cn(
					'flex-1 border-r border-linie font-semibold last:border-r-0',
					SIZE[size],
					'focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb font-bold text-tinte' : 'text-tinte-soft',
				)
			}
		/>
	);
}
