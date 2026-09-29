import * as React from 'react';

import { cn } from '@/lib/utils';

export interface OpenSlotProps extends React.HTMLAttributes<HTMLElement> {
	/**
	 * `span` trägt dasselbe Rezept als reine Notiz — für Stellen, an denen die
	 * rote Lücke nichts zum Anklicken ist (#95: „ohne Station" in der Zeile).
	 */
	as?: 'button' | 'span';
	/**
	 * **Scharf**: es ist gewählt, wer hier hineingehört — der Platz ist jetzt ein
	 * Ziel und keine Klage mehr (#105). Rot heißt „hier fehlt jemand"; sobald
	 * jemand danebensteht, heißt Tinte-auf-Gelb „hier hin".
	 */
	armed?: boolean;
}

/** Freier Platz: gestrichelte rote Outline, rote Versalien („+1 OFFEN",
„HIER EINTRAGEN") — klickbar zum Besetzen (DESIGN-VISION.md §4). */
export function OpenSlot({ className, as = 'button', armed = false, ...props }: OpenSlotProps) {
	const recipe = cn(
		'inline-flex items-center justify-center gap-1.5 border-1.5 border-dashed border-rot bg-white px-2.5 py-[7px] text-[11.5px] font-bold uppercase tracking-[.03em] text-rot',
		as === 'button' && 'hover:bg-[oklch(0.97_0.02_30)]',
		// Blasses Gelb wie im Prototyp (`.armed .bslot.free`) — als Wert und nicht
		// als Token, weil es nur hier vorkommt und ADR 0003 §3 keine Tokens auf
		// Vorrat duldet; dieselbe Schreibweise wie der Hover eine Zeile darüber.
		armed && 'border-solid border-tinte bg-[oklch(0.97_0.03_92)] text-tinte ring-2 ring-inset ring-gelb',
		className,
	);

	if (as === 'span') return <span className={recipe} {...props} />;
	return <button type="button" className={recipe} {...props} />;
}
