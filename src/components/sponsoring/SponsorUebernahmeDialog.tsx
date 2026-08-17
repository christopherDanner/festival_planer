import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserFestivals, type Festival } from '@/lib/festivalService';
import {
	getSponsorings,
	createSponsoring,
	createCategory,
	type SponsoringCategory,
	type SponsoringWithDetails
} from '@/lib/sponsorService';
import { sponsoringTotal } from '@/lib/sponsoringTotals';
import { planSponsorTransfer, type SponsorTransferPlan } from '@/lib/sponsorTransfer';

interface SponsorUebernahmeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Zielfest. */
	festivalId: string;
	/** Kategorien des Zielfests (für das Namens-Mapping). */
	targetCategories: SponsoringCategory[];
	/** Bestehende Sponsorings des Zielfests (bereits erfasste Firmen überspringen). */
	targetSponsorings: SponsoringWithDetails[];
	/** Nach erfolgreicher Übernahme (Daten neu laden). */
	onTransferred: () => void;
}

const formatEuro = (value: number): string =>
	value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

const formatFestivalLabel = (festival: Festival): string => {
	const year = new Date(festival.start_date).getFullYear();
	return Number.isFinite(year) ? `${festival.name} (${year})` : festival.name;
};

const SponsorUebernahmeDialog: React.FC<SponsorUebernahmeDialogProps> = ({
	open,
	onOpenChange,
	festivalId,
	targetCategories,
	targetSponsorings,
	onTransferred
}) => {
	const { toast } = useToast();

	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [sourceId, setSourceId] = useState('');
	const [sourceSponsorings, setSourceSponsorings] = useState<SponsoringWithDetails[]>([]);
	const [loadingSource, setLoadingSource] = useState(false);
	const [selected, setSelected] = useState<Record<string, boolean>>({});
	const [transferring, setTransferring] = useState(false);

	useEffect(() => {
		if (!open) return;
		setSourceId('');
		setSourceSponsorings([]);
		setSelected({});
		getUserFestivals()
			.then((data) => setFestivals(data.filter((f) => f.id !== festivalId)))
			.catch(() =>
				toast({
					title: 'Fehler',
					description: 'Feste konnten nicht geladen werden.',
					variant: 'destructive'
				})
			);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, festivalId]);

	useEffect(() => {
		if (!sourceId) return;
		setLoadingSource(true);
		getSponsorings(sourceId)
			.then((data) => {
				setSourceSponsorings(data);
				setSelected({});
			})
			.catch(() =>
				toast({
					title: 'Fehler',
					description: 'Sponsoren des Quellfests konnten nicht geladen werden.',
					variant: 'destructive'
				})
			)
			.finally(() => setLoadingSource(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sourceId]);

	const plans = useMemo(
		() => planSponsorTransfer(sourceSponsorings, targetCategories),
		[sourceSponsorings, targetCategories]
	);

	const alreadySponsoring = (sponsorId: string): boolean =>
		targetSponsorings.some((s) => s.sponsor_id === sponsorId);

	const selectedPlans = plans.filter((p) => selected[p.sponsorId] && !alreadySponsoring(p.sponsorId));

	const sourceTotalFor = (plan: SponsorTransferPlan): number => {
		const sponsoring = sourceSponsorings.find((s) => s.sponsor_id === plan.sponsorId);
		return sponsoring ? sponsoringTotal(sponsoring) : 0;
	};

	const handleTransfer = async () => {
		setTransferring(true);
		try {
			// Im Zielfest fehlende Kategorien einmalig anlegen (über Sponsoren hinweg dedupliziert).
			const createdByName = new Map<string, string>();
			for (const plan of selectedPlans) {
				for (const cat of plan.categories) {
					if (cat.status !== 'create') continue;
					const key = cat.name.trim().toLowerCase();
					if (!createdByName.has(key)) {
						createdByName.set(key, await createCategory(festivalId, cat.name, cat.proposedValue));
					}
				}
			}

			for (const plan of selectedPlans) {
				const assignments = plan.categories.map((cat) => ({
					category_id:
						cat.status === 'match'
							? cat.targetCategoryId!
							: createdByName.get(cat.name.trim().toLowerCase())!,
					value: cat.assignedValue
				}));
				// Der Einzel-Dialog darf Werte mitnehmen — hier entscheidet ein Mensch pro
				// Firma, und "wie letztes Jahr" ist am Telefon eine echte Zusage. Das
				// Kopierwerk bei der Fest-Anlage übernimmt Sponsoren dagegen als nackte
				// Verknüpfung ohne Beträge; die Semantik der zwei Wege divergiert bewusst
				// (ADR 0008). Das Quellfest wird festgehalten — nur so hat das übernommene
				// Sponsoring später einen Vorjahresbeitrag.
				await createSponsoring(festivalId, plan.sponsorId, plan.freeAmount, assignments, null, {
					copied_from_festival_id: sourceId
				});
			}

			toast({
				title: 'Erfolg',
				description: `${selectedPlans.length} Sponsor${selectedPlans.length === 1 ? '' : 'en'} übernommen.`
			});
			onOpenChange(false);
			onTransferred();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Übernahme fehlgeschlagen',
				variant: 'destructive'
			});
		} finally {
			setTransferring(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Sponsor-Übernahme</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<label className="text-xs text-muted-foreground mb-1 block">Quellfest</label>
						<Select value={sourceId} onValueChange={setSourceId}>
							<SelectTrigger>
								<SelectValue placeholder="Quellfest auswählen…" />
							</SelectTrigger>
							<SelectContent>
								{festivals.map((f) => (
									<SelectItem key={f.id} value={f.id}>
										{formatFestivalLabel(f)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{loadingSource ? (
						<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Sponsoren werden geladen…
						</div>
					) : sourceId && plans.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4 text-center">
							Im Quellfest sind keine Sponsorings erfasst.
						</p>
					) : (
						plans.length > 0 && (
							<div className="space-y-2">
								{/*
									Hier steht bewusst kein "Alle auswählen" (#154): der Einzelentscheid
									pro Firma ist genau die Rechtfertigung dafür, dass dieser Weg Werte
									mitnehmen darf (siehe handleTransfer, ADR 0008) — ein Klick, der alle
									Firmen samt Beträgen anlegt, hebt sie auf. Den Massenfall bedient
									das Kopierwerk bei der Fest-Anlage, als nackte Verknüpfung ohne
									Beträge (#146). Die Reibung ist gewollt, keine fehlende Bequemlichkeit.
								*/}
								<p className="text-sm font-medium">Sponsoren des Quellfests</p>
								{plans.map((plan) => {
									const taken = alreadySponsoring(plan.sponsorId);
									return (
										<div
											key={plan.sponsorId}
											className={`flex items-start gap-3 rounded-md border p-3 ${taken ? 'opacity-60' : ''}`}>
											<Checkbox
												className="mt-0.5"
												checked={!!selected[plan.sponsorId]}
												disabled={taken}
												onCheckedChange={(checked) =>
													setSelected((prev) => ({ ...prev, [plan.sponsorId]: checked === true }))
												}
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-medium">{plan.companyName}</span>
													<span className="text-sm text-muted-foreground">
														Vorjahresbeitrag: {formatEuro(sourceTotalFor(plan))}
													</span>
													{taken && <Badge variant="secondary">bereits erfasst</Badge>}
												</div>
												<div className="flex flex-wrap gap-1.5 mt-1">
													{plan.categories.map((cat, i) => (
														<Badge key={i} variant={cat.status === 'match' ? 'secondary' : 'outline'}>
															{cat.name}
															{cat.status === 'create' && ' (neu)'}
														</Badge>
													))}
													{plan.freeAmount != null && (
														<Badge variant="secondary">
															Freibetrag {formatEuro(plan.freeAmount)}
														</Badge>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)
					)}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleTransfer} disabled={selectedPlans.length === 0 || transferring}>
							{transferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{selectedPlans.length > 0
								? `${selectedPlans.length} übernehmen`
								: 'Übernehmen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SponsorUebernahmeDialog;
