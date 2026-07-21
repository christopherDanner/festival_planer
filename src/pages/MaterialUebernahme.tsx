import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, X, ChevronDown, ChevronRight, Check, AlertCircle, Plus, Trash2, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import FestivalShellHeader from '@/components/festival/FestivalShellHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/components/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import FestivalTabBar, { type FestivalTab } from '@/components/festival/FestivalTabBar';
import MaterialDialog from '@/components/material-list/dialogs/MaterialDialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '@/lib/materialService';
import { getStations } from '@/lib/shiftService';
import { matchMaterials, type MatchRow } from '@/lib/materialMatcher';
import { formatPackaging, fromBaseQuantity, formatRequiredPackaging } from '@/lib/materialQuantity';
import type { SaveState } from '@/lib/materialSaveOrchestrator';
import { useSaveOrchestrator } from '@/hooks/useSaveOrchestrator';

const NO_STATION_KEY = '__no_station__';
const NO_STATION_LABEL = '— Ohne Station —';

function sortFestivalsByDateDesc(festivals: Festival[]): Festival[] {
	return [...festivals].sort(
		(a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
	);
}

function formatFestivalLabel(f: Festival): string {
	const name = f.name || 'Unbenanntes Fest';
	const date = new Date(f.start_date).toLocaleDateString('de-AT');
	return `${name} — ${date}`;
}

function formatQty(value: number | null): string {
	if (value == null) return '—';
	return Number.isInteger(value) ? String(value) : String(value);
}

function groupRowsByStation(
	rows: MatchRow[]
): { key: string; label: string; rows: MatchRow[] }[] {
	const groups = new Map<string, { label: string; rows: MatchRow[] }>();
	for (const r of rows) {
		const name = r.stationName?.trim();
		const key = name ? name : NO_STATION_KEY;
		const label = name ? name : NO_STATION_LABEL;
		if (!groups.has(key)) groups.set(key, { label, rows: [] });
		groups.get(key)!.rows.push(r);
	}
	const result = Array.from(groups, ([key, { label, rows }]) => ({
		key,
		label,
		rows: [...rows].sort((a, b) => a.name.localeCompare(b.name, 'de'))
	}));
	result.sort((a, b) => {
		if (a.key === NO_STATION_KEY) return 1;
		if (b.key === NO_STATION_KEY) return -1;
		return a.label.localeCompare(b.label, 'de');
	});
	return result;
}

export default function MaterialUebernahme() {
	const { festivalId: routeFestivalId } = useParams<{ festivalId: string }>();
	const navigate = useNavigate();
	const { user, loading: authLoading, signOut } = useAuth();
	const isMobile = useIsMobile();

	const festivalsQuery = useQuery({
		queryKey: ['userFestivals'],
		queryFn: getUserFestivals,
		enabled: !!user
	});

	const sortedFestivals = useMemo(
		() => (festivalsQuery.data ? sortFestivalsByDateDesc(festivalsQuery.data) : []),
		[festivalsQuery.data]
	);

	const [sourceId, setSourceId] = useState<string | null>(null);
	const [targetId, setTargetId] = useState<string | null>(null);
	const [defaultsApplied, setDefaultsApplied] = useState(false);

	useEffect(() => {
		if (defaultsApplied || sortedFestivals.length === 0) return;
		const initialTarget =
			routeFestivalId && sortedFestivals.some((f) => f.id === routeFestivalId)
				? routeFestivalId
				: sortedFestivals[0].id;
		const initialSource = sortedFestivals.find((f) => f.id !== initialTarget)?.id ?? null;
		setTargetId(initialTarget);
		setSourceId(initialSource);
		setDefaultsApplied(true);
	}, [sortedFestivals, routeFestivalId, defaultsApplied]);

	const targetMaterialsQuery = useQuery({
		queryKey: ['materials', targetId],
		queryFn: () => getMaterials(targetId!),
		enabled: !!targetId
	});
	const sourceMaterialsQuery = useQuery({
		queryKey: ['materials', sourceId],
		queryFn: () => getMaterials(sourceId!),
		enabled: !!sourceId
	});
	const targetStationsQuery = useQuery({
		queryKey: ['stations', targetId],
		queryFn: () => getStations(targetId!),
		enabled: !!targetId
	});

	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState('');
	const [stationFilter, setStationFilter] = useState('all');
	const [supplierFilter, setSupplierFilter] = useState('all');
	const [categoryFilter, setCategoryFilter] = useState('all');
	const [collapsedStations, setCollapsedStations] = useState<Set<string>>(new Set());
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [rowToDelete, setRowToDelete] = useState<MatchRow | null>(null);
	const [desiredQuantities, setDesiredQuantities] = useState<Record<string, string>>({});

	useEffect(() => {
		setSearchTerm('');
		setStationFilter('all');
		setSupplierFilter('all');
		setCategoryFilter('all');
		setCollapsedStations(new Set());
		setDesiredQuantities({});
	}, [targetId, sourceId]);

	const targetMaterials = useMemo(
		() => targetMaterialsQuery.data ?? [],
		[targetMaterialsQuery.data]
	);
	const sourceMaterials = useMemo(
		() => sourceMaterialsQuery.data ?? [],
		[sourceMaterialsQuery.data]
	);
	const targetStations = useMemo(
		() => targetStationsQuery.data ?? [],
		[targetStationsQuery.data]
	);

	const matchResult = useMemo(
		() => matchMaterials(sourceMaterials, targetMaterials),
		[sourceMaterials, targetMaterials]
	);

	// Pre-fill desired quantities from target's existing ordered_quantity (> 0).
	// Only fills keys not already present, so refetches after save don't overwrite in-progress edits.
	useEffect(() => {
		setDesiredQuantities((prev) => {
			let changed = false;
			const next = { ...prev };
			for (const r of matchResult.rows) {
				if (next[r.key] !== undefined) continue;
				if (
					(r.status === 'match' || r.status === 'only-target') &&
					r.targetOrderedQuantity != null &&
					r.targetOrderedQuantity > 0
				) {
					next[r.key] = String(r.targetOrderedQuantity);
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	}, [matchResult.rows]);

	const orchestrator = useSaveOrchestrator(
		{
			targetFestivalId: targetId ?? '',
			targetStations,
			onCreate: async (payload) => {
				const created = await createMaterial(payload);
				queryClient.invalidateQueries({ queryKey: ['materials', targetId] });
				return { id: created.id };
			},
			onUpdate: async (id, orderedQuantity) => {
				await updateMaterial(id, { ordered_quantity: orderedQuantity });
				queryClient.invalidateQueries({ queryKey: ['materials', targetId] });
			},
			getInitialCommitted: (r) =>
				(r.status === 'match' || r.status === 'only-target') &&
				r.targetOrderedQuantity != null &&
				r.targetOrderedQuantity > 0
					? r.targetOrderedQuantity
					: null
		},
		`${sourceId}::${targetId}`
	);

	const siblingsByName = useMemo(() => {
		const map = new Map<string, MatchRow[]>();
		for (const r of matchResult.rows) {
			const list = map.get(r.normalizedName) ?? [];
			list.push(r);
			map.set(r.normalizedName, list);
		}
		return map;
	}, [matchResult.rows]);

	const stationOptions = useMemo(() => {
		const set = new Set<string>();
		let hasNoStation = false;
		for (const r of matchResult.rows) {
			const name = r.stationName?.trim();
			if (name) set.add(name);
			else hasNoStation = true;
		}
		const arr = Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
		return { stations: arr, hasNoStation };
	}, [matchResult.rows]);

	const supplierOptions = useMemo(() => {
		const set = new Set<string>();
		for (const r of matchResult.rows) {
			if (r.supplier) set.add(r.supplier);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
	}, [matchResult.rows]);

	const categoryOptions = useMemo(() => {
		const set = new Set<string>();
		for (const r of matchResult.rows) {
			if (r.category) set.add(r.category);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
	}, [matchResult.rows]);

	const filteredRows = useMemo(() => {
		return matchResult.rows.filter((r) => {
			if (searchTerm) {
				const term = searchTerm.toLowerCase();
				const matches =
					r.name.toLowerCase().includes(term) ||
					(r.supplier && r.supplier.toLowerCase().includes(term));
				if (!matches) return false;
			}
			if (stationFilter !== 'all') {
				const name = r.stationName?.trim() || '';
				if (stationFilter === NO_STATION_KEY) {
					if (name) return false;
				} else if (name !== stationFilter) return false;
			}
			if (supplierFilter !== 'all' && r.supplier !== supplierFilter) return false;
			if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
			return true;
		});
	}, [matchResult.rows, searchTerm, stationFilter, supplierFilter, categoryFilter]);

	const groupedRows = useMemo(() => groupRowsByStation(filteredRows), [filteredRows]);

	const hasFilters =
		!!searchTerm || stationFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all';
	const resetFilters = () => {
		setSearchTerm('');
		setStationFilter('all');
		setSupplierFilter('all');
		setCategoryFilter('all');
	};

	const toggleStation = (key: string) => {
		setCollapsedStations((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const setQuantity = (rowKey: string, value: string) => {
		setDesiredQuantities((prev) => ({ ...prev, [rowKey]: value }));
	};

	const handleBack = () => {
		if (targetId) navigate(`/festival-results?id=${targetId}&tab=materials`);
		else navigate('/dashboard');
	};

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	const targetFestival = sortedFestivals.find((f) => f.id === targetId) ?? null;

	// Fest-Unterseite: gleicher Shell-Kopf wie der Fest-Arbeitsbereich; die
	// Tab-Leiste (Material aktiv) führt zurück in die Fest-Tabs.
	const shellHeader = targetFestival && (
		<FestivalShellHeader
			festivalName={targetFestival.name || 'Fest'}
			startDate={targetFestival.start_date}
			endDate={targetFestival.end_date}
			activeTab="materials"
			onTabChange={(tab) => navigate(`/festival-results?id=${targetFestival.id}&tab=${tab}`)}
			actions={
				<>
					<Button
						size="sm"
						className="h-8 gap-1"
						disabled={!targetId || targetStationsQuery.isLoading}
						onClick={() => setCreateDialogOpen(true)}
					>
						<Plus className="h-4 w-4" />
						Neue Position
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-white hover:bg-white/15 hover:text-white"
						onClick={handleSignOut}
					>
						Abmelden
					</Button>
				</>
			}
			menuItems={[
				{
					label: 'Neue Position',
					icon: <Plus className="h-4 w-4" />,
					onClick: () => setCreateDialogOpen(true),
					disabled: !targetId || targetStationsQuery.isLoading
				},
				{
					label: 'Zur Festliste',
					icon: <LayoutDashboard className="h-4 w-4" />,
					onClick: () => navigate('/dashboard')
				},
				{
					label: 'Abmelden',
					icon: <LogOut className="h-4 w-4" />,
					onClick: handleSignOut
				}
			]}
		/>
	);

	if (authLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="pt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Lade…
				</div>
			</div>
		);
	}

	const materialsLoading = targetMaterialsQuery.isLoading || sourceMaterialsQuery.isLoading;

	return (
		<div className="min-h-screen bg-background">
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]'
						: 'mx-auto max-w-[1180px] px-[22px] pt-[18px] pb-20'
				}>
				{shellHeader}
				<div className="flex items-center gap-1.5 pt-4 pb-3">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0"
						onClick={handleBack}
						aria-label="Zurück zur Materialliste">
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-sm font-bold uppercase tracking-[.08em]">Material-Übernahme</h1>
				</div>
				{festivalsQuery.isLoading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Feste werden geladen…
					</div>
				) : sortedFestivals.length === 0 ? (
					<div className="border bg-card p-6 text-center text-sm text-muted-foreground">
						Du hast noch keine Feste angelegt. Lege zuerst ein Fest an, um Material zu übernehmen.
					</div>
				) : sortedFestivals.length === 1 ? (
					<div className="border bg-card p-6 text-center text-sm text-muted-foreground">
						Für die Material-Übernahme werden mindestens zwei Feste benötigt — ein Quell- und ein Zielfest. Du hast bisher nur ein Fest angelegt.
					</div>
				) : (
					<div className="space-y-4">
						{/* Festival selection — Quelle links, Ziel rechts */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">Quellfest</label>
								<Select value={sourceId ?? ''} onValueChange={(v) => setSourceId(v)}>
									<SelectTrigger className="h-9 text-sm">
										<SelectValue placeholder="Quellfest auswählen…" />
									</SelectTrigger>
									<SelectContent>
										{sortedFestivals.map((f) => (
											<SelectItem key={f.id} value={f.id} disabled={f.id === targetId}>
												{formatFestivalLabel(f)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">Zielfest</label>
								<Select value={targetId ?? ''} onValueChange={(v) => setTargetId(v)}>
									<SelectTrigger className="h-9 text-sm">
										<SelectValue placeholder="Zielfest auswählen…" />
									</SelectTrigger>
									<SelectContent>
										{sortedFestivals.map((f) => (
											<SelectItem key={f.id} value={f.id} disabled={f.id === sourceId}>
												{formatFestivalLabel(f)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Filter bar sticky */}
						<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b py-2">
							<div className="flex flex-wrap items-center gap-2">
								<div className="relative flex-1 min-w-[180px]">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
									<Input
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										placeholder="Name oder Lieferant…"
										className="pl-8 h-8 text-sm"
									/>
								</div>
								<Select value={stationFilter} onValueChange={setStationFilter}>
									<SelectTrigger className="w-[150px] h-8 text-sm">
										<SelectValue placeholder="Station" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Alle Stationen</SelectItem>
										{stationOptions.hasNoStation && (
											<SelectItem value={NO_STATION_KEY}>{NO_STATION_LABEL}</SelectItem>
										)}
										{stationOptions.stations.map((s) => (
											<SelectItem key={s} value={s}>
												{s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={supplierFilter} onValueChange={setSupplierFilter}>
									<SelectTrigger className="w-[150px] h-8 text-sm">
										<SelectValue placeholder="Lieferant" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Alle Lieferanten</SelectItem>
										{supplierOptions.map((s) => (
											<SelectItem key={s} value={s}>
												{s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={categoryFilter} onValueChange={setCategoryFilter}>
									<SelectTrigger className="w-[150px] h-8 text-sm">
										<SelectValue placeholder="Kategorie" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Alle Kategorien</SelectItem>
										{categoryOptions.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{hasFilters && (
									<Button
										variant="ghost"
										size="sm"
										onClick={resetFilters}
										className="h-8 gap-1 px-2"
									>
										<X className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">Zurücksetzen</span>
									</Button>
								)}
								<span className="text-xs text-muted-foreground ml-auto">
									{filteredRows.length} von {matchResult.rows.length} Zeilen
								</span>
							</div>
						</div>

						{/* Table */}
						{materialsLoading ? (
							<div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Materialien werden geladen…
							</div>
						) : matchResult.rows.length === 0 ? (
							<div className="border bg-card p-6 text-center text-sm text-muted-foreground">
								Weder Ziel- noch Quellfest haben Material-Positionen.
							</div>
						) : (
							<div className="rounded-md border overflow-hidden">
								<table className="w-full text-sm table-fixed">
									<colgroup>
										<col className="w-[20%]" />
										<col className="w-[11%]" />
										<col className="w-[17%]" />
										<col className="w-[15%]" />
										<col className="w-[11%]" />
										<col className="w-[11%]" />
										<col className="w-[11%]" />
										<col className="w-[4%]" />
									</colgroup>
									<thead className="bg-muted">
										<tr className="border-b">
											<th className="p-2 text-left font-medium">Name</th>
											<th className="p-2 text-left font-medium">Kategorie</th>
											<th className="p-2 text-left font-medium">Lieferant</th>
											<th className="p-2 text-left font-medium">Gebinde</th>
											<th className="p-2 text-right font-medium">Bestellt (Quelle)</th>
											<th className="p-2 text-right font-medium">Verbraucht (Quelle)</th>
											<th className="p-2 text-right font-medium">Wunschmenge</th>
											<th className="p-2"></th>
										</tr>
									</thead>
									<tbody>
										{groupedRows.map((group) => {
											const collapsed = collapsedStations.has(group.key);
											return (
												<React.Fragment key={group.key}>
													<tr
														className="bg-muted/50 border-b cursor-pointer hover:bg-muted"
														onClick={() => toggleStation(group.key)}
													>
														<td colSpan={8} className="p-2">
															<div className="flex items-center gap-2">
																{collapsed ? (
																	<ChevronRight className="h-4 w-4" />
																) : (
																	<ChevronDown className="h-4 w-4" />
																)}
																<span className="font-medium">{group.label}</span>
																<span className="text-xs text-muted-foreground">
																	({group.rows.length} {group.rows.length === 1 ? 'Position' : 'Positionen'})
																</span>
															</div>
														</td>
													</tr>
													{!collapsed &&
														group.rows.map((row) => (
															<MaterialRow
																key={row.key}
																row={row}
																siblings={siblingsByName.get(row.normalizedName) ?? [row]}
																desiredValue={desiredQuantities[row.key] ?? ''}
																onChangeDesired={(v) => setQuantity(row.key, v)}
																saveState={orchestrator.statesByKey[row.key]}
																onSave={() => orchestrator.saveRow(row, desiredQuantities[row.key] ?? '')}
																onRetry={() => orchestrator.retry(row)}
																onDelete={() => setRowToDelete(row)}
															/>
														))}
												</React.Fragment>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
			</div>

			{targetId && (
				<MaterialDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					material={null}
					stations={targetStations}
					festivalId={targetId}
					onSave={async (data) => {
						await createMaterial(data);
						queryClient.invalidateQueries({ queryKey: ['materials', targetId] });
						setCreateDialogOpen(false);
					}}
				/>
			)}

			{/* Mobile: Fest-Tab-Bar bleibt auch auf dieser Unterseite sichtbar */}
			{isMobile && targetId && (
				<FestivalTabBar
					active="materials"
					onSelect={(tab: FestivalTab) =>
						navigate(`/festival-results?id=${targetId}&tab=${tab}`)
					}
				/>
			)}

			<AlertDialog
				open={rowToDelete !== null}
				onOpenChange={(open) => !open && setRowToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Position löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							{rowToDelete && (
								<>
									"<strong>{rowToDelete.name}</strong>"
									{rowToDelete.stationName ? <> in Station "{rowToDelete.stationName}"</> : null}
									{' '}wird aus dem Zielfest entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Abbrechen</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								if (rowToDelete?.targetMaterial) {
									await deleteMaterial(rowToDelete.targetMaterial.id);
									queryClient.invalidateQueries({ queryKey: ['materials', targetId] });
								}
								setRowToDelete(null);
							}}
							className="bg-red-600 hover:bg-red-700 focus:ring-red-400"
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

interface MaterialRowProps {
	row: MatchRow;
	siblings: MatchRow[];
	desiredValue: string;
	onChangeDesired: (value: string) => void;
	saveState: SaveState | undefined;
	onSave: () => void;
	onRetry: () => void;
	onDelete: () => void;
}

function MaterialRow({
	row,
	siblings,
	desiredValue,
	onChangeDesired,
	saveState,
	onSave,
	onRetry,
	onDelete
}: MaterialRowProps) {
	const isOnlySource = row.status === 'only-source';
	const isAggregate = row.srcAggregateCount > 1;
	const isGroupMulti = siblings.length > 1;
	const groupOrderedTotal = siblings.reduce(
		(acc, s) => acc + (s.srcOrderedTotal ?? 0),
		0
	);

	const packagingCtx = {
		packaging_unit: row.packagingUnit,
		amount_per_packaging: row.amountPerPackaging
	};
	const orderedHint =
		row.srcOrderedTotal != null
			? formatRequiredPackaging(fromBaseQuantity(row.srcOrderedTotal, packagingCtx), packagingCtx)
			: null;
	const actualHint =
		row.srcActualTotal != null
			? formatRequiredPackaging(fromBaseQuantity(row.srcActualTotal, packagingCtx), packagingCtx)
			: null;
	const desiredNum = parseFloat(desiredValue);
	const desiredHint =
		!Number.isNaN(desiredNum) && desiredNum > 0
			? formatRequiredPackaging(fromBaseQuantity(desiredNum, packagingCtx), packagingCtx)
			: null;

	return (
		<tr
			className={`border-b ${isOnlySource ? 'border-l-2 border-l-green-500 bg-green-50/40 dark:bg-green-950/10' : ''}`}
		>
			<td className="p-2 truncate">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="truncate">{row.name}</span>
					{isOnlySource && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-green-500 text-green-700 dark:text-green-400"
						>
							neu anlegen
						</Badge>
					)}
					{isGroupMulti && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex cursor-help">
									<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
										{siblings.length}× · Σ{formatQty(groupOrderedTotal)}
									</Badge>
								</span>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-xs">
								<StationListTooltip rows={siblings} />
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</td>
			<td className="p-2 truncate">{row.category || '—'}</td>
			<td className="p-2 truncate">{row.supplier || '—'}</td>
			<td className="p-2 truncate">
				{formatPackaging({
					unit: row.unit,
					packaging_unit: row.packagingUnit,
					amount_per_packaging: row.amountPerPackaging
				})}
			</td>
			<td className="p-2 text-right">
				<div className="flex flex-col items-end">
				<div className="flex items-baseline justify-end gap-1">
					<span className={row.srcOrderedTotal == null ? 'text-muted-foreground' : ''}>
						{formatQty(row.srcOrderedTotal)}
					</span>
					<span className="text-xs text-muted-foreground">{row.unit}</span>
					{isAggregate && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex cursor-help">
									<Badge
										variant="outline"
										className="text-[9px] px-1 py-0 leading-none h-4"
									>
										Σ{row.srcAggregateCount}
									</Badge>
								</span>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-xs">
								<div className="text-xs space-y-0.5">
									{row.sourceDetails.map((d, idx) => (
										<div key={idx}>
											<span className="font-medium">{d.stationName ?? NO_STATION_LABEL}:</span>{' '}
											{d.ordered}
										</div>
									))}
								</div>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				{orderedHint && (
					<span className="text-[10px] text-muted-foreground">→ {orderedHint}</span>
				)}
				</div>
			</td>
			<td className="p-2 text-right">
				<div className="flex flex-col items-end">
					<div className="flex items-baseline justify-end gap-1">
						<span className={row.srcActualTotal == null ? 'text-muted-foreground' : ''}>
							{formatQty(row.srcActualTotal)}
						</span>
						<span className="text-xs text-muted-foreground">{row.unit}</span>
					</div>
					{actualHint && (
						<span className="text-[10px] text-muted-foreground">→ {actualHint}</span>
					)}
				</div>
			</td>
			<td className="p-2">
				<div className="flex items-center gap-1">
				<div className="relative flex-1">
					<Input
						type="number"
						min="0"
						step="any"
						value={desiredValue}
						onChange={(e) => onChangeDesired(e.target.value)}
						onBlur={onSave}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.currentTarget.blur();
							}
						}}
						placeholder="0"
						className={`h-7 text-sm text-right w-full pr-7 ${saveState?.status === 'error' ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
					/>
					<div className="absolute right-1.5 top-1/2 -translate-y-1/2">
						{saveState?.status === 'saving' && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						{saveState?.status === 'saved' && (
							<Check className="h-3.5 w-3.5 text-green-600" />
						)}
						{saveState?.status === 'error' && (
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={onRetry}
										className="inline-flex p-0.5"
										aria-label="Speichern wiederholen"
									>
										<AlertCircle className="h-3.5 w-3.5 text-red-600" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left" className="max-w-xs">
									<div className="text-xs">
										{saveState.error ?? 'Speichern fehlgeschlagen'} (Klick = erneut versuchen)
									</div>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
				<span className="text-xs text-muted-foreground shrink-0">{row.unit}</span>
				</div>
				{desiredHint && (
					<div className="text-[10px] text-muted-foreground text-right mt-0.5">→ {desiredHint}</div>
				)}
			</td>
			<td className="p-1 text-center">
				{row.targetMaterial && (
					<button
						type="button"
						onClick={onDelete}
						aria-label="Position löschen"
						className="inline-flex p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				)}
			</td>
		</tr>
	);
}

function StationListTooltip({ rows }: { rows: MatchRow[] }) {
	const entries: { station: string; ordered: number }[] = [];
	for (const r of rows) {
		if (r.sourceDetails.length === 0) {
			entries.push({ station: r.stationName ?? NO_STATION_LABEL, ordered: 0 });
			continue;
		}
		for (const d of r.sourceDetails) {
			entries.push({ station: d.stationName ?? NO_STATION_LABEL, ordered: d.ordered });
		}
	}
	return (
		<div className="text-xs space-y-0.5">
			{entries.map((e, idx) => (
				<div key={idx}>
					<span className="font-medium">{e.station}:</span> {e.ordered}
				</div>
			))}
		</div>
	);
}
