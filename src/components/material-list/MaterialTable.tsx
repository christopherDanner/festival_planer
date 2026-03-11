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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
	if (diff > 0) return { text: `+${diff}`, className: 'text-status-complete-border font-medium' };
	if (diff < 0) return { text: `${diff}`, className: 'text-destructive font-medium' };
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

const MaterialMobileCard: React.FC<{
	material: FestivalMaterialWithStation;
	onEdit: () => void;
	onDelete: () => void;
}> = ({ material, onEdit, onDelete }) => {
	const diff = formatDifference(material);
	return (
		<div className="rounded-lg border bg-card shadow-sm overflow-hidden">
			<div className="flex items-start justify-between gap-2 p-3 pb-2">
				<div className="min-w-0">
					<p className="font-medium text-sm">{material.name}</p>
					<div className="flex flex-wrap gap-1 mt-1.5">
						{material.category && (
							<Badge variant="outline" className="text-[10px] px-1.5 py-0">{material.category}</Badge>
						)}
						{material.station?.name && (
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0">{material.station.name}</Badge>
						)}
						{material.supplier && (
							<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">{material.supplier}</Badge>
						)}
					</div>
				</div>
				<div className="flex gap-0.5 shrink-0">
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-border/50">
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">Bestellt</span>
					<p className="text-sm font-medium mt-0.5">{formatQuantity(material.ordered_quantity, material)}</p>
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">Verbraucht</span>
					<p className="text-sm font-medium mt-0.5">{formatQuantity(material.actual_quantity, material)}</p>
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">Differenz</span>
					<p className={`text-sm mt-0.5 ${diff.className}`}>{diff.text}</p>
				</div>
			</div>
			{material.unit_price != null && (
				<div className="px-3 py-1.5 border-t flex items-center justify-between text-xs">
					<span className="text-muted-foreground">{formatPackaging(material)} · {formatPrice(material.unit_price)}/Stk</span>
					<span className="font-semibold">{formatTotal(material)}</span>
				</div>
			)}
		</div>
	);
};

const MaterialTable: React.FC<MaterialTableProps> = ({ materials, onEdit, onDelete }) => {
	const isMobile = useIsMobile();

	const totalCost = materials.reduce((sum, m) => {
		if (m.unit_price != null) {
			return sum + m.ordered_quantity * m.unit_price;
		}
		return sum;
	}, 0);

	const hasCosts = materials.some((m) => m.unit_price != null);

	if (materials.length === 0) {
		return (
			<div className="rounded-lg border border-dashed py-12 flex flex-col items-center gap-2">
				<Package className="h-8 w-8 text-muted-foreground/40" />
				<p className="text-sm text-muted-foreground/60">Keine Materialien vorhanden</p>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="space-y-2">
				{materials.map((m) => (
					<MaterialMobileCard
						key={m.id}
						material={m}
						onEdit={() => onEdit(m)}
						onDelete={() => onDelete(m.id)}
					/>
				))}
				{hasCosts && (
					<div className="rounded-lg border bg-card p-3 flex items-center justify-between">
						<span className="font-semibold text-sm">Gesamtkosten</span>
						<span className="font-semibold text-sm">{totalCost.toFixed(2)} €</span>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-card overflow-x-auto">
			<Table>
				<TableHeader className="sticky top-0 z-10">
					<TableRow className="hover:bg-transparent">
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
