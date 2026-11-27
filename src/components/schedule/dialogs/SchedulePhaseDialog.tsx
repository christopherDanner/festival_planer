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
	canSavePhase,
	emptyPhaseForm,
	phaseFormFrom,
	type SchedulePhaseForm
} from '@/lib/scheduleDialogForm';
import type { SchedulePhase } from '@/lib/scheduleService';

export interface SchedulePhaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	phase?: Pick<SchedulePhase, 'name'> | null;
	/** Der Tag, dem die Phase gehört — als Aufschrift, nicht als Wahl: eine
	 * Phase wechselt ihren Tag nicht (ADR 0007). */
	dayTitle?: string;
	onSave: (form: SchedulePhaseForm) => void;
}

/**
 * Phasen-Dialog (#124): **nur ein Name**. Die Phase gehört ihrem Tag und
 * behält ihre manuelle Reihenfolge — sie trägt keine Uhrzeit (ADR 0007);
 * verschoben wird sie im ⋮ am Zwischentitel, nicht hier.
 *
 * Ein Feld trägt keinen eigenen Zettel — dieselbe Linie wie beim Tag-Dialog.
 */
const SchedulePhaseDialog: React.FC<SchedulePhaseDialogProps> = ({
	open,
	onOpenChange,
	phase,
	dayTitle,
	onSave
}) => {
	const [form, setForm] = useState<SchedulePhaseForm>(emptyPhaseForm);

	useEffect(() => {
		setForm(phase ? phaseFormFrom(phase) : emptyPhaseForm());
	}, [phase, open]);

	const handleSave = () => {
		if (!canSavePhase(form)) return;
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
					title={phase ? 'Phase umbenennen' : 'Neue Phase'}
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
								disabled={!canSavePhase(form)}>
								{phase ? 'Speichern' : 'Anlegen'}
							</Button>
						</>
					}>
					<PaperSheetFields>
						<PaperSheetField
							wide
							label="Name"
							htmlFor="phase-name"
							hint={dayTitle ? `Block am ${dayTitle} — nur in der Werkliste sichtbar.` : undefined}>
							<Input
								id="phase-name"
								className={FOCUS_INK}
								value={form.name}
								onChange={(e) => setForm({ name: e.target.value })}
								placeholder="z.B. Anlieferung, Frühschoppen, Abendprogramm"
							/>
						</PaperSheetField>
					</PaperSheetFields>
				</PaperSheet>
			</DialogContent>
		</Dialog>
	);
};

export default SchedulePhaseDialog;
