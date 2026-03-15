import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScheduleDayDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	day?: { id: string; date: string; label: string | null } | null;
	festivalId: string;
	existingDaysCount: number;
	onSave: (data: { festival_id: string; date: string; label: string | null; is_auto_generated: boolean; sort_order: number }) => void;
}

const ScheduleDayDialog: React.FC<ScheduleDayDialogProps> = ({
	open,
	onOpenChange,
	day,
	festivalId,
	existingDaysCount,
	onSave
}) => {
	const [form, setForm] = useState({
		date: '',
		label: ''
	});

	useEffect(() => {
		if (day) {
			setForm({
				date: day.date,
				label: day.label || ''
			});
		} else {
			setForm({
				date: '',
				label: ''
			});
		}
	}, [day, open]);

	const handleSave = () => {
		if (!form.date) return;
		onSave({
			festival_id: festivalId,
			date: form.date,
			label: form.label || null,
			is_auto_generated: false,
			sort_order: existingDaysCount
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{day ? 'Tag bearbeiten' : 'Tag hinzufügen'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="day-date">Datum *</Label>
						<Input
							id="day-date"
							type="date"
							value={form.date}
							onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
						/>
					</div>

					<div>
						<Label htmlFor="day-label">Bezeichnung</Label>
						<Input
							id="day-label"
							value={form.label}
							onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
							placeholder="z.B. Aufbautag"
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.date} size="sm">
							{day ? 'Aktualisieren' : 'Hinzufügen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ScheduleDayDialog;
