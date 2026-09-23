import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export interface SponsoringNoteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Die Firma, an deren Sponsoring die Notiz hängt — sie steht in der Überschrift. */
	companyName: string;
	/** Der erfasste Stand aus `sponsorings.notes`; `null` heißt: noch keine Notiz. */
	notes: string | null;
	/** Speichern — leerer Text wird zu `null`, damit kein leerer Satz entsteht. */
	onSave: (notes: string | null) => void;
	saving?: boolean;
}

/**
 * Die Notiz eines *Sponsorings* (#150): ein kleiner Dialog mit Freitext.
 *
 * **Kein Zettel.** Notizen sind Sätze („Zusage per Mail 12.03., Kontakt Hr.
 * Bauer"), die in ein 205px breites Popover nicht passen; und anders als ein
 * Betrag ist das kein Ein-Wert-Vorgang, für den ADR 0009 den Zellklick vorsieht.
 *
 * Rein darstellend: geschrieben wird über `onSave` — den Schreibweg
 * (`updateSponsoring`) kennt der Dialog nicht.
 */
const SponsoringNoteDialog: React.FC<SponsoringNoteDialogProps> = ({
	open,
	onOpenChange,
	companyName,
	notes,
	onSave,
	saving = false
}) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent className="max-w-lg">
			<DialogHeader>
				<DialogTitle>Notiz</DialogTitle>
				<DialogDescription>{companyName}</DialogDescription>
			</DialogHeader>
			{/* Der Inhalt steht erst ab dem Öffnen im Baum — so beginnt jedes Öffnen
			beim gespeicherten Stand und nicht bei einem alten Tippstand. */}
			<NoteForm
				notes={notes}
				saving={saving}
				onSave={onSave}
				onCancel={() => onOpenChange(false)}
			/>
		</DialogContent>
	</Dialog>
);

const NoteForm: React.FC<{
	notes: string | null;
	saving: boolean;
	onSave: (notes: string | null) => void;
	onCancel: () => void;
}> = ({ notes, saving, onSave, onCancel }) => {
	const [text, setText] = useState(notes ?? '');

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSave(text.trim() === '' ? null : text.trim());
			}}>
			<Textarea
				aria-label="Notiz"
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="z.B. Zusage per Mail 12.03., Kontakt Hr. Bauer"
				rows={5}
			/>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Abbrechen
				</Button>
				<Button type="submit" disabled={saving}>
					Speichern
				</Button>
			</div>
		</form>
	);
};

export default SponsoringNoteDialog;
