import { ActionMenu } from '@/components/toolkit/ActionMenu';

export interface FocusBoxMenuProps {
	/** Woran das Menü hängt — der grüne Stationskopf oder eine Schicht-Zeile. */
	subject: 'Station' | 'Schicht';
	/** Aufschrift des ⋮ für Screenreader: „Menü der Schicht 11–15". */
	label: string;
	/** Die Tragweite, die die Rückfrage benennt — formuliert in `shiftDeletion`. */
	deleteMessage: string;
	onEdit: () => void;
	onDelete: () => void;
	/** Der Stationskopf ist eine grüne Plakatfläche. */
	onPoster?: boolean;
}

/**
 * Die beiden ⋮-Menüs des Fokus-Kastens (Entscheid 5 aus #68): eines im grünen
 * Stationskopf, eines je Schicht-Zeile. Sie sind derselbe Baustein
 * (`ActionMenu`) und unterscheiden sich nur darin, **woran** sie hängen —
 * darum leitet `subject` beide Einträge und die Überschrift der Rückfrage
 * gemeinsam ab. Zwei getrennte Beschriftungs-Sätze liefen sonst irgendwann
 * auseinander.
 */
export default function FocusBoxMenu({
	subject,
	label,
	deleteMessage,
	onEdit,
	onDelete,
	onPoster = false
}: FocusBoxMenuProps) {
	const deleteLabel = `${subject} löschen`;

	return (
		<ActionMenu
			menuLabel={label}
			editLabel={`${subject} bearbeiten …`}
			deleteLabel={deleteLabel}
			confirmTitle={deleteLabel}
			confirmMessage={deleteMessage}
			onEdit={onEdit}
			onDelete={onDelete}
			tone={onPoster ? 'white' : 'ink'}
			// In einer Zeile mit 13 Geschwistern ist 40px am Desktop zu breit; am
			// Handy bleibt das Tippziel über die Untergrenze des Bausteins.
			className="h-9 w-9"
		/>
	);
}
