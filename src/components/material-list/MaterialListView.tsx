import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialListData } from './hooks/useMaterialListData';
import { useMaterialListActions } from './hooks/useMaterialListActions';
import MaterialListHeader from './MaterialListHeader';
import MaterialTotals from './MaterialTotals';
import MaterialAxisBar from './MaterialAxisBar';
import MaterialGroupTabs from './MaterialGroupTabs';
import MaterialGroupDrawer from './MaterialGroupDrawer';
import MaterialGroupBox from './MaterialGroupBox';
import MaterialTable from './MaterialTable';
import MaterialCardList from './MaterialCardList';
import UnsavedCardsDialog from './UnsavedCardsDialog';
import RowEditBulkBar from './RowEditBulkBar';
import RowEditGuardDialog from './RowEditGuardDialog';
import { useMaterialCardDrafts } from './hooks/useMaterialCardDrafts';
import MaterialDialog from './dialogs/MaterialDialog';
import MaterialExportDialog from './dialogs/MaterialExportDialog';
import OrderListExportDialog from './dialogs/OrderListExportDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { isFullPayload, type MaterialSaveData } from '@/lib/materialDialogForm';
import { useRowEditor } from '@/hooks/useRowEditor';
import { useCellEditor } from '@/hooks/useCellEditor';
import type { ViewChange } from '@/lib/materialRowEditor';
import { BASE_UNITS, type InputUnits } from '@/lib/materialCellEdit';
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
	const isMobile = useIsMobile();
	const { materials, stations, isLoading } = useMaterialListData(festivalId);
	const actions = useMaterialListActions(festivalId);

	// Die offenen Karten des Zeilenmodus am Handy (#116). Sie hängen hier und
	// nicht an der Kartenliste, weil Achsen-Umschalter und Gruppen-Schublade
	// darüber stehen und durch dieselbe Rückfrage müssen.
	const cards = useMaterialCardDrafts((id, updates) =>
		actions.updateMaterial.mutate({ id, updates })
	);

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

	// Zeilenmodus (#115): ✎ macht Mengen und Preise *einer* Zeile tippbar,
	// mehrere dürfen offen sein, gespeichert wird über die Sammel-Fußleiste.
	// Der Zustand liegt im `materialRowEditor`, nicht hier.
	const { editor, snapshot } = useRowEditor({
		onSave: (id, updates) => actions.updateMaterial.mutate({ id, updates })
	});
	const allRowsOpen = visible.length > 0 && visible.every((m) => snapshot.draftsById[m.id]);

	// Die Eingabe-Einheit je Mengenspalte (#218): Standard Basis, umgeschaltet
	// wird im Spaltenkopf. Die Wahl hängt hier und nicht an der Tabelle, damit
	// sie Reiter, Chip und Suche übersteht — sie hält, solange man in der
	// Materialliste bleibt.
	const [units, setUnits] = useState<InputUnits>(BASE_UNITS);

	// Zellbearbeitung der Mengen (#216, ADR 0013): der Klick in Bestellt oder
	// Verbraucht macht *diese* Zelle zum Feld, sie speichert beim Verlassen.
	// `mutateAsync`, weil ein Fehlschlag die Zelle offen lassen muss — `mutate`
	// verschluckt ihn und die getippte Zahl wäre still weg. Der Sichtwechsel
	// braucht keine eigene Rückfrage: er löst erst den Blur aus, und der
	// speichert. Dasselbe gilt fürs Umschalten der Einheit: der Klick in den
	// Spaltenkopf nimmt dem Feld den Fokus, und das speichert in der Einheit,
	// in der es aufging.
	const cell = useCellEditor({
		onSave: (id, update) =>
			actions.updateMaterial.mutateAsync({ id, updates: update, silent: true }),
		units: () => units
	});

	// Achse, Reiter, Chip und Suche nehmen offene Eingaben aus dem Bild — mit
	// ungespeicherten Änderungen wird erst gefragt. *Welche* Rückfrage greift,
	// hängt am Gerät: am Handy hält der Kartenmodus (#116) das Getippte, am
	// Desktop der Zeilenmodus (#115). Beide Wege gehen durch diese eine Stelle,
	// damit kein Sichtwechsel an der Rückfrage vorbeikommt.
	const guarded =
		<T,>(change: ViewChange, set: (value: T) => void) =>
		(value: T) =>
			isMobile
				? cards.attempt(() => set(value))
				: editor.requestViewChange(change, () => set(value));

	// Die Bestellliste kennt nur zwei Achsen (CONTEXT.md): wer nach Station
	// plant, bestellt für die Station; sonst beim Lieferanten. Der Reiter reist
	// nur mit, wo er auf der Achse der Bestellliste auch ein Schlüssel ist.
	const orderListAxis = axis === 'station' ? 'station' : 'supplier';
	const orderListKey =
		(axis === 'station' || axis === 'supplier') && activeGroup
			? // Die Restgruppe heißt in `orderList` leerer Schlüssel, nicht `null` —
				// `null` wäre dort „alle Gruppen".
				activeGroup.key ?? ''
			: null;

	// Die volle Nutzlast kommt nur beim Anlegen; beim Bearbeiten schickt der
	// Dialog nur seine Stammdaten (#117).
	const handleSave = (data: MaterialSaveData) => {
		if (isFullPayload(data)) {
			actions.createMaterial.mutate(data);
		} else if (dialogState.type === 'material' && dialogState.material) {
			actions.updateMaterial.mutate({ id: dialogState.material.id, updates: data });
		}
	};

	const openNewPosition = (from?: MaterialPrefill) => {
		setPrefill(from);
		setDialogState({ type: 'material' });
	};

	/** ⋮ → Stammdaten-Dialog (#117) — aus Tabellenzeile wie aus Karte derselbe Weg. */
	const openPosition = (material: FestivalMaterialWithStation) => {
		setPrefill(undefined);
		setDialogState({ type: 'material', material });
	};

	const copyPosition = (material: FestivalMaterialWithStation) => {
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
					// Der Umschalter navigiert, er blendet nicht um (Entscheid aus #66) —
					// und nimmt dabei offene Zeilen mit, fragt also wie jeder Sichtwechsel.
					if (mode === 'uebernahme') {
						editor.requestViewChange('mode', () =>
							navigate(`/festivals/${festivalId}/material-uebernahme`)
						);
					}
				}}
				searchTerm={searchTerm}
				onSearchChange={guarded('search', setSearchTerm)}
				positionCount={materials.length}
				onAddMaterial={() => openNewPosition()}
				onExport={() => setDialogState({ type: 'export' })}
				onExportOrderList={() => setDialogState({ type: 'order-export' })}
				allRowsOpen={allRowsOpen}
				onToggleAllRows={() => {
					// Aufklappen ist harmlos; Zuklappen kann Getipptes kosten und
					// läuft darum über dieselbe Rückfrage wie ein Sichtwechsel.
					if (allRowsOpen) editor.requestViewChange('rows', () => editor.cancelAll());
					else editor.openAll(visible);
				}}
			/>

			{/* Der Bereichskopf folgt der Suche, nicht dem Reiter und nicht dem
			Kategorie-Chip: die zwei Zahlen sollen mit den Dashboard-Kästen desselben
			Fests zusammenpassen (ADR 0006), und Reiter wie Chip sind Sichten auf
			*einen* Kasten. */}
			<MaterialTotals materials={found} totalCount={materials.length} />

			{/* Der Achsen-Umschalter bleibt am Handy oben als Knöpfe wie am Desktop
			(#116) — nur die Gruppen-Auswahl darunter wechselt die Gestalt. */}
			<MaterialAxisBar axis={axis} onAxisChange={guarded('axis', setAxis)} />

			{isMobile ? (
				<MaterialGroupDrawer
					groups={groups}
					axis={axis}
					activeGroupId={activeGroupId}
					onSelect={guarded('group', setRequestedGroupId)}
				/>
			) : (
				<MaterialGroupTabs
					groups={groups}
					axis={axis}
					activeGroupId={activeGroupId}
					onSelect={guarded('group', setRequestedGroupId)}
				/>
			)}

			{activeGroup && (
				<MaterialGroupBox
					group={activeGroup}
					axis={axis}
					visibleMaterials={visible}
					categories={groupChips}
					activeCategory={activeCategory}
					// Der Chip nimmt Karten bzw. Zeilen aus der Sicht wie ein
					// Gruppenwechsel — darum durch dieselbe Rückfrage (#115/#116).
					onCategoryChange={guarded('category', setRequestedCategory)}
					onAddPosition={() => openNewPosition(prefillFromGroup(activeGroup, axis))}
				>
					{isMobile ? (
						// Am Handy Karten statt der querscrollenden Tabelle (#116).
						<MaterialCardList
							materials={visible}
							showStation={axis !== 'station'}
							cards={cards}
							onEdit={openPosition}
							onCopy={copyPosition}
							onDelete={(id) => actions.deleteMaterial.mutate(id)}
						/>
					) : (
						<>
							<MaterialTable
								materials={visible}
								// Im Stations-Kasten wäre die Station in jeder Zeile dieselbe.
								showStation={axis !== 'station'}
								onEdit={openPosition}
								onDelete={(id) => actions.deleteMaterial.mutate(id)}
								onCopy={copyPosition}
								rowEdit={{
									draftsById: snapshot.draftsById,
									savedIds: snapshot.savedIds,
									focusId: snapshot.focusId,
									onStartEdit: editor.open,
									onDraftChange: editor.edit,
									onSaveRow: editor.save,
									onCancelRow: editor.cancel
								}}
								cellEdit={{
									editing: cell.snapshot.editing,
									value: cell.snapshot.value,
									saving: cell.snapshot.saving,
									failed: cell.snapshot.failed,
									savedIds: cell.snapshot.savedIds,
									units,
									onOpen: (m, column) => cell.editor.open(m, column),
									onType: cell.editor.type,
									onUnitChange: (column, unit) =>
										setUnits((current) => ({ ...current, [column]: unit })),
									// Der Weg der Tastatur läuft über die *sichtbaren* Zeilen des
									// Kastens — Suche und Kategorie-Chip bestimmen ihn mit.
									onCommit: (move, from) => void cell.editor.commit(move, visible, from),
									onCancel: cell.editor.cancel
								}}
							/>
							{/* Die Fußleiste zählt den Kasten, nicht das Fest — offen ist, was
							man vor sich sieht. */}
							<RowEditBulkBar
								open={snapshot.open}
								dirty={snapshot.dirty}
								onSaveAll={editor.saveAll}
								onCancelAll={editor.cancelAll}
							/>
						</>
					)}
				</MaterialGroupBox>
			)}

			{/* Je Gerät fragt der Modus, der dort tippen lässt: am Handy die Karten,
			am Desktop die Zeilen. Beide hängen an derselben Stelle, damit keiner
			von beiden still offen bleibt. */}
			<UnsavedCardsDialog cards={cards} />

			<RowEditGuardDialog
				change={snapshot.guard}
				dirty={snapshot.dirty}
				onAnswer={editor.resolveGuard}
			/>

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

			{/* Beide Export-Dialoge beginnen dort, wo der Bildschirm steht — Achse
			und Reiter der Arbeitsliste (#119). Exportiert wird über *alle*
			Positionen des Fests, nicht über die Suchtreffer: ein Papier, dem
			stillschweigend Zeilen fehlen, wäre schlimmer als eines zu viel. */}
			<MaterialExportDialog
				open={dialogState.type === 'export'}
				onOpenChange={(open) => {
					if (!open) setDialogState({ type: null });
				}}
				festivalName={festivalName || 'Festival'}
				materials={materials}
				axis={axis}
				groupId={activeGroupId}
			/>

			<OrderListExportDialog
				open={dialogState.type === 'order-export'}
				onOpenChange={(open) => {
					if (!open) setDialogState({ type: null });
				}}
				festivalName={festivalName || 'Festival'}
				materials={materials}
				axis={orderListAxis}
				selectedKey={orderListKey}
			/>
		</div>
	);
};

export default MaterialListView;
