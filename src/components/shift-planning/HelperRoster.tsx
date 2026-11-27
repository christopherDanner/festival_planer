import React from 'react';

import HelperRosterBody, { type HelperListProps } from './HelperRosterBody';
import { rosterTitle } from '@/lib/helperRoster';
import { helperName, type Helper } from '@/lib/helperService';

export interface HelperRosterProps extends HelperListProps {
	/** Die gewählte Marke (#104) — sie steht gelb da und nennt sich im Hinweis. */
	selected: Helper | null;
	/** „Abbrechen" — der zweite Weg zurück neben dem zweiten Antippen der Marke. */
	onCancelSelection: () => void;
}

/**
 * Die **Helferliste** rechts an der Werkbank (#103, Variante C des Prototyps
 * `entscheid-schichtplan-helferliste.html`): Suche, Segment-Filter mit Zählern,
 * Gruppierung nach Wunsch-Passung zur fokussierten Station und je Helfer eine
 * Marke mit Zähler-Plakette und ⋮.
 *
 * Nach ADR 0005 ist sie zugleich der einzige Ort, an dem Helfer entstehen und
 * verschwinden — daher der Anlege-Knopf am Fuß und das Entfernen im ⋮-Menü.
 *
 * Gerechnet und gruppiert wird in `helperRoster`, gezeichnet in
 * `HelperRosterBody`; diese Datei ist nur die **Spalten-Gestalt**. Unter 900px
 * trägt dieselbe Liste die Schublade (`HelperDrawer`, #105).
 */
const HelperRoster: React.FC<HelperRosterProps> = ({
	focusStationName,
	selected,
	onCancelSelection,
	...body
}) => (
	// Die Spalte klebt oben und **scrollt in sich**: bei 40 Helfern liefe sie
	// sonst unter den Fensterrand und nähme den Anlege-Knopf mit (DESIGN-VISION
	// §6 — was scrollt, scrollt im eigenen Rahmen).
	//
	// `hidden … min-[900px]:flex` steht hier, obwohl die Ansicht die Spalte unter
	// 900px schon gar nicht erst einhängt: `useIsMobile` antwortet im ersten
	// Render immer „Desktop", und ohne die Klasse blitzte die Spalte am Handy ein
	// Bild lang unter dem Fokus-Kasten auf. Das JS entscheidet, was hängt, das CSS
	// deckt das erste Bild.
	<aside className="hidden sticky top-3 max-h-[calc(100vh-1.5rem)] flex-col border-2.5 border-tinte bg-white min-[900px]:flex">
		<h3 className="shrink-0 border-b-2 border-tinte bg-papier-getoent px-3 py-2.5 text-xs font-extrabold uppercase tracking-[.07em]">
			{rosterTitle(focusStationName)}
		</h3>
		{/* Der Auswahl-Hinweis (#104): er sagt, was die gelbe Marke bedeutet, und
		trägt den zweiten Weg zurück. Ohne ihn wäre das zweite Antippen derselben
		Marke die einzige Rücknahme — und die findet niemand von selbst. Als
		`aria-live`-Bereich ist er zugleich die Ansage für alle, die das Gelb nicht
		sehen (Research #54). Am Handy sagt dasselbe der Auswahl-Streifen (#105). */}
		<div aria-live="polite" className="shrink-0 px-3">
			{selected && (
				<p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-1.5 border-tinte bg-gelb px-2 py-1.5 text-[11.5px] font-semibold">
					<b className="font-bold">{helperName(selected)}</b>
					<span>— freien Platz wählen</span>
					<button
						type="button"
						onClick={onCancelSelection}
						className="ml-auto text-[11px] font-bold uppercase tracking-[.04em] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
					>
						Abbrechen
					</button>
				</p>
			)}
		</div>
		<HelperRosterBody {...body} />
	</aside>
);

export default HelperRoster;
