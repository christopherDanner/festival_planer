# Material-Übernahme & Export-Anpassung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to transfer materials from an old festival to a new one with custom quantities, and adapt exports (PDF/Excel) for station leaders to review and plan new orders.

**Architecture:** New `MaterialTransferDialog` component following existing dialog patterns (similar to `InvoiceMatchDialog`). Export functions in `materialExportService.ts` are rebuilt to remove pricing columns and add "Neue Menge" column with explanatory text. `updateMaterialsBulk` in `materialService.ts` is generalized to support `ordered_quantity` updates.

**Tech Stack:** React 18, TypeScript, Supabase, jsPDF + jspdf-autotable, XLSX, shadcn-ui, React Query, Tailwind CSS

---

### Task 1: Generalize `updateMaterialsBulk` in materialService

**Files:**
- Modify: `src/lib/materialService.ts:79-89`
- Modify: `src/components/material-list/hooks/useMaterialListActions.ts:86-103`

- [ ] **Step 1: Update `updateMaterialsBulk` signature and implementation**

In `src/lib/materialService.ts`, replace the current `updateMaterialsBulk` function (lines 79-89) with:

```ts
export const updateMaterialsBulk = async (
	updates: { id: string; actual_quantity?: number; unit_price?: number | null; ordered_quantity?: number }[]
): Promise<void> => {
	for (const u of updates) {
		const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
		if (u.actual_quantity !== undefined) updateData.actual_quantity = u.actual_quantity;
		if (u.unit_price !== undefined) updateData.unit_price = u.unit_price;
		if (u.ordered_quantity !== undefined) updateData.ordered_quantity = u.ordered_quantity;
		const { error } = await (supabase as any)
			.from('festival_materials')
			.update(updateData)
			.eq('id', u.id);
		if (error) throw error;
	}
};
```

- [ ] **Step 2: Update `useMaterialListActions` bulk update mutation type**

In `src/components/material-list/hooks/useMaterialListActions.ts`, change the `bulkUpdateMaterialsMutation` mutationFn type (line 87) from:

```ts
mutationFn: (updates: { id: string; actual_quantity: number; unit_price?: number | null }[]) =>
```

to:

```ts
mutationFn: (updates: { id: string; actual_quantity?: number; unit_price?: number | null; ordered_quantity?: number }[]) =>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors. The change is backward-compatible — existing callers still work.

- [ ] **Step 4: Commit**

```bash
git add src/lib/materialService.ts src/components/material-list/hooks/useMaterialListActions.ts
git commit -m "feat: generalize updateMaterialsBulk to support ordered_quantity"
```

---

### Task 2: Create MaterialTransferDialog component

**Files:**
- Create: `src/components/material-list/dialogs/MaterialTransferDialog.tsx`

This is the main dialog. It has two steps: (1) select source festival, (2) review materials and enter desired quantities.

- [ ] **Step 1: Create the dialog file**

Create `src/components/material-list/dialogs/MaterialTransferDialog.tsx` with the following content:

```tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ArrowDownToLine } from 'lucide-react';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
import { getMaterials, type FestivalMaterialWithStation, type FestivalMaterial } from '@/lib/materialService';

type Step = 'select-festival' | 'review';

interface TransferRow {
	sourceMaterial: FestivalMaterialWithStation;
	checked: boolean;
	desiredQuantity: string; // string for input binding
	existingMatch: FestivalMaterialWithStation | null; // matched material in target festival
}

interface MaterialTransferDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festivalId: string;
	festivalName: string;
	targetMaterials: FestivalMaterialWithStation[];
	targetStations: { id: string; name: string }[];
	onTransfer: (
		newMaterials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[],
		updates: { id: string; ordered_quantity: number }[]
	) => void;
	isTransferring: boolean;
}

function matchByName(
	sourceMaterials: FestivalMaterialWithStation[],
	targetMaterials: FestivalMaterialWithStation[]
): TransferRow[] {
	const targetByName = new Map<string, FestivalMaterialWithStation>();
	for (const t of targetMaterials) {
		targetByName.set(t.name.trim().toLowerCase(), t);
	}

	return sourceMaterials.map((src) => {
		const match = targetByName.get(src.name.trim().toLowerCase()) || null;
		return {
			sourceMaterial: src,
			checked: false, // all unchecked initially
			desiredQuantity: '',
			existingMatch: match,
		};
	});
}

