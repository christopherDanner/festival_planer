import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
	children: ReactNode;
	className?: string;
}

/**
 * Zwischenzeile: Versalien-Überschrift mit Punktraster-Linie als Sektionstrenner
 * (DESIGN-VISION.md §4, Master-Prototyp `h2::after`).
 */
export function SectionHeading({ children, className }: SectionHeadingProps) {
	return (
		<h2
			className={cn(
				'flex items-center gap-3 text-[13px] font-bold uppercase tracking-[.09em] text-tinte-soft',
				className
			)}>
			{children}
			<span aria-hidden className="section-heading__rule h-[7px] flex-1" />
		</h2>
	);
}
