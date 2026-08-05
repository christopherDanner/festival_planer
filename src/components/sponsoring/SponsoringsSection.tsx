import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
	parseCategoryValue,
	type Sponsor,
	type SponsoringCategory,
	type SponsoringWithDetails,
	type SponsoringAssignmentInput
} from '@/lib/sponsorService';
import { buildSponsoringOverviewRows } from '@/lib/sponsoringTotals';
import { exportSponsoringOverviewPdf } from '@/lib/sponsoringExportService';

interface SponsoringsSectionProps {
	festivalId: string;
	festivalName: string;
}

const NEW_SPONSOR_VALUE = '__new__';

/** Eingabezustand einer Kategorie-Zuweisung im Dialog. */
interface AssignmentDraft {
	checked: boolean;
	/** Roh-Eingabe des überschriebenen Werts; leer = Kategorie-Wert gilt. */
	valueInput: string;
}

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
	const [editing, setEditing] = useState<SponsoringWithDetails | null>(null);
	const [sponsorChoice, setSponsorChoice] = useState('');
	const [newCompanyName, setNewCompanyName] = useState('');
	const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
	const [freeAmount, setFreeAmount] = useState('');
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

	const emptyDrafts = (): Record<string, AssignmentDraft> =>
		Object.fromEntries(categories.map((c) => [c.id, { checked: false, valueInput: '' }]));

	const openCreate = () => {
		setEditing(null);
		setSponsorChoice('');
		setNewCompanyName('');
		setDrafts(emptyDrafts());
		setFreeAmount('');
		setNotes('');
		setShowDialog(true);
	};

	const openEdit = (sponsoring: SponsoringWithDetails) => {
		setEditing(sponsoring);
		setSponsorChoice(sponsoring.sponsor_id);
		setNewCompanyName('');
		const next = emptyDrafts();
		for (const a of sponsoring.assignments) {
			next[a.category_id] = {
				checked: true,
				valueInput: a.value == null ? '' : String(a.value).replace('.', ',')
			};
		}
		setDrafts(next);
		setFreeAmount(
			sponsoring.free_amount == null ? '' : String(sponsoring.free_amount).replace('.', ',')
		);
		setNotes(sponsoring.notes ?? '');
		setShowDialog(true);
	};

	const buildAssignments = (): SponsoringAssignmentInput[] =>
		categories
			.filter((c) => drafts[c.id]?.checked)
			.map((c) => ({ category_id: c.id, value: parseCategoryValue(drafts[c.id].valueInput) }));

	const handleSave = async () => {
		const isNewSponsor = sponsorChoice === NEW_SPONSOR_VALUE;
		if (!editing && !sponsorChoice) {
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
			const assignments = buildAssignments();
			const parsedFreeAmount = parseCategoryValue(freeAmount);
			const trimmedNotes = notes.trim() || null;

			if (editing) {
				await updateSponsoring(
					editing.id,
					{ free_amount: parsedFreeAmount, notes: trimmedNotes },
					assignments
				);
				toast({ title: 'Erfolg', description: 'Sponsoring wurde aktualisiert.' });
			} else {
				const sponsorId = isNewSponsor
					? await createSponsor({ company_name: newCompanyName.trim() })
					: sponsorChoice;
				await createSponsoring(festivalId, sponsorId, parsedFreeAmount, assignments, trimmedNotes);
				toast({ title: 'Erfolg', description: 'Sponsoring wurde angelegt.' });
			}
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
	const availableSponsors = editing
		? sponsors
		: sponsors.filter((s) => !sponsorings.some((sp) => sp.sponsor_id === s.id));

	const handleDeleteById = (sponsoringId: string) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) handleDelete(sponsoring);
	};

	const handleEditById = (sponsoringId: string) => {
		const sponsoring = sponsorings.find((s) => s.id === sponsoringId);
		if (sponsoring) openEdit(sponsoring);
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
				onEdit={handleEditById}
				onDelete={handleDeleteById}
			/>

			<SponsorUebernahmeDialog
				open={showTransferDialog}
				onOpenChange={setShowTransferDialog}
				festivalId={festivalId}
				targetCategories={categories}
				targetSponsorings={sponsorings}
				onTransferred={loadData}
			/>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editing ? 'Sponsoring bearbeiten' : 'Neues Sponsoring'}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Firma *</Label>
							{editing ? (
								<p className="font-medium py-2">{editing.sponsor.company_name}</p>
							) : (
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
							)}
						</div>

						{!editing && sponsorChoice === NEW_SPONSOR_VALUE && (
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
							<Label>Kategorien</Label>
							{categories.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Noch keine Sponsoring-Kategorien für dieses Fest
								</p>
							) : (
								<div className="space-y-2 mt-1">
									{categories.map((category) => {
										const draft = drafts[category.id] ?? { checked: false, valueInput: '' };
										return (
											<div key={category.id} className="flex items-center gap-3">
												<Checkbox
													id={`cat_${category.id}`}
													checked={draft.checked}
													onCheckedChange={(checked) =>
														setDrafts((prev) => ({
															...prev,
															[category.id]: { ...draft, checked: checked === true }
														}))
													}
												/>
												<Label htmlFor={`cat_${category.id}`} className="flex-1 font-normal">
													{category.name}
												</Label>
												{draft.checked && (
													<Input
														className="w-28"
														inputMode="decimal"
														value={draft.valueInput}
														onChange={(e) =>
															setDrafts((prev) => ({
																...prev,
																[category.id]: { ...draft, valueInput: e.target.value }
															}))
														}
														placeholder={category.value == null ? 'Wert' : String(category.value)}
													/>
												)}
											</div>
										);
									})}
									<p className="text-xs text-muted-foreground">
										Leer lassen = Kategorie-Wert gilt; eigener Wert überschreibt.
									</p>
								</div>
							)}
						</div>

						<div>
							<Label htmlFor="free_amount">Freibetrag (€)</Label>
							<Input
								id="free_amount"
								inputMode="decimal"
								value={freeAmount}
								onChange={(e) => setFreeAmount(e.target.value)}
								placeholder="z.B. 100 oder 100,50"
							/>
						</div>

						<div>
							<Label htmlFor="sponsoring_notes">Notizen</Label>
							<Input
								id="sponsoring_notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setShowDialog(false)}>
								Abbrechen
							</Button>
							<Button onClick={handleSave} disabled={saving}>
								{editing ? 'Aktualisieren' : 'Anlegen'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default SponsoringsSection;