function mapStationId(
	sourceStationName: string | null | undefined,
	targetStations: { id: string; name: string }[]
): string | null {
	if (!sourceStationName) return null;
	const match = targetStations.find(
		(s) => s.name.trim().toLowerCase() === sourceStationName.trim().toLowerCase()
	);
	return match ? match.id : null;
}

const MaterialTransferDialog: React.FC<MaterialTransferDialogProps> = ({
	open, onOpenChange, festivalId, festivalName, targetMaterials, targetStations,
	onTransfer, isTransferring
}) => {
	const [step, setStep] = useState<Step>('select-festival');
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loadingFestivals, setLoadingFestivals] = useState(false);
	const [selectedFestivalId, setSelectedFestivalId] = useState<string>('__none__');
	const [sourceMaterials, setSourceMaterials] = useState<FestivalMaterialWithStation[]>([]);
	const [loadingMaterials, setLoadingMaterials] = useState(false);
	const [rows, setRows] = useState<TransferRow[]>([]);

	// Load festivals on open
	useEffect(() => {
		if (!open) return;
		setLoadingFestivals(true);
		getUserFestivals()
			.then((data) => setFestivals(data.filter((f) => f.id !== festivalId)))
			.catch(() => setFestivals([]))
			.finally(() => setLoadingFestivals(false));
	}, [open, festivalId]);

	// Load source materials when festival selected
	useEffect(() => {
		if (selectedFestivalId === '__none__') {
			setSourceMaterials([]);
			setRows([]);
			return;
		}
		setLoadingMaterials(true);
		getMaterials(selectedFestivalId)
			.then((data) => {
				setSourceMaterials(data);
				setRows(matchByName(data, targetMaterials));
			})
			.catch(() => {
				setSourceMaterials([]);
				setRows([]);
			})
			.finally(() => setLoadingMaterials(false));
	}, [selectedFestivalId, targetMaterials]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setStep('select-festival');
			setSelectedFestivalId('__none__');
			setSourceMaterials([]);
			setRows([]);
		}
		onOpenChange(open);
	};

	const handleQuantityChange = useCallback((index: number, value: string) => {
		setRows((prev) => {
			const next = [...prev];
			const row = { ...next[index] };
			row.desiredQuantity = value;
			// Auto-check when quantity is entered (for new items)
			const numVal = parseFloat(value);
			if (!row.existingMatch) {
				row.checked = !isNaN(numVal) && numVal > 0;
			}
			next[index] = row;
			return next;
		});
	}, []);

	const handleCheckChange = useCallback((index: number, checked: boolean) => {
		setRows((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], checked };
			return next;
		});
	}, []);

	const summary = useMemo(() => {
		let newCount = 0;
		let updateCount = 0;
		for (const row of rows) {
			if (!row.checked) continue;
			const qty = parseFloat(row.desiredQuantity);
			if (isNaN(qty) || qty <= 0) continue;
			if (row.existingMatch) updateCount++;
			else newCount++;
		}
		return { newCount, updateCount, total: newCount + updateCount };
	}, [rows]);

	const handleTransfer = () => {
		const newMaterials: Omit<FestivalMaterial, 'id' | 'created_at' | 'updated_at'>[] = [];
		const updates: { id: string; ordered_quantity: number }[] = [];

		for (const row of rows) {
			if (!row.checked) continue;
			const qty = parseFloat(row.desiredQuantity);
			if (isNaN(qty) || qty <= 0) continue;

			if (row.existingMatch) {
				updates.push({ id: row.existingMatch.id, ordered_quantity: qty });
			} else {
				const src = row.sourceMaterial;
				newMaterials.push({
					festival_id: festivalId,
					name: src.name,
					category: src.category,
					supplier: src.supplier,
					station_id: mapStationId(src.station?.name, targetStations),
					unit: src.unit,
					packaging_unit: src.packaging_unit,
					amount_per_packaging: src.amount_per_packaging,
					ordered_quantity: qty,
					actual_quantity: null,
					unit_price: null,
					tax_rate: null,
					price_is_net: true,
					price_per: 'unit',
					notes: src.notes,
				});
			}
		}

		onTransfer(newMaterials, updates);
	};

	const selectedFestival = festivals.find((f) => f.id === selectedFestivalId);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg">
						Material übernehmen
					</DialogTitle>
				</DialogHeader>

				{step === 'select-festival' && (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Wähle ein vergangenes Fest, von dem du Materialien in <strong>{festivalName}</strong> übernehmen möchtest.
						</p>

						{loadingFestivals ? (
							<div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Feste werden geladen…
							</div>
						) : (
							<Select value={selectedFestivalId} onValueChange={setSelectedFestivalId}>
								<SelectTrigger className="h-9 text-sm">
									<SelectValue placeholder="Fest auswählen…" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Fest auswählen…</SelectItem>
									{festivals.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.name || 'Unbenanntes Fest'} — {new Date(f.start_date).toLocaleDateString('de-AT')}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						{selectedFestivalId !== '__none__' && loadingMaterials && (
							<div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Materialien werden geladen…
							</div>
						)}

						{selectedFestivalId !== '__none__' && !loadingMaterials && sourceMaterials.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								Dieses Fest hat keine Materialien.
							</p>
						)}

						{selectedFestivalId !== '__none__' && !loadingMaterials && sourceMaterials.length > 0 && (
							<div className="text-sm text-muted-foreground">
								{sourceMaterials.length} Materialien gefunden
							</div>
						)}

						<div className="flex justify-end">
							<Button
								onClick={() => setStep('review')}
								disabled={selectedFestivalId === '__none__' || loadingMaterials || sourceMaterials.length === 0}
								className="gap-2"
								size="sm"
							>
								Weiter
							</Button>
						</div>
					</div>
				)}

				{step === 'review' && (
					<div className="flex flex-col gap-3 min-h-0 flex-1">
						{/* Back button + festival info */}
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm" onClick={() => setStep('select-festival')} className="gap-1 px-2">
								<ArrowLeft className="h-3.5 w-3.5" />
								Zurück
							</Button>
							<span className="text-sm text-muted-foreground">
								Quelle: <strong>{selectedFestival?.name || 'Fest'}</strong>
							</span>
						</div>

						<p className="text-xs text-muted-foreground">
							Trage die gewünschte Bestellmenge in der Spalte „Wunschmenge" ein. Positionen, die bereits in {festivalName} vorhanden sind, sind markiert und standardmäßig abgewählt.
						</p>

						{/* Scrollable table area */}
						<div className="overflow-auto flex-1 min-h-0 border rounded-md">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 sticky top-0 z-10">
									<tr className="border-b">
										<th className="p-2 w-8"></th>
										<th className="p-2 text-left font-medium">Name</th>
										<th className="p-2 text-left font-medium">Station</th>
										<th className="p-2 text-left font-medium">Lieferant</th>
										<th className="p-2 text-left font-medium">Einheit</th>
										<th className="p-2 text-left font-medium">VE</th>
										<th className="p-2 text-right font-medium">Menge/VE</th>
										<th className="p-2 text-right font-medium">Bestellt</th>
										<th className="p-2 text-right font-medium">Ist-Menge</th>
										<th className="p-2 text-right font-medium min-w-[100px]">Wunschmenge</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row, i) => {
										const isExisting = !!row.existingMatch;
										return (
											<tr
												key={row.sourceMaterial.id}
												className={`border-b ${isExisting ? 'bg-muted/30 text-muted-foreground' : ''}`}
											>
												<td className="p-2 text-center">
													<Checkbox
														checked={row.checked}
														onCheckedChange={(checked) => handleCheckChange(i, !!checked)}
													/>
												</td>
												<td className="p-2">
													<div className="flex items-center gap-1.5">
														<span className={isExisting ? 'text-muted-foreground' : ''}>{row.sourceMaterial.name}</span>
														{isExisting && (
															<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
																vorhanden
															</Badge>
														)}
													</div>
												</td>
												<td className="p-2">{row.sourceMaterial.station?.name || '–'}</td>
												<td className="p-2">{row.sourceMaterial.supplier || '–'}</td>
												<td className="p-2">{row.sourceMaterial.unit}</td>
												<td className="p-2">{row.sourceMaterial.packaging_unit || '–'}</td>
												<td className="p-2 text-right">{row.sourceMaterial.amount_per_packaging ?? '–'}</td>
												<td className="p-2 text-right">{row.sourceMaterial.ordered_quantity}</td>
												<td className="p-2 text-right">
													{row.sourceMaterial.actual_quantity != null
														? row.sourceMaterial.actual_quantity
														: '–'}
												</td>
												<td className="p-2">
													<Input
														type="number"
														min="0"
														step="any"
														value={row.desiredQuantity}
														onChange={(e) => handleQuantityChange(i, e.target.value)}
														placeholder="0"
														className="h-7 text-sm text-right w-full"
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Summary + action */}
						<div className="flex items-center justify-between pt-1">
							<p className="text-sm text-muted-foreground">
								{summary.total === 0
									? 'Keine Positionen ausgewählt'
									: `${summary.newCount > 0 ? `${summary.newCount} neue` : ''}${summary.newCount > 0 && summary.updateCount > 0 ? ', ' : ''}${summary.updateCount > 0 ? `${summary.updateCount} aktualisieren` : ''}`}
							</p>
							<Button
								onClick={handleTransfer}
								disabled={summary.total === 0 || isTransferring}
								className="gap-2"
								size="sm"
							>
								{isTransferring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
								<ArrowDownToLine className="h-3.5 w-3.5" />
								Übernehmen
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default MaterialTransferDialog;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors (the component is not yet wired into the app).

- [ ] **Step 3: Commit**

```bash
git add src/components/material-list/dialogs/MaterialTransferDialog.tsx
git commit -m "feat: add MaterialTransferDialog component for cross-festival material transfer"
```

---

### Task 3: Wire MaterialTransferDialog into MaterialListView

**Files:**
- Modify: `src/components/material-list/MaterialListView.tsx`
- Modify: `src/components/material-list/MaterialListHeader.tsx`

- [ ] **Step 1: Add `onTransferMaterial` prop to MaterialListHeader**

In `src/components/material-list/MaterialListHeader.tsx`, add the new prop and button. Replace the entire file with:

```tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, Upload, FileCheck, FileDown, ArrowDownToLine } from 'lucide-react';

interface MaterialListHeaderProps {
	onAddMaterial: () => void;
	onImportMaterial: () => void;
	onInvoiceMatch: () => void;
	onExport: () => void;
	onTransfer: () => void;
}

const MaterialListHeader: React.FC<MaterialListHeaderProps> = ({ onAddMaterial, onImportMaterial, onInvoiceMatch, onExport, onTransfer }) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<h2 className="text-lg sm:text-xl font-semibold">Materialliste</h2>
			<div className="grid grid-cols-5 sm:flex gap-1.5 sm:gap-2">
				<Button variant="outline" onClick={onTransfer} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Übernehmen</span>
				</Button>
				<Button variant="outline" onClick={onExport} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Export</span>
				</Button>
				<Button variant="outline" onClick={onInvoiceMatch} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Abgleich</span>
				</Button>
				<Button variant="outline" onClick={onImportMaterial} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Import</span>
				</Button>
				<Button onClick={onAddMaterial} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
					<Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
					<span className="truncate">Neu</span>
				</Button>
			</div>
		</div>
	);
};

export default MaterialListHeader;
```

- [ ] **Step 2: Wire dialog and transfer logic into MaterialListView**

In `src/components/material-list/MaterialListView.tsx`:

**2a.** Add import at the top (after the other dialog imports):

```ts
import MaterialTransferDialog from './dialogs/MaterialTransferDialog';
```

**2b.** Add `'transfer'` to the `DialogState` type:

Replace:
```ts
type DialogState =
	| { type: null }
	| { type: 'material'; material?: FestivalMaterialWithStation }
	| { type: 'import' }
	| { type: 'invoice-match' }
	| { type: 'export' };
```

With:
```ts
type DialogState =
	| { type: null }
	| { type: 'material'; material?: FestivalMaterialWithStation }
	| { type: 'import' }
	| { type: 'invoice-match' }
	| { type: 'export' }
	| { type: 'transfer' };
```

**2c.** Add `onTransfer` to the `MaterialListHeader` call:

Replace:
```tsx
<MaterialListHeader
	onAddMaterial={() => setDialogState({ type: 'material' })}
	onImportMaterial={() => setDialogState({ type: 'import' })}
	onInvoiceMatch={() => setDialogState({ type: 'invoice-match' })}
	onExport={() => setDialogState({ type: 'export' })}
/>
```

With:
```tsx
<MaterialListHeader
	onAddMaterial={() => setDialogState({ type: 'material' })}
	onImportMaterial={() => setDialogState({ type: 'import' })}
	onInvoiceMatch={() => setDialogState({ type: 'invoice-match' })}
	onExport={() => setDialogState({ type: 'export' })}
	onTransfer={() => setDialogState({ type: 'transfer' })}
/>
```

**2d.** Add the `MaterialTransferDialog` at the bottom of the JSX, right before the closing `</div>`:

After the `MaterialExportDialog` block, add:

```tsx
<MaterialTransferDialog
	open={dialogState.type === 'transfer'}
	onOpenChange={(open) => { if (!open) setDialogState({ type: null }); }}
	festivalId={festivalId}
	festivalName={festivalName || 'Festival'}
	targetMaterials={materials}
	targetStations={stations}
	onTransfer={async (newMaterials, updates) => {
		if (newMaterials.length > 0) {
			await actions.bulkCreateMaterials.mutateAsync(newMaterials);
		}
		if (updates.length > 0) {
			await actions.bulkUpdateMaterials.mutateAsync(updates);
		}
		setDialogState({ type: null });
	}}
	isTransferring={actions.bulkCreateMaterials.isPending || actions.bulkUpdateMaterials.isPending}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Manual test**

Run: `npm run dev`
- Open a festival with materials
- Click "Übernehmen" button → dialog opens
- Select a source festival → materials load
- Already existing materials show "vorhanden" badge and are unchecked
- Enter quantities, check items, click "Übernehmen"
- Verify materials appear in the list

- [ ] **Step 5: Commit**

```bash
git add src/components/material-list/MaterialListView.tsx src/components/material-list/MaterialListHeader.tsx
git commit -m "feat: wire MaterialTransferDialog into MaterialListView and header"
```

---

### Task 4: Rebuild export functions (PDF & Excel)

**Files:**
- Modify: `src/lib/materialExportService.ts`
- Modify: `src/components/material-list/dialogs/MaterialExportDialog.tsx`

- [ ] **Step 1: Update `MaterialExportOptions` interface and rebuild `exportMaterialsToExcel`**

Replace the entire content of `src/lib/materialExportService.ts` with:

```ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FestivalMaterialWithStation } from '@/lib/materialService';

export interface MaterialExportOptions {
	festivalName: string;
	materials: FestivalMaterialWithStation[];
	filterLabel?: string;
	isStationFiltered?: boolean;
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').trim();
}

function buildFilename(festivalName: string, suffix: string, filterLabel?: string): string {
	const base = sanitizeFilename(festivalName);
	if (filterLabel) {
		return `${base}_Materialliste_${sanitizeFilename(filterLabel)}.${suffix}`;
	}
	return `${base}_Materialliste.${suffix}`;
}

const EXPLANATION_TEXT = (festivalName: string) =>
	`Diese Liste zeigt die bestellten und tatsächlich verbrauchten Mengen des Festes „${festivalName}". ` +
	`Bitte tragen Sie in der Spalte „Neue Menge" die gewünschte Bestellmenge für das kommende Fest ein ` +
	`und geben Sie die ausgefüllte Liste an den Festverantwortlichen zurück.`;

// ── Excel Export ──────────────────────────────────────────────

export function exportMaterialsToExcel(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel, isStationFiltered } = options;
	const wb = XLSX.utils.book_new();

	const rows: (string | number | null)[][] = [];

	// Title rows
	const subtitle = filterLabel ? `Materialliste — ${filterLabel}` : 'Materialliste';
	rows.push([festivalName]);
	rows.push([subtitle]);
	rows.push([]); // empty row
	rows.push([EXPLANATION_TEXT(festivalName)]);
	rows.push([]); // empty row before table

	// Headers — omit Station column when filtered by station
	const headers = isStationFiltered
		? ['Name', 'Lieferant', 'Einheit', 'Verpackung', 'Menge/VE', 'Bestellt', 'Ist-Menge', 'Neue Menge']
		: ['Name', 'Lieferant', 'Station', 'Einheit', 'Verpackung', 'Menge/VE', 'Bestellt', 'Ist-Menge', 'Neue Menge'];
	rows.push(headers);

	for (const m of materials) {
		const row = isStationFiltered
			? [
				m.name,
				m.supplier || '',
				m.unit,
				m.packaging_unit || '',
				m.amount_per_packaging ?? '',
				m.ordered_quantity,
				m.actual_quantity ?? '',
				'', // Neue Menge — empty for user to fill in
			]
			: [
				m.name,
				m.supplier || '',
				m.station?.name || '',
				m.unit,
				m.packaging_unit || '',
				m.amount_per_packaging ?? '',
				m.ordered_quantity,
				m.actual_quantity ?? '',
				'', // Neue Menge
			];
		rows.push(row);
	}

	// Summary row
	rows.push([]);
	rows.push([`Gesamt: ${materials.length} Positionen`]);

	const ws = XLSX.utils.aoa_to_sheet(rows);

	// Column widths
	ws['!cols'] = isStationFiltered
		? [
			{ wch: 28 }, // Name
			{ wch: 20 }, // Lieferant
			{ wch: 10 }, // Einheit
			{ wch: 14 }, // Verpackung
			{ wch: 10 }, // Menge/VE
			{ wch: 10 }, // Bestellt
			{ wch: 12 }, // Ist-Menge
			{ wch: 14 }, // Neue Menge
		]
		: [
			{ wch: 28 }, // Name
			{ wch: 20 }, // Lieferant
			{ wch: 18 }, // Station
			{ wch: 10 }, // Einheit
			{ wch: 14 }, // Verpackung
			{ wch: 10 }, // Menge/VE
			{ wch: 10 }, // Bestellt
			{ wch: 12 }, // Ist-Menge
			{ wch: 14 }, // Neue Menge
		];

	// Merge explanation text across columns
	const colCount = headers.length;
	ws['!merges'] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // title
		{ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }, // subtitle
		{ s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } }, // explanation
	];

	XLSX.utils.book_append_sheet(wb, ws, 'Materialliste');
	XLSX.writeFile(wb, buildFilename(festivalName, 'xlsx', filterLabel));
}

