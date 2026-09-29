import React, { useState } from 'react';
import PreislisteZettel from '@/components/sponsoring/PreislisteZettel';
import ZettelPopover from '@/components/sponsoring/ZettelPopover';
import {
	buildCategoryZettel,
	NO_CATEGORY_IMPACT,
	type CategoryZettelInput
} from '@/lib/sponsoringPreisliste';

export interface KategorieAnlegenKnopfProps {
	/** Der Griff selbst — „+ KATEGORIE" in der Werkzeugleiste, „+ ERSTE KATEGORIE" in der Anleitung. */
	trigger: React.ReactNode;
	align?: 'start' | 'end';
	/** „Übernehmen" — der Aufrufer legt die Kategorie an. */
	onCategoryApply: (input: CategoryZettelInput) => void;
}

/**
 * Der Weg „neue Kategorie": derselbe Zettel wie am Spaltenkopf, nur leer und
 * ohne Löschen — eine Kategorie, die es noch nicht gibt, kann man nicht löschen
 * (ADR 0009, #149).
 *
 * Er steht hier und nicht in der Werkzeugleiste, weil ihn seit #152 zwei Stellen
 * tragen: der Griff der Leiste und der Leerzustand L1, wo die *Preisliste* der
 * erste Schritt des Bereichs ist (CONTEXT.md „Preisliste"). Auflage aus #152 —
 * die Knöpfe im Leerzustand führen auf **dieselben** Wege, nicht auf zweite
 * Implementierungen (ADR 0003 §2).
 */
const KategorieAnlegenKnopf: React.FC<KategorieAnlegenKnopfProps> = ({
	trigger,
	align,
	onCategoryApply
}) => {
	const [open, setOpen] = useState(false);

	return (
		<ZettelPopover open={open} onOpenChange={setOpen} align={align} trigger={trigger}>
			<PreislisteZettel
				zettel={buildCategoryZettel(null, NO_CATEGORY_IMPACT)}
				onApply={(input) => {
					onCategoryApply(input);
					setOpen(false);
				}}
			/>
		</ZettelPopover>
	);
};

export default KategorieAnlegenKnopf;
