import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, LayoutDashboard, LogOut, Plus } from 'lucide-react';

import FestivalShellHeader from '@/components/festival/FestivalShellHeader';
import FestivalTabBar, { type FestivalTab } from '@/components/festival/FestivalTabBar';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/components/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSaveOrchestrator } from '@/hooks/useSaveOrchestrator';
import MaterialDialog from '@/components/material-list/dialogs/MaterialDialog';
import MaterialModeBar from '@/components/material-list/MaterialModeBar';
import HandoverSourceBar from '@/components/material-list/handover/HandoverSourceBar';
import HandoverGroupTabs from '@/components/material-list/handover/HandoverGroupTabs';
import HandoverGroupBox from '@/components/material-list/handover/HandoverGroupBox';
import HandoverTable, { HandoverCard } from '@/components/material-list/handover/HandoverTable';
import HandoverSummaryBar from '@/components/material-list/handover/HandoverSummaryBar';
import { getUserFestivals } from '@/lib/festivalService';
import { createMaterial, deleteMaterial, getMaterials, updateMaterial } from '@/lib/materialService';
import { getStations } from '@/lib/shiftService';
import { isFullPayload } from '@/lib/materialDialogForm';
import { resolveActiveGroupId } from '@/lib/materialGrouping';
import {
	groupRowsByStation,
	handoverSummary,
	searchHandoverRows,
	sourceFestivalOptions
} from '@/lib/materialHandover';
import { matchMaterials, type MatchRow } from '@/lib/materialMatcher';

/**
 * Material-Übernahme (#118) — der **zweite Modus** des Material-Bereichs: die
 * Bestellmengen eines vergangenen Fests als Referenz für das laufende.
 *
 * Sie bleibt eine eigene Route (Entscheid aus #66, wie das Kopierwerk in #64);
 * der Umschalter in der Werkzeugleiste **navigiert**, er blendet nicht um.
 *
 * Das **Zielfest kommt aus der Route** und ist nicht wählbar — sonst könnte man
 * im Material-Tab von Fest X die Mengen von Fest Y bearbeiten, was `CONTEXT.md`
 * ausschließt („Zielfest — das aktuelle Fest in der Material-Liste").
 */
