import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, Building2, FileDown, Import } from 'lucide-react';
import SponsorUebernahmeDialog from '@/components/sponsoring/SponsorUebernahmeDialog';
import SponsoringHeadline from '@/components/sponsoring/SponsoringHeadline';
import SponsoringMatrix from '@/components/sponsoring/SponsoringMatrix';
import { useToast } from '@/hooks/use-toast';
import {
	getSponsors,
	createSponsor,
	getCategories,
	getSponsorings,
	createSponsoring,
	updateSponsoring,
	deleteSponsoring,
	type Sponsor,
	type SponsoringCategory,
	type SponsoringWithDetails
} from '@/lib/sponsorService';
import {
	buildSponsoringOverviewFooter,
	buildSponsoringOverviewRows,
	festivalInKindTotal,
	festivalSponsoringTotal
} from '@/lib/sponsoringTotals';
import {
	applyZettel,
	clearZettel,
	type SponsoringWrite,
	type ZettelInput,
	type ZettelTarget
} from '@/lib/sponsoringZettel';
import { exportSponsoringOverviewPdf } from '@/lib/sponsoringExportService';
import { formatEuro } from '@/lib/money';

interface SponsoringsSectionProps {
	festivalId: string;
	festivalName: string;
}

const NEW_SPONSOR_VALUE = '__new__';

