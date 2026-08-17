import React from 'react';

import { Button } from '@/components/ui/button';
import { Stamp } from '@/components/toolkit/Stamp';

export interface NoStationsNoticeProps {
	onAddStation: () => void;
}

/**
 * Leerzustand des Schichtplans (#102): ohne Stationen hat die Werkbank weder
 * Reiter noch Fokus. Gestrichelter Rahmen im Stempel-Ton, ein Satz, der Weg
 * heraus — das Rezept der Vision für leere Flächen.
 */
const NoStationsNotice: React.FC<NoStationsNoticeProps> = ({ onAddStation }) => (
	<div className="flex flex-col items-center gap-4 border-2 border-dashed border-rot bg-white px-6 py-12 text-center">
		<Stamp tone="red" size="lg">
			Noch keine Station
		</Stamp>
		<p className="max-w-[420px] text-[13px] text-tinte-soft">
			Der Schichtplan beginnt bei den Stationen — Ausschank, Grill, Einlass. Erst danach lassen
			sich Schichten und Helfer einteilen.
		</p>
		<Button size="sm" className="text-[12.5px] max-[899px]:min-h-10" onClick={onAddStation}>
			+ STATION
		</Button>
	</div>
);

export default NoStationsNotice;
