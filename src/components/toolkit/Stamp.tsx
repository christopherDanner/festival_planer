import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const stampVariants = cva('inline-block whitespace-nowrap font-display font-semibold uppercase', {
	variants: {
		tone: {
			green: 'border-gruen text-gruen',
			red: 'border-rot text-rot',
			ink: 'border-tinte text-tinte',
			yellow: 'border-gelb text-tinte',
		},
		size: {
			sm: 'border-1.5 px-2 py-px text-[10.5px] tracking-[.05em]',
			md: 'border-2 px-2.5 py-0.5 text-[13px] tracking-[.06em]',
			lg: 'border-2.5 px-4 py-1.5 text-base tracking-[.08em]',
		},
		tilt: {
			left: 'stamp--tilt-left',
			right: 'stamp--tilt-right',
			none: '',
		},
		filled: {
			true: '',
			false: 'bg-white',
		},
	},
	compoundVariants: [
		{ filled: true, tone: 'green', className: 'bg-gruen text-white' },
		{ filled: true, tone: 'red', className: 'bg-rot text-white' },
		{ filled: true, tone: 'ink', className: 'bg-tinte text-white' },
		{ filled: true, tone: 'yellow', className: 'bg-gelb text-tinte' },
	],
	defaultVariants: {
		tone: 'green',
		size: 'md',
		tilt: 'left',
		filled: false,
	},
});

export interface StampProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof stampVariants> {}

/** Stempel: Versalien in Rahmenfarbe, leicht rotiert (DESIGN-VISION.md §4). */
export function Stamp({ className, tone, size, tilt, filled, ...props }: StampProps) {
	return <span className={cn(stampVariants({ tone, size, tilt, filled }), className)} {...props} />;
}
