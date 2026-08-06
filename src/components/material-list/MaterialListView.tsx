import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialListData } from './hooks/useMaterialListData';
import { useMaterialListActions } from './hooks/useMaterialListActions';
import MaterialListHeader from './MaterialListHeader';
import MaterialTotals from './MaterialTotals';
import MaterialAxisBar from './MaterialAxisBar';
import MaterialGroupTabs from './MaterialGroupTabs';
import MaterialGroupBox from './MaterialGroupBox';
import MaterialTable from './MaterialTable';
import MaterialDialog from './dialogs/MaterialDialog';
import MaterialExportDialog from './dialogs/MaterialExportDialog';
import OrderListExportDialog from './dialogs/OrderListExportDialog';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import {
	groupMaterials,
	searchMaterials,
	resolveActiveGroupId,
	groupCategories,
	filterByCategory,
	resolveActiveCategory,
	prefillFromGroup,
	type MaterialAxis,
	type MaterialPrefill
} from '@/lib/materialGrouping';

type DialogState =
	| { type: null }
	| { type: 'material'; material?: FestivalMaterialWithStation }
	| { type: 'export' }
	| { type: 'order-export' };

interface MaterialListViewProps {
	festivalId: string;
	festivalName?: string;
}

/**
 * Arbeitsliste des Bereichs Material (#113). Trägt den Zustand des Bereichs:
 * Suche, **Achse** und **aktive Gruppe** — gruppiert, gerechnet und gefiltert
 * wird in `materialGrouping` bzw. `materialCosts`, nicht hier.
 *
 * Die drei Filter-Dropdowns von früher sind weg: die Achse ersetzt sie
 * (Entscheid aus #66), die Kategorie-Chips filtern innerhalb des Kastens.
 */
