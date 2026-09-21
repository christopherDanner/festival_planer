import React, { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { runDownloads } from '@/lib/exportDownloads';
import { planOrderListExport, type OrderListAxis } from '@/lib/orderList';
import {
	exportOrderListSinglePdf,
	exportOrderListSingleExcel,
	exportOrderListCollectionPdf,
	exportOrderListCollectionExcel,
	type OrderListMeta
} from '@/lib/orderListExportService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

import OrderListExportZettel from './OrderListExportZettel';

interface OrderListExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	/** Achse, auf der die Bestellliste beginnt — abgeleitet aus der Achse der
	Arbeitsliste (#113); die Bestellliste kennt nur Lieferant und Station. */
	axis: OrderListAxis;
	/** Vorgewählte Gruppe (Lieferantenname bzw. Stations-Id, `''` für die
	Restgruppe); `null` heißt „alle". */
	selectedKey: string | null;
}

/**
 * Der Radix-Rahmen um den Bestelllisten-Export-Zettel (#119). Er hält Achse und
 * gewählte Gruppe und schiebt die Papiere raus; die Bestellliste selbst — nur
 * Positionen mit Bestellmenge > 0, gruppiert nach Lieferant oder Station —
 * entsteht in `orderList`.
 */
const OrderListExportDialog: React.FC<OrderListExportDialogProps> = ({
	open,
	onOpenChange,
	festivalName,
	materials,
	axis: viewAxis,
	selectedKey: viewSelectedKey
}) => {
	const [axis, setAxis] = useState<OrderListAxis>(viewAxis);
	const [selectedKey, setSelectedKey] = useState<string | null>(viewSelectedKey);

	// Beim Öffnen den Stand des Bildschirms übernehmen, danach nicht mehr.
	useEffect(() => {
		if (!open) return;
		setAxis(viewAxis);
		setSelectedKey(viewSelectedKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const plan = useMemo(
		() => planOrderListExport(materials, axis, selectedKey),
		[materials, axis, selectedKey]
	);

	const changeAxis = (next: OrderListAxis) => {
		setAxis(next);
		// Ein Lieferantenname ist auf der Stations-Achse kein Schlüssel.
		setSelectedKey(null);
	};

	const run = (format: 'pdf' | 'excel') => {
		const meta: OrderListMeta = { festivalName, axis };
		const jobs: Array<() => void> = plan.individual.map((group) => () =>
			format === 'pdf'
				? exportOrderListSinglePdf(group, meta)
				: exportOrderListSingleExcel(group, meta)
		);
		if (plan.collection?.length) {
			const collection = plan.collection;
			jobs.push(() =>
				format === 'pdf'
					? exportOrderListCollectionPdf(collection, meta)
					: exportOrderListCollectionExcel(collection, meta)
			);
		}
		return runDownloads(jobs);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[560px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<OrderListExportZettel
					axis={axis}
					onAxisChange={changeAxis}
					selectedKey={selectedKey}
					onSelectedKeyChange={setSelectedKey}
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

export default OrderListExportDialog;
