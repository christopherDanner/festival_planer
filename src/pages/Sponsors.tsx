import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Phone, Mail, Globe, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import {
	getSponsors,
	createSponsor,
	updateSponsor,
	deleteSponsor,
	filterSponsors,
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

const Sponsors = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
	const { signOut } = useAuth();

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [showDialog, setShowDialog] = useState(false);
	const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
	const [formData, setFormData] = useState(emptyForm);

	useEffect(() => {
		loadSponsors();
	}, []);

	const loadSponsors = async () => {
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
	};

	const filteredSponsors = filterSponsors(sponsors, searchTerm);

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

	const pageHeader = (
		<PageHeader
			title="Sponsoren"
			subtitle="Globale Sponsoren-Stammdaten für alle Feste"
			onBack={() => navigate('/dashboard')}
			actions={
				<>
					<Button size="sm" onClick={openAddSponsor} className="gap-2">
						<Plus className="h-4 w-4" />
						Sponsor hinzufügen
					</Button>
					<Button variant="outline" size="sm" onClick={handleSignOut}>
						Abmelden
					</Button>
				</>
			}
			menuItems={[
				{
					label: 'Sponsor hinzufügen',
					icon: <Plus className="h-4 w-4" />,
					onClick: openAddSponsor
				},
				{
					label: 'Dashboard',
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

	if (loading) {
		return (
			<div className="min-h-screen bg-background">
				{pageHeader}
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center justify-center">
						<div className="text-lg">Lade Sponsoren...</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{pageHeader}
			<div>
				<div className="container mx-auto px-4 py-6">
					<Dialog open={showDialog} onOpenChange={setShowDialog}>
						<DialogContent className="max-w-2xl">
									<DialogHeader>
										<DialogTitle>
											{editingSponsor ? 'Sponsor bearbeiten' : 'Neuen Sponsor hinzufügen'}
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
													onChange={(e) =>
														setFormData((prev) => ({ ...prev, email: e.target.value }))
													}
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
													onChange={(e) =>
														setFormData((prev) => ({ ...prev, phone: e.target.value }))
													}
													placeholder="Telefonnummer"
												/>
											</div>
											<div>
												<Label htmlFor="website">Website</Label>
												<Input
													id="website"
													value={formData.website}
													onChange={(e) =>
														setFormData((prev) => ({ ...prev, website: e.target.value }))
													}
													placeholder="https://..."
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="address">Adresse</Label>
											<Input
												id="address"
												value={formData.address}
												onChange={(e) =>
													setFormData((prev) => ({ ...prev, address: e.target.value }))
												}
												placeholder="Adresse"
											/>
										</div>

										<div>
											<Label htmlFor="notes">Notizen</Label>
											<Textarea
												id="notes"
												value={formData.notes}
												onChange={(e) =>
													setFormData((prev) => ({ ...prev, notes: e.target.value }))
												}
												placeholder="Zusätzliche Notizen"
												rows={3}
											/>
										</div>

										<div className="flex justify-end gap-2">
											<Button variant="outline" onClick={() => setShowDialog(false)}>
												Abbrechen
											</Button>
											<Button onClick={handleSave}>
												{editingSponsor ? 'Aktualisieren' : 'Hinzufügen'}
											</Button>
										</div>
									</div>
						</DialogContent>
					</Dialog>

					{/* Filters */}
					<Card className="mb-6">
						<CardContent className="pt-6">
							<div className="relative max-w-md">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Firmenname..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Sponsors Table */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>Sponsoren ({filteredSponsors.length})</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Firma</TableHead>
										<TableHead>Ansprechpartner</TableHead>
										<TableHead>Kontakt</TableHead>
										<TableHead>Aktionen</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredSponsors.length === 0 ? (
										<TableRow>
											<TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
												Keine Sponsoren gefunden
											</TableCell>
										</TableRow>
									) : (
										filteredSponsors.map((sponsor) => (
											<TableRow key={sponsor.id}>
												<TableCell>
													<div>
														<div className="font-medium">{sponsor.company_name}</div>
														{sponsor.website && (
															<div className="flex items-center gap-1 text-sm text-muted-foreground">
																<Globe className="h-3 w-3" />
																{sponsor.website}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>{sponsor.contact_person || '–'}</TableCell>
												<TableCell>
													<div className="space-y-1">
														{sponsor.phone && (
															<div className="flex items-center gap-1 text-sm">
																<Phone className="h-3 w-3" />
																{sponsor.phone}
															</div>
														)}
														{sponsor.email && (
															<div className="flex items-center gap-1 text-sm">
																<Mail className="h-3 w-3" />
																{sponsor.email}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEdit(sponsor)}>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleDelete(sponsor)}>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default Sponsors;
