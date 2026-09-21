import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import SponsorUebernahmeDialog from '@/components/sponsoring/SponsorUebernahmeDialog';
import SponsoringOverview from '@/components/sponsoring/SponsoringOverview';
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
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import {
	applyZettel,
	clearZettel,
	type SponsoringWrite,
	type ZettelInput,
	type ZettelTarget
} from '@/lib/sponsoringZettel';
import { exportSponsoringOverviewPdf } from '@/lib/sponsoringExportService';

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
	/* Suchzustand der Werkzeugleiste; er filtert nur die Zeilen der Übersicht
	(ADR 0006, #151) — die Fest-Kennzahl im Bereichskopf sieht ihn nie. */
	const [searchTerm, setSearchTerm] = useState('');
	const [sponsorChoice, setSponsorChoice] = useState('');
	const [newCompanyName, setNewCompanyName] = useState('');
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);

	/* Der Stand, aus dem der nächste Schreibvorgang seine Zuweisungsliste baut —
	die Zustandsvariable hinkt einen Render hinterher. */
	const currentSponsorings = useRef<SponsoringWithDetails[]>([]);

	const loadData = useCallback(async () => {
		try {
			const [sponsoringData, sponsorData, categoryData] = await Promise.all([
				getSponsorings(festivalId),
				getSponsors(),
				getCategories(festivalId)
			]);
			currentSponsorings.current = sponsoringData;
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

	/* Schreibvorgänge des Zettels laufen nacheinander, und jeder baut seine
	Zuweisungsliste erst dann. Der Grund: `updateSponsoring` ersetzt die
	Zuweisungen vollständig — zwei schnell aufeinander folgende Zellklicks (der
	Zettel kostet nur zwei) würden sonst beide vom Stand *vor* dem ersten
	rechnen, und die erste Zuweisung wäre still wieder weg. */
	const writeQueue = useRef<Promise<void>>(Promise.resolve());

	const enqueueWrite = (
		sponsoringId: string,
		build: (sponsoring: SponsoringWithDetails) => SponsoringWrite
	) => {
		writeQueue.current = writeQueue.current.then(async () => {
			const sponsoring = currentSponsorings.current.find((s) => s.id === sponsoringId);
			if (!sponsoring) return;
			const write = build(sponsoring);
			try {
				await updateSponsoring(sponsoringId, write.updates, write.assignments);
				/* Neu laden, damit Zeile, Fuß, Maßband und Kopfzahl über denselben
				Rechenweg nachziehen (ADR 0006). */
				await loadData();
			} catch (error) {
				toast({
					title: 'Fehler',
					description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
					variant: 'destructive'
				});
			}
		});
	};

	const handleApply = (sponsoringId: string, target: ZettelTarget, input: ZettelInput) =>
		enqueueWrite(sponsoringId, (sponsoring) => applyZettel(sponsoring, target, input));

	const handleRemove = (sponsoringId: string, target: ZettelTarget) =>
		enqueueWrite(sponsoringId, (sponsoring) => clearZettel(sponsoring, target));

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

	const handleDeleteById = (sponsoringId: string) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) handleDelete(sponsoring);
	};

	/* Der Export nimmt bewusst **alle** Zeilen: ein PDF verlässt den Bildschirm
	und trägt seine Beschriftung nicht mit — ein gefilterter Ausdruck wäre die
	stille Lüge, die ADR 0006 am Fuß gerade verhindert. */
	const handleExportPdf = () =>
		exportSponsoringOverviewPdf(buildSponsoringOverviewRows(sponsorings), { festivalName });

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
			<SponsoringOverview
				sponsorings={sponsorings}
				categories={categories}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				onCreate={openCreate}
				onTransfer={() => setShowTransferDialog(true)}
				onExportPdf={handleExportPdf}
				onDelete={handleDeleteById}
				onApply={handleApply}
				onRemove={handleRemove}
			/>

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
