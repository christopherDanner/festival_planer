import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SchedulePhaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	phase?: { id: string; name: string } | null;
	scheduleDayId: string;
	festivalId: string;
	existingPhasesCount: number;
	onSave: (data: { schedule_day_id: string; festival_id: string; name: string; sort_order: number }) => void;
}

const SchedulePhaseDialog: React.FC<SchedulePhaseDialogProps> = ({
	open,
	onOpenChange,
	phase,
	scheduleDayId,
	festivalId,
	existingPhasesCount,
	onSave
}) => {
	const [form, setForm] = useState({
		name: ''
	});

	useEffect(() => {
		if (phase) {
			setForm({
				name: phase.name
			});
		} else {
			setForm({
				name: ''
			});
		}
	}, [phase, open]);

	const handleSave = () => {
		if (!form.name) return;
		onSave({
			schedule_day_id: scheduleDayId,
			festival_id: festivalId,
			name: form.name,
			sort_order: existingPhasesCount
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{phase ? 'Phase bearbeiten' : 'Phase hinzufügen'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="phase-name">Name *</Label>
						<Input
							id="phase-name"
							value={form.name}
							onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="z.B. Aufbau, Abendprogramm"
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
							Abbrechen
						</Button>
						<Button onClick={handleSave} disabled={!form.name} size="sm">
							{phase ? 'Aktualisieren' : 'Hinzufügen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SchedulePhaseDialog;
