import * as React from 'react';

import { cn } from '@/lib/utils';

export interface OpenSlotProps extends React.HTMLAttributes<HTMLElement> {
	/**
	 * `span` trägt dasselbe Rezept als reine Notiz — für Stellen, an denen die
	 * rote Lücke nichts zum Anklicken ist (#95: „ohne Station" in der Zeile).
	 */
	as?: 'button' | 'span';
	/**
	 * **Scharf**: eine Marke wartet darauf, hier abgelegt zu werden (#104).
	 * Gelber Innenschein, Rahmen von gestrichelt-rot auf durchgezogen-Tinte —
	 * so im abgenommenen Prototyp `entscheid-schichtplan-mobil.html`
	 * (`.armed .bslot.free`). Aus Rot wird Tinte, weil der Platz in diesem
	 * Augenblick kein Mangel mehr ist, sondern ein Angebot.
	 */
	armed?: boolean;
}

/**
 * Der **scharfe** Zustand als reine Fläche: gelber Innenschein auf aufgehelltem
 * Gelbgrund, Werte aus dem abgenommenen `entscheid-schichtplan-mobil.html`.
 *
 * `<OpenSlot armed>` tauscht zusätzlich den Rahmen von gestrichelt-rot auf
 * durchgezogen-Tinte. Flächen, die schon einen eigenen Rahmen tragen — die
 * Stationsmitglieder-Fußzeile des Schichtplans —, nehmen nur diesen Teil,
 * damit das Rezept nur an einer Stelle steht.
 */
export const ARMED_SURFACE =
	'bg-[oklch(0.97_0.03_92)] shadow-[inset_0_0_0_2px_oklch(var(--gelb))]';

/** Freier Platz: gestrichelte rote Outline, rote Versalien („+1 OFFEN",
„HIER EINTRAGEN") — klickbar zum Besetzen (DESIGN-VISION.md §4). */
export function OpenSlot({ className, as = 'button', armed, ...props }: OpenSlotProps) {
	const recipe = cn(
		'inline-flex items-center justify-center gap-1.5 border-1.5 border-dashed border-rot bg-white px-2.5 py-[7px] text-[11.5px] font-bold uppercase tracking-[.03em] text-rot',
		as === 'button' && 'hover:bg-[oklch(0.97_0.02_30)]',
		armed && cn('border-solid border-tinte text-tinte hover:bg-[oklch(0.94_0.05_92)]', ARMED_SURFACE),
		className,
	);

	if (as === 'span') return <span className={recipe} {...props} />;
	return <button type="button" className={recipe} {...props} />;
}
