import React from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

interface MaterialTableProps {
	materials: FestivalMaterialWithStation[];
	onEdit: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
}

function formatPackaging(m: FestivalMaterialWithStation): string {
	if (m.packaging_unit && m.amount_per_packaging) {
		const unitShort = m.unit === 'Liter' ? 'L' : m.unit;
		return `${m.amount_per_packaging}${unitShort} ${m.packaging_unit}`;
	}
	if (m.packaging_unit) {
		return m.packaging_unit;
	}
	return m.unit;
}

function formatQuantity(qty: number | null, m: FestivalMaterialWithStation): string {
	if (qty == null) return '–';
	if (m.packaging_unit && m.amount_per_packaging) {
		const total = qty * m.amount_per_packaging;
		const unitShort = m.unit === 'Liter' ? 'L' : m.unit;
		return `${qty} (${total}${unitShort})`;
	}
	return `${qty}`;
}

function formatDifference(m: FestivalMaterialWithStation): { text: string; className: string } {
	if (m.actual_quantity == null) return { text: '–', className: 'text-muted-foreground' };
	const diff = m.ordered_quantity - m.actual_quantity;
	if (diff > 0) return { text: `+${diff}`, className: 'text-green-600' };
	if (diff < 0) return { text: `${diff}`, className: 'text-red-600' };
	return { text: '0', className: 'text-muted-foreground' };
}

function formatPrice(price: number | null): string {
	if (price == null) return '–';
	return `${price.toFixed(2)} €`;
}

function formatTotal(m: FestivalMaterialWithStation): string {
	if (m.unit_price == null) return '–';
	const total = m.ordered_quantity * m.unit_price;
	return `${total.toFixed(2)} €`;
}

const MaterialTable: React.FC<MaterialTableProps> = ({ materials, onEdit, onDelete }) => {
	const totalCost = materials.reduce((sum, m) => {
		if (m.unit_price != null) {
			return sum + m.ordered_quantity * m.unit_price;
		}
		return sum;
	}, 0);

	const hasCosts = materials.some((m) => m.unit_price != null);

	if (materials.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				Keine Materialien vorhanden
			</div>
		);
	}

	return (
		<div className="rounded-md border overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Material</TableHead>
						<TableHead>Kategorie</TableHead>
						<TableHead>Station</TableHead>
						<TableHead>Lieferant</TableHead>
						<TableHead>Gebinde</TableHead>
						<TableHead className="text-right">Bestellt</TableHead>
						<TableHead className="text-right">Verbraucht</TableHead>
						<TableHead className="text-right">Differenz</TableHead>
						<TableHead className="text-right">Preis</TableHead>
						<TableHead className="text-right">Gesamt</TableHead>
						<TableHead className="w-[80px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{materials.map((m) => {
						const diff = formatDifference(m);
						return (
							<TableRow key={m.id}>
								<TableCell className="font-medium">{m.name}</TableCell>
								<TableCell>{m.category || '–'}</TableCell>
								<TableCell>{m.station?.name || '–'}</TableCell>
								<TableCell>{m.supplier || '–'}</TableCell>
								<TableCell>{formatPackaging(m)}</TableCell>
								<TableCell className="text-right">{formatQuantity(m.ordered_quantity, m)}</TableCell>
								<TableCell className="text-right">{formatQuantity(m.actual_quantity, m)}</TableCell>
								<TableCell className={`text-right ${diff.className}`}>{diff.text}</TableCell>
								<TableCell className="text-right">{formatPrice(m.unit_price)}</TableCell>
								<TableCell className="text-right">{formatTotal(m)}</TableCell>
								<TableCell>
									<div className="flex gap-1">
										<Button variant="ghost" size="icon" onClick={() => onEdit(m)}>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="icon" onClick={() => onDelete(m.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
				{hasCosts && (
					<TableFooter>
						<TableRow>
							<TableCell colSpan={9} className="text-right font-semibold">
								Gesamtkosten
							</TableCell>
							<TableCell className="text-right font-semibold">
								{totalCost.toFixed(2)} €
							</TableCell>
							<TableCell />
						</TableRow>
					</TableFooter>
				)}
			</Table>
		</div>
	);
};

export default MaterialTable;
