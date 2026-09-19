import React, { useEffect, useState } from 'react';

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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { AutoAssignScope } from '@/lib/autoAssignScope';
import type { AutoAssignmentConfig } from '@/lib/automaticAssignmentService';

import AutoAssignZettel from './AutoAssignZettel';

interface AutoAssignDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Worüber der Lauf geht — ganzes Fest oder eine Station (`autoAssignScope`). */
	scope: AutoAssignScope;
	onAssign: (config: AutoAssignmentConfig) => void;
	onClear: () => void;
	isLoading: boolean;
}

/**
 * Rahmen der Auto-Zuteilung (#108): er hält die Einstellung der zwei Regler und
 * die **Rückfrage** vor dem Löschen. Optik und Feldschnitt liegen im
 * `AutoAssignZettel`, die Wortlaute im `autoAssignScope`.
 *
 * Die Rückfrage ist der eigentliche Gehalt dieser Hülle: bis #108 löschte
 * „Alle Zuweisungen löschen" ungefragt die gesamte Schichtplanung des Fests, und
 * der Knopf saß direkt neben „Abbrechen". Gefragt wird mit der **Zahl** der
 * betroffenen Zuweisungen, im AlertDialog-Muster des Repos (`PosterMenu`).
 */
const AutoAssignDialog: React.FC<AutoAssignDialogProps> = ({
	open,
	onOpenChange,
	scope,
	onAssign,
	onClear,
	isLoading
}) => {
	const [config, setConfig] = useState<AutoAssignmentConfig>({
		minShiftsPerHelper: 1,
		maxShiftsPerHelper: 3,
		// Ohne Regler, aber bewusst: die Wünsche der Helfer gehen vor (#68).
		respectPreferences: true
	});
	const [confirmOpen, setConfirmOpen] = useState(false);

	// Wer den Zettel zumacht, hat die Rückfrage nicht beantwortet — sie darf
	// nicht allein zurückbleiben.
	useEffect(() => {
		if (!open) setConfirmOpen(false);
	}, [open]);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				{/* Der Zettel bringt Rahmen, Papier und Versatz-Schatten mit — die
				Shell bleibt reine Positionierung. */}
				<DialogContent
					hideClose
					// Der Zettel erklärt sich über seine Feldbeschriftungen (Radix-Opt-out).
					aria-describedby={undefined}
					className="max-w-[560px] border-0 bg-transparent p-0 shadow-none sm:p-0">
					<AutoAssignZettel
						scope={scope}
						config={config}
						onConfigChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
						onAssign={() => {
							onAssign(config);
							onOpenChange(false);
						}}
						onClearRequest={() => setConfirmOpen(true)}
						onCancel={() => onOpenChange(false)}
						isLoading={isLoading}
						TitleTag={DialogTitle}
					/>
				</DialogContent>
			</Dialog>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{scope.clearLabel}</AlertDialogTitle>
						<AlertDialogDescription>{scope.clearQuestion}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel data-auto="loeschen-abbrechen">Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							data-auto="loeschen-bestaetigen"
							onClick={onClear}
							className={buttonVariants({ variant: 'destructive' })}>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default AutoAssignDialog;
