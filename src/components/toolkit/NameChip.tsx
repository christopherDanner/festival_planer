import * as React from 'react';

import { cn } from '@/lib/utils';

/* `onSelect` ist auch ein DOM-Ereignis; die Marke belegt den Namen neu — bei
ihr ist „auswählen" die Geste, nicht das Markieren von Text. */
export interface NameChipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
	/** Zeigt die ×-Entfernen-Aktion und wird beim Klick gerufen */
	onRemove?: () => void;
	/** A11y-Label der Entfernen-Aktion, z. B. „Maria Huber entfernen" */
	removeLabel?: string;
	/** Macht die Marke **wählbar**: sie wird zum Knopf und trägt im gewählten
	Zustand die Tinte-Fläche. Schließt `onRemove` aus — eine Marke ist entweder
	eine Zuteilung, die man wegnimmt, oder eine Auswahl, die man trifft. */
	onSelect?: () => void;
	/** Nur mit `onSelect`: gewählt. */
	selected?: boolean;
}

const CHIP = 'inline-flex items-center gap-[7px] py-1 pl-[7px] pr-2.5 text-[12.5px] font-medium';

const FOCUS =
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

/** Namens-Marke: getönte Fläche mit Stanzloch-Punkt links, optional
×-Entfernen-Aktion oder — als Knopf — wählbar (DESIGN-VISION.md §4
„Namens-Marke"). */
export function NameChip({
	className,
	children,
	onRemove,
	removeLabel,
	onSelect,
	selected,
	...props
}: NameChipProps) {
	if (onSelect) {
		return (
			<button
				{...props}
				type="button"
				aria-pressed={Boolean(selected)}
				onClick={onSelect}
				className={cn(
					'name-chip',
					CHIP,
					FOCUS,
					// Tippziel ≥ 40px am Handy (DESIGN-VISION §6).
					'max-[899px]:min-h-10',
					selected && 'bg-tinte text-gelb',
					className
				)}>
				{children}
			</button>
		);
	}

	return (
		<span className={cn('name-chip', CHIP, className)} {...props}>
			{children}
			{onRemove && (
				<button
					type="button"
					aria-label={removeLabel ?? 'Entfernen'}
					onClick={onRemove}
					className={cn('-my-1.5 -mr-2.5 ml-0.5 px-2 py-1.5 font-bold text-tinte-soft hover:text-rot', FOCUS)}
				>
					×
				</button>
			)}
		</span>
	);
}
