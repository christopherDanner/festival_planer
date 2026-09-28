import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields
} from '@/components/toolkit/PaperSheet';
import {
	canSaveDay,
	dayFormFrom,
	emptyDayForm,
	type ScheduleDayForm
} from '@/lib/scheduleDialogForm';
import type { ScheduleDay } from '@/lib/scheduleService';

export interface ScheduleDayDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	day?: Pick<ScheduleDay, 'date' | 'label'> | null;
	/** Wie beim Eintrag gibt der Dialog das **Formular** ab; Nutzlast und
	 * `sort_order` baut `ScheduleView`. */
	onSave: (form: ScheduleDayForm) => void;
}

/**
 * Tag-Dialog (#124): Datum und freies Label („Aufbau", „Nachbereitung"), auf
 * demselben Papier wie die übrigen Dialoge (ADR 0003, #106/#117).
 *
 * Zwei Felder tragen keinen eigenen Zettel — die Trennung Rahmen/Zettel gibt es
 * dort, wo das Blatt groß genug ist, um allein zu stehen (Station, Position,
 * Eintrag).
 *
 * **Beliebige Daten sind erlaubt**, auch vor und nach dem Fest: die Festtage
 * entstehen automatisch, alles andere legt der Nutzer selbst an (CONTEXT.md,
 * *Ablauf-Tag*). Ändert sich später das Fest-Datum, ziehen bestehende Tage
 * nicht nach.
 */
const ScheduleDayDialog: React.FC<ScheduleDayDialogProps> = ({
	open,
	onOpenChange,
	day,
	onSave
}) => {
	const [form, setForm] = useState<ScheduleDayForm>(emptyDayForm);

	useEffect(() => {
		setForm(day ? dayFormFrom(day) : emptyDayForm());
	}, [day, open]);

	const handleSave = () => {
		if (!canSaveDay(form)) return;
		onSave(form);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[520px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<PaperSheet
					title={day ? 'Tag bearbeiten' : 'Neuer Ablauf-Tag'}
					TitleTag={DialogTitle}
					onClose={() => onOpenChange(false)}
					footer={
						<>
							<Button variant="outline" className={FOCUS_INK} onClick={() => onOpenChange(false)}>
								Abbrechen
							</Button>
							<Button
								data-zettel="speichern"
								className={FOCUS_INK}
								onClick={handleSave}
								disabled={!canSaveDay(form)}>
								{day ? 'Speichern' : 'Anlegen'}
							</Button>
						</>
					}>
					<PaperSheetFields>
						<PaperSheetField
							label="Datum"
							htmlFor="day-date"
							hint="Auch vor oder nach dem Fest.">
							<Input
								id="day-date"
								type="date"
								className={FOCUS_INK}
								value={form.date}
								onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
							/>
						</PaperSheetField>

						<PaperSheetField
							label="Bezeichnung"
							htmlFor="day-label"
							hint="Steht hinter dem Datum im Zwischentitel.">
							<Input
								id="day-label"
								className={FOCUS_INK}
								value={form.label}
								onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
								placeholder="z.B. Aufbau, Nachbereitung"
							/>
						</PaperSheetField>
					</PaperSheetFields>
				</PaperSheet>
			</DialogContent>
		</Dialog>
	);
};

export default ScheduleDayDialog;
