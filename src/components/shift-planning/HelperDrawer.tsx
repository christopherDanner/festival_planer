import React, { useState } from 'react';

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import HelperRosterBody from './HelperRosterBody';
import type { HelperRosterProps } from './HelperRoster';
import { rosterTitle } from '@/lib/helperRoster';

export type HelperDrawerProps = HelperRosterProps;

/**
 * Die Helferliste am **Handy** (#105, Variante B des Prototyps
 * `entscheid-schichtplan-mobil.html`): ein eckiger gelber FAB über der
 * Bottom-Tab-Bar, dahinter eine Schublade mit derselben Liste wie am Desktop.
 *
 * **Bewusste Abweichung von DESIGN-VISION §6** („Sidebars werden zu Blöcken"),
 * am Prototyp gemessen: mit Tages-Zwischentiteln trägt eine Station bis zu 13
 * Schicht-Zeilen plus vier Tagesköpfe. Läge die Liste darunter, kostete jede
 * Zuteilung zwei lange Scroll-Wege, und den scharfen Zustand der freien Plätze
 * sähe man erst nach dem Hochscrollen — also genau dann nicht, wenn er hilft.
 *
 * Daraus folgt die einzige Regel, die diese Datei über die Optik hinaus trägt:
 * **jeder Griff, der woanders hinführt, schiebt die Schublade zu.** Die Wahl
 * einer Marke legt den freien Platz sofort ins Bild (das Fertig-wenn des
 * Tickets: FAB → Helfer → Platz, kein Scrollen dazwischen); Anlegen und
 * Bearbeiten führen auf den Helfer-Zettel, und ein Blatt über der offenen
 * Schublade wäre ein Blatt auf einem Blatt. Nur das Entfernen lässt sie offen —
 * seine Rückfrage stellt der Browser, und danach arbeitet man in der Liste
 * weiter.
 */
const HelperDrawer: React.FC<HelperDrawerProps> = ({
	focusStationName,
	onSelectHelper,
	onAddHelper,
	onEditHelper,
	...body
}) => {
	const [open, setOpen] = useState(false);

	/** Einen Griff so verpacken, dass er die Schublade aus dem Weg nimmt. */
	const closing =
		<A extends unknown[]>(handle: (...args: A) => void) =>
		(...args: A) => {
			setOpen(false);
			handle(...args);
		};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label="Helferliste öffnen"
				// Über der Bottom-Tab-Bar (`h-14` plus Safe-Area-Saum), nicht darunter —
				// sonst läge der Knopf unter den Fest-Reitern.
				className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1.125rem)] right-3.5 z-40 h-14 w-14 border-2.5 border-tinte bg-gelb shadow-versatz focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
			>
				<span className="font-display text-[11px] font-semibold uppercase leading-[1.1] tracking-[.04em]">
					Helfer
				</span>
			</button>

			<Drawer open={open} onOpenChange={setOpen}>
				{/* Papier-Grund und 3px Tinte-Oberkante; den Griff-Strich bringt
				`DrawerContent` mit. `max-h-[74%]` lässt den Fokus-Kasten oben stehen —
				man soll sehen, wohin die Marke gleich wandert. */}
				<DrawerContent className="max-h-[74%] border-t-[3px] bg-papier">
					<div className="flex shrink-0 items-center gap-3 border-b-2 border-tinte bg-papier-getoent px-3 py-2.5">
						<DrawerTitle className="text-xs font-extrabold uppercase tracking-[.07em]">
							{rosterTitle(focusStationName)}
						</DrawerTitle>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="ml-auto min-h-10 border-2 border-tinte bg-white px-2.5 py-1 text-[11px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
						>
							Schließen
						</button>
					</div>
					<HelperRosterBody
						{...body}
						onSelectHelper={closing(onSelectHelper)}
						onAddHelper={closing(onAddHelper)}
						onEditHelper={closing(onEditHelper)}
					/>
				</DrawerContent>
			</Drawer>
		</>
	);
};

export default HelperDrawer;
