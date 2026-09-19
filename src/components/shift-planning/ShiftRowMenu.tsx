import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface ShiftRowMenuProps {
	/** Woran das Menü hängt — „Station" oder „Schicht". Beide Einträge und die
	 * Rückfrage werden daraus beschriftet, damit das Paar aus Entscheid 5 (#68)
	 * nicht an zwei Stellen auseinanderlaufen kann. */
	subject: 'Station' | 'Schicht';
	/** Aufschrift des ⋮ für Screenreader: „Menü der Schicht 11–15". */
	label: string;
	/** Die Tragweite, die die Rückfrage benennt — formuliert in `shiftDeletion`. */
	deleteMessage: string;
	onEdit: () => void;
	onDelete: () => void;
	/** Auf der grünen Plakatfläche steht das ⋮ in Weiß. */
	onPoster?: boolean;
}

/**
 * Das ⋮-Menü von Stationskopf und Schicht-Zeile (Entscheid 5 aus #68,
 * ausgebaut in #106): Zerstörerisches liegt eine Ebene tiefer, die Zeilen
 * bleiben ruhig — bei 13 Schichten wären zwei Icons pro Zeile viel Werkzeug für
 * selten Gebrauchtes. Das ⋮ ist **der einzige** Weg zu Bearbeiten und Löschen;
 * es erscheint darum dauerhaft und nicht erst bei Hover (am Touchgerät sonst
 * unauffindbar, vgl. Entscheid 7).
 *
 * Gelöscht wird erst nach einer Rückfrage, die die Tragweite beim Namen nennt —
 * bei der Station reißt die Cascade alle ihre Schichten und Zuteilungen mit.
 */
export default function ShiftRowMenu({
	subject,
	label,
	deleteMessage,
	onEdit,
	onDelete,
	onPoster = false
}: ShiftRowMenuProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const deleteLabel = `${subject} löschen`;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={label}
						className={cn(
							'flex h-9 w-9 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
							// Am Handy darf der einzige Weg zu Bearbeiten und Löschen kein
							// 32px-Ziel sein (DESIGN-VISION §6).
							'max-[899px]:min-h-10 max-[899px]:min-w-10',
							onPoster
								? 'text-white hover:bg-white/15 focus-visible:outline-papier'
								: 'text-tinte-soft hover:text-tinte focus-visible:outline-tinte'
						)}>
						<MoreVertical className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem className="gap-2" onClick={onEdit}>
						<Pencil className="h-4 w-4" />
						{subject} bearbeiten …
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2 text-rot" onClick={() => setConfirmOpen(true)}>
						<Trash2 className="h-4 w-4" />
						{deleteLabel}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-display uppercase tracking-[.02em]">
							{deleteLabel}
						</AlertDialogTitle>
						<AlertDialogDescription>{deleteMessage}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							onClick={onDelete}
							className={buttonVariants({ variant: 'destructive' })}>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
