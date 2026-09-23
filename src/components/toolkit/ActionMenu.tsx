import { type ReactNode, useState } from 'react';
import { MoreVertical, Trash2, type LucideIcon } from 'lucide-react';

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

/** Ein harmloser Eintrag des Menüs — er wirkt sofort, ohne Rückfrage. */
export interface ActionMenuEntry {
	label: string;
	/** Symbol vor der Aufschrift, in derselben Größe wie das Löschen. */
	icon: LucideIcon;
	onSelect: () => void;
}

export interface ActionMenuProps {
	/** Aufschrift des ⋮ für Screenreader: „Menü der Schicht 11–15". */
	menuLabel: string;
	/**
	 * Die harmlosen Einträge von oben nach unten. Zerstörerisches steht nie
	 * darin — es hat seinen festen, roten Platz am Fuß des Menüs.
	 */
	entries: ActionMenuEntry[];
	deleteLabel: string;
	/** Überschrift der Rückfrage; üblich derselbe Wortlaut wie `deleteLabel`. */
	confirmTitle: ReactNode;
	/** Was das Löschen mitreißt — ein Satz, der die Tragweite benennt. */
	confirmMessage: ReactNode;
	onDelete: () => void;
	/** `white` für grüne Plakatflächen, `ink` für Papier und getönte Flächen. */
	tone?: 'ink' | 'white';
	/** Wohin das Menü aufklappt — am rechten Rand einer Zeile nach innen
	 * (`end`), an der linken Kante eines Plakats nach außen (`start`). */
	align?: 'start' | 'end';
	className?: string;
}

/**
 * Das ⋮-Menü der Handschrift: die Einträge des Aufrufers und darunter ein rotes
 * **Löschen**, das erst nach einer Rückfrage ausgeführt wird. Es ist der
 * abgenommene Ersatz für den Hover-Papierkorb (Festliste #64/#90, Schichtplan
 * Entscheid 5 aus #68) — Zerstörerisches liegt eine Ebene tiefer, die Zeilen
 * bleiben ruhig.
 *
 * Die harmlosen Einträge sind eine Liste, seit das Sponsoring drei braucht
 * (Notiz · Firmendaten · Entfernen, #150); der rote bleibt der eine feste Platz
 * am Fuß, damit kein Aufrufer ihn irgendwo dazwischen einreihen kann.
 *
 * Das ⋮ erscheint **dauerhaft**, nicht erst bei Hover: es ist der einzige Weg
 * zu beiden Griffen und wäre am Touchgerät sonst unauffindbar. Sein Tippziel
 * ist 40px (DESIGN-VISION §6); enger wird es nur, wo der Platz es erzwingt —
 * dann über `className`, und am Handy bleibt es bei 40px.
 *
 * Die Rückfrage gehört hierher und nicht zum Aufrufer: nur das Menü weiß, ob
 * sie schon bejaht wurde. Ihren *Wortlaut* bringt der Aufrufer mit — die
 * Tragweite kennt nur er.
 */
export function ActionMenu({
	menuLabel,
	entries,
	deleteLabel,
	confirmTitle,
	confirmMessage,
	onDelete,
	tone = 'ink',
	align = 'end',
	className
}: ActionMenuProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={menuLabel}
						className={cn(
							'flex h-10 w-10 items-center justify-center max-[899px]:min-h-10 max-[899px]:min-w-10',
							'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
							tone === 'white'
								? 'text-white hover:bg-white/15 focus-visible:outline-papier'
								: 'text-tinte-soft hover:bg-black/5 hover:text-tinte focus-visible:outline-tinte',
							className
						)}>
						<MoreVertical className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align={align}>
					{entries.map((entry) => (
						<DropdownMenuItem key={entry.label} className="gap-2" onClick={entry.onSelect}>
							<entry.icon className="h-4 w-4" />
							{entry.label}
						</DropdownMenuItem>
					))}
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
							{confirmTitle}
						</AlertDialogTitle>
						<AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
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
