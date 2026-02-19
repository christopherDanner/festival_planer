import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Station, StationShift } from '@/lib/shiftService';

interface StationShiftDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stationShift?: StationShift | null;
	station: Station | null;
	onSave: (data: {
		name: string;
		start_date: string;
		start_time: string;
		end_date: string;
		end_time: string;
		required_people: number;
	}) => void;
}

const StationShiftDialog: React.FC<StationShiftDialogProps> = ({
	open,
	onOpenChange,
	stationShift,
	station,
	onSave
}) => {
	const [form, setForm] = useState({
		name: '',
		start_date: '',
		start_time: '',
		end_date: '',
		end_time: '',
		required_people: 1
	});

	useEffect(() => {
		if (stationShift) {
			setForm({
				name: stationShift.name,
				start_date: stationShift.start_date,
				start_time: stationShift.start_time,
				end_date: stationShift.end_date || '',
				end_time: stationShift.end_time,
				required_people: stationShift.required_people
			});
		} else {
			setForm({
				name: '',
				start_date: '',
				start_time: '',
				end_date: '',
				end_time: '',
				required_people: station?.required_people || 1
			});
		}
	}, [stationShift, station, open]);

	const handleSave = () => {
		if (!form.name || !form.start_date || !form.start_time || !form.end_time) return;
		onSave(form);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{stationShift ? 'Schicht bearbeiten' : `Neue Schicht für ${station?.name} erstellen`}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label htmlFor="shift-name">Name</Label>
						<Input
							id="shift-name"
							value={form.name}
							onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="z.B. Frühschicht, Spätschicht"
						/>
					</div>
					<div>
						<Label htmlFor="shift-date">Datum</Label>
						<Input
							id="shift-date"
							type="date"
							value={form.start_date}
							onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="start-time">Von</Label>
							<Input
								id="start-time"
								type="time"
								value={form.start_time}
								onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="end-time">Bis</Label>
							<Input
								id="end-time"
								type="time"
								value={form.end_time}
								onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="end-date">
							Enddatum (optional - für tagesübergreifende Schichten)
						</Label>
						<Input
							id="end-date"
							type="date"
							value={form.end_date}
							onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
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
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Abbrechen
						</Button>
						<Button
							onClick={handleSave}
							disabled={!form.name || !form.start_date || !form.start_time || !form.end_time}>
							{stationShift ? 'Aktualisieren' : 'Erstellen'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default StationShiftDialog;
