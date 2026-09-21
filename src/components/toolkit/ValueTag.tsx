import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const valueTagVariants = cva(
	'inline-flex items-baseline gap-1.5 whitespace-nowrap border-1.5 px-[9px] py-[3px] text-[11.5px] font-bold',
	{
		variants: {
			tone: {
				/** Leistung mit Standardwert — die Wertmarke der Vision. */
				green: 'border-gruen bg-white text-gruen',
				/** Betrag ohne Standardwert (Freibetrag): Tinte-Rahmen auf Papiergrund. */
				ink: 'border-tinte bg-papier text-tinte',
				/** Nichts erfasst / Sachleistung: gestrichelt grau. */
				muted: 'border-dashed border-tinte-soft bg-white text-tinte-soft'
			},
			/** Durchgedrückt: Fläche in der Rahmenfarbe, Schrift hell — für die
			Marke, die *gewählt* ist und nicht nur einen Wert nennt (#95). */
			filled: { true: '', false: '' }
		},
		compoundVariants: [
			{ filled: true, tone: 'green', className: 'bg-gruen text-white' },
			{ filled: true, tone: 'ink', className: 'bg-tinte text-white' }
		],
		defaultVariants: { tone: 'green', filled: false }
	}
);

export interface ValueTagProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof valueTagVariants> {
	/** Betrag rechts in Akzentschrift, z. B. „€ 200" */
	value?: React.ReactNode;
	/** Überschriebener Wert wird rot (DESIGN-VISION.md §4) */
	overridden?: boolean;
}

/** Wertmarke: Kategoriename + Akzentschrift-Wert (DESIGN-VISION.md §4 „Wertmarke"). */
export function ValueTag({
	className,
	children,
	value,
	overridden,
	tone,
	filled,
	...props
}: ValueTagProps) {
	return (
		<span className={cn(valueTagVariants({ tone, filled }), className)} {...props}>
			{children}
			{value != null && (
				<span
					className={cn(
						'font-display text-xs font-semibold tracking-[.02em]',
						overridden && 'text-rot'
					)}
				>
					{value}
				</span>
			)}
		</span>
	);
}
