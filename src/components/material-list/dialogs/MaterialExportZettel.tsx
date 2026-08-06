import React, { type ElementType } from 'react';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { FOCUS_INK, PaperSheetField } from '@/components/toolkit/PaperSheet';
import { MATERIAL_AXES, type MaterialAxis } from '@/lib/materialGrouping';
import type { MaterialExportPlan } from '@/lib/materialExportPlan';

import ExportZettel from './ExportZettel';

/** Auswahlwert „alle Gruppen" — Radix braucht einen nicht-leeren Wert. */
const ALL_GROUPS = '__alle__';
const ALL_GROUPS_LABEL = 'Alle Gruppen (einzelne Dateien)';

export interface MaterialExportZettelProps {
	axis: MaterialAxis;
	onAxisChange: (axis: MaterialAxis) => void;
	/** Gewählte Gruppe; `null` heißt „alle Gruppen, je eine Datei". */
	groupId: string | null;
	onGroupChange: (groupId: string | null) => void;
	/** Fertig geplanter Export — Papiere, Zahlen und Auswahl (`materialExportPlan`). */
	plan: MaterialExportPlan;
	onPdf: () => void;
	onExcel: () => void;
	onCancel: () => void;
	TitleTag?: ElementType;
}

/**
 * Der Zettel des Materiallisten-Exports (#119). Gefragt wird nur zweierlei:
 * **entlang welcher Achse** eingeteilt wird — dieselben vier wie in der
 * Arbeitsliste (#113) — und **welche Gruppe** aufs Papier kommt.
 *
 * Die früheren drei Umfänge („Gesamte Liste / Nach Station / Nach Lieferant")
 * gehen darin auf: `ALLE` ist die gesamte Liste, `STATION`/`LIEFERANT` mit
 * „alle Gruppen" die Stapel-Ausgabe. Kategorie kommt gratis dazu, weil der
 * Export nun genauso einteilt wie der Bildschirm.
 *
 * Der Zettel ist gesteuert: Achse und Gruppe hält der Dialog.
 */
const MaterialExportZettel: React.FC<MaterialExportZettelProps> = ({
	axis,
	onAxisChange,
	groupId,
	onGroupChange,
	plan,
	onPdf,
	onExcel,
	onCancel,
	TitleTag
}) => {
	// Kennt die Achse die Gruppe nicht (Achse gewechselt), steht wieder „alle
	// Gruppen" da — genauso, wie `planMaterialExport` dann alle Papiere plant.
	const selected = groupId == null ? null : plan.groups.find((g) => g.id === groupId) ?? null;

	return (
		<ExportZettel
			title="Materialliste exportieren"
			TitleTag={TitleTag}
			summary={{
				positionCount: plan.positionCount,
				fileCount: plan.sheets.length,
				ordered: plan.ordered,
				consumed: plan.consumed,
				withoutPrice: plan.withoutPrice
			}}
			onPdf={onPdf}
			onExcel={onExcel}
			onCancel={onCancel}>
			<PaperSheetField
				wide
				label="Sortiert nach"
				hint="Dieselben Achsen wie die Arbeitsliste — ein Papier je Gruppe.">
				<SegmentedControl
					options={MATERIAL_AXES}
					value={axis}
					onValueChange={onAxisChange}
					aria-label="Achse des Exports"
					className="w-max"
				/>
			</PaperSheetField>

			{/* Auf der Achse ALLE gibt es genau eine Gruppe — fragen wäre sinnlos. */}
			{axis !== 'all' && (
				<PaperSheetField wide label="Welches Papier" htmlFor="mat-export-group">
					<Select
						value={selected?.id ?? ALL_GROUPS}
						onValueChange={(value) => onGroupChange(value === ALL_GROUPS ? null : value)}>
						<SelectTrigger id="mat-export-group" className={FOCUS_INK}>
							<SelectValue>
								{selected ? `${selected.name} (${selected.count})` : ALL_GROUPS_LABEL}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_GROUPS}>{ALL_GROUPS_LABEL}</SelectItem>
							{plan.groups.map((group) => (
								<SelectItem key={group.id} value={group.id}>
									{group.name} ({group.count})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PaperSheetField>
			)}
		</ExportZettel>
	);
};

export default MaterialExportZettel;
