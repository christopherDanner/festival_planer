import React, { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { runDownloads } from '@/lib/exportDownloads';
import { planMaterialExport } from '@/lib/materialExportPlan';
import {
	exportMaterialListExcel,
	exportMaterialListPdf,
	type MaterialListPaper
} from '@/lib/materialExportService';
import type { MaterialAxis } from '@/lib/materialGrouping';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

import MaterialExportZettel from './MaterialExportZettel';

interface MaterialExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	/** Achse der Arbeitsliste — der Export beginnt auf ihr (#113, Entscheid #66). */
	axis: MaterialAxis;
	/** Reiter der Arbeitsliste; `null` heißt „alle Gruppen". */
	groupId: string | null;
}

/**
 * Der Radix-Rahmen um den Materiallisten-Export-Zettel (#119). Er hält Achse
 * und gewählte Gruppe und schiebt die Papiere raus — Optik und Beschriftung
 * liegen im `MaterialExportZettel`, die Regel in `materialExportPlan`, das
 * Papier in `materialExportService`.
 *
 * Beim Öffnen übernimmt er Achse und Reiter der Arbeitsliste: wer auf
 * LIEFERANT/Metro schaut und EXPORT drückt, will Metros Liste. Danach darf er im
 * Dialog umstellen, ohne dass der Bildschirm mitspringt.
 */
const MaterialExportDialog: React.FC<MaterialExportDialogProps> = ({
	open,
	onOpenChange,
	festivalName,
	materials,
	axis: viewAxis,
	groupId: viewGroupId
}) => {
	const [axis, setAxis] = useState<MaterialAxis>(viewAxis);
	const [groupId, setGroupId] = useState<string | null>(viewGroupId);

	// Beim Öffnen (nicht bei jedem Rendern) den Stand des Bildschirms übernehmen.
	useEffect(() => {
		if (!open) return;
		setAxis(viewAxis);
		setGroupId(viewGroupId);
		// Absichtlich nur an `open` hängend: eine Achsenänderung hinter dem
		// offenen Dialog soll die Auswahl im Dialog nicht überschreiben.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const plan = useMemo(
		() => planMaterialExport(materials, axis, groupId),
		[materials, axis, groupId]
	);

	const changeAxis = (next: MaterialAxis) => {
		setAxis(next);
		// Die Gruppen-Id trägt die Achse im Schlüssel — nach dem Wechsel gilt
		// wieder „alle Gruppen".
		setGroupId(null);
	};

	const run = (format: 'pdf' | 'excel') => {
		const papers: MaterialListPaper[] = plan.sheets.map((sheet) => ({
			festivalName,
			label: sheet.label,
			showStation: sheet.showStation,
			materials: sheet.materials
		}));
		return runDownloads(
			papers.map((paper) => () =>
				format === 'pdf' ? exportMaterialListPdf(paper) : exportMaterialListExcel(paper)
			)
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Der Zettel bringt Rahmen, Papier und Versatz-Schatten mit — die
			Shell bleibt reine Positionierung (wie beim Positions-Dialog #117). */}
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[560px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<MaterialExportZettel
					axis={axis}
					onAxisChange={changeAxis}
					groupId={groupId}
					onGroupChange={setGroupId}
					plan={plan}
					onPdf={() => void run('pdf')}
					onExcel={() => void run('excel')}
					onCancel={() => onOpenChange(false)}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialExportDialog;
