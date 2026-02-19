import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Station } from '@/lib/shiftService';
import type { Member } from '@/lib/memberService';

interface StationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	station?: Station | null;
	members: Member[];
	onSave: (data: { name: string; required_people: number; description: string; responsible_member_id: string | null }) => void;
}

const StationDialog: React.FC<StationDialogProps> = ({ open, onOpenChange, station, members, onSave }) => {
	const [form, setForm] = useState({ name: '', required_people: 1, description: '', responsible_member_id: '' as string });

	useEffect(() => {
		if (station) {
			setForm({
				name: station.name,
				required_people: station.required_people,
				description: station.description || '',
				responsible_member_id: station.responsible_member_id || ''
			});
		} else {
			setForm({ name: '', required_people: 1, description: '', responsible_member_id: '' });
		}
	}, [station, open]);

	const handleSave = () => {
		if (!form.name) return;
		onSave({
			name: form.name,
			required_people: form.required_people,
			description: form.description,
			responsible_member_id: form.responsible_member_id || null
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{station ? 'Station bearbeiten' : 'Neue Station erstellen'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="station-name">Name</Label>
						<Input
							id="station-name"
							value={form.name}
							onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="z.B. Grill, Kassa, Bar"
						/>
					</div>
					<div>
						<Label htmlFor="required-people">Benötigte Personen</Label>
						<Input
							id="required-people"
							type="number"
							min="1"
							value={form.required_people}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									required_people: parseInt(e.target.value) || 1
								}))
							}
						/>
					</div>
					<div>
						<Label htmlFor="station-description">Beschreibung (optional)</Label>
						<Textarea
							id="station-description"
							value={form.description}
							onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
							placeholder="Zusätzliche Informationen..."
							rows={3}
						/>
					</div>
					<div>
						<Label htmlFor="responsible-member">Verantwortliche Person (optional)</Label>
						<Select
							value={form.responsible_member_id}
							onValueChange={(value) =>
								setForm((prev) => ({
									...prev,
									responsible_member_id: value === '__none__' ? '' : value
								}))
							}>
							<SelectTrigger id="responsible-member">
								<SelectValue placeholder="Keine Person ausgewählt" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Kein Verantwortlicher</SelectItem>
								{members.map((member) => (
									<SelectItem key={member.id} value={member.id}>
										{member.first_name} {member.last_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.name}>
							{station ? 'Aktualisieren' : 'Erstellen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default StationDialog;
