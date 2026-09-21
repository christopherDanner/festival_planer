import React, { type ElementType } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	FOCUS_INK,
	PaperSheet,
	PaperSheetField,
	PaperSheetFields
} from '@/components/toolkit/PaperSheet';
import { canSaveStation, type StationForm } from '@/lib/shiftDialogForm';
import type { Helper } from '@/lib/helperService';

/** Kein Verantwortlicher — Radix braucht für „nichts" einen echten Wert. */
const KEINER = '__keiner__';

export interface StationZettelProps {
	mode: 'create' | 'edit';
	form: StationForm;
	/** Die Helfer des Fests (ADR 0005) — Auswahl für den ♛ Verantwortlichen. */
	helpers: Helper[];
	onChange: (patch: Partial<StationForm>) => void;
	onCancel: () => void;
	onSave: () => void;
	/** Der Radix-Dialog reicht hier seinen `DialogTitle` durch; alleinstehend
	 * (Schaukasten, Test) bleibt es eine gewöhnliche Überschrift. */
	TitleTag?: ElementType;
}

/** „Hochauer Franz" — Nachname zuerst, wie überall sonst in der App. */
const helperName = (helper: Pick<Helper, 'first_name' | 'last_name'>) =>
	`${helper.last_name} ${helper.first_name}`.trim();

/**
 * Der Station-Zettel (#106): Papier-Grund, 3px-Tinte-Rahmen, Versatz-Schatten,
 * grüner Halftone-Kopf mit Oswald-Titel, gelber Primärknopf — derselbe
 * `PaperSheet` wie der Positions-Zettel des Materials (#117/#119), damit die
 * Dialoge der App ein Papier bedrucken und nicht jeder ein eigenes.
 *
 * Felder nach #106: Name, Ort, Soll-Personen, ♛ Verantwortlicher. Der Zettel
 * ist gesteuert — er hält keinen eigenen Zustand.
 */
const StationZettel: React.FC<StationZettelProps> = ({
	mode,
	form,
	helpers,
	onChange,
	onCancel,
	onSave,
	TitleTag = 'h2'
}) => {
	const responsible = helpers.find((h) => h.id === form.responsible_helper_id);

	return (
		<PaperSheet
			title={mode === 'edit' ? 'Station bearbeiten' : 'Neue Station'}
			TitleTag={TitleTag}
			onClose={onCancel}
			footer={
				<>
					<Button variant="outline" className={FOCUS_INK} onClick={onCancel}>
						Abbrechen
					</Button>
					<Button
						data-zettel="speichern"
						className={FOCUS_INK}
						onClick={onSave}
						disabled={!canSaveStation(form)}>
						{mode === 'edit' ? 'Speichern' : 'Anlegen'}
					</Button>
				</>
			}>
			<PaperSheetFields>
				<PaperSheetField wide label="Name" htmlFor="station-name">
					<Input
						id="station-name"
						className={FOCUS_INK}
						value={form.name}
						onChange={(e) => onChange({ name: e.target.value })}
						placeholder="z.B. Ausschank, Kassa, Grill"
					/>
				</PaperSheetField>

				<PaperSheetField
					label="Ort"
					htmlFor="station-place"
					hint="Steht im grünen Kopf der Station">
					<Input
						id="station-place"
						className={FOCUS_INK}
						value={form.description}
						onChange={(e) => onChange({ description: e.target.value })}
						placeholder="z.B. Zelt Nord"
					/>
				</PaperSheetField>

				<PaperSheetField
					label="Soll-Personen"
					htmlFor="station-required"
					hint="Zählt nur, solange die Station keine Schichten hat">
					<Input
						id="station-required"
						type="number"
						min="1"
						className={cn('tabular-nums', FOCUS_INK)}
						value={form.required_people}
						onChange={(e) => onChange({ required_people: e.target.value })}
					/>
				</PaperSheetField>

				<PaperSheetField wide label="♛ Verantwortlicher" htmlFor="station-responsible">
					<Select
						value={form.responsible_helper_id || KEINER}
						onValueChange={(value) =>
							onChange({ responsible_helper_id: value === KEINER ? '' : value })
						}>
						<SelectTrigger id="station-responsible" className={FOCUS_INK}>
							<SelectValue placeholder="Kein Verantwortlicher">
								{responsible ? helperName(responsible) : 'Kein Verantwortlicher'}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={KEINER}>Kein Verantwortlicher</SelectItem>
							{helpers.map((helper) => (
								<SelectItem key={helper.id} value={helper.id}>
									{helperName(helper)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PaperSheetField>
			</PaperSheetFields>
		</PaperSheet>
	);
};

export default StationZettel;