export default function MaterialUebernahme() {
	const { festivalId: targetId } = useParams<{ festivalId: string }>();
	const navigate = useNavigate();
	const { user, loading: authLoading, signOut } = useAuth();
	const isMobile = useIsMobile();
	const queryClient = useQueryClient();

	const festivalsQuery = useQuery({
		queryKey: ['userFestivals'],
		queryFn: getUserFestivals,
		enabled: !!user
	});

	const festivals = useMemo(() => festivalsQuery.data ?? [], [festivalsQuery.data]);
	const targetFestival = festivals.find((f) => f.id === targetId) ?? null;
	const sources = useMemo(
		() => sourceFestivalOptions(festivals, targetId ?? null),
		[festivals, targetId]
	);

	// Das Quellfest ist die einzige Wahl der Seite; ohne Wahl das jüngste andere
	// Fest. Abgeleitet statt gesetzt — ein Effekt könnte hier nur nachhinken.
	const [requestedSourceId, setRequestedSourceId] = useState<string | null>(null);
	const sourceId =
		sources.find((f) => f.id === requestedSourceId)?.id ?? sources[0]?.id ?? null;

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

	const [searchTerm, setSearchTerm] = useState('');
	const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [rowToDelete, setRowToDelete] = useState<MatchRow | null>(null);
	const [desiredByKey, setDesiredByKey] = useState<Record<string, string>>({});

	useEffect(() => {
		setSearchTerm('');
		setRequestedGroupId(null);
		setDesiredByKey({});
	}, [targetId, sourceId]);

	// Vorbelegen aus der Bestellmenge, die im Zielfest schon steht. Nur Schlüssel,
	// die es noch nicht gibt — sonst überschriebe ein Nachladen die laufende Eingabe.
	useEffect(() => {
		setDesiredByKey((prev) => {
			let changed = false;
			const next = { ...prev };
			for (const r of matchResult.rows) {
				if (next[r.key] !== undefined) continue;
				if (r.targetOrderedQuantity != null && r.targetOrderedQuantity > 0) {
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
				r.targetOrderedQuantity != null && r.targetOrderedQuantity > 0
					? r.targetOrderedQuantity
					: null
		},
		`${sourceId}::${targetId}`
	);

	// Dieselbe Position kann in mehreren Stationen stehen; der Reiter zeigt aber
	// nur eine. Die Marke an der Zeile sagt, wo sie sonst noch vorkommt.
	const siblingsByName = useMemo(() => {
		const map = new Map<string, MatchRow[]>();
		for (const r of matchResult.rows) {
			const list = map.get(r.normalizedName) ?? [];
			list.push(r);
			map.set(r.normalizedName, list);
		}
		return map;
	}, [matchResult.rows]);

	// Suchen → gruppieren: die Reiter zeigen damit die Trefferzahl je Station.
	const found = useMemo(
		() => searchHandoverRows(matchResult.rows, searchTerm),
		[matchResult.rows, searchTerm]
	);
	const groups = useMemo(() => groupRowsByStation(found), [found]);
	const activeGroupId = resolveActiveGroupId(groups, requestedGroupId);
	const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

	// Der Fuß zählt den ganzen Lauf, nicht den Reiter: gespeichert wird ins Fest.
	const summary = useMemo(
		() => handoverSummary(matchResult.rows, desiredByKey, orchestrator.statesByKey),
		[matchResult.rows, desiredByKey, orchestrator.statesByKey]
	);

	const rowProps = {
		desiredByKey,
		statesByKey: orchestrator.statesByKey,
		onDesiredChange: (row: MatchRow, value: string) =>
			setDesiredByKey((prev) => ({ ...prev, [row.key]: value })),
		onCommit: (row: MatchRow) => orchestrator.saveRow(row, desiredByKey[row.key] ?? ''),
		onRetry: (row: MatchRow) => orchestrator.retry(row),
		onDelete: (row: MatchRow) => setRowToDelete(row)
	};

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	const toMaterialTab = () => navigate(`/festival-results?id=${targetId}&tab=materials`);

	if (authLoading || festivalsQuery.isLoading) {
		return <PageMessage>Lade …</PageMessage>;
	}

	if (!targetId || !targetFestival) {
		return <PageMessage>Dieses Fest gibt es nicht (mehr).</PageMessage>;
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
				<FestivalShellHeader
					festivalName={targetFestival.name || 'Fest'}
					startDate={targetFestival.start_date}
					endDate={targetFestival.end_date}
					activeTab="materials"
					onTabChange={(tab) => navigate(`/festival-results?id=${targetId}&tab=${tab}`)}
					actions={
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-white hover:bg-white/15 hover:text-white"
							onClick={handleSignOut}>
							Abmelden
						</Button>
					}
					menuItems={[
						{
							label: 'Zur Festliste',
							icon: <LayoutDashboard className="h-4 w-4" />,
							onClick: () => navigate('/dashboard')
						},
						{ label: 'Abmelden', icon: <LogOut className="h-4 w-4" />, onClick: handleSignOut }
					]}
				/>

				<div className="space-y-3 pt-4 sm:space-y-4">
					<MaterialModeBar
						mode="uebernahme"
						onModeChange={(mode) => {
							// Der Umschalter navigiert, er blendet nicht um (Entscheid aus #66).
							if (mode === 'arbeitsliste') toMaterialTab();
						}}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						searchPlaceholder={`Suche in ${matchResult.rows.length} Positionen …`}
						searchLabel="Position suchen">
						<Button
							size="sm"
							className="gap-1 text-[12.5px] max-[899px]:min-h-10"
							disabled={targetStationsQuery.isLoading}
							onClick={() => setCreateDialogOpen(true)}>
							<Plus className="h-4 w-4" />
							POSITION
						</Button>
					</MaterialModeBar>

					{sources.length === 0 ? (
						<EmptyBox>
							Für die Übernahme braucht es ein zweites Fest als Quelle — dieses ist bisher das
							einzige.
						</EmptyBox>
					) : (
						<>
							<HandoverSourceBar
								sources={sources}
								sourceId={sourceId}
								onSourceChange={setRequestedSourceId}
								targetName={targetFestival.name || 'Fest'}
							/>

							{materialsLoading ? (
								<PageMessage>Materialien werden geladen …</PageMessage>
							) : matchResult.rows.length === 0 ? (
								<EmptyBox>Weder Ziel- noch Quellfest haben Material-Positionen.</EmptyBox>
							) : !activeGroup ? (
								<EmptyBox>Keine Position passt zur Suche.</EmptyBox>
							) : (
								<>
									<HandoverGroupTabs
										groups={groups}
										activeGroupId={activeGroupId}
										onSelect={setRequestedGroupId}
									/>

									<HandoverGroupBox group={activeGroup}>
										{isMobile ? (
											<div className="space-y-2 p-2">
												{activeGroup.rows.map((row) => (
													<HandoverCard
														key={row.key}
														row={row}
														siblings={siblingsByName.get(row.normalizedName) ?? [row]}
														{...rowProps}
													/>
												))}
											</div>
										) : (
											<HandoverTable
												rows={activeGroup.rows}
												siblingsByName={siblingsByName}
												{...rowProps}
											/>
										)}
									</HandoverGroupBox>

									<HandoverSummaryBar summary={summary} />
								</>
							)}
						</>
					)}
				</div>
			</div>

			<MaterialDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				material={null}
				stations={targetStations}
				festivalId={targetId}
				onSave={async (data) => {
					// Diese Maske legt immer neu an (`material={null}`) — dann liefert der
					// Dialog die volle Nutzlast samt Menge und Preis.
					if (!isFullPayload(data)) return;
					await createMaterial(data);
					queryClient.invalidateQueries({ queryKey: ['materials', targetId] });
					setCreateDialogOpen(false);
				}}
			/>

			{/* Am Handy bleibt die Fest-Tab-Leiste auch auf dieser Unterseite stehen. */}
			{isMobile && <FestivalTabBar active="materials" onSelect={(tab: FestivalTab) => navigate(`/festival-results?id=${targetId}&tab=${tab}`)} />}

			<AlertDialog
				open={rowToDelete !== null}
				onOpenChange={(open) => !open && setRowToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Position löschen?</AlertDialogTitle>
						<AlertDialogDescription>
							{rowToDelete && (
								<>
									„<strong>{rowToDelete.name}</strong>"
									{rowToDelete.stationName ? <> in Station „{rowToDelete.stationName}"</> : null} wird
									aus dem Zielfest entfernt. Das lässt sich nicht rückgängig machen.
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
							className="bg-rot hover:bg-rot/90">
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function PageMessage({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<div className="flex items-center justify-center gap-2 pt-10 text-sm text-tinte-soft">
				<Loader2 className="h-4 w-4 animate-spin" />
				{children}
			</div>
		</div>
	);
}

const EmptyBox = ({ children }: { children: ReactNode }) => (
	<div className="border-2.5 border-tinte bg-white px-4 py-8 text-center text-sm text-tinte-soft">
		{children}
	</div>
);
