import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import MastPanel from '@/components/sponsors/MastPanel';
import SponsorFormDialog, { type SponsorFormValues } from '@/components/sponsors/SponsorFormDialog';
import SponsorsMast from '@/components/sponsors/SponsorsMast';
import SponsorsView from '@/components/sponsors/SponsorsView';
import { sponsorAnchorId } from '@/components/sponsors/sponsorAnchor';
import type { SponsorHistoryMap, SponsorSegment } from '@/lib/sponsorHistory';
import { getSponsorHistory } from '@/lib/sponsorHistoryService';
import {
	getSponsors,
	createSponsor,
	updateSponsor,
	deleteSponsor,
	type Sponsor
} from '@/lib/sponsorService';

/** Was das Firmendaten-Formular gerade zeigt: zu (`null`), eine neue Firma
oder die Stammdaten einer bestehenden. */
type SponsorForm = null | { sponsor: Sponsor | null };

/**
 * Sponsoren-Stammdaten (`/sponsors`) — der Sponsorenbestand über alle Feste
 * hinweg (ADR 0011). Kein Fest-Arbeitsbereich: eigener Mast statt Tab-Leiste,
 * Zurück-Weg ist der Wordmark (#101).
 *
 * „+ FIRMA" und ⋮ → Bearbeiten öffnen **dasselbe** Firmendaten-Formular wie
 * ⋮ → Firmendaten in der Sponsoring-Matrix (`SponsorFormDialog`, #150) — es ist
 * derselbe globale Stammsatz, also auch dasselbe Formular (#159). Gelöscht wird
 * über das ⋮, und nur, solange die Firma nie gesponsert hat (ADR 0010).
 */
const Sponsors = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
	const { signOut } = useAuth();
	const isMobile = useIsMobile();

	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [history, setHistory] = useState<SponsorHistoryMap>({});
	const [referenceYear, setReferenceYear] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [segment, setSegment] = useState<SponsorSegment>('alle');
	const [form, setForm] = useState<SponsorForm>(null);
	const [saving, setSaving] = useState(false);
	/** Die eben angelegte Firma, die nach dem Neuladen ins Bild geholt wird. */
	const [revealSponsorId, setRevealSponsorId] = useState<string | null>(null);

	// Bestand und Historie gehören zusammen: ohne Historie stünde an jeder Zeile
	// „NOCH NIE" — eine falsche Auskunft, auf der auch die Löschsperre im ⋮
	// steht. Scheitert eine der beiden Abfragen, scheitert das Laden.
	const loadSponsors = useCallback(async () => {
		try {
			const [data, historyLoad] = await Promise.all([getSponsors(), getSponsorHistory()]);
			setSponsors(data);
			setHistory(historyLoad.history);
			setReferenceYear(historyLoad.referenceYear);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Sponsoren konnten nicht geladen werden.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		loadSponsors();
	}, [loadSponsors]);

	// Eine neue Firma landet alphabetisch irgendwo — ohne Sprung schiene der
	// Klick auf „Speichern" nichts getan zu haben (#159, wie #153). Gesucht wird,
	// sobald der neu geladene Bestand gezeichnet ist.
	useEffect(() => {
		if (!revealSponsorId) return;
		const anchor = document.getElementById(sponsorAnchorId(revealSponsorId));
		if (!anchor) return;
		anchor.scrollIntoView({ block: 'center' });
		anchor.focus({ preventScroll: true });
		setRevealSponsorId(null);
	}, [revealSponsorId, sponsors]);

	const handleSignOut = async () => {
		await signOut();
		navigate('/auth');
	};

	const handleSave = async (values: SponsorFormValues) => {
		if (!form) return;
		setSaving(true);
		try {
			if (form.sponsor) {
				await updateSponsor(form.sponsor.id, values);
				toast({ title: 'Erfolg', description: 'Firmendaten wurden gespeichert.' });
			} else {
				// `createSponsor` stempelt `user_id = auth.uid()` (RLS `shared_insert`).
				const id = await createSponsor(values);
				toast({ title: 'Erfolg', description: 'Firma wurde angelegt.' });
				// Suche und Segment könnten die neue Firma verbergen — dann gäbe es
				// nichts, wohin der Sprung führt.
				setSearchTerm('');
				setSegment('alle');
				setRevealSponsorId(id);
			}
			setForm(null);
			await loadSponsors();
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

	/* Die Rückfrage stellt das ⋮ (`ActionMenu`). Läuft das Löschen trotz Sperre
	in den Fremdschlüssel, kommt aus `deleteSponsor` schon der Satz der Regel.
	Neu geladen wird in beiden Fällen: nach einer Ablehnung hat die Firma meist
	inzwischen eine Historie, und das ⋮ soll sie gesperrt zeigen. */
	const handleDelete = async (sponsor: Sponsor) => {
		try {
			await deleteSponsor(sponsor.id);
			toast({ title: 'Erfolg', description: `${sponsor.company_name} wurde gelöscht.` });
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Fehler beim Löschen',
				variant: 'destructive'
			});
		}
		await loadSponsors();
	};

	const openAddSponsor = () => setForm({ sponsor: null });

	return (
		<div className="min-h-screen">
			{/* Layout-Rahmen der Vision: max-width 1180px, zentriert */}
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pt-3 pb-12'
						: 'mx-auto max-w-[1180px] px-[22px] pt-[18px] pb-20'
				}>
				{loading ? (
					<>
						<SponsorsMast
							sponsorCount={null}
							compact={isMobile}
							onOpenFestivalList={() => navigate('/dashboard')}
							onAddSponsor={openAddSponsor}
							onSignOut={handleSignOut}
						/>
						<MastPanel className="px-4 py-16 text-center text-[13px] text-tinte-soft">
							Lade Sponsoren …
						</MastPanel>
					</>
				) : (
					<SponsorsView
						sponsors={sponsors}
						history={history}
						referenceYear={referenceYear}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						segment={segment}
						onSegmentChange={setSegment}
						compact={isMobile}
						onOpenFestivalList={() => navigate('/dashboard')}
						onAddSponsor={openAddSponsor}
						onSignOut={handleSignOut}
						onEditSponsor={(sponsor) => setForm({ sponsor })}
						onDeleteSponsor={handleDelete}
					/>
				)}
			</div>

			<SponsorFormDialog
				open={form !== null}
				onOpenChange={(open) => {
					if (!open) setForm(null);
				}}
				sponsor={form?.sponsor ?? null}
				onSave={handleSave}
				saving={saving}
			/>
		</div>
	);
};

export default Sponsors;
