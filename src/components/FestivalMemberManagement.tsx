import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
	FestivalMember,
	getFestivalMembers,
	createFestivalMember,
	updateFestivalMember,
	deleteFestivalMember,
	importFestivalMembers
} from '@/lib/festivalMemberService';
import MemberImport from './MemberImport';

interface FestivalMemberManagementProps {
	festivalId: string;
}

export const FestivalMemberManagement = ({ festivalId }: FestivalMemberManagementProps) => {
	const [members, setMembers] = useState<FestivalMember[]>([]);
	const [filteredMembers, setFilteredMembers] = useState<FestivalMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
	
	// Form state
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<FestivalMember | null>(null);
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		phone: '',
		email: '',
		notes: '',
		is_active: true,
		station_preferences: [] as string[]
	});

	const loadMembers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getFestivalMembers(festivalId);
			setMembers(data);
		} catch (error) {
			console.error('Error loading members:', error);
			toast.error('Fehler beim Laden der Mitglieder');
		} finally {
			setLoading(false);
		}
	}, [festivalId]);

	useEffect(() => {
		loadMembers();
	}, [loadMembers]);

	useEffect(() => {
		filterMembers();
	}, [members, searchTerm, activeFilter]);

	const filterMembers = () => {
		let filtered = members;

		if (searchTerm) {
			filtered = filtered.filter(
				(member) =>
					member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					member.phone?.includes(searchTerm)
			);
		}

		if (activeFilter !== 'all') {
			filtered = filtered.filter((member) => 
				activeFilter === 'active' ? member.is_active : !member.is_active
			);
		}

		setFilteredMembers(filtered);
	};

	const resetForm = () => {
		setFormData({
			first_name: '',
			last_name: '',
			phone: '',
			email: '',
			notes: '',
			is_active: true,
			station_preferences: []
		});
		setEditingMember(null);
	};

	const handleSaveMember = async () => {
		try {
			if (editingMember) {
				await updateFestivalMember(editingMember.id, formData);
				toast.success('Mitglied erfolgreich aktualisiert');
			} else {
				await createFestivalMember(festivalId, formData);
				toast.success('Mitglied erfolgreich erstellt');
			}
			
			setIsDialogOpen(false);
			resetForm();
			loadMembers();
		} catch (error) {
			console.error('Error saving member:', error);
			toast.error('Fehler beim Speichern des Mitglieds');
		}
	};

	const handleDeleteMember = async (memberId: string) => {
		if (!confirm('Sind Sie sicher, dass Sie dieses Mitglied löschen möchten?')) {
			return;
		}

		try {
			await deleteFestivalMember(memberId);
			toast.success('Mitglied erfolgreich gelöscht');
			loadMembers();
		} catch (error) {
			console.error('Error deleting member:', error);
			toast.error('Fehler beim Löschen des Mitglieds');
		}
	};

	const handleEditMember = (member: FestivalMember) => {
		setFormData({
			first_name: member.first_name,
			last_name: member.last_name,
			phone: member.phone || '',
			email: member.email || '',
			notes: member.notes || '',
			is_active: member.is_active,
			station_preferences: member.station_preferences || []
		});
		setEditingMember(member);
		setIsDialogOpen(true);
	};

	const handleImportComplete = async () => {
		try {
			setIsImportOpen(false);
			loadMembers();
		} catch (error) {
			console.error('Error importing members:', error);
			toast.error('Fehler beim Importieren der Mitglieder');
		}
	};

	if (loading) {
		return <div>Lädt...</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-2xl font-bold">Festival Mitglieder</h2>
					<p className="text-muted-foreground">
						Verwalten Sie die Mitglieder für dieses Festival
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						onClick={() => setIsImportOpen(true)}
						variant="outline"
						className="flex items-center gap-2"
					>
						<Users className="h-4 w-4" />
						Importieren
					</Button>
					<Button
						onClick={() => {
							resetForm();
							setIsDialogOpen(true);
						}}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Mitglied hinzufügen
					</Button>
				</div>
			</div>

			{/* Search and Filter */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex gap-4">
						<div className="flex-1">
							<Input
								placeholder="Name, E-Mail oder Telefon suchen..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Button
								variant={activeFilter === 'all' ? 'default' : 'outline'}
								onClick={() => setActiveFilter('all')}
							>
								Alle ({members.length})
							</Button>
							<Button
								variant={activeFilter === 'active' ? 'default' : 'outline'}
								onClick={() => setActiveFilter('active')}
							>
								Aktiv ({members.filter(m => m.is_active).length})
							</Button>
							<Button
								variant={activeFilter === 'inactive' ? 'default' : 'outline'}
								onClick={() => setActiveFilter('inactive')}
							>
								Inaktiv ({members.filter(m => !m.is_active).length})
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Members Table */}
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Kontakt</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Aktionen</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredMembers.map((member) => (
							<TableRow key={member.id}>
								<TableCell>
									<div>
										<div className="font-medium">
											{member.first_name} {member.last_name}
										</div>
										{member.notes && (
											<div className="text-sm text-muted-foreground">
												{member.notes}
											</div>
										)}
									</div>
								</TableCell>
								<TableCell>
									<div className="space-y-1">
										{member.email && (
											<div className="text-sm">{member.email}</div>
										)}
										{member.phone && (
											<div className="text-sm text-muted-foreground">
												{member.phone}
											</div>
										)}
									</div>
								</TableCell>
								<TableCell>
									<Badge variant={member.is_active ? 'default' : 'secondary'}>
										{member.is_active ? 'Aktiv' : 'Inaktiv'}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEditMember(member)}
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDeleteMember(member.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{/* Add/Edit Member Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingMember ? 'Mitglied bearbeiten' : 'Neues Mitglied'}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="first_name">Vorname *</Label>
								<Input
									id="first_name"
									value={formData.first_name}
									onChange={(e) =>
										setFormData({ ...formData, first_name: e.target.value })
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="last_name">Nachname *</Label>
								<Input
									id="last_name"
									value={formData.last_name}
									onChange={(e) =>
										setFormData({ ...formData, last_name: e.target.value })
									}
									required
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="email">E-Mail</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div>
							<Label htmlFor="phone">Telefon</Label>
							<Input
								id="phone"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
							/>
						</div>
						<div>
							<Label htmlFor="notes">Notizen</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData({ ...formData, notes: e.target.value })
								}
								rows={3}
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="is_active"
								checked={formData.is_active}
								onCheckedChange={(checked) =>
									setFormData({ ...formData, is_active: checked })
								}
							/>
							<Label htmlFor="is_active">Aktiv</Label>
						</div>
						<div className="flex justify-end space-x-2 pt-4">
							<Button variant="outline" onClick={() => setIsDialogOpen(false)}>
								Abbrechen
							</Button>
							<Button 
								onClick={handleSaveMember}
								disabled={!formData.first_name || !formData.last_name}
							>
								{editingMember ? 'Aktualisieren' : 'Erstellen'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Import Dialog */}
			<Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<MemberImport
						onImportComplete={handleImportComplete}
						onClose={() => setIsImportOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
};