// ── PDF Export ────────────────────────────────────────────────

export function exportMaterialsToPdf(options: MaterialExportOptions): void {
	const { festivalName, materials, filterLabel, isStationFiltered } = options;
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	let y = 15;

	// Title
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.text(festivalName, pageWidth / 2, y, { align: 'center' });
	y += 6;

	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	const subtitle = filterLabel ? `Materialliste — ${filterLabel}` : 'Materialliste';
	doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
	y += 8;

	// Explanation text
	doc.setFontSize(9);
	doc.setFont('helvetica', 'italic');
	const explanationLines = doc.splitTextToSize(EXPLANATION_TEXT(festivalName), pageWidth - margin * 2);
	doc.text(explanationLines, margin, y);
	y += explanationLines.length * 4 + 4;

	// Table columns — omit Station when filtered
	const head = isStationFiltered
		? [['Name', 'Lieferant', 'Einheit', 'VE', 'Menge/VE', 'Bestellt', 'Ist-Menge', 'Neue Menge']]
		: [['Name', 'Lieferant', 'Station', 'Einheit', 'VE', 'Menge/VE', 'Bestellt', 'Ist-Menge', 'Neue Menge']];

	const body = materials.map(m => {
		const baseRow = [
			m.name,
			m.supplier || '',
			...(isStationFiltered ? [] : [m.station?.name || '']),
			m.unit,
			m.packaging_unit || '',
			m.amount_per_packaging != null ? String(m.amount_per_packaging) : '',
			String(m.ordered_quantity),
			m.actual_quantity != null ? String(m.actual_quantity) : '',
			'', // Neue Menge — empty
		];
		return baseRow;
	});

	// Column style indices shift based on whether station is shown
	const neueMengeIdx = isStationFiltered ? 7 : 8;
	const istMengeIdx = isStationFiltered ? 6 : 7;
	const bestelltIdx = isStationFiltered ? 5 : 6;
	const mengeVeIdx = isStationFiltered ? 4 : 5;

	const columnStyles: Record<number, any> = isStationFiltered
		? {
			0: { cellWidth: 32 },  // Name
			1: { cellWidth: 24 },  // Lieferant
			2: { cellWidth: 14 },  // Einheit
			3: { cellWidth: 16 },  // VE
			4: { cellWidth: 14, halign: 'right' },  // Menge/VE
			5: { cellWidth: 14, halign: 'right' },  // Bestellt
			6: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },  // Ist-Menge
			7: { cellWidth: 20, halign: 'right' },  // Neue Menge
		}
		: {
			0: { cellWidth: 28 },  // Name
			1: { cellWidth: 22 },  // Lieferant
			2: { cellWidth: 18 },  // Station
			3: { cellWidth: 12 },  // Einheit
			4: { cellWidth: 14 },  // VE
			5: { cellWidth: 12, halign: 'right' },  // Menge/VE
			6: { cellWidth: 12, halign: 'right' },  // Bestellt
			7: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },  // Ist-Menge
			8: { cellWidth: 18, halign: 'right' },  // Neue Menge
		};

	autoTable(doc, {
		startY: y,
		head,
		body,
		theme: 'grid',
		styles: {
			fontSize: 8,
			cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
			overflow: 'linebreak',
			valign: 'top',
			lineWidth: 0.2,
		},
		headStyles: {
			fillColor: [70, 70, 70],
			fontStyle: 'bold',
			fontSize: 8,
			halign: 'center',
			cellPadding: 2,
		},
		columnStyles,
		margin: { left: margin, right: margin },
		didParseCell: (hookData) => {
			if (hookData.section === 'body') {
				// Highlight Ist-Menge column in light blue
				if (hookData.column.index === istMengeIdx) {
					const text = hookData.cell.raw as string;
					if (text) {
						hookData.cell.styles.fillColor = [235, 245, 255];
						hookData.cell.styles.textColor = [30, 64, 120];
					}
				}
				// Highlight Neue Menge column in light yellow
				if (hookData.column.index === neueMengeIdx) {
					hookData.cell.styles.fillColor = [255, 253, 230];
				}
			}
		},
		didDrawPage: () => {
			const pageCount = (doc as any).internal.getNumberOfPages();
			const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
			doc.setFontSize(8);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(130, 130, 130);
			doc.text(
				`Seite ${currentPage} von ${pageCount}`,
				pageWidth / 2,
				pageHeight - 8,
				{ align: 'center' }
			);
			doc.setTextColor(0, 0, 0);
		},
	});

	// Summary below table
	const finalY = (doc as any).lastAutoTable.finalY + 8;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.text(`${materials.length} Positionen`, margin, finalY);

	doc.save(buildFilename(festivalName, 'pdf', filterLabel));
}
```

- [ ] **Step 2: Pass `isStationFiltered` from `MaterialExportDialog`**

In `src/components/material-list/dialogs/MaterialExportDialog.tsx`, update the export handler functions.

Replace:
```ts
const handleExportPdf = () => {
	exportMaterialsToPdf({ festivalName, materials: filteredMaterials, filterLabel });
};

