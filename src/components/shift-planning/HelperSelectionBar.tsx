import React from 'react';

import { helperName, type Helper } from '@/lib/helperService';

export interface HelperSelectionBarProps {
	/** Der gewählte Helfer; ohne Auswahl steht der Streifen gar nicht da. */
	helper: Helper | null;
	onCancel: () => void;
}

/**
 * Der **Auswahl-Streifen** des Schichtplans am Handy (#105, Variante B aus
 * `entscheid-schichtplan-mobil.html`): gelbe Fläche mit 2.5px Tinte-Unterkante,
 * „{Name} — freien Platz antippen" und ein Abbrechen daneben.
 *
 * Er **klebt oben unter dem Kompakt-Mast**, und das ist kein Schmuck: am Handy
 * liegt die gewählte Marke in der zugeschobenen Schublade, der Streifen ist also
 * die einzige Anzeige der Auswahl. Scrollte er mit den Schicht-Zeilen weg, wüsste
 * man beim Antippen eines Platzes nicht mehr, wen man dort einträgt.
 *
 * Am Desktop gibt es ihn nicht — dort steht die Helferliste dauerhaft daneben
 * und die gelbe Marke sagt dasselbe an ihrem Platz.
 */
const HelperSelectionBar: React.FC<HelperSelectionBarProps> = ({ helper, onCancel }) => {
	if (!helper) return null;

	return (
		// `-mx-3` nimmt den Seitenrand des Fest-Rahmens (`FestivalResults`, am Handy
		// `px-3`) zurück: der Streifen ist eine Kante wie der Mast, keine Karte. Er
		// muss darum mitwandern, wenn dort je ein anderer Rand steht.
		<div className="sticky top-0 z-30 -mx-3 flex items-center gap-2 border-b-2.5 border-tinte bg-gelb px-3 py-2.5 text-[12.5px] font-bold">
			<span className="min-w-0 flex-1">{helperName(helper)} — freien Platz antippen</span>
			<button
				type="button"
				onClick={onCancel}
				className="min-h-10 shrink-0 border-2 border-tinte bg-white px-2.5 py-1 text-[11px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte"
			>
				Abbrechen
			</button>
		</div>
	);
};

export default HelperSelectionBar;
