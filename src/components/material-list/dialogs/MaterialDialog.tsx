import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { Station } from '@/lib/shiftService';
import { mergeSuggestions } from '@/lib/materialSuggestions';
import type { MaterialPrefill } from '@/lib/materialGrouping';
import {
	buildMasterDataUpdate,
	buildMaterialPayload,
	canSave,
	dialogMode,
	emptyMaterialForm,
	formFromMaterial,
	type MaterialForm,
	type MaterialSaveData
} from '@/lib/materialDialogForm';
import MaterialZettel from './MaterialZettel';

const DEFAULT_CATEGORIES = [
	'Getränke',
	'Lebensmittel',
	'Dekoration',
	'Geschirr/Besteck',
	'Inventar',
	'Technik',
	'Sonstiges'
];

interface MaterialDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	material?: FestivalMaterialWithStation | null;
	/**
	 * Vorgetragene Zuordnung für eine *neue* Position — „+ POSITION FÜR
	 * AUSSCHANK" im Gruppen-Kasten setzt die Station der Gruppe schon (#113).
	 * Beim Bearbeiten einer Position wirkungslos.
	 */
	prefill?: MaterialPrefill;
	stations: Station[];
	festivalId: string;
	existingSuppliers?: string[];
	existingCategories?: string[];
	onCreateStation?: (name: string) => Promise<Station>;
	/** Beim Anlegen die volle Nutzlast, beim Bearbeiten nur die Stammdaten —
	 * `isFullPayload` unterscheidet die beiden. */
	onSave: (data: MaterialSaveData) => void;
}

/**
 * Positions-Dialog (#117): der Radix-Rahmen um den Positions-Zettel. Er hält
 * den Formularzustand und übergibt beim Speichern — Optik und Feldschnitt
 * liegen im `MaterialZettel`, die Regeln in `materialDialogForm`.
 *
 * Der Dialog selbst ist nur noch Positionierung: Rahmen, Papier und Schatten
 * trägt der Zettel, damit das Plakat an *einer* Stelle steht.
 */
const MaterialDialog: React.FC<MaterialDialogProps> = ({
	open,
	onOpenChange,
	material,
	prefill,
	stations,
	festivalId,
	existingSuppliers = [],
	existingCategories = [],
	onCreateStation,
	onSave
}) => {
	const categorySuggestions = mergeSuggestions(DEFAULT_CATEGORIES, existingCategories);
	const supplierSuggestions = mergeSuggestions([], existingSuppliers);
	const mode = dialogMode(material);
	const [form, setForm] = useState<MaterialForm>(() => emptyMaterialForm(prefill));

	useEffect(() => {
		setForm(material ? formFromMaterial(material) : emptyMaterialForm(prefill));
		// Auf die Felder von `prefill` hören, nicht auf das Objekt — ein Literal
		// wäre bei jedem Rendern neu und würde das Formular leerräumen.
	}, [material, open, prefill?.station_id, prefill?.supplier, prefill?.category]);

	const handleSave = () => {
		if (!canSave(form, mode)) return;
		const context = { festivalId, categorySuggestions, supplierSuggestions };
		// Der Stammdaten-Dialog schreibt beim Bearbeiten auch nur Stammdaten.
		onSave(
			mode === 'create'
				? buildMaterialPayload(form, context)
				: buildMasterDataUpdate(form, context)
		);
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
				<MaterialZettel
					mode={mode}
					form={form}
					onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
					stations={stations}
					categorySuggestions={categorySuggestions}
					supplierSuggestions={supplierSuggestions}
					onCreateStation={onCreateStation}
					onCancel={() => onOpenChange(false)}
					onSave={handleSave}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialDialog;
