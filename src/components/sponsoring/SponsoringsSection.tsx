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
import SponsoringNoteDialog from '@/components/sponsoring/SponsoringNoteDialog';
import SponsoringOverview from '@/components/sponsoring/SponsoringOverview';
import SponsorFormDialog, { type SponsorFormValues } from '@/components/sponsors/SponsorFormDialog';
import { useToast } from '@/hooks/use-toast';
import {
	getSponsors,
	createSponsor,
	getCategories,
	getSponsorings,
	createSponsoring,
	updateSponsoring,
	updateSponsor,
	deleteSponsoring,
	type Sponsor,
	type SponsoringCategory,
	type SponsoringWithDetails
} from '@/lib/sponsorService';
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import {
	applyZettel,
	clearZettel,
	keptAssignments,
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
	/* Die zwei Dialoge hinter dem ⋮ (#150) hängen an der *Sponsoring*-Id, nicht an
	einer Kopie der Zeile: nach jedem Schreibvorgang lädt der Bereich neu, und der
	Dialog soll dann den neuen Stand zeigen, nicht den von vorhin. Die Id steht
	auch im Namen des Firmendaten-Dialogs — er zeigt zwar den globalen *Sponsor*,
	aufgerufen wird er aber von einer Zeile dieses Fests. */
	const [noteForSponsoringId, setNoteForSponsoringId] = useState<string | null>(null);
	const [sponsorFormForSponsoringId, setSponsorFormForSponsoringId] = useState<string | null>(null);
	const [savingSponsor, setSavingSponsor] = useState(false);
	/* Suchzustand der Werkzeugleiste; er filtert nur die Zeilen der Übersicht
	(ADR 0006, #151) — die Fest-Kennzahl im Bereichskopf sieht ihn nie. */
	const [searchTerm, setSearchTerm] = useState('');
	const [sponsorChoice, setSponsorChoice] = useState('');
	const [newCompanyName, setNewCompanyName] = useState('');
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
			danach der Zettel in der Matrix (ADR 0009), die Notiz das ⋮ (#150). */
			await createSponsoring(festivalId, sponsorId, null, []);
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

	/* Die Notiz ist der einzige Schreibvorgang, den keine Zelle anfasst — sie muss
	die Zuweisungen der Zeile trotzdem mitführen, weil `updateSponsoring` sie
	vollständig ersetzt.

	Sie geht durch dieselbe Warteschlange wie der Zettel und schließt wie er
	sofort: der Bereich schreibt nirgends mit angehaltenem Atem, und ein
	Fehlschlag meldet sich als Toast. */
	const handleSaveNote = (sponsoringId: string, notes: string | null) => {
		enqueueWrite(sponsoringId, (sponsoring) => ({
			updates: { notes },
			assignments: keptAssignments(sponsoring)
		}));
		setNoteForSponsoringId(null);
	};

	/* Firmendaten schreiben den **globalen** Sponsor (ADR 0011): dieselbe Nummer
	steht danach auf der Sponsoren-Seite. Das Sponsoring bleibt unberührt.

	Anders als die Notiz läuft das nicht über die Warteschlange — es ist ein
	anderer Schreibweg an einer anderen Tabelle. Darum sperrt `savingSponsor`
	solange den Knopf: ein zweites Absenden schriebe denselben Stand noch einmal. */
	const handleSaveSponsor = async (sponsorId: string, values: SponsorFormValues) => {
		setSavingSponsor(true);
		try {
			await updateSponsor(sponsorId, values);
			toast({ title: 'Erfolg', description: 'Firmendaten wurden gespeichert.' });
			setSponsorFormForSponsoringId(null);
			loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		} finally {
			setSavingSponsor(false);
		}
	};

	/* Die Rückfrage stellt das ⋮ selbst (`ActionMenu`) — hier wird nur noch
	gelöscht, und zwar allein das *Sponsoring*: der Sponsor ist globaler
	Stammsatz und bliebe sonst einem vergangenen Fest weg (ADR 0010). */
	const handleDelete = async (sponsoringId: string) => {
		try {
			await deleteSponsoring(sponsoringId);
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

	/** Die Zeile, an der ein Dialog des ⋮ gerade hängt — immer der frische Stand. */
	const sponsoringById = (sponsoringId: string | null) =>
		sponsoringId == null ? null : (sponsorings.find((s) => s.id === sponsoringId) ?? null);

	const noteSponsoring = sponsoringById(noteForSponsoringId);
	const sponsorFormSponsoring = sponsoringById(sponsorFormForSponsoringId);

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
				onOpenNote={setNoteForSponsoringId}
				onOpenSponsor={setSponsorFormForSponsoringId}
				onDelete={handleDelete}
				onApply={handleApply}
				onRemove={handleRemove}
			/>

			{/* Notiz und Firmendaten — die zwei Dinge hinter dem ⋮, die kein Zettel
			trägt (#150). Ein „Bearbeiten" gibt es daneben ausdrücklich nicht. */}
			{noteSponsoring && (
				<SponsoringNoteDialog
					open
					onOpenChange={(open) => !open && setNoteForSponsoringId(null)}
					companyName={noteSponsoring.sponsor.company_name}
					notes={noteSponsoring.notes}
					onSave={(notes) => handleSaveNote(noteSponsoring.id, notes)}
				/>
			)}

			{sponsorFormSponsoring && (
				<SponsorFormDialog
					open
					onOpenChange={(open) => !open && setSponsorFormForSponsoringId(null)}
					sponsor={sponsorFormSponsoring.sponsor}
					saving={savingSponsor}
					onSave={(values) => handleSaveSponsor(sponsorFormSponsoring.sponsor_id, values)}
				/>
			)}

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

						{/* Die Notiz stand hier als zweites Feld für `sponsorings.notes` —
						mit dem ⋮ (#150) hat sie ihren Ort, und zwei Wege zu demselben Feld
						liefen auseinander (hier ein einzeiliges Feld, das '' schrieb). */}
						<p className="text-xs text-muted-foreground">
							Kategorien, Freibetrag, Sachleistung und Notiz werden danach in der Matrix gesetzt —
							die Werte per Zellklick, die Notiz über das ⋮ der Zeile.
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