const MaterialListView: React.FC<MaterialListViewProps> = ({ festivalId, festivalName }) => {
	const navigate = useNavigate();
	const { materials, stations, isLoading } = useMaterialListData(festivalId);
	const actions = useMaterialListActions(festivalId);

	const [dialogState, setDialogState] = useState<DialogState>({ type: null });
	const [searchTerm, setSearchTerm] = useState('');
	const [axis, setAxis] = useState<MaterialAxis>('station');
	const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);
	const [requestedCategory, setRequestedCategory] = useState<string | null>(null);
	// „+ POSITION FÜR AUSSCHANK" trägt die Zuordnung der Gruppe vor; die
	// Werkzeugleiste („+ POSITION") trägt nichts vor.
	const [prefill, setPrefill] = useState<MaterialPrefill | undefined>(undefined);

	const suppliers = useMemo(
		() => [...new Set(materials.map((m) => m.supplier).filter(Boolean))] as string[],
		[materials]
	);

	const categories = useMemo(
		() => [...new Set(materials.map((m) => m.category).filter(Boolean))] as string[],
		[materials]
	);

	// Suchen → gruppieren: die Reiter zeigen damit die Trefferzahl je Gruppe.
	const found = useMemo(() => searchMaterials(materials, searchTerm), [materials, searchTerm]);
	const groups = useMemo(() => groupMaterials(found, axis), [found, axis]);

	// Achsenwechsel, Suche und Löschen können Gruppe und Chip wegnehmen — dann
	// übernimmt der erste Reiter bzw. „alle Kategorien".
	const activeGroupId = resolveActiveGroupId(groups, requestedGroupId);
	const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
	const groupChips = activeGroup ? groupCategories(activeGroup.materials) : [];
	const activeCategory = resolveActiveCategory(groupChips, requestedCategory);
	const visible = activeGroup ? filterByCategory(activeGroup.materials, activeCategory) : [];

	const handleSave = (data: any) => {
		if (dialogState.type === 'material' && dialogState.material) {
			actions.updateMaterial.mutate({ id: dialogState.material.id, updates: data });
		} else {
			actions.createMaterial.mutate(data);
		}
	};

	const openNewPosition = (from?: MaterialPrefill) => {
		setPrefill(from);
		setDialogState({ type: 'material' });
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-10 bg-muted animate-pulse" />
				<div className="h-[76px] bg-muted animate-pulse" />
				<div className="border-2.5 border-tinte bg-card p-4 sm:p-6 animate-pulse space-y-3">
					<div className="h-4 bg-muted w-full" />
					<div className="h-4 bg-muted w-full" />
					<div className="h-4 bg-muted w-3/4" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3 sm:space-y-4 overflow-x-hidden">
			<MaterialListHeader
				mode="arbeitsliste"
				onModeChange={(mode) => {
					// Der Umschalter navigiert, er blendet nicht um (Entscheid aus #66).
					if (mode === 'uebernahme') navigate(`/festivals/${festivalId}/material-uebernahme`);
				}}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				positionCount={materials.length}
				onAddMaterial={() => openNewPosition()}
				onExport={() => setDialogState({ type: 'export' })}
				onExportOrderList={() => setDialogState({ type: 'order-export' })}
			/>

			{/* Der Bereichskopf folgt der Suche, nicht dem Reiter und nicht dem
			Kategorie-Chip: die zwei Zahlen sollen mit den Dashboard-Kästen desselben
			Fests zusammenpassen (ADR 0006), und Reiter wie Chip sind Sichten auf
			*einen* Kasten. */}
			<MaterialTotals materials={found} totalCount={materials.length} />

			<MaterialAxisBar axis={axis} onAxisChange={setAxis} />

			<MaterialGroupTabs
				groups={groups}
				axis={axis}
				activeGroupId={activeGroupId}
				onSelect={setRequestedGroupId}
			/>

			{activeGroup && (
				<MaterialGroupBox
					group={activeGroup}
					axis={axis}
					visibleMaterials={visible}
					categories={groupChips}
					activeCategory={activeCategory}
					onCategoryChange={setRequestedCategory}
					onAddPosition={() => openNewPosition(prefillFromGroup(activeGroup, axis))}
				>
					<MaterialTable
						materials={visible}
						// Im Stations-Kasten wäre die Station in jeder Zeile dieselbe.
						showStation={axis !== 'station'}
						onEdit={(material) => {
							setPrefill(undefined);
							setDialogState({ type: 'material', material });
						}}
						onDelete={(id) => actions.deleteMaterial.mutate(id)}
						onCopy={(material) => {
							actions.createMaterial.mutate({
								festival_id: material.festival_id,
								name: `${material.name} (Kopie)`,
								category: material.category,
								station_id: material.station_id,
								supplier: material.supplier,
								unit: material.unit,
								packaging_unit: material.packaging_unit,
								amount_per_packaging: material.amount_per_packaging,
								ordered_quantity: material.ordered_quantity,
								actual_quantity: null,
								unit_price: material.unit_price,
								tax_rate: material.tax_rate,
								price_is_net: material.price_is_net,
								price_per: material.price_per,
								notes: material.notes
							});
						}}
						onUpdateField={(id, field, value) => {
							actions.updateMaterial.mutate({ id, updates: { [field]: value } });
						}}
						onUpdateFields={(id, partial) => {
							actions.updateMaterial.mutate({ id, updates: partial });
						}}
					/>
				</MaterialGroupBox>
			)}

			<MaterialDialog
				open={dialogState.type === 'material'}
				onOpenChange={(open) => {
					if (!open) setDialogState({ type: null });
				}}
				material={dialogState.type === 'material' ? dialogState.material : null}
				prefill={prefill}
				stations={stations}
				festivalId={festivalId}
				existingSuppliers={suppliers}
				existingCategories={categories}
				onCreateStation={(name) => actions.createStation.mutateAsync(name)}
				onSave={handleSave}
			/>

			<MaterialExportDialog
				open={dialogState.type === 'export'}
				onOpenChange={(open) => {
					if (!open) setDialogState({ type: null });
				}}
				festivalName={festivalName || 'Festival'}
				materials={materials}
				stations={stations}
				suppliers={suppliers}
			/>

			<OrderListExportDialog
				open={dialogState.type === 'order-export'}
				onOpenChange={(open) => {
					if (!open) setDialogState({ type: null });
				}}
				festivalName={festivalName || 'Festival'}
				materials={materials}
			/>
		</div>
	);
};

export default MaterialListView;
