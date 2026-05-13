import React, { useState, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Package, Copy } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import {
	toBaseQuantity,
	fromBaseQuantity,
	formatPackaging,
	formatRequiredPackaging
} from '@/lib/materialQuantity';

/* ------------------------------------------------------------------ */
/*  Generic inline-editable cell (text / number)                      */
/* ------------------------------------------------------------------ */

const InlineEditCell: React.FC<{
	value: string;
	onSave: (value: string) => void;
	type?: 'text' | 'number';
	placeholder?: string;
	className?: string;
	inputClassName?: string;
}> = ({ value, onSave, type = 'text', placeholder, className, inputClassName }) => {
	const [editing, setEditing] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const startEdit = () => {
		setInputValue(value);
		setEditing(true);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	const commit = () => {
		setEditing(false);
		if (inputValue !== value) onSave(inputValue);
	};

	if (editing) {
		return (
			<Input
				ref={inputRef}
				type={type}
				step={type === 'number' ? 'any' : undefined}
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') setEditing(false);
					if (e.key === 'Tab') { commit(); } // Don't prevent default — let browser move focus
				}}
				className={inputClassName || 'h-7 w-full text-sm px-1'}
				placeholder={placeholder}
			/>
		);
	}

	return (
		<span
			onClick={startEdit}
			className={`cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 -mx-1 inline-block min-w-[30px] ${className || ''}`}
			title="Klicken zum Bearbeiten"
		>
			{value || <span className="text-muted-foreground/40">{placeholder || '–'}</span>}
		</span>
	);
};

/* ------------------------------------------------------------------ */
/*  Inline tax-rate select                                             */
/* ------------------------------------------------------------------ */

