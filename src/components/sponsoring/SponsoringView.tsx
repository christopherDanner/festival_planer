import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Edit, Trash2, HandCoins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
	getCategories,
	createCategory,
	updateCategory,
	deleteCategory,
	parseCategoryValue,
	type SponsoringCategory
} from '@/lib/sponsorService';

interface SponsoringViewProps {
	festivalId: string;
}

const formatValue = (value: number | null): string => {
	if (value == null) return '–';
	return value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });
};

const SponsoringView: React.FC<SponsoringViewProps> = ({ festivalId }) => {
	const { toast } = useToast();

	const [categories, setCategories] = useState<SponsoringCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [showDialog, setShowDialog] = useState(false);
	const [editing, setEditing] = useState<SponsoringCategory | null>(null);
	const [name, setName] = useState('');
	const [value, setValue] = useState('');

	useEffect(() => {
		loadCategories();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [festivalId]);

	const loadCategories = async () => {
		try {
			const data = await getCategories(festivalId);
			setCategories(data);
		} catch (error) {
			toast({
				title: 'Fehler',
				description: 'Sponsoring-Kategorien konnten nicht geladen werden.',
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	};

	const openCreate = () => {
		setEditing(null);
		setName('');
		setValue('');
		setShowDialog(true);
	};

	const openEdit = (category: SponsoringCategory) => {
		setEditing(category);
		setName(category.name);
		setValue(category.value == null ? '' : String(category.value).replace('.', ','));
		setShowDialog(true);
	};

	const handleSave = async () => {
		if (!name.trim()) {
			toast({
				title: 'Fehler',
				description: 'Name ist erforderlich.',
				variant: 'destructive'
			});
			return;
		}

		const parsedValue = parseCategoryValue(value);

		try {
			if (editing) {
				await updateCategory(editing.id, { name: name.trim(), value: parsedValue });
				toast({ title: 'Erfolg', description: 'Kategorie wurde aktualisiert.' });
			} else {
				await createCategory(festivalId, name.trim(), parsedValue);
				toast({ title: 'Erfolg', description: 'Kategorie wurde hinzugefügt.' });
			}
			setShowDialog(false);
			loadCategories();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
				variant: 'destructive'
			});
		}
	};

	const handleDelete = async (category: SponsoringCategory) => {
		if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
			return;
		}

		try {
			await deleteCategory(category.id);
			toast({ title: 'Erfolg', description: 'Kategorie wurde gelöscht.' });
			loadCategories();
		} catch (error) {
			toast({
				title: 'Fehler',
				description: error instanceof Error ? error.message : 'Fehler beim Löschen',
				variant: 'destructive'
			});
		}
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
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
						<HandCoins className="h-5 w-5" />
						Sponsoring-Kategorien
					</h2>
					<p className="text-sm text-muted-foreground">
						Sponsoring-Leistungen für dieses Fest (Name + Wert)
					</p>
				</div>
				<Button onClick={openCreate} size="sm">
					<Plus className="h-4 w-4 mr-2" />
					<span>Kategorie</span>
				</Button>
			</div>

			<div className="rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="text-right">Wert</TableHead>
							<TableHead className="w-[100px]">Aktionen</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{categories.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
									Noch keine Sponsoring-Kategorien
								</TableCell>
							</TableRow>
						) : (
							categories.map((category) => (
								<TableRow key={category.id}>
									<TableCell className="font-medium">{category.name}</TableCell>
									<TableCell className="text-right">{formatValue(category.value)}</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Button size="sm" variant="outline" onClick={() => openEdit(category)}>
												<Edit className="h-4 w-4" />
											</Button>
											<Button size="sm" variant="outline" onClick={() => handleDelete(category)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editing ? 'Kategorie bearbeiten' : 'Neue Sponsoring-Kategorie'}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="category_name">Name *</Label>
							<Input
								id="category_name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="z.B. Werbeplakat"
							/>
						</div>
						<div>
							<Label htmlFor="category_value">Wert (€)</Label>
							<Input
								id="category_value"
								inputMode="decimal"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								placeholder="z.B. 200 oder 200,50"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setShowDialog(false)}>
								Abbrechen
							</Button>
							<Button onClick={handleSave}>{editing ? 'Aktualisieren' : 'Hinzufügen'}</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default SponsoringView;
