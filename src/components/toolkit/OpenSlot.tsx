import * as React from 'react';

import { cn } from '@/lib/utils';

export interface OpenSlotProps extends React.HTMLAttributes<HTMLElement> {
	/**
	 * `span` trägt dasselbe Rezept als reine Notiz — für Stellen, an denen die
	 * rote Lücke nichts zum Anklicken ist (#95: „ohne Station" in der Zeile).
	 */
	as?: 'button' | 'span';
}

/** Freier Platz: gestrichelte rote Outline, rote Versalien („+1 OFFEN",
„HIER EINTRAGEN") — klickbar zum Besetzen (DESIGN-VISION.md §4). */
export function OpenSlot({ className, as = 'button', ...props }: OpenSlotProps) {
	const recipe = cn(
		'inline-flex items-center justify-center gap-1.5 border-1.5 border-dashed border-rot bg-white px-2.5 py-[7px] text-[11.5px] font-bold uppercase tracking-[.03em] text-rot',
		as === 'button' && 'hover:bg-[oklch(0.97_0.02_30)]',
		className,
	);

	if (as === 'span') return <span className={recipe} {...props} />;
	return <button type="button" className={recipe} {...props} />;
}
