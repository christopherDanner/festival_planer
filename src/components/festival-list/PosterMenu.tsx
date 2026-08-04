import { useState } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

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
import { Button, buttonVariants } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
 */
export default function PosterMenu({
	festivalName,
	onEdit,
	onDelete,
	tone = 'ink',
	className
}: PosterMenuProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Menü für ${festivalName}`}
						className={cn(
							'h-10 w-10',
							tone === 'white'
								? 'text-white hover:bg-white/15 hover:text-white'
								: 'text-tinte-soft hover:bg-black/5 hover:text-tinte',
							className
						)}>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={onEdit} className="gap-2">
						<Pencil className="h-4 w-4" />
						Bearbeiten
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setConfirmOpen(true)} className="gap-2 text-rot">
						<Trash2 className="h-4 w-4" />
						Löschen
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Fest löschen</AlertDialogTitle>
						<AlertDialogDescription>
							„{festivalName}" samt Schichten, Material und Ablauf aus der Wand nehmen? Das lässt
							sich nicht rückgängig machen.
						</AlertDialogDescription>
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