const SponsoringsSection: React.FC<SponsoringsSectionProps> = ({ festivalId, festivalName }) => {
	const { toast } = useToast();

	const [sponsorings, setSponsorings] = useState<SponsoringWithDetails[]>([]);
	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [categories, setCategories] = useState<SponsoringCategory[]>([]);
	const [loading, setLoading] = useState(true);

	const [showDialog, setShowDialog] = useState(false);
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [sponsorChoice, setSponsorChoice] = useState('');
	const [newCompanyName, setNewCompanyName] = useState('');
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [sponsoringData, sponsorData, categoryData] = await Promise.all([
				getSponsorings(festivalId),
				getSponsors(),
				getCategories(festivalId)
			]);
			setSponsorings(sponsoringData);
			setSponsors(sponsorData);
			setCategories(categoryData);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Sponsorings konnten nicht geladen werden.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [festivalId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const openCreate = () => {
		setSponsorChoice('');
		setNewCompanyName('');
		setNotes('');
		setShowDialog(true);
	};

	const handleSave = async () => {
		const isNewSponsor = sponsorChoice === NEW_SPONSOR_VALUE;
		if (!sponsorChoice) {
			toast({ title: 'Fehler', description: 'Bitte eine Firma wählen.', variant: 'destructive' });
			return;
		}
		if (isNewSponsor && !newCompanyName.trim()) {
			toast({
				title: 'Fehler',
				description: 'Firmenname ist erforderlich.',
				variant: 'destructive'
			});
			return;
		}

		setSaving(true);
		try {
			const sponsorId = isNewSponsor
				? await createSponsor({ company_name: newCompanyName.trim() })
				: sponsorChoice;
			/* Nackte Verknüpfung: Kategorien, Freibetrag und Sachleistung setzt
			danach der Zettel in der Matrix (ADR 0009). */
			await createSponsoring(festivalId, sponsorId, null, [], notes.trim() || null);
			toast({ title: 'Erfolg', description: 'Sponsoring wurde angelegt.' });
			setShowDialog(false);
			loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setSaving(false);
		}
	};

	/* Der einzige Schreibweg des Zettels. Danach wird neu geladen, damit Zeile,
	Fuß, Maßband und Kopfzahl über denselben Rechenweg nachziehen (ADR 0006). */
	const writeZettel = async (sponsoringId: string, write: SponsoringWrite) => {
		try {
			await updateSponsoring(sponsoringId, write.updates, write.assignments);
			await loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	const handleApply = (sponsoringId: string, target: ZettelTarget, input: ZettelInput) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) writeZettel(sponsoringId, applyZettel(sponsoring, target, input));
	};

	const handleRemove = (sponsoringId: string, target: ZettelTarget) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) writeZettel(sponsoringId, clearZettel(sponsoring, target));
	};

	const handleDelete = async (sponsoring: SponsoringWithDetails) => {
		if (
			!confirm(
				`Möchten Sie das Sponsoring von "${sponsoring.sponsor.company_name}" wirklich entfernen?`
			)
		) {
			return;
		}

		try {
			await deleteSponsoring(sponsoring.id);
			toast({ title: 'Erfolg', description: 'Sponsoring wurde entfernt.' });
			loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Fehler beim Löschen',
				variant: 'destructive'
			});
		}
	};

	// Beim Anlegen nur Firmen anbieten, die das Fest noch nicht sponsern (UNIQUE).
	const availableSponsors = sponsors.filter(
		(s) => !sponsorings.some((sp) => sp.sponsor_id === s.id)
	);

	/* Vorjahresbeitrag je Sponsoring und Geldsumme des vorigen Fests kommen aus
	`getPreviousSponsorings()` / `getPreviousFestivalTotal()` (#145). Solange es
	den Leseweg nicht gibt, zeigt die Matrix den Leerfall: keine Vorjahr-Unterzeile
	und — laut #69, Entscheid 5 — gar kein Maßband. */
	const rows = buildSponsoringOverviewRows(sponsorings);
	const footer = buildSponsoringOverviewFooter(rows, categories);
	const total = festivalSponsoringTotal(sponsorings);

	const handleDeleteById = (sponsoringId: string) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) handleDelete(sponsoring);
	};

	if (loading) {
		return (
			<div className="space-y-3">
				<div className="h-10 bg-muted rounded animate-pulse" />
				<div className="h-24 bg-muted rounded animate-pulse" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Sponsoring-Übersicht
					</h2>
					<p className="text-sm text-muted-foreground">
						Erfasste Sponsoren mit Leistungen und Gesamtsumme
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button onClick={() => setShowTransferDialog(true)} size="sm" variant="outline">
						<Import className="h-4 w-4 mr-2" />
						<span>Übernahme</span>
					</Button>
					<Button
						onClick={() => exportSponsoringOverviewPdf(rows, { festivalName })}
						size="sm"
						variant="outline"
						disabled={rows.length === 0}>
						<FileDown className="h-4 w-4 mr-2" />
						<span>PDF</span>
					</Button>
					<Button onClick={openCreate} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						<span>Sponsoring</span>
					</Button>
				</div>
			</div>

			<SponsoringHeadline
				total={total}
				sponsorCount={sponsorings.length}
				inKindTotal={festivalInKindTotal(sponsorings)}
				previousFestivalTotal={null}
			/>

			{/* Mobile: Karten-Liste. Bedient wird sie noch nicht — die Karten-Form
			des Zettels ist ein eigener Slice (ADR 0009). */}
			<div className="md:hidden space-y-2">
				{rows.length === 0 ? (
					<div className="border bg-card py-8 text-center text-sm text-muted-foreground">
						Noch keine Sponsorings erfasst
					</div>
				) : (
					<>
						{rows.map((row) => {
							const sponsoring = sponsorings.find((s) => s.id === row.sponsoringId)!;
							return (
								<div key={row.sponsoringId} className="border bg-card p-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0">
											<div className="font-medium truncate">{row.companyName}</div>
											<div className="text-sm font-semibold mt-0.5">{formatEuro(row.total)}</div>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive"
											aria-label={`Sponsoring von ${row.companyName} entfernen`}
											onClick={() => handleDelete(sponsoring)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									{(row.positions.length > 0 || row.freeAmount != null) && (
										<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
											{row.positions.map((p, i) => (
												<span key={i}>
													{p.label} ({formatEuro(p.value)})
												</span>
											))}
											{row.freeAmount != null && (
												<span>Freibetrag ({formatEuro(row.freeAmount)})</span>
											)}
										</div>
									)}
								</div>
							);
						})}
						<div className="border bg-card p-3 flex items-center justify-between">
							<span className="font-semibold text-sm">Gesamtsumme</span>
							<span className="font-semibold">{formatEuro(total)}</span>
						</div>
					</>
				)}
			</div>

			{/* Desktop: Paket-Matrix */}
			<div className="hidden md:block">
				<SponsoringMatrix
					categories={categories}
					rows={rows}
					footer={footer}
					onDelete={handleDeleteById}
					onApply={handleApply}
					onRemove={handleRemove}
				/>
				{rows.length === 0 && (
					<p className="border bg-card py-8 text-center text-sm text-muted-foreground">
						Noch keine Sponsorings erfasst
					</p>
				)}
			</div>

			<SponsorUebernahmeDialog
				open={showTransferDialog}
				onOpenChange={setShowTransferDialog}
				festivalId={festivalId}
				targetCategories={categories}
				targetSponsorings={sponsorings}
				onTransferred={loadData}
			/>

			{/* Nur noch die Anlage: die Firmenwahl wandert mit einem eigenen Slice
			ins „+ SPONSOR", die Notiz ins ⋮. Ein „Bearbeiten" gibt es nicht mehr —
			es doppelte die Matrix als Häkchenliste (ADR 0009). */}
			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Neues Sponsoring</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Firma *</Label>
							<Select value={sponsorChoice} onValueChange={setSponsorChoice}>
								<SelectTrigger>
									<SelectValue placeholder="Firma wählen" />
								</SelectTrigger>
								<SelectContent>
									{availableSponsors.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.company_name}
										</SelectItem>
									))}
									<SelectItem value={NEW_SPONSOR_VALUE}>+ Neue Firma erfassen</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{sponsorChoice === NEW_SPONSOR_VALUE && (
							<div>
								<Label htmlFor="new_company_name">Firmenname *</Label>
								<Input
									id="new_company_name"
									value={newCompanyName}
									onChange={(e) => setNewCompanyName(e.target.value)}
									placeholder="z.B. Brauerei Schremser"
								/>
							</div>
						)}

						<div>
							<Label htmlFor="sponsoring_notes">Notizen</Label>
							<Input
								id="sponsoring_notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<p className="text-xs text-muted-foreground">
							Kategorien, Freibetrag und Sachleistung werden danach in der Matrix per Zellklick
							gesetzt.
						</p>

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setShowDialog(false)}>
								Abbrechen
							</Button>
							<Button onClick={handleSave} disabled={saving}>
								Anlegen
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default SponsoringsSection;
