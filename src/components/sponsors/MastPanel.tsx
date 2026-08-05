import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface MastPanelProps {
	className?: string;
	children: ReactNode;
}

/**
 * Kasten, der den Container-Rahmen des Masts nach unten fortsetzt: 2.5px
 * Tinte ringsum, aber keine obere Kante — Mast, Werkzeugleiste und Tabelle
 * lesen sich so als ein Stück Papier (DESIGN-VISION §4).
 */
export default function MastPanel({ className, children }: MastPanelProps) {
	return (
		<div className={cn('border-2.5 border-t-0 border-tinte bg-white', className)}>{children}</div>
	);
}
