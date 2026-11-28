import { Pencil } from 'lucide-react';

import { ActionMenu } from '@/components/toolkit/ActionMenu';
import { deleteBlockedReason } from '@/lib/sponsorHistory';

export interface SponsorRowMenuProps {
	companyName: string;
	/** Bei wie vielen Festen die Firma gesponsert hat — sperrt das Löschen. */
	festivalCount: number;
	/** Öffnet das Firmendaten-Formular mit den Werten der Firma. */
	onEdit: () => void;
	/** Löscht die Firma — erst nach der Rückfrage des Menüs. */
	onDelete: () => void;
	className?: string;
}

/**
 * Das ⋮ einer Firma im Sponsorenbestand (#159): **Bearbeiten · Löschen**.
 * Ersetzt das frühere Knopfpaar ✎/🗑 und den Zeilenklick.
 *
 * Löschen ist nur frei, solange die Firma **nie** gesponsert hat. Sonst bleibt
 * der Eintrag sichtbar, aber gesperrt, und nennt den Grund — ein abgeschlossenes
 * Fest darf seine Sponsoring-Summe nicht verlieren (ADR 0010). Die Datenbank
 * hält dieselbe Regel (`ON DELETE RESTRICT`); das Menü ist die Erklärung davor.
 */
export default function SponsorRowMenu({
	companyName,
	festivalCount,
	onEdit,
	onDelete,
	className
}: SponsorRowMenuProps) {
	return (
		<ActionMenu
			menuLabel={`Menü für ${companyName}`}
			entries={[{ label: 'Bearbeiten …', icon: Pencil, onSelect: onEdit }]}
			deleteLabel="Löschen"
			deleteDisabledReason={deleteBlockedReason(festivalCount)}
			confirmTitle="Firma löschen"
			confirmMessage={
				<>
					„{companyName}" wird aus dem Sponsorenbestand gelöscht. Sie war bei keinem Fest als
					Sponsor erfasst — es geht keine Sponsoring-Summe verloren.
				</>
			}
			onDelete={onDelete}
			className={className}
		/>
	);
}
