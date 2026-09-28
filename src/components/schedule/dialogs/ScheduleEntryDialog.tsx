import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
	canSaveEntry,
	emptyEntryForm,
	entryFormFrom,
	type EntryPrefill,
	type ScheduleEntryForm
} from '@/lib/scheduleDialogForm';
import type { Helper } from '@/lib/helperService';
import type { ScheduleEntry } from '@/lib/scheduleService';
import ScheduleEntryZettel, { type EntryDayOption } from './ScheduleEntryZettel';

export interface ScheduleEntryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entry?: ScheduleEntry | null;
	/** Was der Griff schon weiß: „+ AUFGABE" bringt die Art mit, das ⋮ eines
	 * Tages zusätzlich den Tag. Beim Bearbeiten wirkungslos. */
	prefill: EntryPrefill;
	days: EntryDayOption[];
	helpers: Helper[];
	/** Der Dialog gibt das **Formular** ab; die Nutzlast baut `ScheduleView` —
	 * nur sie weiß, ob angelegt oder geändert wird und welcher Status
	 * gespeichert war. */
	onSave: (form: ScheduleEntryForm) => void;
}

/**
 * Eintrag-Dialog (#124): der Radix-Rahmen um den Eintrag-Zettel. Er hält den
 * Formularzustand und übergibt beim Speichern — Optik und Feldschnitt liegen im
 * `ScheduleEntryZettel`, die Regeln in `scheduleDialogForm`.
 *
 * Der Dialog selbst ist nur noch Positionierung: Rahmen, Papier und Schatten
 * trägt der Zettel (wie #106/#117).
 */
const ScheduleEntryDialog: React.FC<ScheduleEntryDialogProps> = ({
	open,
	onOpenChange,
	entry,
	prefill,
	days,
	helpers,
	onSave
}) => {
	const [form, setForm] = useState<ScheduleEntryForm>(() => emptyEntryForm(prefill));

	useEffect(() => {
		setForm(entry ? entryFormFrom(entry) : emptyEntryForm(prefill));
		// Auf die Felder des Prefills hören, nicht auf das Objekt — ein Literal
		// wäre bei jedem Rendern neu und würde das Formular leerräumen.
	}, [entry, open, prefill.type, prefill.schedule_day_id]);

	const handleSave = () => {
		if (!canSaveEntry(form)) return;
		onSave(form);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Der Zettel bringt Rahmen, Papier und Versatz-Schatten mit — die
			Shell bleibt reine Positionierung. */}
			<DialogContent
				hideClose
				// Der Zettel erklärt sich über seine Feldbeschriftungen; eine
				// Beschreibungszeile darüber wäre Füllwerk (Radix-Opt-out).
				aria-describedby={undefined}
				className="max-w-[620px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<ScheduleEntryZettel
					mode={entry ? 'edit' : 'create'}
					form={form}
					onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
					days={days}
					helpers={helpers}
					onCancel={() => onOpenChange(false)}
					onSave={handleSave}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default ScheduleEntryDialog;
