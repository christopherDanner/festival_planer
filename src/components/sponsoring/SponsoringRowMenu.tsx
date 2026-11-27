import { Building2, StickyNote } from 'lucide-react';

import { ActionMenu } from '@/components/toolkit/ActionMenu';

export interface SponsoringRowMenuProps {
	companyName: string;
	/** Öffnet die Notiz des *Sponsorings* (`sponsorings.notes`). */
	onOpenNote: () => void;
	/** Öffnet die Firmendaten des globalen *Sponsors* (`sponsors`). */
	onOpenSponsor: () => void;
	/** Entfernt das *Sponsoring* — erst nach der Rückfrage des Menüs. */
	onDelete: () => void;
	className?: string;
}

/**
 * Das ⋮ einer Sponsoring-Zeile (#150): **Notiz · Firmendaten · Entfernen** —
 * genau die drei Dinge, die in keine Zelle der Matrix passen.
 *
 * Ein „Bearbeiten" gibt es **ausdrücklich nicht**: das wäre der Rückfall in den
 * Dialog, den der Zettel abgeschafft hat (ADR 0009), und zwei Wege für dieselbe
 * Sache. Die Zellen bedient der Zettel, den Rest dieses Menü.
 *
 * Menü-Optik, 40px-Tippziel und die Rückfrage kommen aus dem Toolkit
 * (`ActionMenu`); hier steht nur, wie das Sponsoring angesprochen wird. Am Handy
 * ist es dasselbe Menü an derselben Karte.
 */
export default function SponsoringRowMenu({
	companyName,
	onOpenNote,
	onOpenSponsor,
	onDelete,
	className
}: SponsoringRowMenuProps) {
	return (
		<ActionMenu
			menuLabel={`Menü für ${companyName}`}
			entries={[
				{ label: 'Notiz …', icon: StickyNote, onSelect: onOpenNote },
				{ label: 'Firmendaten …', icon: Building2, onSelect: onOpenSponsor }
			]}
			deleteLabel="Entfernen"
			confirmTitle="Sponsoring entfernen"
			/* Die Tragweite beim Namen genannt: am ⋮ hängt die ganze Zusage, nicht
			ein einzelner Wert wie am Zettel. Und der *Sponsor* ist global — er
			bleibt, sonst änderte sich die Summe vergangener Feste (ADR 0010). */
			confirmMessage={
				<>
					Das Sponsoring von „{companyName}" bei diesem Fest wird entfernt, samt Kategorien,
					Freibetrag und Sachleistung. Die Firma bleibt im Sponsorenbestand.
				</>
			}
			onDelete={onDelete}
			className={className}
		/>
	);
}
