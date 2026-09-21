import React from 'react';

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
import { Button } from '@/components/ui/button';

import type { MaterialCardDrafts } from './hooks/useMaterialCardDrafts';

export interface UnsavedCardsDialogProps {
	cards: MaterialCardDrafts;
}

/**
 * Die Rückfrage beim Umschalten mit ungespeicherten Karten (#116, Regel aus
 * #115): **warnen, nicht still verwerfen**. Drei Wege, wie im Ticket —
 * Speichern, Verwerfen, Zurück.
 *
 * Nimmt den ganzen Karten-Zustand entgegen: ohne ihn hat der Dialog keinen
 * Sinn, und fünf einzeln durchgereichte Rückrufe wären dieselbe Kopplung in
 * unübersichtlich.
 */
const UnsavedCardsDialog: React.FC<UnsavedCardsDialogProps> = ({ cards }) => (
	<AlertDialog
		open={cards.asking}
		onOpenChange={(open) => {
			if (!open) cards.dismiss();
		}}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>Ungespeicherte Karten</AlertDialogTitle>
				<AlertDialogDescription>
					{cards.summary.dirty === 1
						? 'Eine Karte ist geändert und noch nicht gespeichert.'
						: `${cards.summary.dirty} Karten sind geändert und noch nicht gespeichert.`}{' '}
					Umschalten würde die Eingaben verwerfen.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel onClick={cards.dismiss}>Zurück</AlertDialogCancel>
				<Button type="button" variant="outline" onClick={cards.confirmDiscard}>
					Verwerfen
				</Button>
				<AlertDialogAction onClick={cards.confirmSave}>Speichern</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
);

export default UnsavedCardsDialog;
