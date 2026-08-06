import React, { useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
}

/** Pause zwischen zwei Downloads — ohne sie blockt der Browser die Folgedateien. */
const DOWNLOAD_GAP_MS = 350;

/**
 * Der Radix-Rahmen um den Materiallisten-Export-Zettel (#119). Er hält Achse
 * und gewählte Gruppe und schiebt die Papiere raus — Optik und Beschriftung
 * liegen im `MaterialExportZettel`, die Regel in `materialExportPlan`, das
 * Papier in `materialExportService`.
 */
const MaterialExportDialog: React.FC<MaterialExportDialogProps> = ({
	open,
	onOpenChange,
	festivalName,
	materials
}) => {
	const [axis, setAxis] = useState<MaterialAxis>('station');
	const [groupId, setGroupId] = useState<string | null>(null);

	const plan = useMemo(() => planMaterialExport(materials, axis, groupId), [materials, axis, groupId]);

	const changeAxis = (next: MaterialAxis) => {
		setAxis(next);
		// Die Gruppen-Id trägt die Achse im Schlüssel — nach dem Wechsel gilt
		// wieder „alle Gruppen".
		setGroupId(null);
	};

	const run = async (format: 'pdf' | 'excel') => {
		const papers: MaterialListPaper[] = plan.sheets.map((sheet) => ({
			festivalName,
			label: sheet.label,
			showStation: sheet.showStation,
			materials: sheet.materials
		}));

		for (let i = 0; i < papers.length; i++) {
			if (format === 'pdf') exportMaterialListPdf(papers[i]);
			else exportMaterialListExcel(papers[i]);
			if (i < papers.length - 1) await new Promise((r) => setTimeout(r, DOWNLOAD_GAP_MS));
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setAxis('station');
			setGroupId(null);
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
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
					onCancel={() => handleOpenChange(false)}
					TitleTag={DialogTitle}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default MaterialExportDialog;
