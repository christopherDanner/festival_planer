import * as React from 'react';

import { cn } from '@/lib/utils';

export type OpenSlotProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Freier Platz: gestrichelte rote Outline, rote Versalien („+1 OFFEN",
„HIER EINTRAGEN") — klickbar zum Besetzen (DESIGN-VISION.md §4). */
export function OpenSlot({ className, ...props }: OpenSlotProps) {
	return (
		<button
			type="button"
			className={cn(
				'inline-flex items-center justify-center gap-1.5 border-1.5 border-dashed border-rot bg-white px-2.5 py-[7px] text-[11.5px] font-bold uppercase tracking-[.03em] text-rot hover:bg-[oklch(0.97_0.02_30)]',
				className,
			)}
			{...props}
		/>
	);
}
