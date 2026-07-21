import { cn } from '@/lib/utils';

import { SegmentedBase, type SegmentedOption } from './SegmentedBase';

export interface SegmentedControlProps<T extends string = string> {
	options: readonly SegmentedOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	/** Pflicht: Gruppenname für Screenreader, z. B. „Mengenquelle" */
	'aria-label': string;
	className?: string;
}

/** Segment-Schalter mit gelbem Aktiv-Zustand — ersetzt shadcn switch
(DESIGN-VISION.md §4, ADR 0003). Tastatur: Pfeiltasten wählen. */
export function SegmentedControl<T extends string = string>({
	options,
	value,
	onValueChange,
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
					'flex-1 border-r border-linie px-1 py-1.5 text-xs font-semibold last:border-r-0 max-[899px]:min-h-10',
					'focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-gelb font-bold text-tinte' : 'text-tinte-soft',
				)
			}
		/>
	);
}
