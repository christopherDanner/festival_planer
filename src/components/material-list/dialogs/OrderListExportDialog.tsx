import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { buildOrderList, planOrderListExport, type OrderListAxis } from '@/lib/orderList';
import {
	exportOrderListSinglePdf,
	exportOrderListSingleExcel,
	exportOrderListCollectionPdf,
	exportOrderListCollectionExcel,
	type OrderListMeta,
} from '@/lib/orderListExportService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

interface OrderListExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalName: string;
	materials: FestivalMaterialWithStation[];
}

const ALL = '__all__';
const NONE = '__none__';

const OrderListExportDialog: React.FC<OrderListExportDialogProps> = ({
	open, onOpenChange, festivalName, materials,
}) => {
	const [axis, setAxis] = useState<OrderListAxis>('supplier');
	const [selectValue, setSelectValue] = useState<string>(ALL);

	// Groups that will actually produce output (only positions with ordered_quantity > 0).
	const groups = useMemo(() => buildOrderList(materials, axis), [materials, axis]);

	const selectedKey = selectValue === ALL ? null : selectValue === NONE ? '' : selectValue;
	const plan = useMemo(() => planOrderListExport(materials, axis, selectedKey), [materials, axis, selectedKey]);

	const axisNoun = axis === 'supplier' ? 'Lieferant' : 'Station';
	const allLabel = axis === 'supplier' ? 'Alle Lieferanten' : 'Alle Stationen';

	const info = useMemo(() => {
		if (selectValue === ALL) {
			if (plan.individual.length === 0) return 'Keine Positionen mit Menge > 0';
			return `${plan.individual.length} Einzeldateien + 1 Sammeldokument`;
		}
		const group = plan.individual[0];
		return group ? `${group.rows.length} Positionen` : 'Keine Positionen mit Menge > 0';
	}, [selectValue, plan]);

	const canExport = plan.individual.length > 0;

	const setAxisAndReset = (next: OrderListAxis) => {
		setAxis(next);
		setSelectValue(ALL);
	};

	const runExport = async (formatKind: 'pdf' | 'excel') => {
		const meta: OrderListMeta = { festivalName, axis };
		const jobs: Array<() => void> = [];

		for (const group of plan.individual) {
			jobs.push(() =>
				formatKind === 'pdf'
					? exportOrderListSinglePdf(group, meta)
					: exportOrderListSingleExcel(group, meta)
			);
		}
		if (plan.collection) {
			const collection = plan.collection;
			jobs.push(() =>
				formatKind === 'pdf'
					? exportOrderListCollectionPdf(collection, meta)
					: exportOrderListCollectionExcel(collection, meta)
			);
		}

		for (let i = 0; i < jobs.length; i++) {
			jobs[i]();
			if (i < jobs.length - 1) await new Promise((r) => setTimeout(r, 350));
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setAxis('supplier');
			setSelectValue(ALL);
		}
		onOpenChange(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">Bestellliste exportieren</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Axis toggle */}
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Gruppieren nach</p>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setAxisAndReset('supplier')}
								className={`px-3 py-1 text-xs border transition-colors ${
									axis === 'supplier' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Lieferant
							</button>
							<button
								type="button"
								onClick={() => setAxisAndReset('station')}
								className={`px-3 py-1 text-xs border transition-colors ${
									axis === 'station' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted/50'
								}`}>
								Station
							</button>
						</div>
					</div>

					{/* Group select */}
					<Select value={selectValue} onValueChange={setSelectValue}>
						<SelectTrigger className="h-9 text-sm">
							<SelectValue placeholder={`${axisNoun} auswählen`} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>{allLabel} (Einzeldateien + Sammeldokument)</SelectItem>
							{groups.map((g) => (
								<SelectItem key={g.key || NONE} value={g.key || NONE}>
									{g.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Count info */}
					<p className="text-sm text-muted-foreground">{info}</p>

					{/* Export buttons */}
					<div className="flex gap-2">
						<Button
							onClick={() => void runExport('pdf')}
							variant="outline"
							className="flex-1 gap-2"
							disabled={!canExport}>
							<FileDown className="h-4 w-4" />
							PDF exportieren
						</Button>
						<Button
							onClick={() => void runExport('excel')}
							variant="outline"
							className="flex-1 gap-2"
							disabled={!canExport}>
							<FileSpreadsheet className="h-4 w-4" />
							Excel
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default OrderListExportDialog;
