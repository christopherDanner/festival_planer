import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
	children: ReactNode;
	className?: string;
	/** Überschriftsebene — im Dialog sitzt die Zwischenzeile unter dem Titel
	 * und muss eine Stufe tiefer stehen (#117). */
	as?: 'h2' | 'h3' | 'h4';
}

/**
 * Zwischenzeile: Versalien-Überschrift mit Punktraster-Linie als Sektionstrenner.
 * Maße aus DESIGN-VISION.md §4 („Public Sans 700, 14px, Versalien,
 * letter-spacing .08em"), Linie wie `h2::after` im Master-Prototyp.
 */
export function SectionHeading({ children, className, as: Tag = 'h2' }: SectionHeadingProps) {
	return (
		<Tag
			className={cn(
				'flex items-center gap-3 text-sm font-bold uppercase tracking-[.08em]',
				className
			)}>
			{children}
			<span aria-hidden className="section-heading__rule h-[7px] flex-1" />
		</Tag>
	);
}
