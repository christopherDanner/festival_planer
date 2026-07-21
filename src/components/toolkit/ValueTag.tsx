import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ValueTagProps extends React.HTMLAttributes<HTMLSpanElement> {
	/** Betrag rechts in Akzentschrift, z. B. „€ 200" */
	value?: React.ReactNode;
	/** Überschriebener Wert wird rot (DESIGN-VISION.md §4) */
	overridden?: boolean;
	/** Gestrichelt-graue Variante: „ohne Kategorie"/Sachleistung */
	muted?: boolean;
}

/** Wertmarke: grüner Rahmen, Kategoriename + Akzentschrift-Wert
(DESIGN-VISION.md §4 „Wertmarke"). */
export function ValueTag({ className, children, value, overridden, muted, ...props }: ValueTagProps) {
	return (
		<span
			className={cn(
				'inline-flex items-baseline gap-1.5 whitespace-nowrap border-1.5 bg-white px-[9px] py-[3px] text-[11.5px] font-bold',
				muted ? 'border-dashed border-tinte-soft text-tinte-soft' : 'border-gruen text-gruen',
				className,
			)}
			{...props}
		>
			{children}
			{value != null && <span className={cn('font-display text-xs font-semibold tracking-[.02em]', overridden && 'text-rot')}>{value}</span>}
		</span>
	);
}
