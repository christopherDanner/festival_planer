import React, { useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { buildOrderList, planOrderListExport, type OrderListAxis } from '@/lib/orderList';
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
}

/** Pause zwischen zwei Downloads — ohne sie blockt der Browser die Folgedateien. */
const DOWNLOAD_GAP_MS = 350;

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
	materials
}) => {
	const [axis, setAxis] = useState<OrderListAxis>('supplier');
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

	const groups = useMemo(() => buildOrderList(materials, axis), [materials, axis]);
	const plan = useMemo(
		() => planOrderListExport(materials, axis, selectedKey),
		[materials, axis, selectedKey]
	);

	const changeAxis = (next: OrderListAxis) => {
		setAxis(next);
		// Ein Lieferantenname ist auf der Stations-Achse kein Schlüssel.
		setSelectedKey(null);
	};

	const run = async (format: 'pdf' | 'excel') => {
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

		for (let i = 0; i < jobs.length; i++) {
			jobs[i]();
			if (i < jobs.length - 1) await new Promise((r) => setTimeout(r, DOWNLOAD_GAP_MS));
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setAxis('supplier');
			setSelectedKey(null);
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				hideClose
				aria-describedby={undefined}
				className="max-w-[560px] border-0 bg-transparent p-0 shadow-none sm:p-0">
				<OrderListExportZettel
					axis={axis}
					onAxisChange={changeAxis}
					selectedKey={selectedKey}
					onSelectedKeyChange={setSelectedKey}
					groups={groups}
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

export default OrderListExportDialog;
