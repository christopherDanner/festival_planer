import React, { useState, useMemo } from 'react';
import { useMaterialListData } from './hooks/useMaterialListData';
import { useMaterialListActions } from './hooks/useMaterialListActions';
import MaterialListHeader from './MaterialListHeader';
import MaterialFilters from './MaterialFilters';
import MaterialTable from './MaterialTable';
import MaterialDialog from './dialogs/MaterialDialog';
import MaterialImportDialog from './dialogs/MaterialImportDialog';
import InvoiceMatchDialog from './dialogs/InvoiceMatchDialog';
import type { FestivalMaterialWithStation, FestivalMaterial } from '@/lib/materialService';

type DialogState =
	| { type: null }
	| { type: 'material'; material?: FestivalMaterialWithStation }
	| { type: 'import' }
	| { type: 'invoice-match' };

interface MaterialListViewProps {
	festivalId: string;
}

const MaterialListView: React.FC<MaterialListViewProps> = ({ festivalId }) => {
	const { materials, stations, isLoading } = useMaterialListData(festivalId);
	const actions = useMaterialListActions(festivalId);

	const [dialogState, setDialogState] = useState<DialogState>({ type: null });
	const [searchTerm, setSearchTerm] = useState('');
	const [stationFilter, setStationFilter] = useState('all');
	const [supplierFilter, setSupplierFilter] = useState('all');
	const [categoryFilter, setCategoryFilter] = useState('all');

	const suppliers = useMemo(
		() => [...new Set(materials.map((m) => m.supplier).filter(Boolean))] as string[],
		[materials]
	);

	const categories = useMemo(
		() => [...new Set(materials.map((m) => m.category).filter(Boolean))] as string[],
		[materials]
	);

	const filteredMaterials = useMemo(() => {
		return materials.filter((m) => {
			if (searchTerm) {
				const term = searchTerm.toLowerCase();
				const matches =
					m.name.toLowerCase().includes(term) ||
					(m.supplier && m.supplier.toLowerCase().includes(term)) ||
					(m.category && m.category.toLowerCase().includes(term));
				if (!matches) return false;
			}
			if (stationFilter !== 'all') {
				if (stationFilter === '__none__') {
					if (m.station_id != null) return false;
				} else {
					if (m.station_id !== stationFilter) return false;
				}
			}
			if (supplierFilter !== 'all' && m.supplier !== supplierFilter) return false;
			if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
			return true;
		});
	}, [materials, searchTerm, stationFilter, supplierFilter, categoryFilter]);

	const resetFilters = () => {
		setSearchTerm('');
		setStationFilter('all');
		setSupplierFilter('all');
		setCategoryFilter('all');
	};

	const handleSave = (data: any) => {
		if (dialogState.type === 'material' && dialogState.material) {
			actions.updateMaterial.mutate({ id: dialogState.material.id, updates: data });
		} else {
			actions.createMaterial.mutate(data);
		}
	};

	const totalCost = useMemo(() => {
		return materials.reduce((sum, m) => {
			if (m.unit_price != null) return sum + m.ordered_quantity * m.unit_price;
			return sum;
		}, 0);
	}, [materials]);

	const categoryCount = categories.length;
	const stationCount = new Set(materials.map(m => m.station_id).filter(Boolean)).size;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-10 bg-muted rounded animate-pulse" />
				<div className="grid grid-cols-3 gap-2 sm:gap-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="rounded-lg border bg-card p-3 sm:p-4 animate-pulse space-y-2">
							<div className="h-3 bg-muted rounded w-1/2" />
							<div className="h-5 bg-muted rounded w-1/3" />
						</div>
					))}
				</div>
				<div className="rounded-lg border bg-card p-4 sm:p-6 animate-pulse space-y-3">
					<div className="h-4 bg-muted rounded w-full" />
					<div className="h-4 bg-muted rounded w-full" />
					<div className="h-4 bg-muted rounded w-3/4" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4 overflow-x-hidden">
			<MaterialListHeader
				onAddMaterial={() => setDialogState({ type: 'material' })}
				onImportMaterial={() => setDialogState({ type: 'import' })}
				onInvoiceMatch={() => setDialogState({ type: 'invoice-match' })}
			/>

			{/* Summary stats */}
			{materials.length > 0 && (
				<div className="grid grid-cols-3 gap-2 sm:gap-3">
					<div className="rounded-lg border bg-card px-2 sm:px-4 py-2 sm:py-3 min-w-0">
						<p className="text-[10px] sm:text-xs text-muted-foreground">Materialien</p>
						<p className="text-base sm:text-lg font-semibold">{materials.length}</p>
					</div>
					<div className="rounded-lg border bg-card px-2 sm:px-4 py-2 sm:py-3 min-w-0">
						<p className="text-[10px] sm:text-xs text-muted-foreground">Kategorien</p>
						<p className="text-base sm:text-lg font-semibold">{categoryCount}</p>
					</div>
					<div className="rounded-lg border bg-card px-2 sm:px-4 py-2 sm:py-3 min-w-0 overflow-hidden">
						<p className="text-[10px] sm:text-xs text-muted-foreground truncate">Gesch. Kosten</p>
						<p className="text-base sm:text-lg font-semibold truncate">{totalCost > 0 ? `${totalCost.toFixed(0)} €` : '–'}</p>
					</div>
				</div>
			)}

			<MaterialFilters
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				stationFilter={stationFilter}
				onStationFilterChange={setStationFilter}
				supplierFilter={supplierFilter}
				onSupplierFilterChange={setSupplierFilter}
				categoryFilter={categoryFilter}
				onCategoryFilterChange={setCategoryFilter}
				stations={stations}
				suppliers={suppliers}
				categories={categories}
				onReset={resetFilters}
			/>

			<MaterialTable
				materials={filteredMaterials}
				onEdit={(material) => setDialogState({ type: 'material', material })}
				onDelete={(id) => actions.deleteMaterial.mutate(id)}
				onUpdateActualQuantity={(id, qty) => {
					actions.updateMaterial.mutate({ id, updates: { actual_quantity: qty } });
				}}
			/>

			<MaterialDialog
				open={dialogState.type === 'material'}
				onOpenChange={(open) => { if (!open) setDialogState({ type: null }); }}
				material={dialogState.type === 'material' ? dialogState.material : null}
				stations={stations}
				festivalId={festivalId}
				onSave={handleSave}
			/>

			<MaterialImportDialog
				open={dialogState.type === 'import'}
				onOpenChange={(open) => { if (!open) setDialogState({ type: null }); }}
				festivalId={festivalId}
				stations={stations}
				onImport={(materials) => {
					actions.bulkCreateMaterials.mutate(materials, {
						onSuccess: () => setDialogState({ type: null })
					});
				}}
				isImporting={actions.bulkCreateMaterials.isPending}
			/>

			<InvoiceMatchDialog
				open={dialogState.type === 'invoice-match'}
				onOpenChange={(open) => { if (!open) setDialogState({ type: null }); }}
				materials={materials}
				stations={stations}
				festivalId={festivalId}
				onApply={(updates) => {
					actions.bulkUpdateMaterials.mutate(updates, {
						onSuccess: () => setDialogState({ type: null })
					});
				}}
				onCreateNew={(newMaterials) => {
					actions.bulkCreateMaterials.mutate(newMaterials, {
						onSuccess: () => setDialogState({ type: null })
					});
				}}
				isApplying={actions.bulkUpdateMaterials.isPending || actions.bulkCreateMaterials.isPending}
			/>
		</div>
	);
};

export default MaterialListView;