const InlineTaxSelect: React.FC<{
	value: number | null;
	onSave: (value: number | null) => void;
}> = ({ value, onSave }) => {
	return (
		<select
			value={value != null ? String(value) : ''}
			onChange={(e) => {
				const v = e.target.value;
				onSave(v ? Number(v) : null);
			}}
			className="h-7 text-xs bg-transparent border rounded px-1 cursor-pointer hover:bg-primary/5"
		>
			<option value="">Keine MwSt</option>
			<option value="10">10%</option>
			<option value="13">13%</option>
			<option value="20">20%</option>
		</select>
	);
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MaterialTableProps {
	materials: FestivalMaterialWithStation[];
	onEdit: (material: FestivalMaterialWithStation) => void;
	onDelete: (id: string) => void;
	onCopy: (material: FestivalMaterialWithStation) => void;
	onUpdateField: (id: string, field: string, value: any) => void;
	onUpdateFields: (id: string, partial: Partial<FestivalMaterialWithStation>) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDifference(m: FestivalMaterialWithStation): { text: string; className: string } {
	if (m.actual_quantity == null) return { text: '–', className: 'text-muted-foreground' };
	const orderedBase = toBaseQuantity(m.ordered_quantity, m) ?? 0;
	const actualBase = toBaseQuantity(m.actual_quantity, m) ?? 0;
	const diff = orderedBase - actualBase;
	const rounded = Math.round(diff * 100) / 100;
	if (rounded > 0) return { text: `+${rounded}`, className: 'text-status-complete-border font-medium' };
	if (rounded < 0) return { text: `${rounded}`, className: 'text-destructive font-medium' };
	return { text: '0', className: 'text-muted-foreground' };
}

function formatPrice(price: number | null): string {
	if (price == null) return '–';
	return `${price.toFixed(2)} €`;
}

function calculatePrices(material: FestivalMaterialWithStation): { net: number | null; gross: number | null } {
	if (material.unit_price == null) return { net: null, gross: null };
	if (material.tax_rate == null) return { net: material.unit_price, gross: material.unit_price };
	if (material.price_is_net) {
		return {
			net: material.unit_price,
			gross: Math.round(material.unit_price * (1 + material.tax_rate / 100) * 100) / 100
		};
	} else {
		return {
			net: Math.round(material.unit_price / (1 + material.tax_rate / 100) * 100) / 100,
			gross: material.unit_price
		};
	}
}

function billableQuantity(m: FestivalMaterialWithStation): number {
	const raw = m.actual_quantity ?? m.ordered_quantity;
	if (m.price_per === 'packaging' && m.packaging_unit && m.amount_per_packaging) {
		return Math.ceil(raw);
	}
	return raw;
}

function formatTotal(m: FestivalMaterialWithStation): string {
	if (m.unit_price == null) return '–';
	const prices = calculatePrices(m);
	const grossPrice = prices.gross ?? m.unit_price;
	return `${(billableQuantity(m) * grossPrice).toFixed(2)} €`;
}

function getTotalValue(m: FestivalMaterialWithStation): number {
	if (m.unit_price == null) return 0;
	const prices = calculatePrices(m);
	const grossPrice = prices.gross ?? m.unit_price;
	return billableQuantity(m) * grossPrice;
}

/* ------------------------------------------------------------------ */
/*  Mobile card                                                        */
/* ------------------------------------------------------------------ */

const MaterialMobileCard: React.FC<{
	material: FestivalMaterialWithStation;
	onEdit: () => void;
	onDelete: () => void;
	onCopy: () => void;
	onUpdateField: (field: string, value: any) => void;
	onUpdateFields: (partial: Partial<FestivalMaterialWithStation>) => void;
}> = ({ material, onEdit, onDelete, onCopy, onUpdateField, onUpdateFields }) => {
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
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Kopieren">
						<Copy className="h-3.5 w-3.5" />
					</Button>
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
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						Bestellt ({material.unit}) <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
					</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineEditCell
							value={String(toBaseQuantity(material.ordered_quantity, material) ?? 0)}
							onSave={(v) =>
								onUpdateField('ordered_quantity', v ? fromBaseQuantity(Number(v), material) : 0)
							}
							type="number"
							inputClassName="h-6 w-full text-sm px-1"
						/>
					</div>
					{formatRequiredPackaging(material.ordered_quantity, material) && (
						<span className="text-[10px] text-muted-foreground">
							→ {formatRequiredPackaging(material.ordered_quantity, material)}
						</span>
					)}
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						Verbraucht ({material.unit}) <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
					</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineEditCell
							value={
								material.actual_quantity != null
									? String(toBaseQuantity(material.actual_quantity, material) ?? '')
									: ''
							}
							onSave={(v) =>
								onUpdateField(
									'actual_quantity',
									v ? fromBaseQuantity(Number(v), material) : null
								)
							}
							type="number"
							placeholder="–"
							inputClassName="h-6 w-full text-sm px-1"
						/>
					</div>
					{material.actual_quantity != null && formatRequiredPackaging(material.actual_quantity, material) && (
						<span className="text-[10px] text-muted-foreground">
							→ {formatRequiredPackaging(material.actual_quantity, material)}
						</span>
					)}
				</div>
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">Differenz</span>
					<p className={`text-sm mt-0.5 ${diff.className}`}>{diff.text}</p>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-px bg-border/50 border-t">
				<div className="bg-card px-3 py-2">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">MwSt</span>
					<div className="text-sm font-medium mt-0.5">
						<InlineTaxSelect
							value={material.tax_rate}
							onSave={(v) => onUpdateField('tax_rate', v)}
						/>
					</div>
				</div>
				{(() => {
					const prices = calculatePrices(material);
					const netIsSource = material.price_is_net || material.unit_price == null;
					const grossIsSource = !material.price_is_net || material.unit_price == null;
					return (
						<>
							<div className="bg-card px-3 py-2">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
									Netto € <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
								</span>
								<div className="text-sm font-medium mt-0.5">
									<InlineEditCell
										value={prices.net != null ? prices.net.toFixed(2) : ''}
										onSave={(v) =>
											onUpdateFields({
												unit_price: v ? Number(v) : null,
												price_is_net: true
											})
										}
										type="number"
										placeholder="–"
										inputClassName="h-6 w-full text-sm px-1"
										className={netIsSource ? '' : 'text-muted-foreground italic'}
									/>
								</div>
							</div>
							<div className="bg-card px-3 py-2">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
									Brutto € <Pencil className="h-2.5 w-2.5 text-muted-foreground/40" />
								</span>
								<div className="text-sm font-medium mt-0.5">
									<InlineEditCell
										value={prices.gross != null ? prices.gross.toFixed(2) : ''}
										onSave={(v) =>
											onUpdateFields({
												unit_price: v ? Number(v) : null,
												price_is_net: false
											})
										}
										type="number"
										placeholder="–"
										inputClassName="h-6 w-full text-sm px-1"
										className={grossIsSource ? '' : 'text-muted-foreground italic'}
									/>
								</div>
							</div>
						</>
					);
				})()}
			</div>
			{material.unit_price != null && (
				<div className="px-3 py-1.5 border-t flex items-center justify-between text-xs">
					<span className="text-muted-foreground">{formatPackaging(material)}</span>
					<span className="font-semibold">{formatTotal(material)}</span>
				</div>
			)}
		</div>
	);
};

/* ------------------------------------------------------------------ */
/*  Main table component                                               */
/* ------------------------------------------------------------------ */

const MaterialTable: React.FC<MaterialTableProps> = ({ materials, onEdit, onDelete, onCopy, onUpdateField, onUpdateFields }) => {
	const isMobile = useIsMobile();

	const totalCost = materials.reduce((sum, m) => {
		return sum + getTotalValue(m);
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
						onCopy={() => onCopy(m)}
						onUpdateField={(field, value) => onUpdateField(m.id, field, value)}
						onUpdateFields={(partial) => onUpdateFields(m.id, partial)}
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
						<TableHead className="text-right">MwSt</TableHead>
						<TableHead className="text-right">Netto</TableHead>
						<TableHead className="text-right">Brutto</TableHead>
						<TableHead className="text-right">Gesamt</TableHead>
						<TableHead className="w-[116px]"></TableHead>
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
								<TableCell>
									<InlineEditCell
										value={m.supplier || ''}
										onSave={(v) => onUpdateField(m.id, 'supplier', v || null)}
										type="text"
										placeholder="–"
										inputClassName="h-7 w-28 text-sm px-1"
									/>
								</TableCell>
								<TableCell>{formatPackaging(m)}</TableCell>
								<TableCell className="text-right">
									<div className="flex flex-col items-end">
										<div className="inline-flex items-baseline gap-1">
											<InlineEditCell
												value={String(toBaseQuantity(m.ordered_quantity, m) ?? 0)}
												onSave={(v) =>
													onUpdateField(m.id, 'ordered_quantity', v ? fromBaseQuantity(Number(v), m) : 0)
												}
												type="number"
												inputClassName="h-7 w-16 text-right text-sm px-1"
												className="text-right"
											/>
											<span className="text-xs text-muted-foreground">{m.unit}</span>
										</div>
										{formatRequiredPackaging(m.ordered_quantity, m) && (
											<span className="text-[10px] text-muted-foreground">
												→ {formatRequiredPackaging(m.ordered_quantity, m)}
											</span>
										)}
									</div>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex flex-col items-end">
										<div className="inline-flex items-baseline gap-1">
											<InlineEditCell
												value={
													m.actual_quantity != null
														? String(toBaseQuantity(m.actual_quantity, m) ?? '')
														: ''
												}
												onSave={(v) =>
													onUpdateField(m.id, 'actual_quantity', v ? fromBaseQuantity(Number(v), m) : null)
												}
												type="number"
												placeholder="–"
												inputClassName="h-7 w-16 text-right text-sm px-1"
												className="text-right"
											/>
											<span className="text-xs text-muted-foreground">{m.unit}</span>
										</div>
										{m.actual_quantity != null && formatRequiredPackaging(m.actual_quantity, m) && (
											<span className="text-[10px] text-muted-foreground">
												→ {formatRequiredPackaging(m.actual_quantity, m)}
											</span>
										)}
									</div>
								</TableCell>
								<TableCell className={`text-right ${diff.className}`}>{diff.text}</TableCell>
								<TableCell className="text-right text-xs">
									<InlineTaxSelect
										value={m.tax_rate}
										onSave={(v) => onUpdateField(m.id, 'tax_rate', v)}
									/>
								</TableCell>
								<TableCell className="text-right text-xs">
									{(() => {
										const prices = calculatePrices(m);
										const isSource = m.price_is_net || m.unit_price == null;
										return (
											<InlineEditCell
												value={prices.net != null ? prices.net.toFixed(2) : ''}
												onSave={(v) =>
													onUpdateFields(m.id, {
														unit_price: v ? Number(v) : null,
														price_is_net: true
													})
												}
												type="number"
												placeholder="–"
												inputClassName="h-6 w-16 text-right text-xs px-1"
												className={`text-right ${isSource ? '' : 'text-muted-foreground italic'}`}
											/>
										);
									})()}
								</TableCell>
								<TableCell className="text-right text-xs">
									{(() => {
										const prices = calculatePrices(m);
										const isSource = !m.price_is_net || m.unit_price == null;
										return (
											<InlineEditCell
												value={prices.gross != null ? prices.gross.toFixed(2) : ''}
												onSave={(v) =>
													onUpdateFields(m.id, {
														unit_price: v ? Number(v) : null,
														price_is_net: false
													})
												}
												type="number"
												placeholder="–"
												inputClassName="h-6 w-16 text-right text-xs px-1"
												className={`text-right ${isSource ? '' : 'text-muted-foreground italic'}`}
											/>
										);
									})()}
								</TableCell>
								<TableCell className="text-right">{formatTotal(m)}</TableCell>
								<TableCell>
									<div className="flex gap-1">
										<Button variant="ghost" size="icon" onClick={() => onCopy(m)} title="Kopieren">
											<Copy className="h-4 w-4" />
										</Button>
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
							<TableCell colSpan={11} className="text-right font-semibold">
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
