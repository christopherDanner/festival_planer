import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface MastProps {
	/** Festname bzw. Seitentitel, gesetzt in der Akzentschrift */
	title: string;
	/** Zeile rechts vom Titel, z. B. Datum + Countdown */
	when?: ReactNode;
	/** Rechtsbündiger Bereich (Aktionen, Menü) */
	end?: ReactNode;
	/** Kompakt-Variante für <900px: gleiche Inhalte, reduziert */
	compact?: boolean;
	/** Klick auf den Wordmark (→ Festliste); ohne Handler ist er nicht interaktiv */
	onWordmarkClick?: () => void;
	className?: string;
}

/**
 * Mast — grüne Kopfleiste mit Halftone-Raster, gelbem FESTMEISTER-Wordmark,
 * Titel und Zeitzeile (DESIGN-VISION.md §2/§4, Master-Prototyp `.mast`).
 */
export function Mast({ title, when, end, compact, onWordmarkClick, className }: MastProps) {
	const wordmarkClasses = cn(
		'font-display font-semibold tracking-[.04em] text-gelb',
		compact ? 'text-[13px]' : 'text-[15px]'
	);
	return (
		<header
			className={cn(
				'mast flex flex-wrap items-center border-2.5 border-tinte text-white',
				compact ? 'gap-x-3 gap-y-0.5 px-3.5 py-2.5' : 'gap-x-[18px] gap-y-1 px-5 py-3',
				className
			)}>
			{onWordmarkClick ? (
				<button
					type="button"
					onClick={onWordmarkClick}
					title="Zur Festliste"
					className={cn(wordmarkClasses, 'hover:underline')}>
					FESTMEISTER
				</button>
			) : (
				<span className={wordmarkClasses}>FESTMEISTER</span>
			)}
			<h1
				className={cn(
					'font-display font-semibold uppercase leading-tight tracking-[.015em]',
					compact ? 'text-[17px]' : 'text-[22px]'
				)}>
				{title}
			</h1>
			{when != null && (
				<span className={cn('text-kreide', compact ? 'text-xs' : 'text-[13px]')}>
					{when}
				</span>
			)}
			{end != null && <div className="ml-auto flex items-center gap-2">{end}</div>}
		</header>
	);
}
