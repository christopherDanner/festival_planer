import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ZettelPopoverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Das Trefferfeld: eine Zelle, ein Spaltenkopf oder ein Knopf der Werkzeugleiste. */
	trigger: React.ReactNode;
	/** Ausrichtung unter dem Trefferfeld; „end" hängt ihn an dessen rechte Kante. */
	align?: 'start' | 'end';
	/** Der Zettel; er bringt seinen eigenen Rahmen mit. */
	children: React.ReactNode;
}

/* Der Zettel rahmt sich selbst — der Popover steuert nur noch Platzierung,
Schließen und Fokus bei. */
const ZETTEL_CONTENT = 'w-auto border-0 bg-transparent p-0 shadow-none';

/**
 * Trägt jeden Zettel des Sponsoring-Bereichs: den an einer Matrix-Zelle (#148),
 * den am Kategorie-Spaltenkopf und den an „+ KATEGORIE" (#149). Er steht einmal
 * hier, weil die Verdrahtung an allen drei Stellen dieselbe ist (ADR 0003 §2).
 *
 * Er schwebt unter dem Trefferfeld und verdeckt dabei die Folgezeile — das ist
 * ausdrücklich abgenommen (ADR 0009). Platzierung, Klick außerhalb, Escape und
 * Fokus-Rückgabe kommen von Radix, nicht von uns. Nur den Auto-Fokus nehmen wir
 * ihm ab: der Zettel selektiert sein vorbelegtes Feld selbst, was Radix'
 * Standard-Fokus sonst überschriebe.
 */
const ZettelPopover: React.FC<ZettelPopoverProps> = ({
	open,
	onOpenChange,
	trigger,
	align = 'start',
	children
}) => (
	<Popover open={open} onOpenChange={onOpenChange}>
		<PopoverTrigger asChild>{trigger}</PopoverTrigger>
		<PopoverContent
			align={align}
			sideOffset={2}
			className={ZETTEL_CONTENT}
			onOpenAutoFocus={(e) => e.preventDefault()}
		>
			{children}
		</PopoverContent>
	</Popover>
);

export default ZettelPopover;
