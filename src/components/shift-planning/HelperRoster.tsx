import React from 'react';

import HelperRosterBody, { type HelperListProps } from './HelperRosterBody';
import { rosterTitle } from '@/lib/helperRoster';

export type HelperRosterProps = HelperListProps;

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
const HelperRoster: React.FC<HelperRosterProps> = ({ focusStationName, ...body }) => (
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
		<HelperRosterBody {...body} />
	</aside>
);

export default HelperRoster;
