import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Save } from 'lucide-react';
import type { Helper, HelperInput } from '@/lib/helperService';

interface HelperDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	helper?: Helper | null;
	onSave: (data: Required<HelperInput>) => void;
}

/**
 * Anlegen und Bearbeiten eines Helfers — nach dem Wegfall der Mitglieder-Seite
 * der einzige Weg dazu, aufgerufen aus der Helferliste des Schichtplans.
 * Der Aktiv-Haken ist mit ADR 0005 weg: wer nicht mitmacht, wird entfernt.
 */
const HelperDialog: React.FC<HelperDialogProps> = ({ open, onOpenChange, helper, onSave }) => {
	const [form, setForm] = useState({
		first_name: '',
		last_name: '',
		phone: '',
		email: '',
		notes: ''
	});

	useEffect(() => {
		if (helper) {
			setForm({
				first_name: helper.first_name,
				last_name: helper.last_name,
				phone: helper.phone || '',
				email: helper.email || '',
				notes: helper.notes || ''
			});
		} else {
			setForm({
				first_name: '',
				last_name: '',
				phone: '',
				email: '',
				notes: ''
			});
		}
	}, [helper, open]);

	const handleSave = () => {
		if (!form.first_name || !form.last_name) return;
		onSave(form);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="h-5 w-5" />
						{helper ? 'Helfer bearbeiten' : 'Neuen Helfer hinzufügen'}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="first_name">Vorname *</Label>
							<Input
								id="first_name"
								value={form.first_name}
								onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
								placeholder="Vorname eingeben"
							/>
						</div>
						<div>
							<Label htmlFor="last_name">Nachname *</Label>
							<Input
								id="last_name"
								value={form.last_name}
								onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
								placeholder="Nachname eingeben"
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="phone">Telefon</Label>
							<Input
								id="phone"
								value={form.phone}
								onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
								placeholder="Telefonnummer eingeben"
							/>
						</div>
						<div>
							<Label htmlFor="email">E-Mail</Label>
							<Input
								id="email"
								type="email"
								value={form.email}
								onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
								placeholder="E-Mail eingeben"
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="notes">Notizen</Label>
						<Textarea
							id="notes"
							value={form.notes}
							onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
							placeholder="Notizen eingeben"
							rows={3}
						/>
					</div>
					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.first_name || !form.last_name}>
							<Save className="h-4 w-4 mr-2" />
							{helper ? 'Aktualisieren' : 'Hinzufügen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default HelperDialog;
