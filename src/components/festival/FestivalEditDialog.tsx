import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FestivalEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	festival: { id: string; name: string; start_date: string; end_date?: string; location?: string };
	onSave: (updates: { name: string; start_date: string; end_date: string | null; location: string | null }) => void;
}

const FestivalEditDialog: React.FC<FestivalEditDialogProps> = ({
	open,
	onOpenChange,
	festival,
	onSave
}) => {
	const [form, setForm] = useState({
		name: '',
		start_date: '',
		end_date: '',
		location: ''
	});

	useEffect(() => {
		if (open && festival) {
			setForm({
				name: festival.name || '',
				start_date: festival.start_date || '',
				end_date: festival.end_date || '',
				location: festival.location || ''
			});
		}
	}, [festival, open]);

	const handleSave = () => {
		if (!form.name || !form.start_date) return;
		onSave({
			name: form.name,
			start_date: form.start_date,
			end_date: form.end_date || null,
			location: form.location || null
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Fest bearbeiten</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="fest-name">Name *</Label>
						<Input
							id="fest-name"
							value={form.name}
							onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="z.B. Feuerwehrfest 2026"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<div>
							<Label htmlFor="fest-start">Startdatum *</Label>
							<Input
								id="fest-start"
								type="date"
								value={form.start_date}
								onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="fest-end">Enddatum</Label>
							<Input
								id="fest-end"
								type="date"
								value={form.end_date}
								onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="fest-location">Ort</Label>
						<Input
							id="fest-location"
							value={form.location}
							onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
							placeholder="z.B. Hauptplatz Musterstadt"
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.name || !form.start_date} size="sm">
							Speichern
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default FestivalEditDialog;
