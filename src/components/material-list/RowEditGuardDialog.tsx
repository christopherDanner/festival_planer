import React from 'react';

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { GuardAnswer, ViewChange } from '@/lib/materialRowEditor';

export interface RowEditGuardDialogProps {
	/** Der zurückgehaltene Wechsel — `null` heißt: nichts zu fragen. */
	change: ViewChange | null;
	/** Wie viele offene Zeilen geändert sind. */
	dirty?: number;
	onAnswer: (answer: GuardAnswer) => void;
}

/** Was der Wechsel in der Sprache des Bereichs heißt — die Rückfrage muss
sagen, welcher Griff die Zeilen aus dem Bild nähme. */
const CHANGE_WORDS: Record<ViewChange, string> = {
	axis: 'Die Achse zu wechseln',
	group: 'Den Reiter zu wechseln',
	category: 'Die Kategorie zu filtern',
	search: 'Die Suche zu ändern',
	mode: 'In die Übernahme zu wechseln',
	rows: 'Die Zeilen zuzuklappen'
};

const GUARD_BUTTON =
	'border-2 border-tinte px-3.5 py-2 text-[12.5px] font-bold uppercase tracking-[.02em] text-tinte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte';

/**
 * Rückfrage vor einem Sichtwechsel mit ungespeicherten Zeilen (#115). Achse,
 * Reiter, Kategorie und Suche nehmen die offenen Zeilen aus dem Bild — still
 * verworfen wäre die Arbeit einer ganzen Lieferantenrechnung weg.
 *
 * Drei Antworten, weil zwei zu wenig sind: wer den Reiter falsch getroffen hat,
 * will zurück, ohne sich zwischen Speichern und Verwerfen entscheiden zu müssen.
 */
const RowEditGuardDialog: React.FC<RowEditGuardDialogProps> = ({ change, dirty = 0, onAnswer }) => (
	<AlertDialog
		open={change != null}
		onOpenChange={(open) => {
			// Esc und Klick daneben heißen „doch nicht" — nie „verwerfen".
			if (!open) onAnswer('back');
		}}
	>
		<AlertDialogContent className="border-3 border-tinte bg-papier">
			<AlertDialogHeader>
				<AlertDialogTitle className="font-display text-lg uppercase tracking-[.02em]">
					Ungespeicherte Zeilen
				</AlertDialogTitle>
				<AlertDialogDescription className="text-tinte">
					{change && CHANGE_WORDS[change]} schließt{' '}
					<b>
						{dirty} {dirty === 1 ? 'geänderte Zeile' : 'geänderte Zeilen'}
					</b>
					. Speichern, verwerfen — oder zurück zur Liste?
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter className="gap-2">
				<button type="button" onClick={() => onAnswer('back')} className={cn(GUARD_BUTTON, 'bg-white')}>
					ZURÜCK
				</button>
				<button type="button" onClick={() => onAnswer('discard')} className={cn(GUARD_BUTTON, 'bg-white text-rot')}>
					VERWERFEN
				</button>
				<button type="button" onClick={() => onAnswer('save')} className={cn(GUARD_BUTTON, 'bg-gelb')}>
					SPEICHERN
				</button>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
);

export default RowEditGuardDialog;
