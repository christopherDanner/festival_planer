import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Plakat — grüne Plakatfläche mit Halftone-Raster und Tinte-Rahmen
 * (DESIGN-VISION.md §4/§5, Master-Prototyp `.plakat`). Trägt nur die Fläche;
 * Innenabstände und Inhalt bestimmt die aufrufende Ansicht.
 */
export function Poster({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('poster border-2.5 border-tinte text-white', className)} {...props} />;
}
