import { Pencil } from 'lucide-react';

import { ActionMenu } from '@/components/toolkit/ActionMenu';

interface PosterMenuProps {
	festivalName: string;
	onEdit: () => void;
	onDelete: () => void;
	/** `white` für das grüne Plakat, `ink` für Papier- und getönte Plakate. */
	tone?: 'ink' | 'white';
	className?: string;
}

/**
 * ⋮-Menü eines Plakats (Issue #90): dauerhaft sichtbar — der frühere Papierkorb
 * erschien nur bei Hover und war am Handy unerreichbar. Löschen behält die
 * Sicherheitsabfrage; gelöscht wird weich (Issue #8).
 *
 * Menü und Rückfrage kommen aus dem Toolkit (`ActionMenu`, seit #106 geteilt
 * mit den ⋮ des Schichtplans); hier steht nur noch, wie das Fest angesprochen
 * wird.
 */
export default function PosterMenu({
	festivalName,
	onEdit,
	onDelete,
	tone = 'ink',
	className
}: PosterMenuProps) {
	return (
		<ActionMenu
			menuLabel={`Menü für ${festivalName}`}
			entries={[{ label: 'Bearbeiten', icon: Pencil, onSelect: onEdit }]}
			deleteLabel="Löschen"
			confirmTitle="Fest löschen"
			confirmMessage={
				<>
					„{festivalName}" samt Schichten, Material und Ablauf aus der Wand nehmen? Das lässt sich
					nicht rückgängig machen.
				</>
			}
			onDelete={onDelete}
			tone={tone}
			align="start"
			className={className}
		/>
	);
}