const handleExportExcel = () => {
	exportMaterialsToExcel({ festivalName, materials: filteredMaterials, filterLabel });
};
```

With:
```ts
const isStationFiltered = filterMode === 'station' && selectedStationId !== '__none__';

const handleExportPdf = () => {
	exportMaterialsToPdf({ festivalName, materials: filteredMaterials, filterLabel, isStationFiltered });
};

const handleExportExcel = () => {
	exportMaterialsToExcel({ festivalName, materials: filteredMaterials, filterLabel, isStationFiltered });
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Manual test**

Run: `npm run dev`
- Export PDF with "Gesamte Liste" → should have Station column, no prices, explanation text, "Neue Menge" column with yellow background
- Export PDF with a specific station filter → Station column should be gone, station name in subtitle
- Export Excel → same column logic, explanation text in merged cells above table
- Verify no price columns appear

- [ ] **Step 5: Commit**

```bash
git add src/lib/materialExportService.ts src/components/material-list/dialogs/MaterialExportDialog.tsx
git commit -m "feat: rebuild exports for order planning with explanation text and Neue Menge column"
```

---

### Task 5: Final integration test

**Files:** None (manual verification only)

- [ ] **Step 1: Full end-to-end test of material transfer**

Run: `npm run dev`

Test scenario:
1. Create a new festival (or use an existing one with no materials)
2. Open it → go to Materialliste
3. Click "Übernehmen" → select an old festival with materials
4. Verify materials load, already-existing ones show "vorhanden" badge
5. Enter quantities for some items, leave others empty
6. Check that new items auto-check when quantity is entered
7. Manually check an existing item and enter a new quantity
8. Click "Übernehmen" → verify new materials appear, existing one's ordered_quantity updated
9. Re-open "Übernehmen" dialog → previously transferred materials should now show as "vorhanden"

- [ ] **Step 2: Full end-to-end test of exports**

1. Export PDF with all stations → verify columns, explanation text, yellow "Neue Menge" column
2. Export PDF for one station → verify Station column is gone, station name in subtitle
3. Export Excel with all stations → verify merged explanation text, correct columns
4. Export Excel for one station → verify Station column gone

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: No errors, no warnings.

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: adjustments from integration testing"
```
