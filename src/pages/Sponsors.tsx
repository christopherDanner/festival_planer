import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import MastPanel from '@/components/sponsors/MastPanel';
import SponsorsMast from '@/components/sponsors/SponsorsMast';
import SponsorsView from '@/components/sponsors/SponsorsView';
import {
	getSponsors,
	createSponsor,
	updateSponsor,
	deleteSponsor,
	type Sponsor
} from '@/lib/sponsorService';

const emptyForm = {
	company_name: '',
	contact_person: '',
	email: '',
	phone: '',
	address: '',
	website: '',
	notes: ''
};

/**
 * Sponsoren-Stammdaten (`/sponsors`) — der Sponsorenbestand über alle Feste
 * hinweg (ADR 0011). Kein Fest-Arbeitsbereich: eigener Mast statt Tab-Leiste,
 * Zurück-Weg ist der Wordmark (#101).
 *
 * Der Dialog unten ist der Übergangsweg zum Anlegen/Bearbeiten/Löschen, bis
 * #159 das geteilte Firmendaten-Formular hinter das ⋮ hängt.
 */
const Sponsors = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
	const { signOut } = useAuth();
	const isMobile = useIsMobile();

	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [showDialog, setShowDialog] = useState(false);
	const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
	const [formData, setFormData] = useState(emptyForm);

	const loadSponsors = useCallback(async () => {
		try {
			const data = await getSponsors();
			setSponsors(data);
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

	const handleSignOut = async () => {
		await signOut();
		navigate('/auth');
	};

	const resetForm = () => {
		setFormData(emptyForm);
		setEditingSponsor(null);
	};

	const handleSave = async () => {
		if (!formData.company_name.trim()) {
			toast({
				title: 'Fehler',
				description: 'Firmenname ist erforderlich.',
				variant: 'destructive'
			});
			return;
		}

		try {
			if (editingSponsor) {
				await updateSponsor(editingSponsor.id, formData);
				toast({ title: 'Erfolg', description: 'Sponsor wurde aktualisiert.' });
			} else {
				await createSponsor(formData);
				toast({ title: 'Erfolg', description: 'Sponsor wurde hinzugefügt.' });
			}
			resetForm();
			setShowDialog(false);
			loadSponsors();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	const handleDelete = async (sponsor: Sponsor) => {
		if (!confirm(`Möchten Sie ${sponsor.company_name} wirklich löschen?`)) {
			return;
		}

		try {
			await deleteSponsor(sponsor.id);
			toast({ title: 'Erfolg', description: 'Sponsor wurde gelöscht.' });
			resetForm();
			setShowDialog(false);
			loadSponsors();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Fehler beim Löschen',
				variant: 'destructive'
			});
		}
	};

	const handleEdit = (sponsor: Sponsor) => {
		setFormData({
			company_name: sponsor.company_name,
			contact_person: sponsor.contact_person || '',
			email: sponsor.email || '',
			phone: sponsor.phone || '',
			address: sponsor.address || '',
			website: sponsor.website || '',
			notes: sponsor.notes || ''
		});
		setEditingSponsor(sponsor);
		setShowDialog(true);
	};

	const openAddSponsor = () => {
		resetForm();
		setShowDialog(true);
	};

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
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						compact={isMobile}
						onOpenFestivalList={() => navigate('/dashboard')}
						onAddSponsor={openAddSponsor}
						onSignOut={handleSignOut}
						onSelectSponsor={handleEdit}
					/>
				)}
			</div>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editingSponsor ? 'Firma bearbeiten' : 'Neue Firma anlegen'}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="company_name">Firmenname *</Label>
							<Input
								id="company_name"
								value={formData.company_name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, company_name: e.target.value }))
								}
								placeholder="Firmenname"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="contact_person">Ansprechpartner</Label>
								<Input
									id="contact_person"
									value={formData.contact_person}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
									}
									placeholder="Ansprechpartner"
								/>
							</div>
							<div>
								<Label htmlFor="email">E-Mail</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
									placeholder="E-Mail Adresse"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="phone">Telefon</Label>
								<Input
									id="phone"
									value={formData.phone}
									onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
									placeholder="Telefonnummer"
								/>
							</div>
							<div>
								<Label htmlFor="website">Website</Label>
								<Input
									id="website"
									value={formData.website}
									onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
									placeholder="https://..."
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="address">Adresse</Label>
							<Input
								id="address"
								value={formData.address}
								onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
								placeholder="Adresse"
							/>
						</div>

						<div>
							<Label htmlFor="notes">Notizen</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
								placeholder="Zusätzliche Notizen"
								rows={3}
							/>
						</div>

						<div className="flex items-center justify-between gap-2">
							{editingSponsor ? (
								<Button variant="destructive" onClick={() => handleDelete(editingSponsor)}>
									Löschen
								</Button>
							) : (
								<span />
							)}
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => setShowDialog(false)}>
									Abbrechen
								</Button>
								<Button onClick={handleSave}>
									{editingSponsor ? 'Aktualisieren' : 'Hinzufügen'}
								</Button>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Sponsors;
