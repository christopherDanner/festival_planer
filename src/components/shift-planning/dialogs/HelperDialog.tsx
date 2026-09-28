import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
	canSaveHelper,
	emptyHelperForm,
	helperFormFrom,
	helperPayload,
	type HelperForm,
	type HelperPayload
} from '@/lib/helperDialogForm';
import type { Helper } from '@/lib/helperService';
import type { Station, StationShift } from '@/lib/shiftService';
import HelperZettel from './HelperZettel';

export interface HelperDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	helper?: Helper | null;
	/** Stationen und Schichten des Fests — woran die Wunsch-Marken hängen. */
	stations: Station[];
	stationShifts: StationShift[];
	onSave: (data: HelperPayload) => void;
}

/**
 * Helfer-Dialog (#107): der Radix-Rahmen um den Helfer-Zettel. **Ein** Blatt für
 * Anlegen, Bearbeiten und Wünsche-Setzen — der frühere `PreferenceDialog` ist
 * damit weg. Er war nötig, solange die Wünsche in `festival_member_preferences`
 * lagen; seit ADR 0005 sind sie zwei `uuid[]`-Spalten auf derselben Zeile, die
 * auch die Stammdaten trägt.
 *
 * Der Dialog hält den Formularzustand und übergibt beim Speichern — Optik und
 * Feldschnitt liegen im `HelperZettel`, die Regeln in `helperDialogForm`. Wie
 * beim Station-Dialog (#106) ist der Rahmen reine Positionierung: Papier,
 * Rahmen und Schatten bringt der Zettel mit.
 */
const HelperDialog: React.FC<HelperDialogProps> = ({
	open,
	onOpenChange,
	helper,
	stations,
	stationShifts,
	onSave
}) => {
	const [form, setForm] = useState<HelperForm>(emptyHelperForm);

	useEffect(() => {
		setForm(helper ? helperFormFrom(helper, { stations, stationShifts }) : emptyHelperForm());
		// Stationen und Schichten stehen hier nur als Sieb für Karteileichen
		// (ADR 0005). Ein Nachladen der Liste darf kein Getipptes zurücksetzen —
		// darum hängt das Blatt am Helfer und am Öffnen, nicht an den Listen.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [helper, open]);

	const handleSave = () => {
		if (!canSaveHelper(form)) return;
		onSave(helperPayload(form));
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
				<HelperZettel
					mode={helper ? 'edit' : 'create'}
					form={form}
					source={{ stations, stationShifts }}
					onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
					onCancel={() => onOpenChange(false)}
					onSave={handleSave}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default HelperDialog;
