import { cn } from '@/lib/utils';

import { SegmentedBase, type SegmentedOption } from './SegmentedBase';

export interface ModeToggleProps<T extends string = string> {
	options: readonly SegmentedOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	/** Pflicht: Gruppenname für Screenreader, z. B. „Material-Modus" */
	'aria-label': string;
	className?: string;
}

/** Invertierter Modus-Umschalter (Tinte-Fläche, gelbe Schrift), z. B.
ARBEITSLISTE ⇄ ÜBERNAHME (DESIGN-VISION.md §4). Tastatur: Pfeiltasten wählen. */
export function ModeToggle<T extends string = string>({ options, value, onValueChange, className, 'aria-label': ariaLabel }: ModeToggleProps<T>) {
	return (
		<SegmentedBase
			options={options}
			value={value}
			onValueChange={(v) => onValueChange(v as T)}
			aria-label={ariaLabel}
			className={cn('inline-flex border-2 border-tinte', className)}
			buttonClassName={(active) =>
				cn(
					'whitespace-nowrap border-r border-linie px-4 py-2 text-[12.5px] font-bold last:border-r-0 max-[899px]:min-h-10',
					'focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte',
					active ? 'bg-tinte text-gelb' : 'bg-white text-tinte-soft',
				)
			}
		/>
	);
}
