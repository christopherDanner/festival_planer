import React, { type ElementType } from 'react';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { ZettelField, ZETTEL_FOCUS } from '@/components/toolkit/Zettel';
import {
	summarizeOrderListExport,
	type OrderListAxis,
	type OrderListExportPlan,
	type OrderListGroup
} from '@/lib/orderList';

import ExportZettel from './ExportZettel';

/** Auswahlwert „alle Gruppen"; die Gruppe ohne Zuordnung hat den leeren
Schlüssel und braucht darum ihren eigenen Platzhalter (Radix verbietet ''). */
export const ALL_GROUPS = '__alle__';
export const NO_GROUP = '__ohne__';

/** Die zwei Achsen der Bestellliste — Lieferant zuerst, weil `CONTEXT.md` die
Bestellliste über den Lieferanten definiert („alle Positionen mit demselben
Lieferanten ergeben eine Bestellung"). */
const AXES: readonly { value: OrderListAxis; label: string }[] = [
	{ value: 'supplier', label: 'LIEFERANT' },
	{ value: 'station', label: 'STATION' }
];

export interface OrderListExportZettelProps {
	axis: OrderListAxis;
	onAxisChange: (axis: OrderListAxis) => void;
	/** Gewählte Gruppe (`''` ist die Gruppe ohne Zuordnung); `null` heißt „alle". */
	selectedKey: string | null;
	onSelectedKeyChange: (key: string | null) => void;
	/** Alle Gruppen der Achse — die Auswahl. */
	groups: OrderListGroup[];
	/** Der geplante Export (`planOrderListExport`). */
	plan: OrderListExportPlan;
	onPdf: () => void;
	onExcel: () => void;
	onCancel: () => void;
	TitleTag?: ElementType;
}

/**
 * Der Zettel des Bestelllisten-Exports (#119). Die Bestellliste gruppiert
 * weiterhin nach **Lieferant oder Station** (`CONTEXT.md`) und enthält nur
 * Positionen mit Bestellmenge > 0 — das entscheidet `buildOrderList`, dieser
 * Zettel fragt nur Achse und Gruppe ab.
 *
 * Gesteuert wie der Positions-Zettel (#117); die Zahlen kommen fertig gerechnet
 * aus `summarizeOrderListExport` bzw. `materialCosts`.
 */
const OrderListExportZettel: React.FC<OrderListExportZettelProps> = ({
	axis,
	onAxisChange,
	selectedKey,
	onSelectedKeyChange,
	groups,
	plan,
	onPdf,
	onExcel,
	onCancel,
	TitleTag
}) => {
	const summary = summarizeOrderListExport(plan);
	const selected = selectedKey == null ? null : groups.find((g) => g.key === selectedKey) ?? null;
	const allLabel = `Alle ${axis === 'supplier' ? 'Lieferanten' : 'Stationen'} (Einzeldateien + Sammeldokument)`;

	return (
		<ExportZettel
			title="Bestellliste exportieren"
			TitleTag={TitleTag}
			summary={{
				positionCount: summary.positionCount,
				fileCount: summary.fileCount,
				ordered: summary.orderedValue,
				withoutPrice: summary.withoutPrice
			}}
			onPdf={onPdf}
			onExcel={onExcel}
			onCancel={onCancel}>
			<ZettelField
				wide
				label="Gruppiert nach"
				hint="Eine Bestellung je Lieferant — oder je Station, wo die Ware gebraucht wird.">
				<SegmentedControl
					options={AXES}
					value={axis}
					onValueChange={onAxisChange}
					aria-label="Achse der Bestellliste"
					className="w-max"
				/>
			</ZettelField>

			<ZettelField
				wide
				label="Welche Bestellung"
				htmlFor="order-export-group"
				hint="Nur Positionen mit Bestellmenge stehen darauf.">
				<Select
					value={selected ? selected.key || NO_GROUP : ALL_GROUPS}
					onValueChange={(value) =>
						onSelectedKeyChange(
							value === ALL_GROUPS ? null : value === NO_GROUP ? '' : value
						)
					}>
					<SelectTrigger id="order-export-group" className={ZETTEL_FOCUS}>
						<SelectValue>
							{selected ? `${selected.name} (${selected.rows.length})` : allLabel}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_GROUPS}>{allLabel}</SelectItem>
						{groups.map((group) => (
							<SelectItem key={group.key || NO_GROUP} value={group.key || NO_GROUP}>
								{group.name} ({group.rows.length})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</ZettelField>
		</ExportZettel>
	);
};

export default OrderListExportZettel;
