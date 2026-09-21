import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
	canSaveStation,
	emptyStationForm,
	stationFormFrom,
	stationPayload,
	type StationForm,
	type StationPayload
} from '@/lib/shiftDialogForm';
import type { Station } from '@/lib/shiftService';
import type { Helper } from '@/lib/helperService';
import StationZettel from './StationZettel';

export interface StationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	station?: Station | null;
	helpers: Helper[];
	onSave: (data: StationPayload) => void;
}

/**
 * Station-Dialog (#106): der Radix-Rahmen um den Station-Zettel. Er hält den
 * Formularzustand und übergibt beim Speichern — Optik und Feldschnitt liegen im
 * `StationZettel`, die Regeln in `shiftDialogForm`.
 *
 * Der Dialog selbst ist nur noch Positionierung: Rahmen, Papier und Schatten
 * trägt der Zettel, damit das Plakat an *einer* Stelle steht (wie #117/#119 es
 * für den Positions-Dialog festgelegt haben).
 */
const StationDialog: React.FC<StationDialogProps> = ({
	open,
	onOpenChange,
	station,
	helpers,
	onSave
}) => {
	const [form, setForm] = useState<StationForm>(emptyStationForm);

	useEffect(() => {
		setForm(station ? stationFormFrom(station) : emptyStationForm());
	}, [station, open]);

	const handleSave = () => {
		if (!canSaveStation(form)) return;
		onSave(stationPayload(form));
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
				<StationZettel
					mode={station ? 'edit' : 'create'}
					form={form}
					helpers={helpers}
					onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
					onCancel={() => onOpenChange(false)}
					onSave={handleSave}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default StationDialog;
