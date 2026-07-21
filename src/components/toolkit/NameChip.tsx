import * as React from 'react';

import { cn } from '@/lib/utils';

export interface NameChipProps extends React.HTMLAttributes<HTMLSpanElement> {
	/** Zeigt die ×-Entfernen-Aktion und wird beim Klick gerufen */
	onRemove?: () => void;
	/** A11y-Label der Entfernen-Aktion, z. B. „Maria Huber entfernen" */
	removeLabel?: string;
}

/** Namens-Marke: getönte Fläche mit Stanzloch-Punkt links, optional
×-Entfernen-Aktion (DESIGN-VISION.md §4 „Namens-Marke"). */
export function NameChip({ className, children, onRemove, removeLabel, ...props }: NameChipProps) {
	return (
		<span className={cn('name-chip inline-flex items-center gap-[7px] py-1 pl-[7px] pr-2.5 text-[12.5px] font-medium', className)} {...props}>
			{children}
			{onRemove && (
				<button
					type="button"
					aria-label={removeLabel ?? 'Entfernen'}
					onClick={onRemove}
					className="-my-1.5 -mr-2.5 ml-0.5 px-2 py-1.5 font-bold text-tinte-soft hover:text-rot focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
				>
					×
				</button>
			)}
		</span>
	);
}
