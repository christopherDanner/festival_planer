import React, { useState, useEffect, useCallback, useRef } from 'react';
import FirmenwahlDialog from '@/components/sponsoring/FirmenwahlDialog';
import SponsorUebernahmeDialog from '@/components/sponsoring/SponsorUebernahmeDialog';
import SponsoringNoteDialog from '@/components/sponsoring/SponsoringNoteDialog';
import SponsoringOverview from '@/components/sponsoring/SponsoringOverview';
import SponsorFormDialog, { type SponsorFormValues } from '@/components/sponsors/SponsorFormDialog';
import { useToast } from '@/hooks/use-toast';
import {
	getSponsors,
	createSponsor,
	getCategories,
	createCategory,
	updateCategory,
	deleteCategory,
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
	categoryImpact,
	categoryZettelWrite,
	type CategoryImpact,
	type CategoryZettelInput
} from '@/lib/sponsoringPreisliste';
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

const SponsoringsSection: React.FC<SponsoringsSectionProps> = ({ festivalId, festivalName }) => {
	const { toast } = useToast();

	const [sponsorings, setSponsorings] = useState<SponsoringWithDetails[]>([]);
	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [categories, setCategories] = useState<SponsoringCategory[]>([]);
	const [loading, setLoading] = useState(true);

	/* „+ SPONSOR" (#153) hat zwei Schritte: die Firmenwahl, und — nur wenn die
	Firma fehlt — das Firmendaten-Formular für eine neue. */
	const [showFirmenwahl, setShowFirmenwahl] = useState(false);
	const [showNewCompany, setShowNewCompany] = useState(false);
	/** Das eben angelegte Sponsoring — seine Zeile wird sichtbar gemacht. */
	const [newSponsoringId, setNewSponsoringId] = useState<string | null>(null);
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

	/* Ein leeres Sponsoring ist ein gültiger Zustand (#153): € 0, lauter Lücken —
	derselbe, den die Übernahme (#146) massenhaft erzeugt. Gefüllt wird in der
	Matrix per Zettel (ADR 0009), die Notiz kommt übers ⋮ (#150).
	`copied_from_festival_id` bleibt NULL, nur die Übernahme setzt es (#145) —
	ein hier angelegtes Sponsoring hat darum keinen Vorjahresbeitrag.

	Danach ist die Suche leer: eine, die die neue Firma nicht trifft, verdeckte
	sonst gerade die Zeile, die sichtbar werden soll. */
	const addSponsoring = async (sponsorId: string) => {
		const sponsoringId = await createSponsoring(festivalId, sponsorId, null, [], null);
		setSearchTerm('');
		await loadData();
		setNewSponsoringId(sponsoringId);
		toast({ title: 'Erfolg', description: 'Sponsor wurde hinzugefügt.' });
	};

	const reportError = (error: unknown) =>
		toast({
			title: 'Fehler',
			description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
			variant: 'destructive'
		});

	const handleChooseSponsor = async (sponsorId: string) => {
		setSaving(true);
		try {
			await addSponsoring(sponsorId);
			setShowFirmenwahl(false);
		} catch (error) {
			reportError(error);
		} finally {
			setSaving(false);
		}
	};

	/* Die neue Firma kommt mit vollen Stammdaten an den **globalen** Sponsor
	(ADR 0011) — Ansprechpartner und Telefon hat man beim Anlegen zur Hand, und
	die Sponsoren-Seite zeigt sie danach ohne Nachtragen. `createSponsor` stempelt
	`user_id` mit `auth.uid()` (RLS `shared_insert`).

	Scheitert erst das Sponsoring, steht die Firma schon im Bestand: das Formular
	schließt trotzdem, und die Firmenliste bietet sie beim nächsten Versuch an —
	ein zweites „Neue Firma" legte sie doppelt an. */
	const handleCreateSponsor = async (values: SponsorFormValues) => {
		setSaving(true);
		let sponsorId: string;
		try {
			sponsorId = await createSponsor(values);
		} catch (error) {
			reportError(error);
			setSaving(false);
			return;
		}
		setShowNewCompany(false);
		try {
			await addSponsoring(sponsorId);
		} catch (error) {
			reportError(error);
			loadData();
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

	/* Die Preisliste wird am Spaltenkopf verwaltet (ADR 0009, #149) — anlegen,
	umbenennen, Standardwert ändern, löschen. Eine zweite Tabelle gibt es nicht
	mehr. Nach jedem Schreiben neu laden, damit Spalten, Fuß und Kopfzahl über
	denselben Rechenweg nachziehen. */
	const handleCategoryApply = async (
		category: SponsoringCategory | null,
		input: CategoryZettelInput
	) => {
		const { name, value } = categoryZettelWrite(input);
		try {
			if (category) {
				await updateCategory(category.id, { name, value });
			} else {
				await createCategory(festivalId, name, value);
			}
			loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	/* Die bezifferte Rückfrage hat der Zettel schon gestellt — hier fällt nur
	noch die Kategorie samt ihren Zuweisungen (ON DELETE CASCADE). */
	const handleCategoryDelete = async (category: SponsoringCategory) => {
		try {
			await deleteCategory(category.id);
			loadData();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Fehler beim Löschen',
				variant: 'destructive'
			});
		}
	};

	/* Über **alle** Sponsorings gezählt, nicht über die gefilterten Zeilen: was
	ein neuer Standardwert verschiebt und was das Löschen mitreißt, hängt nicht
	am Suchfeld (ADR 0006). */
	const categoryImpacts: Record<string, CategoryImpact> = Object.fromEntries(
		categories.map((c) => [c.id, categoryImpact(sponsorings, c.id)])
	);

	// „+ SPONSOR" bietet nur Firmen an, die das Fest noch nicht sponsern (UNIQUE).
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
				onCreate={() => setShowFirmenwahl(true)}
				onTransfer={() => setShowTransferDialog(true)}
				onExportPdf={handleExportPdf}
				onOpenNote={setNoteForSponsoringId}
				onOpenSponsor={setSponsorFormForSponsoringId}
				onDelete={handleDelete}
				onApply={handleApply}
				onRemove={handleRemove}
				categoryImpacts={categoryImpacts}
				onCategoryApply={handleCategoryApply}
				onCategoryDelete={handleCategoryDelete}
				newSponsoringId={newSponsoringId}
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

			<FirmenwahlDialog
				open={showFirmenwahl}
				onOpenChange={setShowFirmenwahl}
				sponsors={availableSponsors}
				bestandLeer={sponsors.length === 0}
				saving={saving}
				onChoose={handleChooseSponsor}
				onNewCompany={() => {
					setShowFirmenwahl(false);
					setShowNewCompany(true);
				}}
			/>

			{/* „Neue Firma" — dasselbe Formular wie ⋮ → Firmendaten, nur leer (#150). */}
			{showNewCompany && (
				<SponsorFormDialog
					open
					onOpenChange={(open) => !open && setShowNewCompany(false)}
					sponsor={null}
					saving={saving}
					onSave={handleCreateSponsor}
				/>
			)}
		</div>
	);
};

export default SponsoringsSection;
