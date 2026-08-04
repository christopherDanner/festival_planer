import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
	children: ReactNode;
	className?: string;
}

/**
 * Zwischenzeile: Versalien-Überschrift mit Punktraster-Linie als Sektionstrenner.
 * Maße aus DESIGN-VISION.md §4 („Public Sans 700, 14px, Versalien,
 * letter-spacing .08em"), Linie wie `h2::after` im Master-Prototyp.
 */
export function SectionHeading({ children, className }: SectionHeadingProps) {
	return (
		<h2
			className={cn(
				'flex items-center gap-3 text-sm font-bold uppercase tracking-[.08em]',
				className
			)}>
			{children}
			<span aria-hidden className="section-heading__rule h-[7px] flex-1" />
		</h2>
	);
}
