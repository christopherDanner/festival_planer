import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { CopyFestivalOptions } from '@/lib/festivalCopyService';

/** Was Schritt 3 zur Kopie beisteuert — die Stationen kommen aus Schritt 2. */
export type MaterialSelection = Pick<CopyFestivalOptions, 'materialIds' | 'materialQuantitySource'>;

interface MaterialSelectionStepProps {
	materials: FestivalMaterialWithStation[];
	loading: boolean;
	onBack: () => void;
	onSubmit: (selection: MaterialSelection) => void;
}

/**
 * Schritt 3 des Kopierwerks in der alten shadcn-Optik — die Stationen sind mit
 * #94 in `StationsShiftsStep` gewandert, dieser Zettel führt nur noch das
 * Material. In Werkzeug-Handschrift baut ihn #95 neu.
 */
export default function MaterialSelectionStep({
	materials, loading, onBack, onSubmit,
}: MaterialSelectionStepProps) {
	const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set(materials.map(m => m.id)));
	const [quantitySource, setQuantitySource] = useState<'ordered' | 'actual'>('ordered');

	const categories = useMemo(() => [...new Set(materials.map(m => m.category).filter(Boolean))] as string[], [materials]);
	const suppliers = useMemo(() => [...new Set(materials.map(m => m.supplier).filter(Boolean))] as string[], [materials]);
	const materialStationNames = useMemo(() =>
		[...new Set(materials.filter(m => m.station).map(m => m.station!.name))],
	[materials]);

	const allMaterialsSelected = materials.length > 0 && selectedMaterialIds.size === materials.length;

	const toggleAllMaterials = () => {
		setSelectedMaterialIds(allMaterialsSelected ? new Set() : new Set(materials.map(m => m.id)));
	};

	const toggleMaterial = (id: string) => {
		const next = new Set(selectedMaterialIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		setSelectedMaterialIds(next);
	};

	const toggleGroup = (filterFn: (m: FestivalMaterialWithStation) => boolean) => {
		const groupIds = materials.filter(filterFn).map(m => m.id);
		const allSelected = groupIds.every(id => selectedMaterialIds.has(id));
		const next = new Set(selectedMaterialIds);
		if (allSelected) {
			groupIds.forEach(id => next.delete(id));
		} else {
			groupIds.forEach(id => next.add(id));
		}
		setSelectedMaterialIds(next);
	};

	const getGroupState = (filterFn: (m: FestivalMaterialWithStation) => boolean): boolean | 'indeterminate' => {
		const groupIds = materials.filter(filterFn).map(m => m.id);
		const selectedCount = groupIds.filter(id => selectedMaterialIds.has(id)).length;
		if (selectedCount === 0) return false;
		if (selectedCount === groupIds.length) return true;
		return 'indeterminate';
	};

	const chipClass = (state: boolean | 'indeterminate') =>
		`text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
			state === true
				? 'bg-primary text-primary-foreground border-primary'
				: state === 'indeterminate'
					? 'bg-primary/20 border-primary/40'
					: 'bg-muted/30 border-border hover:bg-muted/50'
		}`;

	const handleSubmit = () => {
		onSubmit({
			materialIds: [...selectedMaterialIds],
			materialQuantitySource: quantitySource,
		});
	};

	return (
		<div className="space-y-6">
			{/* Materials */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-lg">Materialien</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{materials.length === 0 ? (
						<p className="text-sm text-muted-foreground">Keine Materialien vorhanden</p>
					) : (
						<>
							<RadioGroup value={quantitySource} onValueChange={(v) => setQuantitySource(v as 'ordered' | 'actual')}>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<RadioGroupItem value="ordered" id="qty-ordered" />
										<Label htmlFor="qty-ordered" className="text-sm">Bestellmenge</Label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="actual" id="qty-actual" />
										<Label htmlFor="qty-actual" className="text-sm">Tatsächliche Menge</Label>
									</div>
								</div>
							</RadioGroup>

							{/* Group toggles by section */}
							{categories.length > 0 && (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kategorie</p>
									<div className="flex flex-wrap gap-2">
										{categories.map(cat => (
											<button key={`cat-${cat}`} type="button"
												onClick={() => toggleGroup(m => m.category === cat)}
												className={chipClass(getGroupState(m => m.category === cat))}>
												{cat}
											</button>
										))}
									</div>
								</div>
							)}
							{suppliers.length > 0 && (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lieferant</p>
									<div className="flex flex-wrap gap-2">
										{suppliers.map(sup => (
											<button key={`sup-${sup}`} type="button"
												onClick={() => toggleGroup(m => m.supplier === sup)}
												className={chipClass(getGroupState(m => m.supplier === sup))}>
												{sup}
											</button>
										))}
									</div>
								</div>
							)}
							{(materialStationNames.length > 0 || materials.some(m => !m.station_id)) && (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Station</p>
									<div className="flex flex-wrap gap-2">
										{materialStationNames.map(st => (
											<button key={`st-${st}`} type="button"
												onClick={() => toggleGroup(m => m.station?.name === st)}
												className={chipClass(getGroupState(m => m.station?.name === st))}>
												{st}
											</button>
										))}
										{materials.some(m => !m.station_id) && (
											<button type="button"
												onClick={() => toggleGroup(m => !m.station_id)}
												className={chipClass(getGroupState(m => !m.station_id))}>
												Ohne Station
											</button>
										)}
									</div>
								</div>
							)}

							{/* All/None + list */}
							<div className="flex items-center gap-2">
								<Checkbox
									id="all-materials"
									checked={allMaterialsSelected ? true : selectedMaterialIds.size === 0 ? false : 'indeterminate'}
									onCheckedChange={toggleAllMaterials}
								/>
								<Label htmlFor="all-materials" className="text-sm font-medium">Alle Materialien</Label>
								<span className="text-xs text-muted-foreground ml-auto">
									{selectedMaterialIds.size}/{materials.length} gewählt
								</span>
							</div>
							<div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
								{materials.map(m => (
									<label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
										<Checkbox
											checked={selectedMaterialIds.has(m.id)}
											onCheckedChange={() => toggleMaterial(m.id)}
										/>
										<span className="text-sm flex-1 truncate">{m.name}</span>
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											{m.category || '–'}
										</span>
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											{quantitySource === 'actual' ? (m.actual_quantity ?? 0) : m.ordered_quantity} {m.unit}
										</span>
									</label>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex gap-3">
				<Button variant="outline" onClick={onBack} className="flex-1">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Zurück
				</Button>
				<Button onClick={handleSubmit} className="flex-1" disabled={loading}>
					{loading ? 'Erstelle Fest...' : 'Fest erstellen'}
				</Button>
			</div>
		</div>
	);
}
