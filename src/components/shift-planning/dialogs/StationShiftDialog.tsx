import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
	canSaveShift,
	emptyShiftForm,
	shiftFormFrom,
	shiftPayload,
	type ShiftForm,
	type ShiftPayload
} from '@/lib/shiftDialogForm';
import type { Station, StationShift } from '@/lib/shiftService';
import ShiftZettel from './ShiftZettel';

export interface StationShiftDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stationShift?: StationShift | null;
	/** Eine Schicht entsteht immer *an* einer Station — sie steht im Kopf und
	 * gibt einer neuen Schicht ihr Soll mit. */
	station: Station | null;
	onSave: (data: ShiftPayload) => void;
}

/**
 * Schicht-Dialog (#106): der Radix-Rahmen um den Schicht-Zettel — Zwilling des
 * `StationDialog`. Formularzustand hier, Optik im `ShiftZettel`, Regeln in
 * `shiftDialogForm`.
 */
const StationShiftDialog: React.FC<StationShiftDialogProps> = ({
	open,
	onOpenChange,
	stationShift,
	station,
	onSave
}) => {
	const [form, setForm] = useState<ShiftForm>(() => emptyShiftForm(station));

	useEffect(() => {
		setForm(stationShift ? shiftFormFrom(stationShift) : emptyShiftForm(station));
	}, [stationShift, station, open]);

	const handleSave = () => {
		if (!canSaveShift(form)) return;
		onSave(shiftPayload(form));
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[620px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<ShiftZettel
					mode={stationShift ? 'edit' : 'create'}
					form={form}
					stationName={station?.name ?? ''}
					onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
					onCancel={() => onOpenChange(false)}
					onSave={handleSave}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default StationShiftDialog;
